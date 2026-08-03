import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Prisma is mocked so these cover the service's own decisions — ownership
 * checks, the full-month replace, how archived categories are treated — rather
 * than the database. The round-trip against real Postgres lives in
 * budget-target.integration.test.ts.
 */
const mockPrisma = {
  budgetTarget: {
    findMany: vi.fn(),
    deleteMany: vi.fn(),
    createMany: vi.fn(),
  },
  userCategory: {
    findMany: vi.fn(),
  },
  $transaction: vi.fn(),
};

vi.mock("../db/client.js", () => ({ prisma: mockPrisma }));

const { getBudgetTargets, setBudgetTargets } = await import(
  "./budget-target.service.js"
);

const USER = "user-1";
const OTHER_USER = "user-2";

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.$transaction.mockResolvedValue([]);
  mockPrisma.budgetTarget.findMany.mockResolvedValue([]);
});

describe("getBudgetTargets", () => {
  it("scopes the query to the requesting user and month", async () => {
    await getBudgetTargets(USER, 8, 2026);

    expect(mockPrisma.budgetTarget.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: USER, month: 8, year: 2026 },
      })
    );
  });

  it("flattens the category label onto each row", async () => {
    mockPrisma.budgetTarget.findMany.mockResolvedValue([
      {
        id: "bt-1",
        userCategoryId: "cat-1",
        month: 8,
        year: 2026,
        amount: "650.00",
        userCategory: { label: "Groceries", sortOrder: 1 },
      },
    ]);

    const rows = await getBudgetTargets(USER, 8, 2026);

    expect(rows).toEqual([
      {
        id: "bt-1",
        userCategoryId: "cat-1",
        label: "Groceries",
        month: 8,
        year: 2026,
        amount: 650,
      },
    ]);
  });

  it("converts Prisma's Decimal to a number for the client", async () => {
    mockPrisma.budgetTarget.findMany.mockResolvedValue([
      {
        id: "bt-1",
        userCategoryId: "cat-1",
        month: 8,
        year: 2026,
        amount: "1234.56",
        userCategory: { label: "Rent", sortOrder: 1 },
      },
    ]);

    const [row] = await getBudgetTargets(USER, 8, 2026);
    expect(row.amount).toBeTypeOf("number");
    expect(row.amount).toBeCloseTo(1234.56, 2);
  });

  it("does not filter archived categories out of history", async () => {
    // Requirement: a month already budgeted for a category keeps rendering it
    // after the category leaves the library, so the join must stay unfiltered.
    await getBudgetTargets(USER, 3, 2026);

    const call = mockPrisma.budgetTarget.findMany.mock.calls[0][0];
    expect(JSON.stringify(call.include)).not.toContain("deletedAt");
  });
});

describe("setBudgetTargets", () => {
  const validCategories = (ids: string[]) =>
    mockPrisma.userCategory.findMany.mockResolvedValue(
      ids.map((id) => ({ id }))
    );

  it("rejects a category belonging to someone else", async () => {
    // The lookup is filtered by userId, so another account's id returns nothing.
    validCategories([]);

    await expect(
      setBudgetTargets(USER, 8, 2026, [
        { userCategoryId: "someone-elses-category", amount: 100 },
      ])
    ).rejects.toThrow(/not valid fixed-cost categories/i);

    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it("looks categories up scoped to the user and the fixed_costs section", async () => {
    validCategories(["cat-1"]);

    await setBudgetTargets(USER, 8, 2026, [
      { userCategoryId: "cat-1", amount: 100 },
    ]);

    expect(mockPrisma.userCategory.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: USER,
          section: "fixed_costs",
        }),
      })
    );
  });

  it("rejects the batch when only some categories are valid", async () => {
    validCategories(["cat-1"]);

    await expect(
      setBudgetTargets(USER, 8, 2026, [
        { userCategoryId: "cat-1", amount: 100 },
        { userCategoryId: "cat-missing", amount: 50 },
      ])
    ).rejects.toThrow();

    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it("still accepts an archived category already in this month's budget", async () => {
    // Editing one amount must not fail — and so silently wipe the month —
    // just because another row points at a since-archived category.
    validCategories(["cat-archived"]);

    await expect(
      setBudgetTargets(USER, 3, 2026, [
        { userCategoryId: "cat-archived", amount: 45 },
      ])
    ).resolves.toBeDefined();

    const where = mockPrisma.userCategory.findMany.mock.calls[0][0].where;
    expect(where).not.toHaveProperty("deletedAt");
  });

  it("replaces the month atomically: delete then insert in one transaction", async () => {
    validCategories(["cat-1", "cat-2"]);

    await setBudgetTargets(USER, 8, 2026, [
      { userCategoryId: "cat-1", amount: 100 },
      { userCategoryId: "cat-2", amount: 200 },
    ]);

    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
    expect(mockPrisma.budgetTarget.deleteMany).toHaveBeenCalledWith({
      where: { userId: USER, month: 8, year: 2026 },
    });
    expect(mockPrisma.budgetTarget.createMany).toHaveBeenCalledWith({
      data: [
        { userId: USER, userCategoryId: "cat-1", month: 8, year: 2026, amount: 100 },
        { userId: USER, userCategoryId: "cat-2", month: 8, year: 2026, amount: 200 },
      ],
    });
  });

  it("scopes the delete to one month so other months survive", async () => {
    validCategories(["cat-1"]);

    await setBudgetTargets(USER, 8, 2026, [
      { userCategoryId: "cat-1", amount: 100 },
    ]);

    const where = mockPrisma.budgetTarget.deleteMany.mock.calls[0][0].where;
    expect(where).toEqual({ userId: USER, month: 8, year: 2026 });
    expect(where.userId).toBe(USER);
    expect(where.userId).not.toBe(OTHER_USER);
  });

  it("clears a month when given an empty list, without a category lookup", async () => {
    await setBudgetTargets(USER, 8, 2026, []);

    expect(mockPrisma.userCategory.findMany).not.toHaveBeenCalled();
    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
    expect(mockPrisma.budgetTarget.createMany).toHaveBeenCalledWith({ data: [] });
  });

  it("returns the month as stored rather than echoing the request", async () => {
    validCategories(["cat-1"]);
    mockPrisma.budgetTarget.findMany.mockResolvedValue([
      {
        id: "bt-1",
        userCategoryId: "cat-1",
        month: 8,
        year: 2026,
        amount: "100.00",
        userCategory: { label: "Rent", sortOrder: 1 },
      },
    ]);

    const result = await setBudgetTargets(USER, 8, 2026, [
      { userCategoryId: "cat-1", amount: 100 },
    ]);

    expect(result).toEqual([
      {
        id: "bt-1",
        userCategoryId: "cat-1",
        label: "Rent",
        month: 8,
        year: 2026,
        amount: 100,
      },
    ]);
  });
});
