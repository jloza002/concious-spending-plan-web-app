import { describe, expect, it } from "vitest";
import { selectRangePlans, selectComparePlans, buildPieSlices, PIE_OTHER_COLOR } from "./dashboard-display";

const plan = (id: string, year: number) => ({ id, year });

describe("selectRangePlans", () => {
  const lockedPlans = [plan("jan25", 2025), plan("dec25", 2025), plan("jan26", 2026), plan("feb26", 2026)];

  it("returns nothing when there is no selected plan", () => {
    expect(selectRangePlans("month", lockedPlans, null)).toEqual([]);
  });

  it("month mode returns only the selected plan", () => {
    expect(selectRangePlans("month", lockedPlans, plan("jan26", 2026))).toEqual([plan("jan26", 2026)]);
  });

  it("year mode returns every locked plan in the selected plan's year", () => {
    expect(selectRangePlans("year", lockedPlans, plan("jan26", 2026))).toEqual([
      plan("jan26", 2026),
      plan("feb26", 2026),
    ]);
  });

  it("all mode returns every locked plan regardless of year", () => {
    expect(selectRangePlans("all", lockedPlans, plan("jan26", 2026))).toEqual(lockedPlans);
  });
});

describe("selectComparePlans", () => {
  const lockedPlans = [plan("jan25", 2025), plan("dec25", 2025), plan("jan26", 2026), plan("feb26", 2026)];

  it("month mode compares against the prior locked plan when one exists", () => {
    expect(selectComparePlans("month", lockedPlans, plan("jan26", 2026), plan("dec25", 2025))).toEqual([
      plan("dec25", 2025),
    ]);
  });

  it("month mode has nothing to compare against when there is no prior locked plan", () => {
    expect(selectComparePlans("month", lockedPlans, plan("jan25", 2025), null)).toEqual([]);
  });

  it("year mode compares against every locked plan in the prior calendar year", () => {
    expect(selectComparePlans("year", lockedPlans, plan("jan26", 2026), plan("dec25", 2025))).toEqual([
      plan("jan25", 2025),
      plan("dec25", 2025),
    ]);
  });

  it("all mode has no natural comparison period", () => {
    expect(selectComparePlans("all", lockedPlans, plan("jan26", 2026), plan("dec25", 2025))).toEqual([]);
  });
});

describe("buildPieSlices", () => {
  it("drops non-positive categories and sorts descending by amount", () => {
    const slices = buildPieSlices({ Rent: 1850, Groceries: 400, Refund: -20, Zero: 0 });
    expect(slices.map((s) => s.label)).toEqual(["Rent", "Groceries"]);
  });

  it("caps at maxSlices real categories and rolls the remainder into one Other slice", () => {
    const byLabel = { A: 100, B: 90, C: 80 };
    const slices = buildPieSlices(byLabel, 2);
    expect(slices).toHaveLength(3);
    expect(slices[2]).toEqual({ label: "Other (1 category)", value: 80, color: PIE_OTHER_COLOR });
  });

  it("pluralizes the Other rollup label for more than one leftover category", () => {
    const byLabel = { A: 100, B: 90, C: 80, D: 70 };
    const slices = buildPieSlices(byLabel, 2);
    expect(slices[2].label).toBe("Other (2 categories)");
    expect(slices[2].value).toBe(150);
  });

  it("omits the Other slice entirely when everything fits under the cap", () => {
    const slices = buildPieSlices({ A: 100, B: 50 }, 8);
    expect(slices.every((s) => !s.label.startsWith("Other"))).toBe(true);
  });

  it("assigns each real slice a distinct color from the palette, cycling if needed", () => {
    const byLabel = Object.fromEntries(Array.from({ length: 12 }, (_, i) => [`Cat ${i}`, 100 - i]));
    const slices = buildPieSlices(byLabel, 8);
    expect(slices).toHaveLength(9); // 8 real + 1 "Other"
    expect(new Set(slices.slice(0, 8).map((s) => s.color)).size).toBe(8);
  });
});
