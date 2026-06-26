/**
 * remoteCrud.ts — Fire-and-forget CRUD wrappers.
 *
 * Pattern:
 *   1. Mutate local store immediately (optimistic).
 *   2. Fire API call in the background.
 *   3. On error → call onSyncError callback (for Snackbar).
 *
 * The app stays responsive even if the API is down.
 *
 * Update semantics: each `update*Remote(id, patch)` sends a PATCH containing
 * ONLY the fields actually in `patch`. This is critical for two-parent
 * concurrent edit safety — if both parents change different fields of the
 * same event, each PATCH carries only their delta and the server merges
 * field-by-field. The previous implementation read the full local item and
 * PUT/upserted it, which meant Parent B's stale title overwrote Parent A's
 * rename (lost-update race). See QA Pass 2 BUG-N1.
 */

import { useFamilyStore } from "@src/store/useFamilyStore";
import { getFamilyId } from "../familyContext";
import { nextDueForSeries, isRecurringOccurrence } from "@src/models/budget";
import {
  familyApi,
  groceryApi,
  notesApi,
  choresApi,
  projectsApi,
  kidsApi,
  scheduleBlocksApi,
  familyMembersApi,
  familyEventsApi,
  customizationsApi,
  budgetCategoriesApi,
  expensesApi,
} from "../api/endpoints";
import {
  localToApiGrocery,
  localToApiNote,
  localToApiChore,
  localToApiProject,
  localToApiKid,
  localToApiScheduleBlock,
  localToApiFamilyMember,
  localToApiFamilyEvent,
  apiToLocalFamilyMember,
  localToApiBudgetCategory,
  localToApiExpense,
} from "../api/mappers";
import type { Note } from "@src/models/note";
import type { Chore } from "@src/models/chore";
import type { Project } from "@src/models/project";
import type { ScheduleBlock, BlockType } from "@src/models/schedule";
import type { Kid } from "@src/models/kid";
import type { FamilyMember, MemberRole } from "@src/models/familyMember";
import type { FamilyEvent, AssigneeType } from "@src/models/familyEvent";
import type { BudgetCategory, Expense } from "@src/models/budget";

// ---------------------------------------------------------------------------
// Error handler — set by UI (Snackbar)
// ---------------------------------------------------------------------------

let _onSyncError: ((msg: string) => void) | null = null;

export function setSyncErrorHandler(handler: (msg: string) => void) {
  _onSyncError = handler;
}

function fireAndForget(promise: Promise<unknown>, label: string) {
  promise
    .then(() => {
      // Server accepted the mutation — bump the "last sync" timestamp so the
      // Today screen reflects that local state is current. Without this, the
      // displayed "אחרון: HH:MM" only updated on full pullAll(), making
      // recent edits look unsynced even when they were already persisted.
      useFamilyStore.getState().setLastSyncedAt(Date.now());
    })
    .catch((err) => {
      const msg = `${label}: ${err instanceof Error ? err.message : "unknown error"}`;
      console.warn("[sync]", msg);
      _onSyncError?.(msg);
    });
}

// ---------------------------------------------------------------------------
// Family Name
// ---------------------------------------------------------------------------

export function updateFamilyNameRemote(name: string) {
  useFamilyStore.getState().setFamilyName(name);
  fireAndForget(
    getFamilyId().then((fid) => familyApi.update(fid, { name })),
    "Update family name",
  );
}

// ---------------------------------------------------------------------------
// Customizations (per-family preferences)
// ---------------------------------------------------------------------------

/**
 * Replace the family's customizations blob. Optimistic: store updates
 * instantly, then PUT goes out in the background. On error the snackbar
 * shows; next pullAll will reconcile from the server.
 */
export function updateCustomizationsRemote(
  next: import("@src/models/customization").FamilyCustomizations,
) {
  useFamilyStore.getState().setCustomizations(next);
  fireAndForget(
    getFamilyId().then((fid) => customizationsApi.put(fid, next)),
    "Update customizations",
  );
}

// ---------------------------------------------------------------------------
// Grocery
// ---------------------------------------------------------------------------

export function addGroceryRemote(input: {
  title: string;
  shoppingCategory: import("@src/models/grocery").ShoppingCategory;
  subcategory?: string;
  qty?: string;
}) {
  const item = useFamilyStore.getState().addGrocery(input);
  fireAndForget(
    getFamilyId().then((fid) =>
      groceryApi.upsert(fid, localToApiGrocery(item)),
    ),
    "Add grocery",
  );
}

export function updateGroceryRemote(id: string, patch: { title?: string; subcategory?: string; qty?: string }) {
  useFamilyStore.getState().updateGrocery(id, patch);
  // Send PATCH with only the changed fields — see BUG-N1 note in module header.
  const apiPatch: Partial<{ title: string; subcategory: string | null; qty: string | null }> = {};
  if (patch.title !== undefined) apiPatch.title = patch.title;
  if (patch.subcategory !== undefined) apiPatch.subcategory = patch.subcategory ?? null;
  if (patch.qty !== undefined) apiPatch.qty = patch.qty ?? null;
  fireAndForget(
    getFamilyId().then((fid) => groceryApi.update(fid, id, apiPatch)),
    "Update grocery",
  );
}

export function toggleGroceryBoughtRemote(id: string) {
  useFamilyStore.getState().toggleGroceryBought(id);
  const item = useFamilyStore.getState().grocery.find((g) => g.id === id);
  if (!item) return;
  fireAndForget(
    getFamilyId().then((fid) =>
      groceryApi.update(fid, id, { isBought: item.isBought }),
    ),
    "Toggle grocery",
  );
}

export function deleteGroceryRemote(id: string) {
  useFamilyStore.getState().deleteGrocery(id);
  fireAndForget(
    getFamilyId().then((fid) => groceryApi.delete(fid, id)),
    "Delete grocery",
  );
}

export function clearBoughtRemote(shoppingCategory?: import("@src/models/grocery").ShoppingCategory) {
  const ids = useFamilyStore.getState().clearBought(shoppingCategory);
  fireAndForget(
    getFamilyId().then((fid) =>
      Promise.all(ids.map((id) => groceryApi.delete(fid, id))),
    ),
    "Clear bought",
  );
}

export function clearAllCategoryRemote(shoppingCategory: import("@src/models/grocery").ShoppingCategory) {
  const ids = useFamilyStore.getState().clearAllCategory(shoppingCategory);
  fireAndForget(
    getFamilyId().then((fid) =>
      Promise.all(ids.map((id) => groceryApi.delete(fid, id))),
    ),
    "Clear all category",
  );
}

// ---------------------------------------------------------------------------
// Notes
// ---------------------------------------------------------------------------

export function addNoteRemote(input: {
  title?: string;
  body: string;
  kidId?: string;
  ownerMemberId?: string;
}) {
  const item = useFamilyStore.getState().addNote(input);
  fireAndForget(
    getFamilyId().then((fid) =>
      notesApi.upsert(fid, localToApiNote(item)),
    ),
    "Add note",
  );
}

export function updateNoteRemote(
  id: string,
  patch: Partial<Pick<Note, "title" | "body" | "kidId" | "ownerMemberId">>,
) {
  useFamilyStore.getState().updateNote(id, patch);
  // PATCH with only changed fields — see BUG-N1 note in module header.
  const apiPatch: Partial<{
    title: string | null;
    body: string;
    kidId: string | null;
    ownerMemberId: string | null;
  }> = {};
  if (patch.title !== undefined) apiPatch.title = patch.title ?? null;
  if (patch.body !== undefined) apiPatch.body = patch.body;
  // Treat the key being present (even with value undefined) as an explicit
  // (un)assign — frontend sends null so the backend updates the column.
  if ("kidId" in patch) apiPatch.kidId = patch.kidId ?? null;
  if ("ownerMemberId" in patch) apiPatch.ownerMemberId = patch.ownerMemberId ?? null;
  fireAndForget(
    getFamilyId().then((fid) => notesApi.update(fid, id, apiPatch)),
    "Update note",
  );
}

export function toggleNotePinnedRemote(id: string) {
  useFamilyStore.getState().toggleNotePinned(id);
  const item = useFamilyStore.getState().notes.find((n) => n.id === id);
  if (!item) return;
  fireAndForget(
    getFamilyId().then((fid) =>
      notesApi.update(fid, id, { pinned: item.pinned }),
    ),
    "Toggle note pinned",
  );
}

export function deleteNoteRemote(id: string) {
  useFamilyStore.getState().deleteNote(id);
  fireAndForget(
    getFamilyId().then((fid) => notesApi.delete(fid, id)),
    "Delete note",
  );
}

/** Persist a new note order (ids top-to-bottom). PATCHes each item's sortOrder. */
export function reorderNotesRemote(ids: string[]) {
  useFamilyStore.getState().reorderNotes(ids);
  const notes = useFamilyStore.getState().notes;
  fireAndForget(
    getFamilyId().then((fid) =>
      Promise.all(
        ids.map((id) => {
          const n = notes.find((x) => x.id === id);
          return n ? notesApi.update(fid, id, { sortOrder: n.sortOrder }) : null;
        }),
      ),
    ),
    "Reorder notes",
  );
}

// ---------------------------------------------------------------------------
// Chores
// ---------------------------------------------------------------------------

export function addChoreRemote(input: {
  title: string;
  assignedTo?: string;
  assignedToMemberId?: string;
}) {
  const item = useFamilyStore.getState().addChore(input);
  fireAndForget(
    getFamilyId().then((fid) =>
      choresApi.upsert(fid, localToApiChore(item)),
    ),
    "Add chore",
  );
}

export function updateChoreRemote(
  id: string,
  patch: Partial<Pick<Chore, "title" | "assignedToMemberId">>,
) {
  useFamilyStore.getState().updateChore(id, patch);
  // PATCH with only changed fields — see BUG-N1 note in module header.
  const apiPatch: Partial<{ title: string; assignedToMemberId: string | null }> = {};
  if (patch.title !== undefined) apiPatch.title = patch.title;
  if (patch.assignedToMemberId !== undefined)
    apiPatch.assignedToMemberId = patch.assignedToMemberId ?? null;
  fireAndForget(
    getFamilyId().then((fid) => choresApi.update(fid, id, apiPatch)),
    "Update chore",
  );
}

export function toggleChoreDoneRemote(id: string) {
  useFamilyStore.getState().toggleChoreDone(id);
  const item = useFamilyStore.getState().chores.find((c) => c.id === id);
  if (!item) return;
  fireAndForget(
    getFamilyId().then((fid) =>
      choresApi.update(fid, id, { done: item.done }),
    ),
    "Toggle chore",
  );
}

export function toggleChoreSelectedForTodayRemote(id: string) {
  useFamilyStore.getState().toggleChoreSelectedForToday(id);
  const item = useFamilyStore.getState().chores.find((c) => c.id === id);
  if (!item) return;
  fireAndForget(
    getFamilyId().then((fid) =>
      choresApi.update(fid, id, { selectedForToday: item.selectedForToday }),
    ),
    "Toggle chore selected for today",
  );
}

export function deleteChoreRemote(id: string) {
  useFamilyStore.getState().deleteChore(id);
  fireAndForget(
    getFamilyId().then((fid) => choresApi.delete(fid, id)),
    "Delete chore",
  );
}

/** Persist a new chore order (ids top-to-bottom). PATCHes each item's sortOrder. */
export function reorderChoresRemote(ids: string[]) {
  useFamilyStore.getState().reorderChores(ids);
  const chores = useFamilyStore.getState().chores;
  fireAndForget(
    getFamilyId().then((fid) =>
      Promise.all(
        ids.map((id) => {
          const c = chores.find((x) => x.id === id);
          return c ? choresApi.update(fid, id, { sortOrder: c.sortOrder }) : null;
        }),
      ),
    ),
    "Reorder chores",
  );
}

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

export function addProjectRemote(input: {
  title: string;
  description?: string;
  kidId?: string;
  ownerMemberId?: string;
}) {
  const item = useFamilyStore.getState().addProject(input);
  fireAndForget(
    getFamilyId().then((fid) =>
      projectsApi.upsert(fid, localToApiProject(item)),
    ),
    "Add project",
  );
}

export function updateProjectRemote(
  id: string,
  patch: Partial<Pick<Project, "title" | "description" | "status" | "progress" | "kidId" | "ownerMemberId">>,
) {
  useFamilyStore.getState().updateProject(id, patch);
  // PATCH with only changed fields — see BUG-N1 note in module header.
  const apiPatch: Partial<{
    title: string;
    description: string | null;
    status: import("@src/models/project").ProjectStatus;
    progress: number;
    kidId: string | null;
    ownerMemberId: string | null;
  }> = {};
  if (patch.title !== undefined) apiPatch.title = patch.title;
  if (patch.description !== undefined) apiPatch.description = patch.description ?? null;
  if (patch.status !== undefined) apiPatch.status = patch.status;
  if (patch.progress !== undefined) apiPatch.progress = patch.progress;
  // Key present (rather than `!== undefined`) so unassign (null/undefined
  // value) is honored — the backend needs to see the key in the PATCH body.
  if ("kidId" in patch) apiPatch.kidId = patch.kidId ?? null;
  if ("ownerMemberId" in patch) apiPatch.ownerMemberId = patch.ownerMemberId ?? null;
  fireAndForget(
    getFamilyId().then((fid) => projectsApi.update(fid, id, apiPatch)),
    "Update project",
  );
}

export function deleteProjectRemote(id: string) {
  useFamilyStore.getState().deleteProject(id);
  fireAndForget(
    getFamilyId().then((fid) => projectsApi.delete(fid, id)),
    "Delete project",
  );
}

/** Persist a new project order (ids top-to-bottom). PATCHes each item's sortOrder. */
export function reorderProjectsRemote(ids: string[]) {
  useFamilyStore.getState().reorderProjects(ids);
  const projects = useFamilyStore.getState().projects;
  fireAndForget(
    getFamilyId().then((fid) =>
      Promise.all(
        ids.map((id) => {
          const p = projects.find((x) => x.id === id);
          return p ? projectsApi.update(fid, id, { sortOrder: p.sortOrder }) : null;
        }),
      ),
    ),
    "Reorder projects",
  );
}

// ---------------------------------------------------------------------------
// Schedule Blocks
// ---------------------------------------------------------------------------

export function addScheduleBlockRemote(input: {
  kidId: string;
  daysOfWeek: number[];
  title: string;
  type: BlockType;
  startMinutes: number;
  endMinutes: number;
  location?: string;
  color?: string;
  isRecurring?: boolean;
  date?: string;
  reminders?: number[];
}) {
  const block = useFamilyStore.getState().addScheduleBlock(input);
  fireAndForget(
    getFamilyId().then((fid) =>
      scheduleBlocksApi.upsert(fid, localToApiScheduleBlock(block)),
    ),
    "Add schedule block",
  );
}

export function updateScheduleBlockRemote(
  id: string,
  patch: Partial<
    Pick<
      ScheduleBlock,
      "daysOfWeek" | "title" | "type" | "startMinutes" | "endMinutes" | "location" | "color" | "isRecurring" | "date" | "reminders"
    >
  >,
) {
  useFamilyStore.getState().updateScheduleBlock(id, patch);
  // PATCH with only changed fields — see BUG-N1 note in module header.
  // `reminders` is stored as JSON string on the wire.
  const apiPatch: Record<string, unknown> = {};
  if (patch.daysOfWeek !== undefined) apiPatch.daysOfWeek = patch.daysOfWeek;
  if (patch.title !== undefined) apiPatch.title = patch.title;
  if (patch.type !== undefined) apiPatch.type = patch.type;
  if (patch.startMinutes !== undefined) apiPatch.startMinutes = patch.startMinutes;
  if (patch.endMinutes !== undefined) apiPatch.endMinutes = patch.endMinutes;
  if (patch.location !== undefined) apiPatch.location = patch.location ?? null;
  if (patch.color !== undefined) apiPatch.color = patch.color ?? null;
  if (patch.isRecurring !== undefined) apiPatch.isRecurring = patch.isRecurring;
  if (patch.date !== undefined) apiPatch.date = patch.date ?? null;
  if (patch.reminders !== undefined)
    apiPatch.reminders =
      patch.reminders && patch.reminders.length > 0
        ? JSON.stringify(patch.reminders)
        : null;
  fireAndForget(
    getFamilyId().then((fid) => scheduleBlocksApi.update(fid, id, apiPatch)),
    "Update schedule block",
  );
}

export function deleteScheduleBlockRemote(id: string) {
  useFamilyStore.getState().deleteScheduleBlock(id);
  fireAndForget(
    getFamilyId().then((fid) => scheduleBlocksApi.delete(fid, id)),
    "Delete schedule block",
  );
}

// ---------------------------------------------------------------------------
// Kids
// ---------------------------------------------------------------------------

export function addKidRemote(input: {
  name: string;
  emoji: string;
  color: string;
}) {
  const item = useFamilyStore.getState().addKid(input);
  fireAndForget(
    getFamilyId().then((fid) =>
      kidsApi.upsert(fid, localToApiKid(item)),
    ),
    "Add kid",
  );
}

export function updateKidRemote(
  id: string,
  patch: Partial<Pick<Kid, "name" | "emoji" | "color">>,
) {
  useFamilyStore.getState().updateKid(id, patch);
  // PATCH with only changed fields — see BUG-N1 note in module header.
  const apiPatch: Partial<{ name: string; emoji: string; color: string }> = {};
  if (patch.name !== undefined) apiPatch.name = patch.name;
  if (patch.emoji !== undefined) apiPatch.emoji = patch.emoji;
  if (patch.color !== undefined) apiPatch.color = patch.color;
  fireAndForget(
    getFamilyId().then((fid) => kidsApi.update(fid, id, apiPatch)),
    "Update kid",
  );
}

export function setKidActiveRemote(id: string, isActive: boolean) {
  useFamilyStore.getState().setKidActive(id, isActive);
  const item = useFamilyStore.getState().kids.find((k) => k.id === id);
  if (!item) return;
  fireAndForget(
    getFamilyId().then((fid) =>
      kidsApi.update(fid, id, { isActive }),
    ),
    "Toggle kid active",
  );
}

// ---------------------------------------------------------------------------
// Family Members
// ---------------------------------------------------------------------------

export function addFamilyMemberRemote(input: {
  name: string;
  role: MemberRole;
  color?: string;
  avatarEmoji?: string;
}) {
  const item = useFamilyStore.getState().addFamilyMember(input);
  fireAndForget(
    getFamilyId().then((fid) =>
      familyMembersApi.upsert(fid, localToApiFamilyMember(item)),
    ),
    "Add family member",
  );
}

export function updateFamilyMemberRemote(
  id: string,
  patch: Partial<Pick<FamilyMember, "name" | "role" | "color" | "avatarEmoji">>,
) {
  useFamilyStore.getState().updateFamilyMember(id, patch);
  // PATCH with only changed fields — see BUG-N1 note in module header.
  const apiPatch: Partial<{
    name: string;
    role: MemberRole;
    color: string | null;
    avatarEmoji: string | null;
  }> = {};
  if (patch.name !== undefined) apiPatch.name = patch.name;
  if (patch.role !== undefined) apiPatch.role = patch.role;
  if (patch.color !== undefined) apiPatch.color = patch.color ?? null;
  if (patch.avatarEmoji !== undefined) apiPatch.avatarEmoji = patch.avatarEmoji ?? null;
  fireAndForget(
    getFamilyId().then((fid) => familyMembersApi.update(fid, id, apiPatch)),
    "Update family member",
  );
}

export function setFamilyMemberActiveRemote(id: string, isActive: boolean) {
  useFamilyStore.getState().setFamilyMemberActive(id, isActive);
  const item = useFamilyStore
    .getState()
    .familyMembers.find((m) => m.id === id);
  if (!item) return;
  fireAndForget(
    getFamilyId().then((fid) =>
      familyMembersApi.update(fid, id, { isActive }),
    ),
    "Toggle family member active",
  );
}

/** Link the current user to a family member (claim "who am I"). */
export async function claimFamilyMemberRemote(memberId: string): Promise<void> {
  const fid = await getFamilyId();
  const apiMember = await familyMembersApi.claim(fid, memberId);
  // Update local store with the returned member (which now has userId set)
  const local = apiToLocalFamilyMember(apiMember);
  useFamilyStore.getState().updateFamilyMember(memberId, {
    ...local,
  });
}

// ---------------------------------------------------------------------------
// Family Events
// ---------------------------------------------------------------------------

export function addFamilyEventRemote(input: {
  title: string;
  assigneeType: AssigneeType;
  assigneeId?: string;
  daysOfWeek: number[];
  startMinutes: number;
  endMinutes: number;
  location?: string;
  color?: string;
  isRecurring?: boolean;
  date?: string;
  reminders?: number[];
}) {
  const item = useFamilyStore.getState().addFamilyEvent(input);
  fireAndForget(
    getFamilyId().then((fid) =>
      familyEventsApi.upsert(fid, localToApiFamilyEvent(item)),
    ),
    "Add family event",
  );
}

export function updateFamilyEventRemote(
  id: string,
  patch: Partial<
    Pick<
      FamilyEvent,
      "title" | "assigneeType" | "assigneeId" | "daysOfWeek" | "startMinutes" | "endMinutes" | "location" | "color" | "isRecurring" | "date" | "reminders"
    >
  >,
) {
  useFamilyStore.getState().updateFamilyEvent(id, patch);
  // PATCH with only changed fields — see BUG-N1 note in module header.
  // `reminders` is stored as JSON string on the wire.
  const apiPatch: Record<string, unknown> = {};
  if (patch.title !== undefined) apiPatch.title = patch.title;
  if (patch.assigneeType !== undefined) apiPatch.assigneeType = patch.assigneeType;
  if (patch.assigneeId !== undefined) apiPatch.assigneeId = patch.assigneeId ?? null;
  if (patch.daysOfWeek !== undefined) apiPatch.daysOfWeek = patch.daysOfWeek;
  if (patch.startMinutes !== undefined) apiPatch.startMinutes = patch.startMinutes;
  if (patch.endMinutes !== undefined) apiPatch.endMinutes = patch.endMinutes;
  if (patch.location !== undefined) apiPatch.location = patch.location ?? null;
  if (patch.color !== undefined) apiPatch.color = patch.color ?? null;
  if (patch.isRecurring !== undefined) apiPatch.isRecurring = patch.isRecurring;
  if (patch.date !== undefined) apiPatch.date = patch.date ?? null;
  if (patch.reminders !== undefined)
    apiPatch.reminders =
      patch.reminders && patch.reminders.length > 0
        ? JSON.stringify(patch.reminders)
        : null;
  fireAndForget(
    getFamilyId().then((fid) => familyEventsApi.update(fid, id, apiPatch)),
    "Update family event",
  );
}

export function deleteFamilyEventRemote(id: string) {
  useFamilyStore.getState().deleteFamilyEvent(id);
  fireAndForget(
    getFamilyId().then((fid) => familyEventsApi.delete(fid, id)),
    "Delete family event",
  );
}

// ---------------------------------------------------------------------------
// Budget Categories
// ---------------------------------------------------------------------------

export function addBudgetCategoryRemote(input: {
  name: string;
  icon: string;
  color: string;
  monthlyCap?: number;
  sortOrder?: number;
}): BudgetCategory {
  const item = useFamilyStore.getState().addBudgetCategory(input);
  fireAndForget(
    getFamilyId().then((fid) => budgetCategoriesApi.upsert(fid, localToApiBudgetCategory(item))),
    "Add budget category",
  );
  return item;
}

export function updateBudgetCategoryRemote(
  id: string,
  patch: Partial<Pick<BudgetCategory, "name" | "icon" | "color" | "monthlyCap" | "sortOrder">>,
) {
  useFamilyStore.getState().updateBudgetCategory(id, patch);
  fireAndForget(
    getFamilyId().then((fid) => budgetCategoriesApi.update(fid, id, patch as any)),
    "Update budget category",
  );
}

export function deleteBudgetCategoryRemote(id: string) {
  useFamilyStore.getState().deleteBudgetCategory(id);
  fireAndForget(
    getFamilyId().then((fid) => budgetCategoriesApi.delete(fid, id)),
    "Delete budget category",
  );
}

// ---------------------------------------------------------------------------
// Expenses
// ---------------------------------------------------------------------------

export function addExpenseRemote(input: {
  amount: number;
  categoryName: string;
  payerMemberId?: string;
  kidId?: string;
  date: string;
  note?: string;
  paid?: boolean;
  isRecurring?: boolean;
  recurrenceType?: Expense["recurrenceType"];
  recurrenceDay?: number;
}): Expense {
  const item = useFamilyStore.getState().addExpense(input);
  fireAndForget(
    getFamilyId().then((fid) => expensesApi.upsert(fid, localToApiExpense(item))),
    "Add expense",
  );
  return item;
}

export function updateExpenseRemote(
  id: string,
  patch: Partial<Pick<Expense, "amount" | "categoryName" | "payerMemberId" | "kidId" | "date" | "note" | "paid" | "isRecurring" | "recurrenceType" | "recurrenceDay">>,
) {
  useFamilyStore.getState().updateExpense(id, patch);
  // The PATCH body is serialized with JSON.stringify, which DROPS keys whose
  // value is `undefined` — so an explicit "clear this field" (e.g. setting
  // recurrenceType to undefined when a payment stops being recurring) would
  // never reach the server, leaving stale values. Coerce present-`undefined`
  // values to `null` so clears actually persist. (Absent keys stay absent, so
  // field-by-field merge for concurrent edits is unaffected.)
  const apiPatch: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(patch)) apiPatch[k] = v === undefined ? null : v;
  fireAndForget(
    getFamilyId().then((fid) => expensesApi.update(fid, id, apiPatch as any)),
    "Update expense",
  );
}

export function deleteExpenseRemote(id: string) {
  useFamilyStore.getState().deleteExpense(id);
  fireAndForget(
    getFamilyId().then((fid) => expensesApi.delete(fid, id)),
    "Delete expense",
  );
}

/**
 * Mark a kid payment paid.
 *
 * Recurring template (isRecurring:true): the template is a persistent schedule
 * and is never settled or duplicated. We create a separate settled OCCURRENCE
 * for the current due period (history + budget spend); the template stays put,
 * and its next-due simply recomputes to the following unpaid period.
 *
 * One-time payment (isRecurring:false): settle it in place.
 *
 * This template+occurrence model replaces the old "settle row + spawn next"
 * chain, which produced duplicate "to pay" rows and gaps under repeated
 * mark/undo clicks.
 */
export function markKidPaymentPaidRemote(payment: Expense) {
  if (payment.isRecurring) {
    const due = nextDueForSeries(payment, useFamilyStore.getState().expenses);
    addExpenseRemote({
      amount: payment.amount,
      categoryName: payment.categoryName,
      kidId: payment.kidId,
      date: due,
      note: payment.note,
      paid: true,
      isRecurring: false,
      // Tag with the recurrence so undo knows this is a series occurrence.
      recurrenceType: payment.recurrenceType,
      recurrenceDay: payment.recurrenceDay,
    });
  } else {
    updateExpenseRemote(payment.id, { paid: true });
  }
}

/**
 * Undo a settled kid payment.
 *
 * A settled *recurring occurrence* (tagged with recurrenceType) is removed —
 * which simply reopens that period in the template's next-due computation. A
 * one-time settled payment goes back to "to pay".
 */
export function markKidPaymentUnpaidRemote(payment: Expense) {
  if (isRecurringOccurrence(payment)) {
    deleteExpenseRemote(payment.id);
  } else {
    updateExpenseRemote(payment.id, { paid: false });
  }
}
