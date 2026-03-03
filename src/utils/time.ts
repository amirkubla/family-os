/**
 * Convert total minutes since midnight to "HH:MM" string.
 * e.g. 480 → "08:00", 810 → "13:30"
 */
export function minutesToHHMM(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Parse "HH:MM" string to total minutes since midnight.
 * e.g. "08:00" → 480, "13:30" → 810
 * Returns NaN if format is invalid.
 */
export function hhmmToMinutes(hhmm: string): number {
  const parts = hhmm.split(":");
  if (parts.length !== 2) return NaN;
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (isNaN(h) || isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) return NaN;
  return h * 60 + m;
}
