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
  foldersApi,
  documentsApi,
} from "../api/endpoints";
import {
  apiToLocalGrocery,
  apiToLocalNote,
  apiToLocalChore,
  apiToLocalProject,
  apiToLocalKid,
  apiToLocalScheduleBlock,
  apiToLocalFamilyMember,
  apiToLocalFamilyEvent,
  apiToLocalBudgetCategory,
  apiToLocalExpense,
  apiToLocalFolder,
  apiToLocalDocument,
  localToApiGrocery,
  localToApiNote,
  localToApiChore,
  localToApiProject,
  localToApiKid,
  localToApiScheduleBlock,
  localToApiFamilyMember,
  localToApiFamilyEvent,
  localToApiBudgetCategory,
  localToApiExpense,
} from "../api/mappers";

// ---------------------------------------------------------------------------
// Pull (server → local)
// ---------------------------------------------------------------------------

export async function pullAll(familyIdOverride?: string): Promise<void> {
  const store = useFamilyStore.getState();
  store.setSyncStatus("syncing");

  try {
    const fid = familyIdOverride ?? (await getFamilyId());

    // Use allSettled so one failing endpoint doesn't kill the entire sync
    const results = await Promise.allSettled([
      familyApi.list(),
      groceryApi.list(fid),
      notesApi.list(fid),
      choresApi.list(fid),
      projectsApi.list(fid),
      kidsApi.list(fid),
      scheduleBlocksApi.list(fid),
      familyMembersApi.list(fid),
      familyEventsApi.list(fid),
      customizationsApi.get(fid),
      budgetCategoriesApi.list(fid),
      expensesApi.list(fid),
      foldersApi.list(fid),
      documentsApi.list(fid),
    ]);

    // Log any failures and figure out which endpoints succeeded.
    // CRITICAL: we only call store.setX() for endpoints that succeeded.
    // The previous version did `val(rejected, [])` and then `store.setX([])`,
    // which silently *wiped* the local cache for any failed resource — a flaky
    // network hop would erase your grocery list / events / etc. instead of
    // showing the previous data with a sync-error banner.
    const names = ["families", "grocery", "notes", "chores", "projects", "kids", "scheduleBlocks", "members", "events", "customizations", "budgetCategories", "expenses", "folders", "documents"];
    const failures = results
      .map((r, i) => (r.status === "rejected" ? i : null))
      .filter((i): i is number => i !== null);
    if (failures.length > 0) {
      const failedNames = failures.map((i) => names[i]).join(", ");
      console.warn(`[sync] Partial pull — keeping local cache for: ${failedNames}`);
    }

    // Helper: apply `setX(mapped)` ONLY when the corresponding fetch succeeded.
    // For rejected endpoints, we do nothing — local cache stays as-is.
    const applyIfOk = <T, U>(
      idx: number,
      mapper: (raw: T) => U,
      setter: (mapped: U[]) => void,
    ) => {
      const r = results[idx];
      if (r.status === "fulfilled") {
        setter((r.value as T[]).map(mapper));
      }
    };

    // Set family name from matching family (only if family list succeeded)
    if (results[0].status === "fulfilled") {
      const familyList = results[0].value as { id: string; name: string }[];
      const currentFamily = familyList.find((f) => f.id === fid);
      if (currentFamily) {
        store.setFamilyName(currentFamily.name);
      }
    }

    applyIfOk(1, apiToLocalGrocery, store.setGrocery);
    applyIfOk(2, apiToLocalNote, store.setNotes);
    applyIfOk(3, apiToLocalChore, store.setChores);
    applyIfOk(4, apiToLocalProject, store.setProjects);
    applyIfOk(5, apiToLocalKid, store.setKids);
    applyIfOk(6, apiToLocalScheduleBlock, store.setScheduleBlocks);
    applyIfOk(7, apiToLocalFamilyMember, store.setFamilyMembers);
    applyIfOk(8, apiToLocalFamilyEvent, store.setFamilyEvents);
    // Customizations is a singleton object (not a list), so applyIfOk's
    // map-and-set shape doesn't fit — handle it inline.
    if (results[9].status === "fulfilled") {
      const value = results[9].value as
        | import("@src/models/customization").FamilyCustomizations
        | null;
      store.setCustomizations(value ?? {});
    }
    applyIfOk(10, apiToLocalBudgetCategory, store.setBudgetCategories);
    applyIfOk(11, apiToLocalExpense, store.setExpenses);
    applyIfOk(12, apiToLocalFolder, store.setFolders);
    applyIfOk(13, apiToLocalDocument, store.setDocuments);
    store.setLastSyncedAt(Date.now());
    store.setSyncStatus(failures.length > 0 ? "error" : "idle",
      failures.length > 0 ? "Partial sync" : undefined);
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
    const { grocery, notes, chores, projects, kids, scheduleBlocks, familyMembers, familyEvents, budgetCategories, expenses } = store;

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
      ...familyMembers.map((item) =>
        familyMembersApi.upsert(fid, localToApiFamilyMember(item)),
      ),
      ...familyEvents.map((item) =>
        familyEventsApi.upsert(fid, localToApiFamilyEvent(item)),
      ),
      ...budgetCategories.map((item) =>
        budgetCategoriesApi.upsert(fid, localToApiBudgetCategory(item)),
      ),
      ...expenses.map((item) =>
        expensesApi.upsert(fid, localToApiExpense(item)),
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
