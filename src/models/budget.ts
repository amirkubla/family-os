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
  date: string; // "YYYY-MM-DD"
  note?: string;
  isRecurring: boolean;
  recurrenceDay?: number; // 1-31
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
