import { describe, expect, it } from "vitest";
import { bulkDeleteTransactionsSchema } from "./transaction";

const uuid = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

describe("bulkDeleteTransactionsSchema", () => {
  it("accepts a normal list of ids", () => {
    const result = bulkDeleteTransactionsSchema.safeParse({
      transactionIds: [uuid(1), uuid(2), uuid(3)],
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty list — there is nothing to delete", () => {
    const result = bulkDeleteTransactionsSchema.safeParse({ transactionIds: [] });
    expect(result.success).toBe(false);
  });

  it("accepts exactly MAX_ROWS worth of ids, matching what a single CSV import can produce", () => {
    const ids = Array.from({ length: 10_000 }, (_, i) => uuid(i));
    const result = bulkDeleteTransactionsSchema.safeParse({ transactionIds: ids });
    expect(result.success).toBe(true);
  });

  it("rejects one past the cap", () => {
    const ids = Array.from({ length: 10_001 }, (_, i) => uuid(i));
    const result = bulkDeleteTransactionsSchema.safeParse({ transactionIds: ids });
    expect(result.success).toBe(false);
  });

  it("rejects a non-uuid id", () => {
    const result = bulkDeleteTransactionsSchema.safeParse({
      transactionIds: ["not-a-uuid"],
    });
    expect(result.success).toBe(false);
  });

  it("rejects a missing transactionIds field", () => {
    const result = bulkDeleteTransactionsSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
