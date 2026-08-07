export type ImportAccountChoice = "" | "from_file" | "credit_card" | "checking" | "savings";

/**
 * Apply the chosen account type to every row about to be imported. "" (no
 * choice yet) and "from_file" both mean "leave each row's own value alone" —
 * "" only reaches here in tests, since the UI blocks Import until a real
 * choice is made.
 */
export function resolveImportRows<T extends { accountType?: string }>(
  rows: T[],
  choice: ImportAccountChoice
): T[] {
  if (choice === "" || choice === "from_file") return rows;
  return rows.map((r) => ({ ...r, accountType: choice }));
}

/** How many rows would import without a resolvable account type if "from file" is kept. */
export function countMissingAccountType<T extends { accountType?: string }>(rows: T[]): number {
  return rows.filter((r) => !r.accountType).length;
}
