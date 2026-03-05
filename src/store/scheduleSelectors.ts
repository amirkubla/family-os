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

/** All recurring blocks for a specific kid, sorted by dayOfWeek then startMinutes. */
export function useKidBlocks(kidId: string): ScheduleBlock[] {
  const blocks = useFamilyStore((s) => s.scheduleBlocks);
  return useMemo(
    () =>
      blocks
        .filter((b) => b.kidId === kidId && b.isRecurring)
        .sort(
          (a, b) =>
            a.dayOfWeek - b.dayOfWeek || a.startMinutes - b.startMinutes,
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
        .filter((b) => b.kidId === kidId && b.isRecurring && b.dayOfWeek === dayOfWeek)
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
            ((b.isRecurring && b.dayOfWeek === dayOfWeek) ||
              (!b.isRecurring && b.date === dateStr)),
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
            (b.isRecurring && b.dayOfWeek === dayOfWeek) ||
            (!b.isRecurring && b.date === dateStr),
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
        map[b.dayOfWeek]?.push(b);
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
