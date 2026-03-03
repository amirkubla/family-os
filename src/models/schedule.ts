export type BlockType = "school" | "hobby" | "other";

export interface ScheduleBlock {
  id: string;
  kidId: string;
  dayOfWeek: number; // 0 = Sun, 1 = Mon ... 6 = Sat
  title: string;
  type: BlockType;
  startMinutes: number; // 480 = 08:00
  endMinutes: number;
  location?: string;
  color?: string; // falls back to kid color if absent
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

export const BLOCK_TYPES: { value: BlockType; label: string }[] = [
  { value: "school", label: "School" },
  { value: "hobby", label: "Hobby" },
  { value: "other", label: "Other" },
];
