import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Regression coverage for a bug where addManualTransaction returned the raw
 * Prisma row (Date objects, Decimal amount) while getTransactions/
 * getDeletedTransactions ran it through formatTransaction() first — so a
 * freshly-added transaction rendered its date as a full ISO timestamp
 * ("2026-08-07T00:00:00.000Z") until the next refetch replaced it with the
 * short "2026-08-07" form every other row already had.
 */
const mockPrisma = {
  spendingPlan: { findFirst: vi.fn() },
  transactionImport: { create: vi.fn(), findMany: vi.fn() },
};

vi.mock("../db/client.js", () => ({ prisma: mockPrisma }));

const { addManualTransaction, getTransactions, getDeletedTransactions } = await import("./import.service.js");

const USER = "user-1";
const PLAN = "plan-1";

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.spendingPlan.findFirst.mockResolvedValue({ id: PLAN, userId: USER });
});

function rawRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "tx-1",
    importId: "import-1",
    transactionDate: new Date("2026-08-07T00:00:00.000Z"),
    postDate: new Date("2026-08-07T00:00:00.000Z"),
    description: "Paycheck",
    originalCategory: null,
    type: "Sale",
    amount: 50,
    memo: null,
    spendingCategory: null,
    spendingSubcategory: null,
    accountType: null,
    isDuplicate: false,
    isManual: true,
    ...overrides,
  };
}

describe("addManualTransaction", () => {
  it("formats the returned transaction's dates the same short way getTransactions does", async () => {
    mockPrisma.transactionImport.create.mockResolvedValue({
      transactions: [rawRow()],
    });

    const result = await addManualTransaction(
      PLAN,
      USER,
      { transactionDate: "2026-08-07", description: "Paycheck", type: "Sale", amount: 50 }
    );

    expect(result.transactionDate).toBe("2026-08-07");
    expect(result.postDate).toBe("2026-08-07");
    expect(result.transactionDate).not.toContain("T");
  });

  it("returns amount as a number, not a Decimal-like object", async () => {
    mockPrisma.transactionImport.create.mockResolvedValue({
      transactions: [rawRow({ amount: "50.00" })],
    });

    const result = await addManualTransaction(
      PLAN,
      USER,
      { transactionDate: "2026-08-07", description: "Paycheck", type: "Sale", amount: 50 }
    );

    expect(result.amount).toBe(50);
    expect(typeof result.amount).toBe("number");
  });
});

describe("getTransactions / getDeletedTransactions still format dates the same way", () => {
  it("getTransactions", async () => {
    mockPrisma.transactionImport.findMany.mockResolvedValue([
      { transactions: [rawRow()] },
    ]);

    const [result] = await getTransactions(PLAN, USER);

    expect(result.transactionDate).toBe("2026-08-07");
  });

  it("getDeletedTransactions", async () => {
    mockPrisma.transactionImport.findMany.mockResolvedValue([
      { transactions: [rawRow({ deletedAt: new Date("2026-08-08T12:00:00.000Z") })] },
    ]);

    const [result] = await getDeletedTransactions(PLAN, USER);

    expect(result.transactionDate).toBe("2026-08-07");
    expect(result.deletedAt).toBe("2026-08-08T12:00:00.000Z");
  });
});
