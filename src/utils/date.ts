/**
 * Format a Date to "YYYY-MM-DD".
 */
export function toYMD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Get day of week (0=Sun … 6=Sat) from a "YYYY-MM-DD" string.
 */
export function dayOfWeekFromYMD(ymd: string): number {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d).getDay();
}
