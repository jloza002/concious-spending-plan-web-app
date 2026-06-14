import { prisma } from "../db/client.js";
import {
  DEFAULT_FIXED_COSTS,
  DEFAULT_INVESTMENTS,
  DEFAULT_SAVINGS,
} from "@csp/shared";

/**
 * Make sure a user has a non-empty category library. If they don't (legacy
 * users created before the universal-categories migration, or fresh accounts
 * that for some reason skipped the seed step), backfill the defaults.
 */
export async function ensureUserCategoryLibrary(userId: string): Promise<void> {
  const count = await prisma.userCategory.count({ where: { userId } });
  if (count > 0) return;

  const rows = [
    ...DEFAULT_FIXED_COSTS.map((label, i) => ({ userId, section: "fixed_costs", label, sortOrder: i + 1 })),
    ...DEFAULT_INVESTMENTS.map((label, i) => ({ userId, section: "investments", label, sortOrder: i + 1 })),
    ...DEFAULT_SAVINGS.map((label, i) => ({ userId, section: "savings", label, sortOrder: i + 1 })),
  ];
  await prisma.userCategory.createMany({ data: rows, skipDuplicates: true });
}

/** Return the user's category library ordered for display. */
export async function listUserCategories(userId: string) {
  await ensureUserCategoryLibrary(userId);
  return prisma.userCategory.findMany({
    where: { userId },
    orderBy: [{ section: "asc" }, { sortOrder: "asc" }],
  });
}

/**
 * Add a category to the user's library. Also append it to every unlocked
 * plan as a zero-amount line item so it shows up in the dropdown.
 */
export async function addUserCategory(
  userId: string,
  section: string,
  label: string
) {
  const existing = await prisma.userCategory.findUnique({
    where: { userId_section_label: { userId, section, label } },
  });
  if (existing) return existing;

  const maxOrder = await prisma.userCategory.findFirst({
    where: { userId, section },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });

  const created = await prisma.userCategory.create({
    data: {
      userId,
      section,
      label,
      sortOrder: (maxOrder?.sortOrder ?? 0) + 1,
    },
  });

  // Append to all unlocked plans for this user
  const unlockedPlans = await prisma.spendingPlan.findMany({
    where: { userId, isLocked: false },
    select: { id: true },
  });
  if (unlockedPlans.length > 0) {
    const lineItems = await Promise.all(
      unlockedPlans.map(async (p) => {
        const maxItem = await prisma.planLineItem.findFirst({
          where: { spendingPlanId: p.id, section },
          orderBy: { sortOrder: "desc" },
          select: { sortOrder: true },
        });
        return {
          spendingPlanId: p.id,
          section,
          label,
          amount: 0,
          isDefault: false,
          sortOrder: (maxItem?.sortOrder ?? 0) + 1,
        };
      })
    );
    await prisma.planLineItem.createMany({ data: lineItems, skipDuplicates: false });
  }

  return created;
}

/**
 * Rename a category in the user's library, cascading to:
 *  - matching plan_line_items in all UNLOCKED plans
 *  - transactions in those plans whose spendingSubcategory matches the old label
 * Locked plans are untouched, preserving the historical record.
 */
export async function renameUserCategory(
  userId: string,
  categoryId: string,
  newLabel: string
) {
  const cat = await prisma.userCategory.findFirst({
    where: { id: categoryId, userId },
  });
  if (!cat) return null;
  const oldLabel = cat.label;
  if (oldLabel === newLabel) return cat;

  // Find unlocked plan IDs for this user
  const unlocked = await prisma.spendingPlan.findMany({
    where: { userId, isLocked: false },
    select: { id: true },
  });
  const unlockedIds = unlocked.map((p) => p.id);

  await prisma.$transaction([
    prisma.userCategory.update({
      where: { id: categoryId },
      data: { label: newLabel },
    }),
    prisma.planLineItem.updateMany({
      where: {
        spendingPlanId: { in: unlockedIds },
        section: cat.section,
        label: oldLabel,
      },
      data: { label: newLabel },
    }),
    prisma.transaction.updateMany({
      where: {
        import: { spendingPlanId: { in: unlockedIds } },
        spendingCategory: cat.section,
        spendingSubcategory: oldLabel,
      },
      data: { spendingSubcategory: newLabel },
    }),
  ]);

  return prisma.userCategory.findUnique({ where: { id: categoryId } });
}

/**
 * Delete a category from the user's library, cascading to:
 *  - matching plan_line_items in all UNLOCKED plans (removed)
 *  - transactions in those plans (subcategory cleared to null)
 * Locked plans keep their copy of the line item and the existing transactions.
 */
export async function deleteUserCategory(userId: string, categoryId: string) {
  const cat = await prisma.userCategory.findFirst({
    where: { id: categoryId, userId },
  });
  if (!cat) return null;

  const unlocked = await prisma.spendingPlan.findMany({
    where: { userId, isLocked: false },
    select: { id: true },
  });
  const unlockedIds = unlocked.map((p) => p.id);

  await prisma.$transaction([
    prisma.transaction.updateMany({
      where: {
        import: { spendingPlanId: { in: unlockedIds } },
        spendingCategory: cat.section,
        spendingSubcategory: cat.label,
      },
      data: { spendingCategory: null, spendingSubcategory: null },
    }),
    prisma.planLineItem.deleteMany({
      where: {
        spendingPlanId: { in: unlockedIds },
        section: cat.section,
        label: cat.label,
      },
    }),
    prisma.userCategory.delete({ where: { id: categoryId } }),
  ]);

  return { id: categoryId };
}
