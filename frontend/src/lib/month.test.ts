import { describe, expect, it } from "vitest";
import { MONTH_NAMES, shiftMonth } from "./month";

describe("shiftMonth", () => {
  it("steps within a year", () => {
    expect(shiftMonth(8, 2026, 1)).toEqual({ month: 9, year: 2026 });
    expect(shiftMonth(8, 2026, -1)).toEqual({ month: 7, year: 2026 });
  });

  it("rolls forward across the year boundary", () => {
    expect(shiftMonth(12, 2026, 1)).toEqual({ month: 1, year: 2027 });
  });

  it("rolls backward across the year boundary", () => {
    expect(shiftMonth(1, 2026, -1)).toEqual({ month: 12, year: 2025 });
  });

  it("handles whole-year steps", () => {
    expect(shiftMonth(1, 2026, -12)).toEqual({ month: 1, year: 2025 });
    expect(shiftMonth(12, 2026, 12)).toEqual({ month: 12, year: 2027 });
  });

  it("handles steps larger than a year", () => {
    expect(shiftMonth(1, 2026, -13)).toEqual({ month: 12, year: 2024 });
    expect(shiftMonth(3, 2026, -14)).toEqual({ month: 1, year: 2025 });
    expect(shiftMonth(6, 2026, 30)).toEqual({ month: 12, year: 2028 });
  });

  it("is a no-op at zero", () => {
    expect(shiftMonth(6, 2026, 0)).toEqual({ month: 6, year: 2026 });
  });

  it("always lands on a real month, walking two years in each direction", () => {
    // A modulo that returns a negative index would silently produce
    // `MONTH_NAMES[-1]` and render "undefined 2025" in the picker.
    for (const step of [-1, 1]) {
      let cursor = { month: 1, year: 2026 };
      for (let i = 0; i < 24; i++) {
        cursor = shiftMonth(cursor.month, cursor.year, step);
        expect(cursor.month).toBeGreaterThanOrEqual(1);
        expect(cursor.month).toBeLessThanOrEqual(12);
        expect(MONTH_NAMES[cursor.month - 1]).toBeTypeOf("string");
      }
    }
  });

  it("returns to the start after twelve steps each way", () => {
    let cursor = { month: 5, year: 2026 };
    for (let i = 0; i < 12; i++) {
      cursor = shiftMonth(cursor.month, cursor.year, 1);
    }
    expect(cursor).toEqual({ month: 5, year: 2027 });
  });
});

describe("MONTH_NAMES", () => {
  it("covers all twelve months", () => {
    expect(MONTH_NAMES).toHaveLength(12);
    expect(MONTH_NAMES[0]).toBe("January");
    expect(MONTH_NAMES[11]).toBe("December");
  });
});
