/**
 * Picks a label guaranteed not to collide with any existing one — "New Item",
 * then "New Item 2", "New Item 3", and so on.
 *
 * "Add your own" always started a fresh row with the literal text "New Item".
 * The backend treats adding a category as a no-op once one with that exact
 * label already exists for the user's account (correct for the Transactions
 * page's "type a name to add it" flow, where re-adding an existing name
 * should just reuse it) — but here it meant every click after the first
 * silently did nothing, because "New Item" was never renamed at the library
 * level even after the user renamed their copy of the row on this plan.
 */
export function nextAvailableLabel(
  existingLabels: Iterable<string>,
  base = "New Item"
): string {
  const taken = new Set(existingLabels);
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base} ${n}`)) n++;
  return `${base} ${n}`;
}
