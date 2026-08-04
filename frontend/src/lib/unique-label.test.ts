import { describe, expect, it } from "vitest";
import { nextAvailableLabel } from "./unique-label";

describe("nextAvailableLabel", () => {
  it("returns the base label when nothing collides", () => {
    expect(nextAvailableLabel([])).toBe("New Item");
    expect(nextAvailableLabel(["Rent", "Stocks"])).toBe("New Item");
  });

  it("appends 2 the first time the base label is already taken", () => {
    expect(nextAvailableLabel(["New Item"])).toBe("New Item 2");
  });

  it("keeps counting up past several taken slots", () => {
    expect(nextAvailableLabel(["New Item", "New Item 2", "New Item 3"])).toBe(
      "New Item 4"
    );
  });

  it("fills a gap left by a renamed or deleted middle entry", () => {
    // "New Item 2" was renamed away or removed — 2 is free again.
    expect(nextAvailableLabel(["New Item", "New Item 3"])).toBe("New Item 2");
  });

  it("supports a custom base label", () => {
    expect(nextAvailableLabel(["Untitled"], "Untitled")).toBe("Untitled 2");
  });

  it("is the actual fix for the reported bug: two clicks in a row never collide", () => {
    // Simulates the real flow: each click's result feeds into the next.
    const library = new Set<string>();
    const first = nextAvailableLabel(library);
    library.add(first);
    const second = nextAvailableLabel(library);
    expect(first).not.toBe(second);
    expect(second).toBe("New Item 2");
  });
});
