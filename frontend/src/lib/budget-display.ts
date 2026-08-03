import type { PlanLineItem, Transaction } from "@csp/shared";

/** How a category's spend compares to its budget for the month. */
export type OverUnder =
  | { kind: "not-budgeted" }
  | { kind: "even" }
  | { kind: "over"; amount: number }
  | { kind: "under"; amount: number };

/**
 * Actual minus planned.
 *
 * Spending in a category with no target is reported as "not budgeted" rather
 * than a large underspend — calling it green would present unplanned spending
 * as if it were savings. Differences under a dollar read as "even" because the
 * amounts are displayed rounded, and a chip contradicting the column beside it
 * looks like a bug.
 */
export function classifyOverUnder(
  planned: number | undefined,
  actual: number
): OverUnder {
  if (planned === undefined) return { kind: "not-budgeted" };
  const diff = actual - planned;
  if (Math.abs(diff) < 0.5) return { kind: "even" };
  if (diff > 0) return { kind: "over", amount: diff };
  return { kind: "under", amount: Math.abs(diff) };
}

export interface SpendingVsPlanRow {
  name: string;
  actual: number;
  planned: number;
}

const truncate = (label: string) =>
  label.length > 14 ? label.slice(0, 12) + "…" : label;

/** A transaction counts toward a category's actual spend for the month. */
function countsToward(t: Transaction, label: string): boolean {
  return (
    !t.isDuplicate &&
    t.type !== "Payment" &&
    t.spendingCategory === "fixed_costs" &&
    t.spendingSubcategory === label
  );
}

/**
 * Rows for the dashboard's "Spending vs Plan" chart.
 *
 * Labels are the union of the plan's fixed-cost line items and the month's
 * budget targets, so a category that was budgeted but never spent still charts
 * (planned, zero) and spending in an unbudgeted category still charts (zero,
 * actual). Rows where both sides are zero are dropped, and the chart shows at
 * most ten bars.
 */
export function buildSpendingVsPlan(
  lineItems: Pick<PlanLineItem, "section" | "label">[],
  transactions: Transaction[],
  budgetTargets: { label: string; amount: number }[],
  limit = 10
): SpendingVsPlanRow[] {
  const plannedByLabel: Record<string, number> = {};
  for (const target of budgetTargets) {
    plannedByLabel[target.label] = target.amount;
  }

  const fixedLabels = lineItems
    .filter((i) => i.section === "fixed_costs")
    .map((i) => i.label);
  const allLabels = new Set([...fixedLabels, ...Object.keys(plannedByLabel)]);

  return [...allLabels]
    .map((label) => {
      const actual = transactions
        .filter((t) => countsToward(t, label))
        .reduce((sum, t) => sum + -Number(t.amount), 0);
      return {
        name: truncate(label),
        actual: Math.round(actual),
        planned: Math.round(plannedByLabel[label] ?? 0),
      };
    })
    .filter((row) => row.actual > 0 || row.planned > 0)
    .slice(0, limit);
}
