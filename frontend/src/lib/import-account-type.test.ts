import { describe, expect, it } from "vitest";
import { resolveImportRows, countMissingAccountType } from "./import-account-type";

describe("resolveImportRows", () => {
  const rows = [{ accountType: undefined }, { accountType: "checking" as const }];

  it("leaves rows untouched when the user chose to keep each row's own value", () => {
    expect(resolveImportRows(rows, "from_file")).toEqual(rows);
  });

  it("leaves rows untouched when nothing has been chosen yet", () => {
    expect(resolveImportRows(rows, "")).toEqual(rows);
  });

  it("overrides every row's account type when a specific type is chosen", () => {
    expect(resolveImportRows(rows, "savings")).toEqual([
      { accountType: "savings" },
      { accountType: "savings" },
    ]);
  });
});

describe("countMissingAccountType", () => {
  it("counts rows with no resolvable account type", () => {
    const rows = [{ accountType: undefined }, { accountType: "checking" as const }, { accountType: undefined }];
    expect(countMissingAccountType(rows)).toBe(2);
  });

  it("returns zero when every row already has an account type", () => {
    expect(countMissingAccountType([{ accountType: "credit_card" as const }])).toBe(0);
  });
});
