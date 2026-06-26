/**
 * familyEventSelectors.ts — Derived selectors for family events.
 *
 * IMPORTANT: Never .filter()/.sort() inside a Zustand selector — it
 * creates a new reference every render and causes infinite re-render loops.
 * Instead, select the raw array (stable ref) and derive in useMemo.
 */

import { useMemo } from "react";
import { useFamilyStore } from "./useFamilyStore";
import type { FamilyEvent } from "@src/models/familyEvent";

/** Safely get daysOfWeek as an array, handling legacy data where it might be a number or undefined. */
function getDays(e: FamilyEvent): number[] {
  const d = (e as any).daysOfWeek ?? (e as any).dayOfWeek;
  if (Array.isArray(d)) return d;
  if (typeof d === "number") return [d];
  return [];
}

/**
 * Does a one-time event fall on `dateStr`? Multi-day events span their full
 * [date … endDate] range (inclusive); single-day events match the exact date.
 */
export function oneTimeEventOnDate(e: FamilyEvent, dateStr: string): boolean {
  if (e.isRecurring || !e.date) return false;
  return dateStr >= e.date && dateStr <= (e.endDate || e.date);
}

/**
 * Family events for a specific date.
 * Returns both recurring events for that date's DOW and one-time events on that exact date.
 */
export function useFamilyEventsForDate(
  dateStr: string,
  dayOfWeek: number,
): FamilyEvent[] {
  const events = useFamilyStore((s) => s.familyEvents);
  return useMemo(
    () =>
      events
        .filter(
          (e) =>
            (e.isRecurring && getDays(e).includes(dayOfWeek)) ||
            oneTimeEventOnDate(e, dateStr),
        )
        .sort((a, b) => a.startMinutes - b.startMinutes),
    [events, dateStr, dayOfWeek],
  );
}

/**
 * Family events for today (used by Today screen).
 * Returns all non-kid-schedule family events happening today.
 */
export function useTodayFamilyEvents(
  dateStr: string,
  dayOfWeek: number,
): FamilyEvent[] {
  const events = useFamilyStore((s) => s.familyEvents);
  return useMemo(
    () =>
      events
        .filter(
          (e) =>
            (e.isRecurring && getDays(e).includes(dayOfWeek)) ||
            oneTimeEventOnDate(e, dateStr),
        )
        .sort((a, b) => a.startMinutes - b.startMinutes),
    [events, dateStr, dayOfWeek],
  );
}

/** All one-time family events (for calendar dot markers). */
export function useFamilyEventOneTimeBlocks(): FamilyEvent[] {
  const events = useFamilyStore((s) => s.familyEvents);
  return useMemo(
    () =>
      events
        .filter((e) => !e.isRecurring)
        .sort(
          (a, b) =>
            (a.date ?? "").localeCompare(b.date ?? "") ||
            a.startMinutes - b.startMinutes,
        ),
    [events],
  );
}

/** All recurring family events (for calendar recurring dot markers). */
export function useFamilyEventRecurringByDay(): Record<number, FamilyEvent[]> {
  const events = useFamilyStore((s) => s.familyEvents);
  return useMemo(() => {
    const map: Record<number, FamilyEvent[]> = {};
    for (let d = 0; d < 7; d++) map[d] = [];
    for (const e of events) {
      if (e.isRecurring) {
        for (const dow of getDays(e)) {
          map[dow]?.push(e);
        }
      }
    }
    return map;
  }, [events]);
}
