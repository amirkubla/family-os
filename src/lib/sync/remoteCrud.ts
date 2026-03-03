/**
 * remoteCrud.ts — Fire-and-forget CRUD wrappers.
 *
 * Pattern:
 *   1. Mutate local store immediately (optimistic).
 *   2. Fire API call in the background.
 *   3. On error → call onSyncError callback (for Snackbar).
 *
 * The app stays responsive even if the API is down.
 */

import { useFamilyStore } from "@src/store/useFamilyStore";
import { getFamilyId } from "../familyContext";
import {
  groceryApi,
  notesApi,
  choresApi,
  projectsApi,
  scheduleBlocksApi,
} from "../api/endpoints";
import {
  localToApiGrocery,
  localToApiNote,
  localToApiChore,
  localToApiProject,
  localToApiScheduleBlock,
} from "../api/mappers";
import type { GroceryItem } from "@src/models/grocery";
import type { Note } from "@src/models/note";
import type { Chore } from "@src/models/chore";
import type { Project } from "@src/models/project";
import type { ScheduleBlock, BlockType } from "@src/models/schedule";

// ---------------------------------------------------------------------------
// Error handler — set by UI (Snackbar)
// ---------------------------------------------------------------------------

let _onSyncError: ((msg: string) => void) | null = null;

export function setSyncErrorHandler(handler: (msg: string) => void) {
  _onSyncError = handler;
}

function fireAndForget(promise: Promise<unknown>, label: string) {
  promise.catch((err) => {
    const msg = `${label}: ${err instanceof Error ? err.message : "unknown error"}`;
    console.warn("[sync]", msg);
    _onSyncError?.(msg);
  });
}

// ---------------------------------------------------------------------------
// Grocery
// ---------------------------------------------------------------------------

export function addGroceryRemote(input: {
  title: string;
  category: string;
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

export function clearBoughtRemote() {
  const ids = useFamilyStore.getState().clearBought();
  fireAndForget(
    getFamilyId().then((fid) =>
      Promise.all(ids.map((id) => groceryApi.delete(fid, id))),
    ),
    "Clear bought",
  );
}

// ---------------------------------------------------------------------------
// Notes
// ---------------------------------------------------------------------------

export function addNoteRemote(input: { title?: string; body: string }) {
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
  patch: Partial<Pick<Note, "title" | "body">>,
) {
  useFamilyStore.getState().updateNote(id, patch);
  const item = useFamilyStore.getState().notes.find((n) => n.id === id);
  if (!item) return;
  fireAndForget(
    getFamilyId().then((fid) =>
      notesApi.upsert(fid, localToApiNote(item)),
    ),
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

// ---------------------------------------------------------------------------
// Chores
// ---------------------------------------------------------------------------

export function addChoreRemote(input: {
  title: string;
  assignedTo?: string;
}) {
  const item = useFamilyStore.getState().addChore(input);
  fireAndForget(
    getFamilyId().then((fid) =>
      choresApi.upsert(fid, localToApiChore(item)),
    ),
    "Add chore",
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

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

export function addProjectRemote(input: {
  title: string;
  description?: string;
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
  patch: Partial<Pick<Project, "title" | "description" | "status" | "progress">>,
) {
  useFamilyStore.getState().updateProject(id, patch);
  const item = useFamilyStore.getState().projects.find((p) => p.id === id);
  if (!item) return;
  fireAndForget(
    getFamilyId().then((fid) =>
      projectsApi.upsert(fid, localToApiProject(item)),
    ),
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

// ---------------------------------------------------------------------------
// Schedule Blocks
// ---------------------------------------------------------------------------

export function addScheduleBlockRemote(input: {
  kidId: string;
  dayOfWeek: number;
  title: string;
  type: BlockType;
  startMinutes: number;
  endMinutes: number;
  location?: string;
  color?: string;
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
      "dayOfWeek" | "title" | "type" | "startMinutes" | "endMinutes" | "location" | "color"
    >
  >,
) {
  useFamilyStore.getState().updateScheduleBlock(id, patch);
  const block = useFamilyStore
    .getState()
    .scheduleBlocks.find((b) => b.id === id);
  if (!block) return;
  fireAndForget(
    getFamilyId().then((fid) =>
      scheduleBlocksApi.upsert(fid, localToApiScheduleBlock(block)),
    ),
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
