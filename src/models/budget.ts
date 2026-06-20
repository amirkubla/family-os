import { nextDueDate } from "@src/utils/date";

export interface BudgetCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  monthlyCap?: number; // agorot (÷100 = NIS); undefined = no cap
  sortOrder: number;
  updatedAt: number;
  createdAt: number;
}

export interface Expense {
  id: string;
  amount: number; // agorot (÷100 = NIS)
  categoryName: string;
  payerMemberId?: string;
  kidId?: string;
  date: string; // "YYYY-MM-DD" — for kid payments this is the due date
  note?: string;
  /**
   * false = a planned kid payment still "to pay" (לתשלום); true/undefined = a
   * settled expense. Unpaid items are excluded from budget spending totals.
   */
  paid?: boolean;
  isRecurring: boolean;
  recurrenceType?: "weekly" | "monthly";
  recurrenceDay?: number; // 0-6 for weekly, 1-31 for monthly
  updatedAt: number;
  createdAt: number;
}

/** Format agorot as a NIS string. Shows decimals only when non-zero. */
export function formatILS(agorot: number): string {
  const nis = agorot / 100;
  return `₪${nis % 1 === 0 ? nis.toLocaleString() : nis.toFixed(2)}`;
}

/** Parse a user-entered amount string (e.g. "340" or "34.5") to agorot. */
export function parseILS(input: string): number {
  const n = parseFloat(input.replace(/,/g, ""));
  return isNaN(n) ? 0 : Math.round(n * 100);
}

// ── Recurring kid payments ──────────────────────────────────────────────────
//
// A recurring payment is modeled as a single persistent TEMPLATE row
// (isRecurring:true, paid:false, date = the series anchor / first due). Paying
// a period creates a separate settled OCCURRENCE row (isRecurring:false,
// paid:true, recurrenceType set, date = that period's due date). The template
// is never mutated or duplicated, so any sequence of mark-paid / undo clicks
// stays consistent — no chains, no duplicate "to pay" rows, no gaps.

/** Identity key for a recurring series (template ↔ its settled occurrences). */
export function seriesKey(e: Expense): string {
  return `${e.kidId}|${e.note ?? ""}|${e.amount}|${e.recurrenceType ?? ""}`;
}

/** Is this row a settled occurrence of a recurring series (vs. a one-time)? */
export function isRecurringOccurrence(e: Expense): boolean {
  return !e.isRecurring && e.paid === true && !!e.recurrenceType && !!e.kidId;
}

/**
 * The next due date for a recurring template: the earliest scheduled date
 * (from the anchor, stepping by period) that has no settled occurrence yet.
 * Robust to out-of-order payments — it simply finds the first unpaid period.
 */
export function nextDueForSeries(template: Expense, expenses: Expense[]): string {
  const key = seriesKey(template);
  const paid = new Set(
    expenses.filter((e) => isRecurringOccurrence(e) && seriesKey(e) === key).map((e) => e.date),
  );
  let d = template.date;
  for (let i = 0; i < 600 && paid.has(d); i++) {
    d = nextDueDate(d, template.recurrenceType);
  }
  return d;
}

/** Display due date for any kid-payment row (computed next-due for templates). */
export function paymentDueDate(e: Expense, expenses: Expense[]): string {
  return e.isRecurring ? nextDueForSeries(e, expenses) : e.date;
}

/** Default budget categories — mirrors the server-side auto-seed. */
export const DEFAULT_BUDGET_CATEGORIES: { name: string; icon: string; color: string; sortOrder: number }[] = [
  { name: "מזון וקניות",   icon: "🛒", color: "#2D9F6F", sortOrder: 0 },
  { name: "בית ושירותים",  icon: "🏠", color: "#3A7BD5", sortOrder: 1 },
  { name: "ילדים וחוגים",  icon: "👶", color: "#E0699B", sortOrder: 2 },
  { name: "תחבורה",        icon: "🚗", color: "#F59E0B", sortOrder: 3 },
  { name: "בילויים",       icon: "🎉", color: "#9B59B6", sortOrder: 4 },
  { name: "בריאות",        icon: "💊", color: "#EF4444", sortOrder: 5 },
  { name: "אחר",           icon: "📦", color: "#888888", sortOrder: 6 },
];
