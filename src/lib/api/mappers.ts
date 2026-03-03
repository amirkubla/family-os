/**
 * mappers.ts — Bidirectional converters between API JSON and local models.
 *
 * API  →  Local:  ISO strings → epoch ms, null → undefined, drop familyId
 * Local →  API:   epoch ms → (not sent, server sets), undefined → null, inject familyId
 */

import type {
  ApiGroceryItem,
  ApiNote,
  ApiChore,
  ApiProject,
  ApiKid,
  ApiScheduleBlock,
} from "./types";
import type { GroceryItem } from "@src/models/grocery";
import type { Note } from "@src/models/note";
import type { Chore } from "@src/models/chore";
import type { Project } from "@src/models/project";
import type { Kid } from "@src/models/seed";
import type { ScheduleBlock } from "@src/models/schedule";

const toMs = (iso: string) => new Date(iso).getTime();

// ---------------------------------------------------------------------------
// Grocery
// ---------------------------------------------------------------------------

export function apiToLocalGrocery(a: ApiGroceryItem): GroceryItem {
  return {
    id: a.id,
    title: a.title,
    category: a.category,
    qty: a.qty ?? undefined,
    isBought: a.isBought,
    updatedAt: toMs(a.updatedAt),
    createdAt: toMs(a.createdAt),
  };
}

export function localToApiGrocery(item: GroceryItem) {
  return {
    id: item.id,
    title: item.title,
    category: item.category,
    qty: item.qty ?? null,
    isBought: item.isBought,
  };
}

// ---------------------------------------------------------------------------
// Notes
// ---------------------------------------------------------------------------

export function apiToLocalNote(a: ApiNote): Note {
  return {
    id: a.id,
    title: a.title ?? undefined,
    body: a.body,
    pinned: a.pinned,
    updatedAt: toMs(a.updatedAt),
    createdAt: toMs(a.createdAt),
  };
}

export function localToApiNote(item: Note) {
  return {
    id: item.id,
    title: item.title ?? null,
    body: item.body,
    pinned: item.pinned,
  };
}

// ---------------------------------------------------------------------------
// Chores
// ---------------------------------------------------------------------------

export function apiToLocalChore(a: ApiChore): Chore {
  return {
    id: a.id,
    title: a.title,
    assignedTo: a.assignedTo ?? undefined,
    done: a.done,
    selectedForToday: a.selectedForToday,
    updatedAt: toMs(a.updatedAt),
    createdAt: toMs(a.createdAt),
  };
}

export function localToApiChore(item: Chore) {
  return {
    id: item.id,
    title: item.title,
    assignedTo: item.assignedTo ?? null,
    done: item.done,
    selectedForToday: item.selectedForToday,
  };
}

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

export function apiToLocalProject(a: ApiProject): Project {
  return {
    id: a.id,
    title: a.title,
    description: a.description ?? undefined,
    status: a.status,
    progress: a.progress,
    updatedAt: toMs(a.updatedAt),
    createdAt: toMs(a.createdAt),
  };
}

export function localToApiProject(item: Project) {
  return {
    id: item.id,
    title: item.title,
    description: item.description ?? null,
    status: item.status,
    progress: item.progress,
  };
}

// ---------------------------------------------------------------------------
// Kids
// ---------------------------------------------------------------------------

export function apiToLocalKid(a: ApiKid): Kid {
  return {
    id: a.id,
    name: a.name,
    color: a.color,
    emoji: a.emoji ?? "",
  };
}

export function localToApiKid(item: Kid) {
  return {
    id: item.id,
    name: item.name,
    color: item.color,
    emoji: item.emoji || null,
  };
}

// ---------------------------------------------------------------------------
// Schedule Blocks
// ---------------------------------------------------------------------------

export function apiToLocalScheduleBlock(a: ApiScheduleBlock): ScheduleBlock {
  return {
    id: a.id,
    kidId: a.kidId,
    dayOfWeek: a.dayOfWeek,
    title: a.title,
    type: a.type,
    startMinutes: a.startMinutes,
    endMinutes: a.endMinutes,
    location: a.location ?? undefined,
    color: a.color ?? undefined,
    updatedAt: toMs(a.updatedAt),
    createdAt: toMs(a.createdAt),
  };
}

export function localToApiScheduleBlock(item: ScheduleBlock) {
  return {
    id: item.id,
    kidId: item.kidId,
    dayOfWeek: item.dayOfWeek,
    title: item.title,
    type: item.type,
    startMinutes: item.startMinutes,
    endMinutes: item.endMinutes,
    location: item.location ?? null,
    color: item.color ?? null,
  };
}
