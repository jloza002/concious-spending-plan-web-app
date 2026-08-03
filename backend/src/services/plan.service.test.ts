import { describe, expect, it, vi } from "vitest";
import { MISCELLANEOUS_RATE } from "@csp/shared";

// The module opens a Prisma client at import time; the function under test is
// pure and never touches it.
vi.mock("../db/client.js", () => ({ prisma: {} }));

const { computePlanTotals } = await import("./plan.service.js");

/** A plan with nothing filled in; each test overrides only what it exercises. */
const base = {
  netMonthlyIncome: 0,
  assets: 0,
  investmentsNw: 0,
  savingsNw: 0,
  debt: 0,
  includeMiscellaneous: false,
  fixedCostsSubtotal: 0,
  investmentsTotal: 0,
  savingsTotal: 0,
};

describe("computePlanTotals", () => {
  describe("miscellaneous (never stored, always computed)", () => {
    it("adds 15% on top of the fixed-cost subtotal when enabled", () => {
      const { fixedCostsTotal } = computePlanTotals({
        ...base,
        fixedCostsSubtotal: 1000,
        includeMiscellaneous: true,
      });
      expect(fixedCostsTotal).toBeCloseTo(1150, 2);
    });

    it("leaves the subtotal alone when disabled", () => {
      const { fixedCostsTotal } = computePlanTotals({
        ...base,
        fixedCostsSubtotal: 1000,
        includeMiscellaneous: false,
      });
      expect(fixedCostsTotal).toBe(1000);
    });

    it("uses the shared rate constant rather than a hardcoded 0.15", () => {
      const { fixedCostsTotal } = computePlanTotals({
        ...base,
        fixedCostsSubtotal: 200,
        includeMiscellaneous: true,
      });
      expect(fixedCostsTotal).toBeCloseTo(200 * (1 + MISCELLANEOUS_RATE), 6);
    });

    it("adds nothing when there are no fixed costs to uplift", () => {
      const { fixedCostsTotal } = computePlanTotals({
        ...base,
        includeMiscellaneous: true,
      });
      expect(fixedCostsTotal).toBe(0);
    });
  });

  describe("guilt-free spending", () => {
    it("is what remains after fixed costs, investments and savings", () => {
      const { guiltFreeTotal } = computePlanTotals({
        ...base,
        netMonthlyIncome: 6000,
        fixedCostsSubtotal: 3000,
        investmentsTotal: 600,
        savingsTotal: 400,
      });
      expect(guiltFreeTotal).toBe(2000);
    });

    it("accounts for the miscellaneous uplift", () => {
      const { guiltFreeTotal } = computePlanTotals({
        ...base,
        netMonthlyIncome: 6000,
        fixedCostsSubtotal: 3000,
        includeMiscellaneous: true,
        investmentsTotal: 600,
        savingsTotal: 400,
      });
      // 6000 - 3450 - 600 - 400
      expect(guiltFreeTotal).toBeCloseTo(1550, 2);
    });

    it("goes negative when the plan overspends, rather than clamping to zero", () => {
      // Overspending is a real state the plan has to show.
      const { guiltFreeTotal, guiltFreePercentage } = computePlanTotals({
        ...base,
        netMonthlyIncome: 4000,
        fixedCostsSubtotal: 3500,
        investmentsTotal: 500,
        savingsTotal: 500,
      });
      expect(guiltFreeTotal).toBe(-500);
      expect(guiltFreePercentage).toBeLessThan(0);
    });

    it("equals net income when nothing is allocated", () => {
      const { guiltFreeTotal } = computePlanTotals({
        ...base,
        netMonthlyIncome: 5000,
      });
      expect(guiltFreeTotal).toBe(5000);
    });
  });

  describe("percentages", () => {
    it("are expressed as fractions of net income", () => {
      const totals = computePlanTotals({
        ...base,
        netMonthlyIncome: 10_000,
        fixedCostsSubtotal: 5000,
        investmentsTotal: 1000,
        savingsTotal: 500,
      });
      expect(totals.fixedCostsPercentage).toBeCloseTo(0.5, 6);
      expect(totals.investmentsPercentage).toBeCloseTo(0.1, 6);
      expect(totals.savingsPercentage).toBeCloseTo(0.05, 6);
      expect(totals.guiltFreePercentage).toBeCloseTo(0.35, 6);
    });

    it("sum to 1 across the four sections", () => {
      const t = computePlanTotals({
        ...base,
        netMonthlyIncome: 8000,
        fixedCostsSubtotal: 4000,
        includeMiscellaneous: true,
        investmentsTotal: 800,
        savingsTotal: 600,
      });
      const sum =
        t.fixedCostsPercentage +
        t.investmentsPercentage +
        t.savingsPercentage +
        t.guiltFreePercentage;
      expect(sum).toBeCloseTo(1, 10);
    });

    it("report zero instead of NaN when income has not been entered", () => {
      // Dividing by a zero income would otherwise render "NaN%" on a new plan.
      const totals = computePlanTotals({
        ...base,
        netMonthlyIncome: 0,
        fixedCostsSubtotal: 1200,
      });
      expect(totals.fixedCostsPercentage).toBe(0);
      expect(totals.guiltFreePercentage).toBe(0);
      expect(Number.isNaN(totals.fixedCostsPercentage)).toBe(false);
    });
  });

  describe("net worth", () => {
    it("counts assets and holdings up, and debt down", () => {
      const { totalNetWorth } = computePlanTotals({
        ...base,
        assets: 10_000,
        investmentsNw: 25_000,
        savingsNw: 5_000,
        debt: 12_000,
      });
      expect(totalNetWorth).toBe(28_000);
    });

    it("can be negative when debt exceeds everything else", () => {
      const { totalNetWorth } = computePlanTotals({ ...base, debt: 5000 });
      expect(totalNetWorth).toBe(-5000);
    });
  });
});
