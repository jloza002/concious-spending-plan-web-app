import { describe, expect, it } from "vitest";
import {
  MAX_BUDGET_CATEGORIES,
  getBudgetTargetsQuerySchema,
  setBudgetTargetsSchema,
} from "./budget-target";

const uuid = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

const targets = (count: number) =>
  Array.from({ length: count }, (_, i) => ({
    userCategoryId: uuid(i),
    amount: 100,
  }));

const parse = (body: unknown) => setBudgetTargetsSchema.safeParse(body);
const month = (targets: unknown) => ({ month: 8, year: 2026, targets });

describe("setBudgetTargetsSchema", () => {
  describe("the ten-category cap", () => {
    it("accepts exactly ten", () => {
      expect(parse(month(targets(MAX_BUDGET_CATEGORIES))).success).toBe(true);
    });

    it("rejects eleven", () => {
      expect(parse(month(targets(MAX_BUDGET_CATEGORIES + 1))).success).toBe(false);
    });

    it("explains the limit rather than failing silently", () => {
      const result = parse(month(targets(11)));
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("10");
      }
    });

    it("accepts an empty list, which is how a month gets cleared", () => {
      expect(parse(month([])).success).toBe(true);
    });
  });

  describe("duplicate categories", () => {
    it("rejects the same category twice", () => {
      const result = parse(
        month([
          { userCategoryId: uuid(1), amount: 10 },
          { userCategoryId: uuid(1), amount: 20 },
        ])
      );
      expect(result.success).toBe(false);
    });

    it("allows distinct categories with identical amounts", () => {
      const result = parse(
        month([
          { userCategoryId: uuid(1), amount: 50 },
          { userCategoryId: uuid(2), amount: 50 },
        ])
      );
      expect(result.success).toBe(true);
    });
  });

  describe("amounts", () => {
    it.each([
      ["zero", 0, true],
      ["a normal amount", 1234.56, true],
      ["negative", -1, false],
      ["beyond the DECIMAL(12,2) column", 100_000_000, false],
    ])("%s -> %s", (_label, amount, expected) => {
      expect(parse(month([{ userCategoryId: uuid(1), amount }])).success).toBe(
        expected
      );
    });
  });

  describe("month and year", () => {
    it.each([
      [1, true],
      [12, true],
      [0, false],
      [13, false],
    ])("month %i -> %s", (m, expected) => {
      expect(
        setBudgetTargetsSchema.safeParse({ month: m, year: 2026, targets: [] })
          .success
      ).toBe(expected);
    });

    it("rejects a fractional month", () => {
      expect(
        setBudgetTargetsSchema.safeParse({ month: 8.5, year: 2026, targets: [] })
          .success
      ).toBe(false);
    });
  });

  it("rejects a category id that is not a uuid", () => {
    expect(
      parse(month([{ userCategoryId: "not-a-uuid", amount: 10 }])).success
    ).toBe(false);
  });
});

describe("getBudgetTargetsQuerySchema", () => {
  it("coerces query strings, which arrive from the URL as text", () => {
    const result = getBudgetTargetsQuerySchema.safeParse({
      month: "8",
      year: "2026",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ month: 8, year: 2026 });
    }
  });

  it("still rejects an out-of-range month after coercion", () => {
    expect(
      getBudgetTargetsQuerySchema.safeParse({ month: "13", year: "2026" }).success
    ).toBe(false);
  });

  it("rejects non-numeric input", () => {
    expect(
      getBudgetTargetsQuerySchema.safeParse({ month: "august", year: "2026" })
        .success
    ).toBe(false);
  });
});
