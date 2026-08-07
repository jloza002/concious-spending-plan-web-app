import { describe, expect, it, vi } from "vitest";

// The module opens a Prisma client at import time; sumIncome itself is pure
// and never touches it — mirrors the pattern in plan.service.test.ts.
vi.mock("../db/client.js", () => ({ prisma: {} }));

const { sumIncome, resolveEffectiveNetIncome } = await import("./net-income.service.js");

describe("sumIncome", () => {
  it("reports zero count for a plan with no income transactions — the fallback signal", () => {
    const { count, total } = sumIncome(
      [
        { spendingCategory: "fixed_costs", spendingSubcategory: "Rent", amount: -1800 },
        { spendingCategory: null, spendingSubcategory: null, amount: -50 },
      ],
      new Set()
    );
    expect(count).toBe(0);
    expect(total).toBe(0);
  });

  it("sums income amounts as-is, without negating them", () => {
    const { count, total } = sumIncome(
      [
        { spendingCategory: "income", spendingSubcategory: "Paycheck / Salary", amount: 3000 },
        { spendingCategory: "income", spendingSubcategory: "Side Income", amount: 500 },
      ],
      new Set()
    );
    expect(count).toBe(2);
    expect(total).toBe(3500);
  });

  it("ignores non-income rows entirely — not counted, not summed", () => {
    const { count, total } = sumIncome(
      [
        { spendingCategory: "income", spendingSubcategory: "Paycheck / Salary", amount: 3000 },
        { spendingCategory: "fixed_costs", spendingSubcategory: "Groceries", amount: -400 },
        { spendingCategory: "investments", spendingSubcategory: "Stocks", amount: -200 },
      ],
      new Set()
    );
    expect(count).toBe(1);
    expect(total).toBe(3000);
  });

  it("a non-positive income row still counts toward the fallback signal but not the total", () => {
    // e.g. a sign-convention re-import flip left a stray non-positive income row.
    const { count, total } = sumIncome(
      [{ spendingCategory: "income", spendingSubcategory: "Paycheck / Salary", amount: -50 }],
      new Set()
    );
    expect(count).toBe(1);
    expect(total).toBe(0);
  });

  it("drops an excluded category from the total but keeps it in the count", () => {
    const { count, total } = sumIncome(
      [
        { spendingCategory: "income", spendingSubcategory: "Paycheck / Salary", amount: 3000 },
        { spendingCategory: "income", spendingSubcategory: "Side Income", amount: 500 },
      ],
      new Set(["Side Income"])
    );
    expect(count).toBe(2);
    expect(total).toBe(3000);
  });

  it("all categories excluded still reports a nonzero count with a zero total", () => {
    // Distinguishes "has income transactions but they're all excluded" (write 0)
    // from "has none at all" (leave the manual value alone).
    const { count, total } = sumIncome(
      [{ spendingCategory: "income", spendingSubcategory: "Paycheck / Salary", amount: 3000 }],
      new Set(["Paycheck / Salary"])
    );
    expect(count).toBe(1);
    expect(total).toBe(0);
  });

  it("an income row with no subcategory yet still counts toward the total", () => {
    const { count, total } = sumIncome(
      [{ spendingCategory: "income", spendingSubcategory: null, amount: 200 }],
      new Set(["Paycheck / Salary"])
    );
    expect(count).toBe(1);
    expect(total).toBe(200);
  });
});

describe("resolveEffectiveNetIncome", () => {
  // Regression coverage for a real bug caught in live Test-environment
  // verification: recomputeNetIncome used to leave netMonthlyIncome
  // untouched when the count dropped to zero, which meant untagging the
  // last income transaction did NOT restore the original manually-typed
  // figure — it left the stale auto-computed total sitting there forever.

  it("uses the computed total once any income transaction exists", () => {
    expect(resolveEffectiveNetIncome(2, 3500, 7075)).toBe(3500);
  });

  it("actively reverts to the manual value once the count drops to zero — not a no-op", () => {
    // The scenario that broke: manual was 7075, tagging one deposit computed
    // 100, then untagging it must produce 7075 again, not 100.
    expect(resolveEffectiveNetIncome(0, 100, 7075)).toBe(7075);
  });

  it("a zero manual baseline is still a valid revert target", () => {
    expect(resolveEffectiveNetIncome(0, 500, 0)).toBe(0);
  });
});
