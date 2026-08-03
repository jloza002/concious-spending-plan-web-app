import { describe, expect, it } from "vitest";
import type { Transaction } from "@csp/shared";
import { buildSpendingVsPlan, classifyOverUnder } from "./budget-display";

describe("classifyOverUnder", () => {
  it("reports spending past the budget as over", () => {
    expect(classifyOverUnder(650, 712.43)).toEqual({
      kind: "over",
      amount: expect.closeTo(62.43, 2),
    });
  });

  it("reports spending inside the budget as under", () => {
    expect(classifyOverUnder(180, 164.2)).toEqual({
      kind: "under",
      amount: expect.closeTo(15.8, 2),
    });
  });

  it("reports an exact match as even", () => {
    expect(classifyOverUnder(2100, 2100)).toEqual({ kind: "even" });
  });

  it("treats sub-dollar drift as even, since the column is displayed rounded", () => {
    expect(classifyOverUnder(100, 100.4)).toEqual({ kind: "even" });
    expect(classifyOverUnder(100, 99.6)).toEqual({ kind: "even" });
  });

  it("counts a budgeted category with nothing spent as fully under", () => {
    expect(classifyOverUnder(220, 0)).toEqual({ kind: "under", amount: 220 });
  });

  it("calls unbudgeted spending out rather than crediting it as savings", () => {
    // A large green underspend here would present unplanned spending as if the
    // user had come in under budget.
    expect(classifyOverUnder(undefined, 288.1)).toEqual({ kind: "not-budgeted" });
  });

  it("still reports not-budgeted when nothing was spent either", () => {
    expect(classifyOverUnder(undefined, 0)).toEqual({ kind: "not-budgeted" });
  });
});

const tx = (overrides: Partial<Transaction>): Transaction => ({
  id: crypto.randomUUID(),
  importId: "imp",
  transactionDate: "2026-08-05",
  postDate: "2026-08-06",
  description: "TEST",
  originalCategory: null,
  type: "Sale",
  amount: -100,
  memo: null,
  spendingCategory: "fixed_costs",
  spendingSubcategory: "Rent",
  accountType: null,
  isDuplicate: false,
  isManual: false,
  ...overrides,
});

const item = (label: string, section = "fixed_costs") =>
  ({ section, label }) as { section: "fixed_costs"; label: string };

describe("buildSpendingVsPlan", () => {
  it("pairs a category's budget against its spending", () => {
    const rows = buildSpendingVsPlan(
      [item("Rent")],
      [tx({ spendingSubcategory: "Rent", amount: -712.43 })],
      [{ label: "Rent", amount: 650 }]
    );
    expect(rows).toEqual([{ name: "Rent", actual: 712, planned: 650 }]);
  });

  it("charts a budgeted category that has not been spent yet", () => {
    // The bug this feature fixed: these rows used to vanish entirely.
    const rows = buildSpendingVsPlan([item("Insurance")], [], [
      { label: "Insurance", amount: 220 },
    ]);
    expect(rows).toEqual([{ name: "Insurance", actual: 0, planned: 220 }]);
  });

  it("charts spending in a category that was never budgeted", () => {
    const rows = buildSpendingVsPlan(
      [item("Groceries")],
      [tx({ spendingSubcategory: "Groceries", amount: -288.1 })],
      []
    );
    expect(rows).toEqual([{ name: "Groceries", actual: 288, planned: 0 }]);
  });

  it("includes a budgeted category with no matching line item", () => {
    const rows = buildSpendingVsPlan([], [], [{ label: "Gym", amount: 45 }]);
    expect(rows).toEqual([{ name: "Gym", actual: 0, planned: 45 }]);
  });

  it("drops categories with neither a budget nor spending", () => {
    const rows = buildSpendingVsPlan([item("Unused")], [], []);
    expect(rows).toEqual([]);
  });

  it("sums several transactions in one category", () => {
    const rows = buildSpendingVsPlan(
      [item("Groceries")],
      [
        tx({ spendingSubcategory: "Groceries", amount: -100 }),
        tx({ spendingSubcategory: "Groceries", amount: -50.5 }),
      ],
      [{ label: "Groceries", amount: 200 }]
    );
    expect(rows[0]).toEqual({ name: "Groceries", actual: 151, planned: 200 });
  });

  describe("transactions that must not count", () => {
    it.each([
      ["duplicates", { isDuplicate: true }],
      ["card payments", { type: "Payment" }],
      ["another section", { spendingCategory: "savings" }],
      ["an uncategorized row", { spendingCategory: null }],
    ])("ignores %s", (_label, override) => {
      const rows = buildSpendingVsPlan(
        [item("Rent")],
        [tx({ spendingSubcategory: "Rent", amount: -500, ...override })],
        [{ label: "Rent", amount: 650 }]
      );
      expect(rows[0].actual).toBe(0);
    });
  });

  it("truncates long labels so the axis stays readable", () => {
    const long = "Utilities (gas, water, electric)";
    const rows = buildSpendingVsPlan([item(long)], [], [
      { label: long, amount: 100 },
    ]);
    expect(rows[0].name).toBe("Utilities (g…");
  });

  it("caps the chart at ten bars", () => {
    const targets = Array.from({ length: 15 }, (_, i) => ({
      label: `Category ${i}`,
      amount: 10,
    }));
    expect(buildSpendingVsPlan([], [], targets)).toHaveLength(10);
  });

  it("does not double-count a label present in both sources", () => {
    const rows = buildSpendingVsPlan([item("Rent")], [], [
      { label: "Rent", amount: 650 },
    ]);
    expect(rows).toHaveLength(1);
  });
});
