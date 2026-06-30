/**
 * scheduleSelectors.ts — Derived selectors for schedule blocks.
 *
 * IMPORTANT: Never .filter()/.sort() inside a Zustand selector — it
 * creates a new reference every render and causes infinite re-render loops.
 * Instead, select the raw array (stable ref) and derive in useMemo.
 */

import { useMemo } from "react";
import { useFamilyStore } from "./useFamilyStore";
import type { ScheduleBlock } from "@src/models/schedule";

/** Safely get daysOfWeek as an array, handling legacy data where it might be a number or undefined. */
function getDays(b: ScheduleBlock): number[] {
  const d = (b as any).daysOfWeek ?? (b as any).dayOfWeek;
  if (Array.isArray(d)) return d;
  if (typeof d === "number") return [d];
  return [];
}

/** Whether a one-time block falls on `dateStr`, spanning [date..endDate] inclusive. */
export function oneTimeBlockOnDate(b: ScheduleBlock, dateStr: string): boolean {
  if (b.isRecurring || !b.date) return false;
  return dateStr >= b.date && dateStr <= (b.endDate || b.date);
}

/** All recurring blocks for a specific kid, sorted by first day then startMinutes. */
export function useKidBlocks(kidId: string): ScheduleBlock[] {
  const blocks = useFamilyStore((s) => s.scheduleBlocks);
  return useMemo(
    () =>
      blocks
        .filter((b) => b.kidId === kidId && b.isRecurring)
        .sort(
          (a, b) =>
            ((a.daysOfWeek ?? [])[0] ?? 0) - (getDays(b)[0] ?? 0) || a.startMinutes - b.startMinutes,
        ),
    [blocks, kidId],
  );
}

/** Recurring blocks for a specific kid on a specific day of week, sorted by start time. */
export function useKidBlocksForDay(
  kidId: string,
  dayOfWeek: number,
): ScheduleBlock[] {
  const blocks = useFamilyStore((s) => s.scheduleBlocks);
  return useMemo(
    () =>
      blocks
        .filter((b) => b.kidId === kidId && b.isRecurring && getDays(b).includes(dayOfWeek))
        .sort((a, b) => a.startMinutes - b.startMinutes),
    [blocks, kidId, dayOfWeek],
  );
}

/**
 * Blocks for a specific kid on a specific date.
 * Returns both recurring blocks for that date's DOW and one-time events on that exact date.
 */
export function useKidBlocksForDate(
  kidId: string,
  dateStr: string,
  dayOfWeek: number,
): ScheduleBlock[] {
  const blocks = useFamilyStore((s) => s.scheduleBlocks);
  return useMemo(
    () =>
      blocks
        .filter(
          (b) =>
            b.kidId === kidId &&
            ((b.isRecurring && getDays(b).includes(dayOfWeek)) ||
              oneTimeBlockOnDate(b, dateStr)),
        )
        .sort((a, b) => a.startMinutes - b.startMinutes),
    [blocks, kidId, dateStr, dayOfWeek],
  );
}

/** All one-time events for a specific kid. */
export function useKidOneTimeBlocks(kidId: string): ScheduleBlock[] {
  const blocks = useFamilyStore((s) => s.scheduleBlocks);
  return useMemo(
    () =>
      blocks
        .filter((b) => b.kidId === kidId && !b.isRecurring)
        .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? "") || a.startMinutes - b.startMinutes),
    [blocks, kidId],
  );
}

// ---------------------------------------------------------------------------
// All-kids selectors (used by Calendar view)
// ---------------------------------------------------------------------------

/** All schedule blocks for a specific date across all kids. */
export function useAllKidBlocksForDate(
  dateStr: string,
  dayOfWeek: number,
): ScheduleBlock[] {
  const blocks = useFamilyStore((s) => s.scheduleBlocks);
  return useMemo(
    () =>
      blocks
        .filter(
          (b) =>
            (b.isRecurring && getDays(b).includes(dayOfWeek)) ||
            oneTimeBlockOnDate(b, dateStr),
        )
        .sort((a, b) => a.startMinutes - b.startMinutes),
    [blocks, dateStr, dayOfWeek],
  );
}

/** Recurring blocks by day-of-week across all kids (for calendar dots). */
export function useAllKidRecurringByDay(): Record<number, ScheduleBlock[]> {
  const blocks = useFamilyStore((s) => s.scheduleBlocks);
  return useMemo(() => {
    const map: Record<number, ScheduleBlock[]> = {};
    for (let d = 0; d < 7; d++) map[d] = [];
    for (const b of blocks) {
      if (b.isRecurring) {
        for (const dow of getDays(b)) {
          map[dow]?.push(b);
        }
      }
    }
    return map;
  }, [blocks]);
}

/** All one-time schedule blocks across all kids (for calendar dots). */
export function useAllKidOneTimeBlocks(): ScheduleBlock[] {
  const blocks = useFamilyStore((s) => s.scheduleBlocks);
  return useMemo(
    () =>
      blocks
        .filter((b) => !b.isRecurring)
        .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? "") || a.startMinutes - b.startMinutes),
    [blocks],
  );
}
