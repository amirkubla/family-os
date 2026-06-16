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
  pushTokens,
  sentNotifications,
  reminders,
  users,
  invites,
  budgetCategories,
  expenses,
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
export type PushToken = InferSelectModel<typeof pushTokens>;
export type SentNotification = InferSelectModel<typeof sentNotifications>;
export type Reminder = InferSelectModel<typeof reminders>;
export type User = InferSelectModel<typeof users>;
export type Invite = InferSelectModel<typeof invites>;

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
export type NewPushToken = InferInsertModel<typeof pushTokens>;
export type NewReminder = InferInsertModel<typeof reminders>;
export type NewUser = InferInsertModel<typeof users>;
export type NewInvite = InferInsertModel<typeof invites>;

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
export type UpdateReminder = Partial<Omit<NewReminder, "id">>;

export type ReminderSourceKind = "family_event" | "schedule_block";
export type ReminderStatus =
  | "pending"
  | "processing"
  | "sent"
  | "failed"
  | "cancelled"
  | "complete";

export type BudgetCategory = InferSelectModel<typeof budgetCategories>;
export type NewBudgetCategory = InferInsertModel<typeof budgetCategories>;
export type UpdateBudgetCategory = Partial<Omit<NewBudgetCategory, "id">>;

export type Expense = InferSelectModel<typeof expenses>;
export type NewExpense = InferInsertModel<typeof expenses>;
export type UpdateExpense = Partial<Omit<NewExpense, "id">>;

// ---------------------------------------------------------------------------
// Enums (mirrored from schema for convenience)
// ---------------------------------------------------------------------------

export type ProjectStatus = "idea" | "in_progress" | "done";
export type BlockType = "school" | "hobby" | "other";
