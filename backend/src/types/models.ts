import type { InferSelectModel, InferInsertModel } from "drizzle-orm";
import type {
  families,
  familyMembers,
  kids,
  groceryItems,
  notes,
  chores,
  projects,
  scheduleBlocks,
  familyEvents,
} from "../db/schema.js";

// ---------------------------------------------------------------------------
// Select types  (what you GET back from the DB)
// ---------------------------------------------------------------------------

export type Family = InferSelectModel<typeof families>;
export type FamilyMember = InferSelectModel<typeof familyMembers>;
export type Kid = InferSelectModel<typeof kids>;
export type GroceryItem = InferSelectModel<typeof groceryItems>;
export type Note = InferSelectModel<typeof notes>;
export type Chore = InferSelectModel<typeof chores>;
export type Project = InferSelectModel<typeof projects>;
export type ScheduleBlock = InferSelectModel<typeof scheduleBlocks>;
export type FamilyEvent = InferSelectModel<typeof familyEvents>;

// ---------------------------------------------------------------------------
// Insert types  (what you SEND to create a row)
// ---------------------------------------------------------------------------

export type NewFamily = InferInsertModel<typeof families>;
export type NewFamilyMember = InferInsertModel<typeof familyMembers>;
export type NewKid = InferInsertModel<typeof kids>;
export type NewGroceryItem = InferInsertModel<typeof groceryItems>;
export type NewNote = InferInsertModel<typeof notes>;
export type NewChore = InferInsertModel<typeof chores>;
export type NewProject = InferInsertModel<typeof projects>;
export type NewScheduleBlock = InferInsertModel<typeof scheduleBlocks>;
export type NewFamilyEvent = InferInsertModel<typeof familyEvents>;

// ---------------------------------------------------------------------------
// Update (patch) types  (partial insert minus id, with optional fields)
// ---------------------------------------------------------------------------

export type UpdateFamily = Partial<Omit<NewFamily, "id">>;
export type UpdateFamilyMember = Partial<Omit<NewFamilyMember, "id">>;
export type UpdateKid = Partial<Omit<NewKid, "id">>;
export type UpdateGroceryItem = Partial<Omit<NewGroceryItem, "id">>;
export type UpdateNote = Partial<Omit<NewNote, "id">>;
export type UpdateChore = Partial<Omit<NewChore, "id">>;
export type UpdateProject = Partial<Omit<NewProject, "id">>;
export type UpdateScheduleBlock = Partial<Omit<NewScheduleBlock, "id">>;
export type UpdateFamilyEvent = Partial<Omit<NewFamilyEvent, "id">>;

// ---------------------------------------------------------------------------
// Enums (mirrored from schema for convenience)
// ---------------------------------------------------------------------------

export type ProjectStatus = "idea" | "in_progress" | "done";
export type BlockType = "school" | "hobby" | "other";
