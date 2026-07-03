export type ChorePriority = "low" | "medium" | "high";

/** Recurrence granularity for a repeating chore. */
export type RepeatUnit = "day" | "week" | "month";

export interface Chore {
  id: string;
  title: string;
  description?: string;
  assignedTo?: string;
  assignedToMemberId?: string;
  /** Assignee can be a kid instead of a member — mutually exclusive with assignedToMemberId. */
  kidId?: string;
  done: boolean;
  selectedForToday: boolean;
  /** low | medium | high — undefined = no priority set. */
  priority?: ChorePriority;
  /** Optional due date, epoch ms (date-only in practice; mirrors Project.dueDate). */
  dueDate?: number;
  /** When the chore was last completed, epoch ms. Cleared when re-opened. */
  completedAt?: number;
  /** Recurring chore — completing it advances dueDate to the next occurrence. */
  isRecurring?: boolean;
  repeatUnit?: RepeatUnit;
  /** Every N units (default 1). */
  repeatInterval?: number;
  /** Weekly recurrence only — [0..6], Sun..Sat. */
  daysOfWeek?: number[];
  /** Manual drag-to-reorder position; lower sorts first. */
  sortOrder: number;
  updatedAt: number;
  createdAt: number;
}

const MS_PER_DAY = 86_400_000;

/** Local midnight for an epoch-ms timestamp. */
function midnight(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Whole-day difference between a due date and today (negative = overdue). */
export function dueDiffDays(dueMs: number): number {
  return Math.round((midnight(dueMs) - midnight(Date.now())) / MS_PER_DAY);
}

/** True when the chore is not done and its due date is before today. */
export function isChoreOverdue(chore: Chore): boolean {
  if (chore.done || chore.dueDate == null) return false;
  return midnight(chore.dueDate) < midnight(Date.now());
}

/** Sort weight for priority — high first, no-priority last. */
export function priorityRank(p?: ChorePriority): number {
  return p === "high" ? 0 : p === "medium" ? 1 : p === "low" ? 2 : 3;
}

/**
 * Next occurrence for a recurring chore, epoch ms (date-only, local midnight).
 * - day   → +interval days
 * - week  → next selected weekday after the current one, else +interval·7 days
 * - month → +interval months (day-of-month preserved by JS Date rollover)
 */
export function nextChoreDue(
  dueMs: number,
  unit: RepeatUnit,
  interval = 1,
  daysOfWeek?: number[],
): number {
  const step = Math.max(1, interval);
  const d = new Date(midnight(dueMs));

  if (unit === "day") {
    d.setDate(d.getDate() + step);
    return d.getTime();
  }

  if (unit === "week") {
    const days = (daysOfWeek ?? []).filter((n) => n >= 0 && n <= 6).sort((a, b) => a - b);
    if (days.length > 0) {
      const cur = d.getDay();
      const nextInWeek = days.find((x) => x > cur);
      if (nextInWeek !== undefined) {
        d.setDate(d.getDate() + (nextInWeek - cur));
      } else {
        // Wrap to the first selected day, `step` weeks out.
        d.setDate(d.getDate() + (7 * step - cur + days[0]));
      }
      return d.getTime();
    }
    d.setDate(d.getDate() + 7 * step);
    return d.getTime();
  }

  // month
  d.setMonth(d.getMonth() + step);
  return d.getTime();
}
