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
