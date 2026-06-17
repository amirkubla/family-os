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
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ApiGroceryItem {
  id: string;
  familyId: string;
  title: string;
  shoppingCategory: string;
  subcategory: string | null;
  qty: string | null;
  isBought: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ApiNote {
  id: string;
  familyId: string;
  kidId: string | null;
  title: string | null;
  body: string;
  pinned: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ApiChore {
  id: string;
  familyId: string;
  title: string;
  assignedTo: string | null;
  assignedToMemberId: string | null;
  done: boolean;
  selectedForToday: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ApiFamilyMember {
  id: string;
  familyId: string;
  displayName: string;
  role: string | null;
  color: string | null;
  avatarEmoji: string | null;
  userId: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ApiProject {
  id: string;
  familyId: string;
  kidId: string | null;
  title: string;
  description: string | null;
  status: "idea" | "in_progress" | "done";
  progress: number;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ApiScheduleBlock {
  id: string;
  familyId: string;
  kidId: string;
  daysOfWeek: number[];
  title: string;
  type: "school" | "hobby" | "other";
  startMinutes: number;
  endMinutes: number;
  location: string | null;
  color: string | null;
  date: string | null;
  isRecurring: boolean;
  reminders: string | null; // JSON string e.g. "[1440,60,5]"
  createdAt: string;
  updatedAt: string;
}

export interface ApiBudgetCategory {
  id: string;
  familyId: string;
  name: string;
  icon: string;
  color: string;
  monthlyCap: number | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ApiExpense {
  id: string;
  familyId: string;
  amount: number;
  categoryName: string;
  payerMemberId: string | null;
  kidId: string | null;
  date: string;
  note: string | null;
  isRecurring: boolean;
  recurrenceType: string | null; // 'weekly' | 'monthly' | 'yearly'
  recurrenceDay: number | null;
  recurrenceMonth: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApiFamilyEvent {
  id: string;
  familyId: string;
  title: string;
  assigneeType: "member" | "kid" | "family";
  assigneeId: string | null;
  daysOfWeek: number[];
  startMinutes: number;
  endMinutes: number;
  location: string | null;
  color: string | null;
  isRecurring: boolean;
  date: string | null;
  reminders: string | null; // JSON string e.g. "[1440,60,5]"
  createdAt: string;
  updatedAt: string;
}
