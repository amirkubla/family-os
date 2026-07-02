/**
 * recurrence.ts — "does this event occur on date X?", shared by the reminder
 * pipeline, the internal (Telegram) expansion routes, and the push safety net.
 *
 * MIRROR: src/utils/recurrence.ts (frontend) holds an identical implementation
 * for the calendar views. Keep the two in sync.
 *
 * Recurrence model:
 *   - one-time  → occurs on [date … endDate] (inclusive span).
 *   - weekly    → weekday ∈ daysOfWeek AND (weekIndex from anchor) % interval === 0.
 *   - monthly   → anchor day-of-month (clamped for short months) AND
 *                 (monthsFromAnchor) % interval === 0.
 *
 * interval defaults to 1, so a legacy recurring row with no repeatUnit/interval
 * behaves exactly as before: weekly on its daysOfWeek (kid schedule blocks and
 * pre-existing family events keep working unchanged).
 */

export interface RecurrenceLike {
  isRecurring: boolean;
  daysOfWeek?: number[] | null;
  date?: string | null; // anchor "YYYY-MM-DD"
  endDate?: string | null;
  repeatUnit?: "week" | "month" | null;
  repeatInterval?: number | null;
}

function epochDay(ymd: string): number {
  const [y, m, d] = ymd.split("-").map(Number);
  return Math.floor(Date.UTC(y!, m! - 1, d!) / 86_400_000);
}

function dowOfYMD(ymd: string): number {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, d!)).getUTCDay();
}

function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

function startOfWeekEpoch(ymd: string): number {
  return epochDay(ymd) - dowOfYMD(ymd);
}

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
    if (d !== Math.min(ad!, daysInMonth(y!, m!))) return false;
    const monthsDiff = (y! - ay!) * 12 + (m! - am!);
    return monthsDiff >= 0 && monthsDiff % interval === 0;
  }

  const days = e.daysOfWeek?.length ? e.daysOfWeek : e.date ? [dowOfYMD(e.date)] : [];
  if (!days.includes(dowOfYMD(dateStr))) return false;
  if (interval > 1) {
    if (!e.date || dateStr < e.date) return false;
    const weekIdx = (startOfWeekEpoch(dateStr) - startOfWeekEpoch(e.date)) / 7;
    if (weekIdx < 0 || weekIdx % interval !== 0) return false;
  }
  return true;
}
