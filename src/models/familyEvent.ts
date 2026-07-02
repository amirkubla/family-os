export type AssigneeType = "member" | "kid" | "family";

/** Repeat cadence unit. Absent/one-time when `isRecurring` is false. */
export type RepeatUnit = "week" | "month";

export interface FamilyEvent {
  id: string;
  title: string;
  assigneeType: AssigneeType;
  assigneeId?: string;
  daysOfWeek: number[]; // [0, 2, 4] = Sun, Tue, Thu — weekly repeats only
  startMinutes: number; // 0–1439
  endMinutes: number;
  location?: string;
  color?: string;
  isRecurring: boolean; // true = repeats (see repeatUnit/interval), false = one-time
  /**
   * "YYYY-MM-DD". The event's date. For a one-time event this is the (start)
   * day; for a recurring event it's the ANCHOR / first occurrence, off which
   * the weekly/monthly interval is measured.
   */
  date?: string;
  /** Inclusive end date ("YYYY-MM-DD") for multi-day one-time events; absent = single day. */
  endDate?: string;
  /** Repeat cadence — "week" or "month". Absent when one-time. */
  repeatUnit?: RepeatUnit;
  /** Repeat every N units (≥1). Defaults to 1 (every week / every month). */
  repeatInterval?: number;
  /** All-day event — time range is ignored and the UI shows "כל היום". */
  allDay?: boolean;
  reminders?: number[]; // minutes before event, e.g. [1440, 60, 5]
  createdAt: number;
  updatedAt: number;
}
