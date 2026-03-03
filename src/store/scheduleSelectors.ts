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

/** All blocks for a specific kid, sorted by dayOfWeek then startMinutes. */
export function useKidBlocks(kidId: string): ScheduleBlock[] {
  const blocks = useFamilyStore((s) => s.scheduleBlocks);
  return useMemo(
    () =>
      blocks
        .filter((b) => b.kidId === kidId)
        .sort(
          (a, b) =>
            a.dayOfWeek - b.dayOfWeek || a.startMinutes - b.startMinutes,
        ),
    [blocks, kidId],
  );
}

/** Blocks for a specific kid on a specific day of week, sorted by start time. */
export function useKidBlocksForDay(
  kidId: string,
  dayOfWeek: number,
): ScheduleBlock[] {
  const blocks = useFamilyStore((s) => s.scheduleBlocks);
  return useMemo(
    () =>
      blocks
        .filter((b) => b.kidId === kidId && b.dayOfWeek === dayOfWeek)
        .sort((a, b) => a.startMinutes - b.startMinutes),
    [blocks, kidId, dayOfWeek],
  );
}
