import { prisma } from "../db/client.js";

export interface CategorySummary {
  /** Fixed-cost actuals summed across the primary range, keyed by category label. */
  actual: Record<string, number>;
  /** Budgeted amounts summed across the primary range, keyed by category label. */
  planned: Record<string, number>;
  /** Fixed-cost actuals summed across the comparison range, keyed by category label. */
  compareActual: Record<string, number>;
}

/**
 * Aggregate fixed-cost category actuals (+ budgeted amounts) across a set of
 * plans, and actuals-only across a comparison set — the shared data source for
 * the dashboard's period-aware Spending vs Plan chart, Top Movers card, and
 * pie chart, so all three inherit the same period-awareness and exclusion
 * handling for free instead of re-deriving it three times.
 *
 * Ownership is the security boundary: any requested id that isn't one of the
 * caller's own plans is silently dropped, never echoed back.
 */
export async function getCategorySummary(
  userId: string,
  planIds: string[],
  comparePlanIds: string[]
): Promise<CategorySummary> {
  const allIds = [...new Set([...planIds, ...comparePlanIds])];
  if (allIds.length === 0) {
    return { actual: {}, planned: {}, compareActual: {} };
  }

  const plans = await prisma.spendingPlan.findMany({
    where: { id: { in: allIds }, userId },
    include: { lineItems: { where: { section: "fixed_costs" } } },
  });
  const ownedIds = new Set(plans.map((p) => p.id));
  const rangeIds = planIds.filter((id) => ownedIds.has(id));
  const compareIds = comparePlanIds.filter((id) => ownedIds.has(id));

  // Per-plan excluded fixed-cost labels — the same "what-if" exclusion
  // respected everywhere else fixed costs are aggregated.
  const excludedByPlan = new Map<string, Set<string>>();
  for (const plan of plans) {
    excludedByPlan.set(
      plan.id,
      new Set(plan.lineItems.filter((i) => i.excluded).map((i) => i.label))
    );
  }

  const txns = await prisma.transaction.findMany({
    where: {
      import: { spendingPlanId: { in: [...rangeIds, ...compareIds] } },
      spendingCategory: "fixed_costs",
      isDuplicate: false,
      deletedAt: null,
    },
    select: {
      amount: true,
      type: true,
      spendingSubcategory: true,
      import: { select: { spendingPlanId: true } },
    },
  });

  const rangeSet = new Set(rangeIds);
  const compareSet = new Set(compareIds);
  const actual: Record<string, number> = {};
  const compareActual: Record<string, number> = {};
  for (const t of txns) {
    // Credit card payments etc. — same exclusion as every other fixed-cost total.
    if (t.type === "Payment") continue;
    const pid = t.import.spendingPlanId;
    const label = t.spendingSubcategory;
    if (!label) continue;
    if (excludedByPlan.get(pid)?.has(label)) continue;
    const amount = -Number(t.amount);
    if (rangeSet.has(pid)) actual[label] = (actual[label] ?? 0) + amount;
    if (compareSet.has(pid)) compareActual[label] = (compareActual[label] ?? 0) + amount;
  }

  // Budgeted amounts only apply to the primary range, keyed by each plan's own
  // (month, year). A budget target has no "excluded" flag of its own, so it
  // inherits the exclusion of whichever plan shares its month/year.
  const rangePlans = plans.filter((p) => rangeSet.has(p.id));
  const planned: Record<string, number> = {};
  if (rangePlans.length > 0) {
    const planByMonthYear = new Map(rangePlans.map((p) => [`${p.year}-${p.month}`, p]));
    const budgetRows = await prisma.budgetTarget.findMany({
      where: {
        userId,
        OR: rangePlans.map((p) => ({ month: p.month, year: p.year })),
      },
      include: { userCategory: { select: { label: true } } },
    });
    for (const row of budgetRows) {
      const plan = planByMonthYear.get(`${row.year}-${row.month}`);
      if (plan && excludedByPlan.get(plan.id)?.has(row.userCategory.label)) continue;
      planned[row.userCategory.label] = (planned[row.userCategory.label] ?? 0) + Number(row.amount);
    }
  }

  return { actual, planned, compareActual };
}
