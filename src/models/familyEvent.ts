export type AssigneeType = "member" | "kid" | "family";

export interface FamilyEvent {
  id: string;
  title: string;
  assigneeType: AssigneeType;
  assigneeId?: string;
  daysOfWeek: number[]; // [0, 2, 4] = Sun, Tue, Thu
  startMinutes: number; // 0–1439
  endMinutes: number;
  location?: string;
  color?: string;
  isRecurring: boolean; // true = weekly recurring, false = one-time event
  date?: string; // "YYYY-MM-DD" start date for one-time events
  /** Inclusive end date ("YYYY-MM-DD") for multi-day one-time events; absent = single day. */
  endDate?: string;
  /** All-day event — time range is ignored and the UI shows "כל היום". */
  allDay?: boolean;
  reminders?: number[]; // minutes before event, e.g. [1440, 60, 5]
  createdAt: number;
  updatedAt: number;
}
