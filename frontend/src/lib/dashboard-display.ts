export type Period = "month" | "year" | "all";

interface PeriodPlan {
  id: string;
  year: number;
}

/**
 * Which locked plans feed the dashboard's period-detail cards (Spending vs
 * Plan, Top Movers, pie chart) for the given period. Pulled out as a pure
 * function so the Month/Year/All-time selection logic is unit-testable
 * without mounting the dashboard page.
 */
export function selectRangePlans<T extends PeriodPlan>(
  period: Period,
  lockedPlans: T[],
  selected: T | null
): T[] {
  if (!selected) return [];
  if (period === "all") return lockedPlans;
  if (period === "year") return lockedPlans.filter((p) => p.year === selected.year);
  return [selected];
}

/**
 * The comparison set for Top Movers deltas. Month compares against the prior
 * locked month (array-adjacent, not necessarily calendar-adjacent — matches
 * the existing KPI delta semantics); Year compares against the prior
 * calendar year's locked plans; All-time has no natural "prior" period.
 */
export function selectComparePlans<T extends PeriodPlan>(
  period: Period,
  lockedPlans: T[],
  selected: T | null,
  previous: T | null
): T[] {
  if (period === "all") return [];
  if (period === "year") return selected ? lockedPlans.filter((p) => p.year === selected.year - 1) : [];
  return previous ? [previous] : [];
}

export interface PieSlice {
  label: string;
  value: number;
  color: string;
}

/** ~10 distinct hues extending the app's existing chart colors; cycles if there are more than 10 real slices. */
export const PIE_COLORS = [
  "#15302F", // dark teal
  "#FB4D30", // orange
  "#0EA5E9", // sky
  "#22C55E", // green
  "#A855F7", // purple
  "#F59E0B", // amber
  "#EC4899", // pink
  "#6366F1", // indigo
  "#14B8A6", // teal-light
  "#84CC16", // lime
];

/** Reserved for the "Other" rollup slice only — too pale for a real category slice's contrast. */
export const PIE_OTHER_COLOR = "#EEE3D2";

/**
 * Turn a label→amount map into pie slices, capped at `maxSlices` real
 * categories with the remainder rolled into one "Other" slice so the chart
 * stays readable regardless of how many fixed-cost categories exist.
 */
export function buildPieSlices(
  actualByLabel: Record<string, number>,
  maxSlices = 8
): PieSlice[] {
  const entries = Object.entries(actualByLabel)
    .filter(([, value]) => value > 0)
    .sort((a, b) => b[1] - a[1]);

  const top = entries.slice(0, maxSlices);
  const rest = entries.slice(maxSlices);

  const slices: PieSlice[] = top.map(([label, value], i) => ({
    label,
    value: Math.round(value),
    color: PIE_COLORS[i % PIE_COLORS.length],
  }));

  if (rest.length > 0) {
    const restTotal = rest.reduce((sum, [, value]) => sum + value, 0);
    slices.push({
      label: `Other (${rest.length} ${rest.length === 1 ? "category" : "categories"})`,
      value: Math.round(restTotal),
      color: PIE_OTHER_COLOR,
    });
  }

  return slices;
}
