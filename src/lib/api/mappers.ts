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
  ApiFamilyMember,
  ApiFamilyEvent,
} from "./types";
import type { GroceryItem, ShoppingCategory } from "@src/models/grocery";
import type { Note } from "@src/models/note";
import type { Chore } from "@src/models/chore";
import type { Project } from "@src/models/project";
import type { Kid } from "@src/models/kid";
import type { ScheduleBlock } from "@src/models/schedule";
import type { FamilyMember, MemberRole } from "@src/models/familyMember";
import type { FamilyEvent, AssigneeType } from "@src/models/familyEvent";

const toMs = (iso: string) => new Date(iso).getTime();

// ---------------------------------------------------------------------------
// Grocery
// ---------------------------------------------------------------------------

export function apiToLocalGrocery(a: ApiGroceryItem): GroceryItem {
  return {
    id: a.id,
    title: a.title,
    shoppingCategory: (a.shoppingCategory || "grocery") as ShoppingCategory,
    subcategory: a.subcategory ?? undefined,
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
    shoppingCategory: item.shoppingCategory,
    subcategory: item.subcategory ?? null,
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
    assignedToMemberId: a.assignedToMemberId ?? undefined,
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
    assignedToMemberId: item.assignedToMemberId ?? null,
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
    isActive: a.isActive,
    updatedAt: toMs(a.updatedAt),
    createdAt: toMs(a.createdAt),
  };
}

export function localToApiKid(item: Kid) {
  return {
    id: item.id,
    name: item.name,
    color: item.color,
    emoji: item.emoji || null,
    isActive: item.isActive,
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
    isRecurring: a.isRecurring,
    date: a.date ?? undefined,
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
    isRecurring: item.isRecurring,
    date: item.date ?? null,
  };
}

// ---------------------------------------------------------------------------
// Family Members
// ---------------------------------------------------------------------------

export function apiToLocalFamilyMember(a: ApiFamilyMember): FamilyMember {
  return {
    id: a.id,
    name: a.displayName,
    role: (a.role ?? "other") as MemberRole,
    color: a.color ?? undefined,
    avatarEmoji: a.avatarEmoji ?? undefined,
    isActive: a.isActive,
    updatedAt: toMs(a.updatedAt),
    createdAt: toMs(a.createdAt),
  };
}

export function localToApiFamilyMember(item: FamilyMember) {
  return {
    id: item.id,
    displayName: item.name,
    role: item.role,
    color: item.color ?? null,
    avatarEmoji: item.avatarEmoji ?? null,
    isActive: item.isActive,
  };
}

// ---------------------------------------------------------------------------
// Family Events
// ---------------------------------------------------------------------------

export function apiToLocalFamilyEvent(a: ApiFamilyEvent): FamilyEvent {
  return {
    id: a.id,
    title: a.title,
    assigneeType: a.assigneeType as AssigneeType,
    assigneeId: a.assigneeId ?? undefined,
    dayOfWeek: a.dayOfWeek,
    startMinutes: a.startMinutes,
    endMinutes: a.endMinutes,
    location: a.location ?? undefined,
    color: a.color ?? undefined,
    isRecurring: a.isRecurring,
    date: a.date ?? undefined,
    updatedAt: toMs(a.updatedAt),
    createdAt: toMs(a.createdAt),
  };
}

export function localToApiFamilyEvent(item: FamilyEvent) {
  return {
    id: item.id,
    title: item.title,
    assigneeType: item.assigneeType,
    assigneeId: item.assigneeId ?? null,
    dayOfWeek: item.dayOfWeek,
    startMinutes: item.startMinutes,
    endMinutes: item.endMinutes,
    location: item.location ?? null,
    color: item.color ?? null,
    isRecurring: item.isRecurring,
    date: item.date ?? null,
  };
}
