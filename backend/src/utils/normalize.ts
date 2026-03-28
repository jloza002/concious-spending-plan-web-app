/**
 * Known payment processor prefixes that precede the real merchant name.
 * e.g. "TST*CASA ESPANA" → processor is TST, merchant is "CASA ESPANA"
 *      "SQ *BLUE BOTTLE" → processor is Square, merchant is "BLUE BOTTLE"
 */
const PROCESSOR_PREFIX_RE = /^(tst|sq|sp|apl|dsh|dd|pmc|aut|squ)\s*\*/i;

/**
 * Normalize a transaction description for category memory matching.
 *
 * Extraction steps applied in order:
 *  1. Strip known payment processor prefixes  e.g. "TST*MERCHANT" → "MERCHANT"
 *  2. Strip *ORDERCODE suffixes               e.g. "AMAZON MKTPL*B10S379D1" → "AMAZON MKTPL"
 *  3. Strip store/location numbers (#NUM)
 *  4. Remove remaining punctuation noise
 *  5. Collapse whitespace
 *
 * Examples:
 *   "WM SUPERCENTER #2591"    -> "wm supercenter"
 *   "AMAZON MKTPL*B10S379D1"  -> "amazon mktpl"
 *   "TST*CASA ESPANA"         -> "casa espana"
 *   "SQ *BLUE BOTTLE COFFEE"  -> "blue bottle coffee"
 *   "COSTCO GAS #0742"        -> "costco gas"
 */
export function normalizeDescription(description: string): string {
  return description
    .toLowerCase()
    .replace(PROCESSOR_PREFIX_RE, "")  // "tst*merchant" → "merchant"
    .replace(/\*\S*/g, "")             // "name*ordercode" → "name"
    .replace(/[#&;]/g, "")             // remove remaining noise characters
    .replace(/\d{4,}/g, "")            // remove store/location numbers (4+ digits)
    .replace(/\s+/g, " ")
    .trim();
}
