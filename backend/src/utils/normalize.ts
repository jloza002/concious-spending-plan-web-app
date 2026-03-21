/**
 * Normalize a transaction description for category memory matching.
 * Strips store numbers, special characters, and normalizes whitespace.
 *
 * Examples:
 *   "WM SUPERCENTER #2591"    -> "wm supercenter"
 *   "AMAZON MKTPL*B10S379D1"  -> "amazon mktpl"
 *   "COSTCO GAS #0742"        -> "costco gas"
 */
export function normalizeDescription(description: string): string {
  return description
    .toLowerCase()
    .replace(/[#*&;]/g, "") // Remove special characters
    .replace(/\d{4,}/g, "") // Remove long numbers (store IDs, order numbers)
    .replace(/\s+/g, " ") // Collapse whitespace
    .trim();
}
