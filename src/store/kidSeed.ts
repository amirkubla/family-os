/**
 * kidSeed.ts — Seeds default kids on first run.
 *
 * If the kids array is empty, we add two default kids.
 */

import { useFamilyStore } from "./useFamilyStore";
import { addKidRemote } from "@src/lib/sync/remoteCrud";
import { DEFAULT_KIDS } from "@src/models/kid";

export function seedKidsIfEmpty() {
  const { kids } = useFamilyStore.getState();
  if (kids.length > 0) return;

  for (const kid of DEFAULT_KIDS) {
    addKidRemote({
      name: kid.name,
      emoji: kid.emoji,
      color: kid.color,
    });
  }
}
