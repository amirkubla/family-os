/**
 * Kid-payments logic, server-side.
 *
 * A "kid payment" is an `expenses` row scoped to a kid (categoryName
 * "ילדים וחוגים", kidId set, note = the payment name, paid=false until
 * settled). This module is a faithful port of the frontend helpers in
 * src/models/budget.ts so the Telegram-bot internal routes can answer
 * "what's outstanding" and settle payments with the same template+occurrence
 * semantics the app uses.
 *
 * Recurring model (mirrors budget.ts):
 *   - A recurring payment is a single persistent TEMPLATE
 *     (isRecurring:true, paid:false, date = series anchor) that is never
 *     settled or duplicated.
 *   - Paying a period creates a separate settled OCCURRENCE
 *     (isRecurring:false, paid:true, recurrenceType tagged, date = that period).
 *   - The template's next-due is the earliest scheduled date with no settled
 *     occurrence yet — robust to any order of mark/undo.
 *
 * Dates are computed in Asia/Jerusalem to match the family's local timezone.
 */

import type { Expense } from "../types/models.js";

const JERUSALEM_TZ = "Asia/Jerusalem";
const KID_PAYMENT_CATEGORY = "ילדים וחוגים";

/** "YYYY-MM-DD" for a Date in the family's timezone. */
function toYMD(d: Date): string {
  return d.toLocaleDateString("en-CA", { timeZone: JERUSALEM_TZ });
}

/** Today's wall-clock date in Asia/Jerusalem as {y, m (1-12), d, dow (0=Sun)}. */
function jerusalemToday(): { y: number; m: number; d: number; dow: number } {
  const now = new Date();
  const isoDate = toYMD(now); // YYYY-MM-DD
  const [y, m, d] = isoDate.split("-").map(Number);
  // Local weekday in Jerusalem.
  const weekdayShort = new Intl.DateTimeFormat("en-US", {
    timeZone: JERUSALEM_TZ,
    weekday: "short",
  }).format(now);
  const map: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };
  return { y, m, d, dow: map[weekdayShort] ?? 0 };
}

/** Step a "YYYY-MM-DD" forward by one period. Port of utils/date.nextDueDate. */
export function nextDueDate(ymd: string, type?: "weekly" | "monthly"): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  if (type === "weekly") date.setUTCDate(date.getUTCDate() + 7);
  else date.setUTCMonth(date.getUTCMonth() + 1);
  // Format the UTC parts directly — these are calendar values, not instants.
  const yy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

/** Next date (today or later) whose weekday is `dow` (0=Sun). */
export function nextWeeklyDate(dow: number): string {
  const t = jerusalemToday();
  const diff = (dow - t.dow + 7) % 7;
  const date = new Date(Date.UTC(t.y, t.m - 1, t.d + diff));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

/** `dom`-th of this month, or next month if that day already passed. */
export function nextMonthlyDate(dom: number): string {
  const t = jerusalemToday();
  let y = t.y;
  let m = t.m - 1; // 0-based
  if (dom < t.d) {
    m += 1;
    if (m > 11) { m = 0; y += 1; }
  }
  const daysInMonth = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const day = Math.min(dom, daysInMonth);
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Identity key linking a recurring template to its settled occurrences. */
export function seriesKey(e: Expense): string {
  return `${e.kidId}|${e.note ?? ""}|${e.amount}|${e.recurrenceType ?? ""}`;
}

/** Is this row a settled occurrence of a recurring series (vs. a one-time)? */
export function isRecurringOccurrence(e: Expense): boolean {
  return !e.isRecurring && e.paid === true && !!e.recurrenceType && !!e.kidId;
}

/**
 * Next due date for a recurring template: the earliest scheduled date (from
 * the anchor, stepping by period) with no settled occurrence yet.
 */
export function nextDueForSeries(template: Expense, expenses: Expense[]): string {
  const key = seriesKey(template);
  const paid = new Set(
    expenses
      .filter((e) => isRecurringOccurrence(e) && seriesKey(e) === key)
      .map((e) => e.date),
  );
  let d = template.date;
  const type = (template.recurrenceType as "weekly" | "monthly" | null) ?? "monthly";
  for (let i = 0; i < 600 && paid.has(d); i++) {
    d = nextDueDate(d, type);
  }
  return d;
}

/** Display due date for any kid-payment row (computed next-due for templates). */
export function paymentDueDate(e: Expense, expenses: Expense[]): string {
  return e.isRecurring ? nextDueForSeries(e, expenses) : e.date;
}

/**
 * An outstanding ("to pay") kid payment is either a one-time unpaid row or a
 * recurring template. Settled occurrences and ordinary expenses are excluded.
 */
export function isOutstandingKidPayment(e: Expense): boolean {
  if (!e.kidId || e.paid === true) return false;
  // paid === false at this point. One-time outstanding or a recurring template.
  return true;
}

/**
 * Shape an outstanding kid payment for the bot: resolved due date + the fields
 * the assistant needs to render and to settle it.
 */
export interface OutstandingPayment {
  id: string;
  note: string | null;
  amount: number; // agorot
  kidId: string;
  dueDate: string; // computed next-due for templates
  isRecurring: boolean;
  recurrenceType: string | null;
}

export function buildOutstanding(all: Expense[]): OutstandingPayment[] {
  const outstanding = all.filter(isOutstandingKidPayment);
  return outstanding
    .map((e) => ({
      id: e.id,
      note: e.note,
      amount: e.amount,
      kidId: e.kidId!,
      dueDate: paymentDueDate(e, all),
      isRecurring: e.isRecurring,
      recurrenceType: e.recurrenceType,
    }))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

export { KID_PAYMENT_CATEGORY, JERUSALEM_TZ };
