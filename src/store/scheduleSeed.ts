/**
 * scheduleSeed.ts — Pre-seed "בית ספר" blocks for each kid Mon–Fri 08:00–13:30.
 * Only seeds if scheduleBlocks is empty and there are kids in the store.
 *
 * Uses addScheduleBlockRemote so seeds are also pushed to the backend.
 */

import { useFamilyStore } from "./useFamilyStore";
import { addScheduleBlockRemote } from "@src/lib/sync/remoteCrud";

export function seedScheduleIfEmpty() {
  const { scheduleBlocks, kids } = useFamilyStore.getState();

  if (scheduleBlocks.length > 0) return;
  if (kids.length === 0) return;

  for (const kid of kids) {
    // Mon (1) through Fri (5)
    for (let dow = 1; dow <= 5; dow++) {
      addScheduleBlockRemote({
        kidId: kid.id,
        dayOfWeek: dow,
        title: "בית ספר",
        type: "school",
        startMinutes: 480, // 08:00
        endMinutes: 810, // 13:30
      });
    }
  }
}
