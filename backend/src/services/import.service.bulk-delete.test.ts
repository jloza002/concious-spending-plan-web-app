import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Prisma is mocked so this covers the service's own decision: every id must
 * resolve to a transaction owned by the requesting user before anything is
 * deleted. A real database round-trip lives alongside the rest of the import
 * flow in the integration suite.
 */
const mockPrisma = {
  transaction: {
    findMany: vi.fn(),
    updateMany: vi.fn(),
  },
};

vi.mock("../db/client.js", () => ({ prisma: mockPrisma }));

const { bulkDeleteTransactions } = await import("./import.service.js");

const USER = "user-1";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("bulkDeleteTransactions", () => {
  it("soft-deletes every id once ownership of all of them is confirmed", async () => {
    const ids = ["tx-1", "tx-2", "tx-3"];
    mockPrisma.transaction.findMany.mockResolvedValue(ids.map((id) => ({ id })));

    await bulkDeleteTransactions(ids, USER);

    expect(mockPrisma.transaction.findMany).toHaveBeenCalledWith({
      where: { id: { in: ids }, import: { spendingPlan: { userId: USER } } },
      select: { id: true },
    });
    expect(mockPrisma.transaction.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ids } },
      data: { deletedAt: expect.any(Date) },
    });
  });

  it("rejects the whole request if any id doesn't belong to this user", async () => {
    const ids = ["tx-1", "tx-2", "someone-elses-tx"];
    // Only two of the three resolved under this user's ownership filter.
    mockPrisma.transaction.findMany.mockResolvedValue([{ id: "tx-1" }, { id: "tx-2" }]);

    await expect(bulkDeleteTransactions(ids, USER)).rejects.toThrow(
      "One or more transactions were not found"
    );
    expect(mockPrisma.transaction.updateMany).not.toHaveBeenCalled();
  });

  it("rejects the whole request if an id doesn't exist at all", async () => {
    const ids = ["tx-1", "does-not-exist"];
    mockPrisma.transaction.findMany.mockResolvedValue([{ id: "tx-1" }]);

    await expect(bulkDeleteTransactions(ids, USER)).rejects.toThrow(
      "One or more transactions were not found"
    );
    expect(mockPrisma.transaction.updateMany).not.toHaveBeenCalled();
  });

  it("a repeated id for a real transaction is not mistaken for a mismatch", async () => {
    // The request lists tx-1 twice. Prisma's findMany naturally returns it once
    // (unique by id), so comparing against the raw array length would falsely
    // reject this — the check compares against the de-duplicated count instead.
    const ids = ["tx-1", "tx-1"];
    mockPrisma.transaction.findMany.mockResolvedValue([{ id: "tx-1" }]);

    await bulkDeleteTransactions(ids, USER);

    expect(mockPrisma.transaction.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ids } },
      data: { deletedAt: expect.any(Date) },
    });
  });
});
