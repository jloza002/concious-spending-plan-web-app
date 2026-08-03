export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/**
 * Step a 1-based month/year pair by any number of months, rolling the year
 * over in both directions (December + 1 → January of the next year, and
 * January − 1 → December of the previous one).
 */
export function shiftMonth(
  month: number,
  year: number,
  delta: number
): { month: number; year: number } {
  const zeroBased = month - 1 + delta;
  return {
    month: (((zeroBased % 12) + 12) % 12) + 1,
    year: year + Math.floor(zeroBased / 12),
  };
}
