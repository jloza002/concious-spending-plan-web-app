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
 * Rows for the dashboard's "Spending vs Plan" chart, built directly from
 * pre-aggregated per-label totals (e.g. the backend's category-summary
 * endpoint, which can span several plans for Year/All-time views). Labels are
 * the union of both maps, so a budgeted-but-unspent category still charts
 * (planned, zero) and spending in an unbudgeted category still charts (zero,
 * actual). Rows where both sides are zero are dropped, and the chart shows at
 * most `limit` bars.
 */
export function buildSpendingVsPlanFromTotals(
  actualsByLabel: Record<string, number>,
  plannedByLabel: Record<string, number>,
  limit = 10
): SpendingVsPlanRow[] {
  const allLabels = new Set([...Object.keys(actualsByLabel), ...Object.keys(plannedByLabel)]);

  return [...allLabels]
    .map((label) => ({
      name: truncate(label),
      actual: Math.round(actualsByLabel[label] ?? 0),
      planned: Math.round(plannedByLabel[label] ?? 0),
    }))
    .filter((row) => row.actual > 0 || row.planned > 0)
    .slice(0, limit);
}

/**
 * Single-plan convenience wrapper over {@link buildSpendingVsPlanFromTotals}.
 * A category with its line item excluded (the section's "what-if" toggle) is
 * dropped from both actual and planned — the exclude toggle means "leave this
 * out of everything," not just the section subtotal.
 */
export function buildSpendingVsPlan(
  lineItems: Pick<PlanLineItem, "section" | "label" | "excluded">[],
  transactions: Transaction[],
  budgetTargets: { label: string; amount: number }[],
  limit = 10
): SpendingVsPlanRow[] {
  const excludedLabels = new Set(
    lineItems.filter((i) => i.section === "fixed_costs" && i.excluded).map((i) => i.label)
  );
  const fixedLabels = lineItems
    .filter((i) => i.section === "fixed_costs" && !i.excluded)
    .map((i) => i.label);

  const actualsByLabel: Record<string, number> = {};
  for (const label of fixedLabels) {
    actualsByLabel[label] = transactions
      .filter((t) => countsToward(t, label))
      .reduce((sum, t) => sum + -Number(t.amount), 0);
  }

  const plannedByLabel: Record<string, number> = {};
  for (const target of budgetTargets) {
    if (excludedLabels.has(target.label)) continue;
    plannedByLabel[target.label] = target.amount;
  }

  return buildSpendingVsPlanFromTotals(actualsByLabel, plannedByLabel, limit);
}
