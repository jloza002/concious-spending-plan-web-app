import { prisma } from "../db/client.js";
import { AppError } from "../middleware/error-handler.js";
import type { BudgetTargetItemInput } from "@csp/shared";

/** Shape returned to the client — label is denormalized off the category. */
export interface BudgetTargetResponse {
  id: string;
  userCategoryId: string;
  label: string;
  month: number;
  year: number;
  amount: number;
}

/**
 * All budget targets for one month.
 *
 * The category join deliberately does NOT filter on `deletedAt`: a month that
 * was budgeted before a category was archived must still render its label and
 * amount, which is what keeps historical months meaningful.
 */
export async function getBudgetTargets(
  userId: string,
  month: number,
  year: number
): Promise<BudgetTargetResponse[]> {
  const rows = await prisma.budgetTarget.findMany({
    where: { userId, month, year },
    include: { userCategory: { select: { label: true, sortOrder: true } } },
    orderBy: { createdAt: "asc" },
  });

  return rows.map((row) => ({
    id: row.id,
    userCategoryId: row.userCategoryId,
    label: row.userCategory.label,
    month: row.month,
    year: row.year,
    amount: Number(row.amount),
  }));
}

/**
 * Replace a month's budget wholesale.
 *
 * The client always sends the full set for the month, so this deletes and
 * recreates inside one transaction rather than diffing. That keeps the
 * ten-category cap a simple array-length check (enforced by the Zod schema)
 * and avoids partial-update races between the picker and the amount inputs.
 */
export async function setBudgetTargets(
  userId: string,
  month: number,
  year: number,
  targets: BudgetTargetItemInput[]
): Promise<BudgetTargetResponse[]> {
  if (targets.length > 0) {
    const ids = targets.map((t) => t.userCategoryId);

    // Ownership + section check. Archived categories are still accepted here:
    // re-saving a month that already includes a since-archived category must
    // not fail, otherwise editing one amount would wipe unrelated history.
    const categories = await prisma.userCategory.findMany({
      where: { id: { in: ids }, userId, section: "fixed_costs" },
      select: { id: true },
    });

    if (categories.length !== new Set(ids).size) {
      throw new AppError(
        "One or more categories are not valid fixed-cost categories for this account",
        400
      );
    }
  }

  await prisma.$transaction([
    prisma.budgetTarget.deleteMany({ where: { userId, month, year } }),
    prisma.budgetTarget.createMany({
      data: targets.map((t) => ({
        userId,
        userCategoryId: t.userCategoryId,
        month,
        year,
        amount: t.amount,
      })),
    }),
  ]);

  return getBudgetTargets(userId, month, year);
}
