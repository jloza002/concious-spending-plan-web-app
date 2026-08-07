import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Prisma is mocked so this covers the service's own decisions: which plan ids
 * survive the ownership filter, and how transactions/budgets get aggregated
 * once they do. The ownership check itself (`where: { ..., userId }`) is the
 * security boundary for this endpoint — a future edit that aggregates off the
 * raw requested ids instead of the ownership-filtered ones would leak another
 * user's plan data, and that's exactly what several tests below guard against.
 */
const mockPrisma = {
  spendingPlan: { findMany: vi.fn() },
  transaction: { findMany: vi.fn() },
  budgetTarget: { findMany: vi.fn() },
};

vi.mock("../db/client.js", () => ({ prisma: mockPrisma }));

const { getCategorySummary } = await import("./dashboard.service.js");

const USER = "user-1";

function plan(id: string, month: number, year: number, lineItems: { label: string; excluded: boolean }[] = []) {
  return { id, month, year, lineItems };
}

function txn(spendingPlanId: string, label: string, amount: number, type = "Sale") {
  return {
    amount,
    type,
    spendingSubcategory: label,
    import: { spendingPlanId },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.budgetTarget.findMany.mockResolvedValue([]);
});

describe("getCategorySummary", () => {
  it("returns an all-empty result without querying anything when no plan ids are given", async () => {
    const result = await getCategorySummary(USER, [], []);

    expect(result).toEqual({ actual: {}, planned: {}, compareActual: {} });
    expect(mockPrisma.spendingPlan.findMany).not.toHaveBeenCalled();
  });

  it("scopes the plan lookup to the requesting user — the security boundary for this endpoint", async () => {
    mockPrisma.spendingPlan.findMany.mockResolvedValue([plan("plan-1", 8, 2026)]);
    mockPrisma.transaction.findMany.mockResolvedValue([]);

    await getCategorySummary(USER, ["plan-1"], []);

    expect(mockPrisma.spendingPlan.findMany).toHaveBeenCalledWith({
      where: { id: { in: ["plan-1"] }, userId: USER },
      include: { lineItems: { where: { section: "fixed_costs" } } },
    });
  });

  it("drops a requested plan id that doesn't belong to this user before aggregating anything", async () => {
    // The caller asks for "someone-elses-plan" too, but the userId-scoped
    // lookup (simulated here) only resolves the plan this user actually owns.
    mockPrisma.spendingPlan.findMany.mockResolvedValue([plan("plan-1", 8, 2026)]);
    mockPrisma.transaction.findMany.mockResolvedValue([]);

    await getCategorySummary(USER, ["plan-1", "someone-elses-plan"], []);

    // The foreign id must never reach the transaction query's filter — if it
    // did, an attacker's plan id could pull in that user's transactions.
    expect(mockPrisma.transaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          import: { spendingPlanId: { in: ["plan-1"] } },
        }),
      })
    );
  });

  it("drops an unowned id from the comparison range the same way", async () => {
    mockPrisma.spendingPlan.findMany.mockResolvedValue([plan("plan-1", 8, 2026)]);
    mockPrisma.transaction.findMany.mockResolvedValue([]);

    await getCategorySummary(USER, [], ["plan-1", "someone-elses-plan"]);

    expect(mockPrisma.transaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          import: { spendingPlanId: { in: ["plan-1"] } },
        }),
      })
    );
  });

  it("sums fixed-cost actuals by label for the range plans, negating the stored (negative) amount", async () => {
    mockPrisma.spendingPlan.findMany.mockResolvedValue([plan("plan-1", 8, 2026)]);
    mockPrisma.transaction.findMany.mockResolvedValue([
      txn("plan-1", "Groceries", -100),
      txn("plan-1", "Groceries", -50),
    ]);

    const result = await getCategorySummary(USER, ["plan-1"], []);

    expect(result.actual).toEqual({ Groceries: 150 });
  });

  it("excludes Payment-type rows from the total, same as every other fixed-cost aggregation", async () => {
    mockPrisma.spendingPlan.findMany.mockResolvedValue([plan("plan-1", 8, 2026)]);
    mockPrisma.transaction.findMany.mockResolvedValue([
      txn("plan-1", "Groceries", -100),
      txn("plan-1", "Credit Card", -500, "Payment"),
    ]);

    const result = await getCategorySummary(USER, ["plan-1"], []);

    expect(result.actual).toEqual({ Groceries: 100 });
  });

  it("keeps a range plan's actual and a compare plan's actual separate", async () => {
    mockPrisma.spendingPlan.findMany.mockResolvedValue([
      plan("plan-range", 8, 2026),
      plan("plan-compare", 7, 2026),
    ]);
    mockPrisma.transaction.findMany.mockResolvedValue([
      txn("plan-range", "Groceries", -100),
      txn("plan-compare", "Groceries", -80),
    ]);

    const result = await getCategorySummary(USER, ["plan-range"], ["plan-compare"]);

    expect(result.actual).toEqual({ Groceries: 100 });
    expect(result.compareActual).toEqual({ Groceries: 80 });
  });

  it("drops an excluded category from the actual total, matching that plan's what-if toggle", async () => {
    mockPrisma.spendingPlan.findMany.mockResolvedValue([
      plan("plan-1", 8, 2026, [{ label: "Subscriptions", excluded: true }]),
    ]);
    mockPrisma.transaction.findMany.mockResolvedValue([
      txn("plan-1", "Groceries", -100),
      txn("plan-1", "Subscriptions", -20),
    ]);

    const result = await getCategorySummary(USER, ["plan-1"], []);

    expect(result.actual).toEqual({ Groceries: 100 });
  });

  it("sums budgeted amounts for range plans, matched by month/year, respecting that plan's exclusions", async () => {
    mockPrisma.spendingPlan.findMany.mockResolvedValue([
      plan("plan-1", 8, 2026, [{ label: "Subscriptions", excluded: true }]),
    ]);
    mockPrisma.transaction.findMany.mockResolvedValue([]);
    mockPrisma.budgetTarget.findMany.mockResolvedValue([
      { month: 8, year: 2026, amount: 200, userCategory: { label: "Groceries" } },
      { month: 8, year: 2026, amount: 15, userCategory: { label: "Subscriptions" } },
    ]);

    const result = await getCategorySummary(USER, ["plan-1"], []);

    expect(result.planned).toEqual({ Groceries: 200 });
  });

  it("never queries budget targets when there are no range plans (compare-only request)", async () => {
    mockPrisma.spendingPlan.findMany.mockResolvedValue([plan("plan-1", 8, 2026)]);
    mockPrisma.transaction.findMany.mockResolvedValue([]);

    await getCategorySummary(USER, [], ["plan-1"]);

    expect(mockPrisma.budgetTarget.findMany).not.toHaveBeenCalled();
  });
});
