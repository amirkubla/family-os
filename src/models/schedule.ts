export interface ScheduleBlock {
  id: string;
  kidId: string;
  daysOfWeek: number[]; // [0, 2, 4] = Sun, Tue, Thu
  title: string;
  startMinutes: number; // 480 = 08:00
  endMinutes: number;
  location?: string;
  color?: string; // falls back to kid color if absent
  isRecurring: boolean; // true = weekly recurring, false = one-time event
  date?: string; // "YYYY-MM-DD" for one-time events only
  reminders?: number[]; // minutes before event, e.g. [1440, 60, 5]
  createdAt: number;
  updatedAt: number;
}

export const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export const DAY_NAMES_SHORT = [
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
] as const;
