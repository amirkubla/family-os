/**
 * types.ts — API response shapes (mirrors backend JSON exactly).
 *
 * Timestamps come back as ISO-8601 strings.
 * Nullable fields use `| null` (not `undefined`).
 */

export interface ApiFamily {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiKid {
  id: string;
  familyId: string;
  name: string;
  color: string;
  emoji: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApiGroceryItem {
  id: string;
  familyId: string;
  title: string;
  category: string;
  qty: string | null;
  isBought: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ApiNote {
  id: string;
  familyId: string;
  title: string | null;
  body: string;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ApiChore {
  id: string;
  familyId: string;
  title: string;
  assignedTo: string | null;
  done: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ApiProject {
  id: string;
  familyId: string;
  title: string;
  description: string | null;
  status: "idea" | "in_progress" | "done";
  progress: number;
  createdAt: string;
  updatedAt: string;
}

export interface ApiScheduleBlock {
  id: string;
  familyId: string;
  kidId: string;
  dayOfWeek: number;
  title: string;
  type: "school" | "hobby" | "other";
  startMinutes: number;
  endMinutes: number;
  location: string | null;
  color: string | null;
  createdAt: string;
  updatedAt: string;
}
