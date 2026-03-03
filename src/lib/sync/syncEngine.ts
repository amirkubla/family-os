/**
 * syncEngine.ts — Pull / push / full-sync helpers.
 *
 * pullAll:  fetch all 5 modules in parallel → replace local state (server wins).
 * pushAll:  upsert all local items to server.
 * syncAll:  push then pull (server wins on conflict).
 */

import { useFamilyStore } from "@src/store/useFamilyStore";
import { getFamilyId } from "../familyContext";
import {
  groceryApi,
  notesApi,
  choresApi,
  projectsApi,
  kidsApi,
  scheduleBlocksApi,
} from "../api/endpoints";
import {
  apiToLocalGrocery,
  apiToLocalNote,
  apiToLocalChore,
  apiToLocalProject,
  apiToLocalKid,
  apiToLocalScheduleBlock,
  localToApiGrocery,
  localToApiNote,
  localToApiChore,
  localToApiProject,
  localToApiKid,
  localToApiScheduleBlock,
} from "../api/mappers";

// ---------------------------------------------------------------------------
// Pull (server → local)
// ---------------------------------------------------------------------------

export async function pullAll(): Promise<void> {
  const store = useFamilyStore.getState();
  store.setSyncStatus("syncing");

  try {
    const fid = await getFamilyId();

    const [grocery, notes, chores, projects, kids, scheduleBlocks] =
      await Promise.all([
        groceryApi.list(fid),
        notesApi.list(fid),
        choresApi.list(fid),
        projectsApi.list(fid),
        kidsApi.list(fid),
        scheduleBlocksApi.list(fid),
      ]);

    store.setGrocery(grocery.map(apiToLocalGrocery));
    store.setNotes(notes.map(apiToLocalNote));
    store.setChores(chores.map(apiToLocalChore));
    store.setProjects(projects.map(apiToLocalProject));
    store.setKids(kids.map(apiToLocalKid));
    store.setScheduleBlocks(scheduleBlocks.map(apiToLocalScheduleBlock));
    store.setLastSyncedAt(Date.now());
    store.setSyncStatus("idle");
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Sync pull failed";
    store.setSyncStatus("error", msg);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Push (local → server)
// ---------------------------------------------------------------------------

export async function pushAll(): Promise<void> {
  const store = useFamilyStore.getState();
  store.setSyncStatus("syncing");

  try {
    const fid = await getFamilyId();
    const { grocery, notes, chores, projects, kids, scheduleBlocks } = store;

    await Promise.all([
      ...grocery.map((item) =>
        groceryApi.upsert(fid, localToApiGrocery(item)),
      ),
      ...notes.map((item) =>
        notesApi.upsert(fid, localToApiNote(item)),
      ),
      ...chores.map((item) =>
        choresApi.upsert(fid, localToApiChore(item)),
      ),
      ...projects.map((item) =>
        projectsApi.upsert(fid, localToApiProject(item)),
      ),
      ...kids.map((item) =>
        kidsApi.upsert(fid, localToApiKid(item)),
      ),
      ...scheduleBlocks.map((item) =>
        scheduleBlocksApi.upsert(fid, localToApiScheduleBlock(item)),
      ),
    ]);

    store.setSyncStatus("idle");
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Sync push failed";
    store.setSyncStatus("error", msg);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Full sync: push then pull (server wins on conflict)
// ---------------------------------------------------------------------------

export async function syncAll(): Promise<void> {
  await pushAll();
  await pullAll();
}
