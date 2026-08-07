import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Prisma is mocked so this covers autoCategorize's own matching decision —
 * exact-match pre-index taking priority over the fuzzy scan, and the fuzzy
 * scan still working as a fallback. A real database round-trip lives
 * alongside the rest of the import flow in the integration suite.
 */
const mockPrisma = {
  categoryMapping: {
    findMany: vi.fn(),
  },
};

vi.mock("../db/client.js", () => ({ prisma: mockPrisma }));

const { autoCategorize } = await import("./import.service.js");

const USER = "user-1";

function mapping(
  descriptionNormalized: string,
  spendingCategory = "fixed_costs",
  spendingSubcategory = "Groceries",
  timesUsed = 1
) {
  return { descriptionNormalized, spendingCategory, spendingSubcategory, timesUsed };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("autoCategorize", () => {
  it("resolves an exact normalized match via the pre-index, not the fuzzy scan", async () => {
    mockPrisma.categoryMapping.findMany.mockResolvedValue([
      mapping("whole foods market", "fixed_costs", "Groceries"),
    ]);

    const result = await autoCategorize(USER, ["WHOLE FOODS MARKET #2591"]);

    expect(result.get("WHOLE FOODS MARKET #2591")).toEqual({
      spendingCategory: "fixed_costs",
      spendingSubcategory: "Groceries",
      timesUsed: 1,
    });
  });

  it("falls back to fuzzy substring matching when there is no exact hit", async () => {
    mockPrisma.categoryMapping.findMany.mockResolvedValue([
      mapping("netflix", "fixed_costs", "Subscriptions"),
    ]);

    // "NETFLIX.COM" normalizes to "netflix.com" — not an exact match for
    // "netflix", but the keyword is contained in it (substring containment).
    const result = await autoCategorize(USER, ["NETFLIX.COM"]);

    expect(result.get("NETFLIX.COM")).toEqual({
      spendingCategory: "fixed_costs",
      spendingSubcategory: "Subscriptions",
      timesUsed: 1,
    });
  });

  it("resolves each description independently against the same mapping set", async () => {
    mockPrisma.categoryMapping.findMany.mockResolvedValue([
      mapping("kroger", "fixed_costs", "Groceries"),
      mapping("spotify usa", "fixed_costs", "Subscriptions"),
    ]);

    const result = await autoCategorize(USER, ["KROGER", "SPOTIFY USA", "KROGER"]);

    expect(result.get("KROGER")).toMatchObject({ spendingSubcategory: "Groceries" });
    expect(result.get("SPOTIFY USA")).toMatchObject({ spendingSubcategory: "Subscriptions" });
    expect(result.size).toBe(2);
  });

  it("leaves a description unmatched when nothing clears the fuzzy threshold", async () => {
    mockPrisma.categoryMapping.findMany.mockResolvedValue([
      mapping("kroger", "fixed_costs", "Groceries"),
    ]);

    const result = await autoCategorize(USER, ["A COMPLETELY UNRELATED MERCHANT XYZ"]);

    expect(result.has("A COMPLETELY UNRELATED MERCHANT XYZ")).toBe(false);
  });

  it("fetches the user's mapping library once regardless of how many descriptions are checked", async () => {
    mockPrisma.categoryMapping.findMany.mockResolvedValue([mapping("kroger")]);

    await autoCategorize(USER, ["KROGER", "KROGER #1", "KROGER #2", "SOMETHING ELSE"]);

    expect(mockPrisma.categoryMapping.findMany).toHaveBeenCalledTimes(1);
    expect(mockPrisma.categoryMapping.findMany).toHaveBeenCalledWith({ where: { userId: USER } });
  });
});
