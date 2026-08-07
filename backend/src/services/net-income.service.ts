import { prisma } from "../db/client.js";

/** Minimal transaction shape needed to sum income — keeps sumIncome pure and unit-testable. */
export interface IncomeTransactionLike {
  spendingCategory: string | null;
  spendingSubcategory: string | null;
  amount: number;
}

/**
 * Sum income-tagged transactions.
 *
 * `count` is the number of income-tagged rows regardless of exclusion — it's
 * the "does this plan have any income transactions at all" signal that decides
 * whether to auto-compute net income or fall back to the manual value.
 *
 * `total` only includes rows with amount > 0 (a deposit) that aren't in an
 * excluded category. Amounts are summed AS-IS, not negated — unlike every
 * fixed-cost aggregation in this app, income is already positive in the app's
 * sign convention (spending negative, income positive), so there's no sign
 * flip here.
 *
 * Deliberately does NOT filter out transactions with type "Payment" — banks
 * frequently describe real payroll deposits that way (normalizeType maps
 * anything containing "PAYMENT" to that type on the client), and excluding
 * them would silently drop paychecks from net income.
 */
export function sumIncome(
  transactions: IncomeTransactionLike[],
  excludedLabels: Set<string>
): { count: number; total: number } {
  let count = 0;
  let total = 0;
  for (const t of transactions) {
    if (t.spendingCategory !== "income") continue;
    count++;
    if (t.amount <= 0) continue;
    if (t.spendingSubcategory && excludedLabels.has(t.spendingSubcategory)) continue;
    total += t.amount;
  }
  return { count, total };
}

/**
 * Recompute a plan's netMonthlyIncome from its income-tagged transactions and
 * persist it. Returns the computed total, or null if the plan has zero income
 * transactions (in which case the stored value — the manual fallback — is left
 * untouched).
 *
 * No lock check: per-transaction category assignment already isn't guarded on
 * locked plans (only category-library structural edits are), so this follows
 * the same precedent.
 */
export async function recomputeNetIncome(planId: string): Promise<number | null> {
  const [plan, excludedItems, transactions] = await Promise.all([
    prisma.spendingPlan.findUnique({ where: { id: planId }, select: { netMonthlyIncome: true } }),
    prisma.planLineItem.findMany({
      where: { spendingPlanId: planId, section: "income", excluded: true },
      select: { label: true },
    }),
    prisma.transaction.findMany({
      where: {
        import: { spendingPlanId: planId },
        spendingCategory: "income",
        isDuplicate: false,
        deletedAt: null,
      },
      select: { spendingCategory: true, spendingSubcategory: true, amount: true },
    }),
  ]);
  if (!plan) return null;

  const excludedLabels = new Set(excludedItems.map((i) => i.label));
  const { count, total } = sumIncome(
    transactions.map((t) => ({ ...t, amount: Number(t.amount) })),
    excludedLabels
  );
  if (count === 0) return null;

  // Avoid writing (and bumping updatedAt) on a no-op recompute.
  if (Math.abs(Number(plan.netMonthlyIncome) - total) >= 0.005) {
    await prisma.spendingPlan.update({ where: { id: planId }, data: { netMonthlyIncome: total } });
  }
  return total;
}

/** Recompute net income for several plans in sequence (bulk mutation paths). */
export async function recomputeNetIncomeForPlans(planIds: string[]): Promise<void> {
  const distinct = [...new Set(planIds)];
  for (const id of distinct) {
    await recomputeNetIncome(id);
  }
}
