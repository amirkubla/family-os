/**
 * recurrence.ts — the single source of truth for "does this event occur on
 * date X?", shared by the calendar selectors and every calendar view.
 *
 * MIRROR: backend/src/lib/recurrence.ts holds an identical implementation for
 * the reminder pipeline. Keep the two in sync.
 *
 * Recurrence model:
 *   - one-time      → occurs on [date … endDate] (inclusive span).
 *   - weekly        → weekday ∈ daysOfWeek AND (weekIndex from anchor) % interval === 0.
 *   - monthly       → anchor day-of-month (clamped for short months) AND
 *                     (monthsFromAnchor) % interval === 0.
 *
 * interval defaults to 1 (every week/month), so a legacy recurring event with
 * no repeatUnit/interval behaves exactly as before: weekly on its daysOfWeek.
 */

export interface RecurrenceLike {
  isRecurring: boolean;
  daysOfWeek?: number[];
  date?: string | null; // anchor "YYYY-MM-DD"
  endDate?: string | null;
  repeatUnit?: "week" | "month" | null;
  repeatInterval?: number | null;
}

/** Whole days since the Unix epoch for a "YYYY-MM-DD" (timezone-independent). */
function epochDay(ymd: string): number {
  const [y, m, d] = ymd.split("-").map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000);
}

/** Calendar weekday (Sun=0..Sat=6) for a "YYYY-MM-DD". */
function dowOfYMD(ymd: string): number {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** Number of days in a given (1-based) month. */
function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** Epoch-day of the Sunday that starts the week containing `ymd`. */
function startOfWeekEpoch(ymd: string): number {
  return epochDay(ymd) - dowOfYMD(ymd);
}

/**
 * Does an event with this recurrence occur on `dateStr` ("YYYY-MM-DD")?
 */
export function eventOccursOn(e: RecurrenceLike, dateStr: string): boolean {
  if (!e.isRecurring) {
    if (!e.date) return false;
    return dateStr >= e.date && dateStr <= (e.endDate || e.date);
  }

  const unit = e.repeatUnit ?? "week";
  const interval = Math.max(1, e.repeatInterval ?? 1);

  if (unit === "month") {
    if (!e.date || dateStr < e.date) return false;
    const [ay, am, ad] = e.date.split("-").map(Number);
    const [y, m, d] = dateStr.split("-").map(Number);
    if (d !== Math.min(ad, daysInMonth(y, m))) return false;
    const monthsDiff = (y - ay) * 12 + (m - am);
    return monthsDiff >= 0 && monthsDiff % interval === 0;
  }

  // weekly
  const days = e.daysOfWeek?.length ? e.daysOfWeek : e.date ? [dowOfYMD(e.date)] : [];
  if (!days.includes(dowOfYMD(dateStr))) return false;
  if (interval > 1) {
    if (!e.date || dateStr < e.date) return false;
    const weekIdx = (startOfWeekEpoch(dateStr) - startOfWeekEpoch(e.date)) / 7;
    if (weekIdx < 0 || weekIdx % interval !== 0) return false;
  }
  return true;
}
