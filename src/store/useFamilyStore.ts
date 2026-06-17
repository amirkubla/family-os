import { create } from "zustand";
import { persist, createJSONStorage, type StateStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { GroceryItem, ShoppingCategory } from "@src/models/grocery";
import type { Note } from "@src/models/note";
import type { Chore } from "@src/models/chore";
import type { Project, ProjectStatus } from "@src/models/project";
import type { ScheduleBlock, BlockType } from "@src/models/schedule";
import type { Kid } from "@src/models/kid";
import type { FamilyMember, MemberRole } from "@src/models/familyMember";
import type { FamilyEvent, AssigneeType } from "@src/models/familyEvent";
import type { FamilyCustomizations } from "@src/models/customization";
import type { BudgetCategory, Expense } from "@src/models/budget";
import { makeId } from "@src/utils/id";

/**
 * Defensive storage wrapper that drops corrupt persisted state instead of
 * letting JSON.parse throw and stall rehydration forever (which manifested as
 * a permanent blank screen — see QA Pass 2 BUG #1).
 *
 * If the stored value is unparseable JSON, we:
 *   1. log a warning,
 *   2. remove the bad key so the next write starts fresh,
 *   3. return null → Zustand treats it as "no persisted state" and uses defaults.
 *
 * After that, the next successful pullAll() backfills the store from the server.
 */
const safeStorage: StateStorage = {
  getItem: async (name) => {
    const raw = await AsyncStorage.getItem(name);
    if (raw == null) return null;
    try {
      JSON.parse(raw);
      return raw;
    } catch (err) {
      console.warn(
        "[store] Persisted state is corrupt JSON; dropping and starting fresh.",
        err,
      );
      try {
        await AsyncStorage.removeItem(name);
      } catch {
        // ignore — worst case the next setItem overwrites it
      }
      return null;
    }
  },
  setItem: (name, value) => AsyncStorage.setItem(name, value),
  removeItem: (name) => AsyncStorage.removeItem(name),
};

/* ─── Sync status ─── */

export type SyncStatus = "idle" | "syncing" | "error";

/* ─── State shape ─── */

/** Which home-screen sections are expanded. Persisted; defaults to all expanded. */
export interface HomeSectionsState {
  notes: boolean;
  chores: boolean;
  projects: boolean;
}

export type HomeSectionKey = keyof HomeSectionsState;

interface FamilyState {
  familyName: string;
  grocery: GroceryItem[];
  notes: Note[];
  chores: Chore[];
  projects: Project[];
  kids: Kid[];
  scheduleBlocks: ScheduleBlock[];
  familyMembers: FamilyMember[];
  familyEvents: FamilyEvent[];
  budgetCategories: BudgetCategory[];
  expenses: Expense[];

  // Onboarding
  onboardingComplete: boolean;

  // Home screen UI state — which sections are expanded
  homeSections: HomeSectionsState;

  // Per-family preferences (extensible JSONB; see models/customization.ts).
  // Empty object = "use defaults". Replaced wholesale on PUT — the
  // settings screen always sends the complete object.
  customizations: FamilyCustomizations;

  // Sync metadata
  syncStatus: SyncStatus;
  syncError: string | null;
  lastSyncedAt: number | null;

  // Onboarding
  setOnboardingComplete: (val: boolean) => void;

  // Home sections (collapse/expand)
  toggleHomeSection: (key: HomeSectionKey) => void;

  // Customizations (full replace — see comment on the field)
  setCustomizations: (next: FamilyCustomizations) => void;

  // Family name
  setFamilyName: (name: string) => void;

  // Bulk setters (used by sync engine to replace entire collections)
  setGrocery: (items: GroceryItem[]) => void;
  setNotes: (items: Note[]) => void;
  setChores: (items: Chore[]) => void;
  setProjects: (items: Project[]) => void;
  setKids: (items: Kid[]) => void;
  setScheduleBlocks: (items: ScheduleBlock[]) => void;
  setFamilyMembers: (items: FamilyMember[]) => void;
  setFamilyEvents: (items: FamilyEvent[]) => void;
  setBudgetCategories: (items: BudgetCategory[]) => void;
  setExpenses: (items: Expense[]) => void;
  setSyncStatus: (status: SyncStatus, error?: string | null) => void;
  setLastSyncedAt: (ts: number) => void;

  // Grocery actions
  addGrocery: (input: {
    title: string;
    shoppingCategory: ShoppingCategory;
    subcategory?: string;
    qty?: string;
  }) => GroceryItem;
  updateGrocery: (id: string, patch: { title?: string; subcategory?: string; qty?: string }) => void;
  toggleGroceryBought: (id: string) => void;
  deleteGrocery: (id: string) => void;
  clearBought: (shoppingCategory?: ShoppingCategory) => string[];
  clearAllCategory: (shoppingCategory: ShoppingCategory) => string[];

  // Notes actions
  addNote: (input: { title?: string; body: string; kidId?: string }) => Note;
  updateNote: (id: string, patch: Partial<Pick<Note, "title" | "body" | "kidId">>) => void;
  /** Reassign note sortOrder from the given top-to-bottom id order. */
  reorderNotes: (ids: string[]) => void;
  toggleNotePinned: (id: string) => void;
  deleteNote: (id: string) => void;

  // Chores actions
  addChore: (input: { title: string; assignedTo?: string; assignedToMemberId?: string }) => Chore;
  updateChore: (
    id: string,
    patch: Partial<Pick<Chore, "title" | "assignedToMemberId">>
  ) => void;
  toggleChoreDone: (id: string) => void;
  toggleChoreSelectedForToday: (id: string) => void;
  deleteChore: (id: string) => void;
  /** Reassign chore sortOrder from the given top-to-bottom id order. */
  reorderChores: (ids: string[]) => void;

  // Kids actions
  addKid: (input: { name: string; emoji: string; color: string }) => Kid;
  updateKid: (id: string, patch: Partial<Pick<Kid, "name" | "emoji" | "color">>) => void;
  setKidActive: (id: string, isActive: boolean) => void;

  // Family Members actions
  addFamilyMember: (input: {
    name: string;
    role: MemberRole;
    color?: string;
    avatarEmoji?: string;
  }) => FamilyMember;
  updateFamilyMember: (
    id: string,
    patch: Partial<Pick<FamilyMember, "name" | "role" | "color" | "avatarEmoji">>
  ) => void;
  setFamilyMemberActive: (id: string, isActive: boolean) => void;

  // Projects actions
  addProject: (input: { title: string; description?: string; kidId?: string }) => Project;
  updateProject: (
    id: string,
    patch: Partial<Pick<Project, "title" | "description" | "status" | "progress" | "kidId">>
  ) => void;
  deleteProject: (id: string) => void;
  /** Reassign project sortOrder from the given top-to-bottom id order. */
  reorderProjects: (ids: string[]) => void;

  // Family Events actions
  addFamilyEvent: (input: {
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
  }) => FamilyEvent;
  updateFamilyEvent: (
    id: string,
    patch: Partial<
      Pick<
        FamilyEvent,
        "title" | "assigneeType" | "assigneeId" | "daysOfWeek" | "startMinutes" | "endMinutes" | "location" | "color" | "isRecurring" | "date" | "reminders"
      >
    >
  ) => void;
  deleteFamilyEvent: (id: string) => void;

  // Schedule actions
  addScheduleBlock: (input: {
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
  }) => ScheduleBlock;
  updateScheduleBlock: (
    id: string,
    patch: Partial<
      Pick<
        ScheduleBlock,
        "daysOfWeek" | "title" | "type" | "startMinutes" | "endMinutes" | "location" | "color" | "isRecurring" | "date" | "reminders"
      >
    >
  ) => void;
  deleteScheduleBlock: (id: string) => void;

  // Budget Categories actions
  addBudgetCategory: (input: { name: string; icon: string; color: string; monthlyCap?: number; sortOrder?: number }) => BudgetCategory;
  updateBudgetCategory: (id: string, patch: Partial<Pick<BudgetCategory, "name" | "icon" | "color" | "monthlyCap" | "sortOrder">>) => void;
  deleteBudgetCategory: (id: string) => void;

  // Expense actions
  addExpense: (input: { amount: number; categoryName: string; payerMemberId?: string; kidId?: string; date: string; note?: string; isRecurring?: boolean; recurrenceDay?: number }) => Expense;
  updateExpense: (id: string, patch: Partial<Pick<Expense, "amount" | "categoryName" | "payerMemberId" | "kidId" | "date" | "note" | "isRecurring" | "recurrenceDay">>) => void;
  deleteExpense: (id: string) => void;
}

/* ─── Store ─── */

export const useFamilyStore = create<FamilyState>()(
  persist(
    (set, get) => ({
      familyName: "",
      grocery: [],
      notes: [],
      chores: [],
      projects: [],
      kids: [],
      scheduleBlocks: [],
      familyMembers: [],
      familyEvents: [],
      budgetCategories: [],
      expenses: [],

      onboardingComplete: false,

      // Home sections start expanded — matches pre-feature behavior, users
      // can collapse what they don't want to see.
      homeSections: { notes: true, chores: true, projects: true },

      // Empty until pullAll fetches the family's saved customizations.
      // Consumers should read effective values via effectiveSubcategories()
      // from models/customization.ts, which falls back to Hebrew defaults.
      customizations: {},

      syncStatus: "idle" as SyncStatus,
      syncError: null,
      lastSyncedAt: null,

      /* ── Onboarding ── */

      setOnboardingComplete: (val) => set({ onboardingComplete: val }),

      /* ── Home sections ── */

      toggleHomeSection: (key) =>
        set((state) => ({
          homeSections: { ...state.homeSections, [key]: !state.homeSections[key] },
        })),

      /* ── Customizations ── */

      setCustomizations: (next) => set({ customizations: next }),

      /* ── Family name ── */

      setFamilyName: (name) => set({ familyName: name }),

      /* ── Bulk setters ── */

      setGrocery: (items) => set({ grocery: items }),
      setNotes: (items) => set({ notes: items }),
      setChores: (items) => set({ chores: items }),
      setProjects: (items) => set({ projects: items }),
      setKids: (items) => set({ kids: items }),
      setScheduleBlocks: (items) => set({ scheduleBlocks: items }),
      setFamilyMembers: (items) => set({ familyMembers: items }),
      setFamilyEvents: (items) => set({ familyEvents: items }),
      setBudgetCategories: (items) => set({ budgetCategories: items }),
      setExpenses: (items) => set({ expenses: items }),
      setSyncStatus: (status, error = null) =>
        set({ syncStatus: status, syncError: error }),
      setLastSyncedAt: (ts) => set({ lastSyncedAt: ts }),

      /* ── Grocery ── */

      addGrocery: ({ title, shoppingCategory, subcategory, qty }) => {
        const now = Date.now();
        const item: GroceryItem = {
          id: makeId(),
          title,
          shoppingCategory,
          subcategory,
          qty,
          isBought: false,
          updatedAt: now,
          createdAt: now,
        };
        set((s) => ({ grocery: [item, ...s.grocery] }));
        return item;
      },

      toggleGroceryBought: (id) =>
        set((s) => ({
          grocery: s.grocery.map((g) =>
            g.id === id
              ? { ...g, isBought: !g.isBought, updatedAt: Date.now() }
              : g
          ),
        })),

      updateGrocery: (id, patch) =>
        set((s) => ({
          grocery: s.grocery.map((g) =>
            g.id === id ? { ...g, ...patch } : g,
          ),
        })),

      deleteGrocery: (id) =>
        set((s) => ({
          grocery: s.grocery.filter((g) => g.id !== id),
        })),

      clearBought: (shoppingCategory) => {
        const bought = get().grocery.filter(
          (g) => g.isBought && (!shoppingCategory || g.shoppingCategory === shoppingCategory),
        );
        const ids = bought.map((g) => g.id);
        set((s) => ({
          grocery: s.grocery.filter((g) => !ids.includes(g.id)),
        }));
        return ids;
      },

      clearAllCategory: (shoppingCategory) => {
        const items = get().grocery.filter(
          (g) => g.shoppingCategory === shoppingCategory,
        );
        const ids = items.map((g) => g.id);
        set((s) => ({
          grocery: s.grocery.filter((g) => !ids.includes(g.id)),
        }));
        return ids;
      },

      /* ── Notes ── */

      addNote: ({ title, body, kidId }) => {
        const now = Date.now();
        const minOrder = get().notes.reduce((m, n) => Math.min(m, n.sortOrder ?? 0), 0);
        const item: Note = {
          id: makeId(),
          title,
          body,
          pinned: false,
          sortOrder: minOrder - 1, // prepend → sorts first
          kidId,
          updatedAt: now,
          createdAt: now,
        };
        set((s) => ({ notes: [item, ...s.notes] }));
        return item;
      },

      updateNote: (id, patch) =>
        set((s) => ({
          notes: s.notes.map((n) =>
            n.id === id ? { ...n, ...patch, updatedAt: Date.now() } : n
          ),
        })),

      toggleNotePinned: (id) =>
        set((s) => ({
          notes: s.notes.map((n) =>
            n.id === id ? { ...n, pinned: !n.pinned, updatedAt: Date.now() } : n
          ),
        })),

      deleteNote: (id) =>
        set((s) => ({
          notes: s.notes.filter((n) => n.id !== id),
        })),

      reorderNotes: (ids) =>
        set((s) => {
          const pos = new Map(ids.map((id, i) => [id, i]));
          return {
            notes: s.notes.map((n) =>
              pos.has(n.id) ? { ...n, sortOrder: pos.get(n.id)!, updatedAt: Date.now() } : n
            ),
          };
        }),

      /* ── Chores ── */

      addChore: ({ title, assignedTo, assignedToMemberId }) => {
        const now = Date.now();
        const minOrder = get().chores.reduce((m, c) => Math.min(m, c.sortOrder ?? 0), 0);
        const item: Chore = {
          id: makeId(),
          title,
          assignedTo,
          assignedToMemberId,
          done: false,
          selectedForToday: false,
          sortOrder: minOrder - 1, // prepend → sorts first
          updatedAt: now,
          createdAt: now,
        };
        set((s) => ({ chores: [item, ...s.chores] }));
        return item;
      },

      updateChore: (id, patch) =>
        set((s) => ({
          chores: s.chores.map((c) =>
            c.id === id ? { ...c, ...patch, updatedAt: Date.now() } : c
          ),
        })),

      toggleChoreDone: (id) =>
        set((s) => ({
          chores: s.chores.map((c) =>
            c.id === id
              ? { ...c, done: !c.done, updatedAt: Date.now() }
              : c
          ),
        })),

      toggleChoreSelectedForToday: (id) =>
        set((s) => ({
          chores: s.chores.map((c) =>
            c.id === id
              ? { ...c, selectedForToday: !c.selectedForToday, updatedAt: Date.now() }
              : c
          ),
        })),

      deleteChore: (id) =>
        set((s) => ({
          chores: s.chores.filter((c) => c.id !== id),
        })),

      /* ── Projects ── */

      addProject: ({ title, description, kidId }) => {
        const now = Date.now();
        const minOrder = get().projects.reduce((m, p) => Math.min(m, p.sortOrder ?? 0), 0);
        const item: Project = {
          id: makeId(),
          title,
          description,
          status: "idea" as ProjectStatus,
          progress: 0,
          sortOrder: minOrder - 1, // prepend → sorts first
          kidId,
          updatedAt: now,
          createdAt: now,
        };
        set((s) => ({ projects: [item, ...s.projects] }));
        return item;
      },

      updateProject: (id, patch) =>
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === id ? { ...p, ...patch, updatedAt: Date.now() } : p
          ),
        })),

      deleteProject: (id) =>
        set((s) => ({
          projects: s.projects.filter((p) => p.id !== id),
        })),

      // Drag-to-reorder: assign sortOrder by position in the given id list.
      // ids is the new top-to-bottom order; lower index → lower sortOrder.
      reorderChores: (ids) =>
        set((s) => {
          const pos = new Map(ids.map((id, i) => [id, i]));
          return {
            chores: s.chores.map((c) =>
              pos.has(c.id) ? { ...c, sortOrder: pos.get(c.id)!, updatedAt: Date.now() } : c
            ),
          };
        }),

      reorderProjects: (ids) =>
        set((s) => {
          const pos = new Map(ids.map((id, i) => [id, i]));
          return {
            projects: s.projects.map((p) =>
              pos.has(p.id) ? { ...p, sortOrder: pos.get(p.id)!, updatedAt: Date.now() } : p
            ),
          };
        }),

      /* ── Family Events ── */

      addFamilyEvent: (input) => {
        const now = Date.now();
        const item: FamilyEvent = {
          id: makeId(),
          ...input,
          isRecurring: input.isRecurring ?? true,
          date: input.date,
          createdAt: now,
          updatedAt: now,
        };
        set((s) => ({
          familyEvents: [item, ...s.familyEvents],
        }));
        return item;
      },

      updateFamilyEvent: (id, patch) =>
        set((s) => ({
          familyEvents: s.familyEvents.map((e) =>
            e.id === id ? { ...e, ...patch, updatedAt: Date.now() } : e
          ),
        })),

      deleteFamilyEvent: (id) =>
        set((s) => ({
          familyEvents: s.familyEvents.filter((e) => e.id !== id),
        })),

      /* ── Schedule ── */

      addScheduleBlock: (input) => {
        const now = Date.now();
        const block: ScheduleBlock = {
          id: makeId(),
          ...input,
          isRecurring: input.isRecurring ?? true,
          date: input.date,
          createdAt: now,
          updatedAt: now,
        };
        set((s) => ({
          scheduleBlocks: [...s.scheduleBlocks, block],
        }));
        return block;
      },

      updateScheduleBlock: (id, patch) =>
        set((s) => ({
          scheduleBlocks: s.scheduleBlocks.map((b) =>
            b.id === id ? { ...b, ...patch, updatedAt: Date.now() } : b
          ),
        })),

      deleteScheduleBlock: (id) =>
        set((s) => ({
          scheduleBlocks: s.scheduleBlocks.filter((b) => b.id !== id),
        })),

      /* ── Kids ── */

      addKid: ({ name, emoji, color }) => {
        const now = Date.now();
        const item: Kid = {
          id: makeId(),
          name,
          emoji,
          color,
          isActive: true,
          updatedAt: now,
          createdAt: now,
        };
        set((s) => ({ kids: [item, ...s.kids] }));
        return item;
      },

      updateKid: (id, patch) =>
        set((s) => ({
          kids: s.kids.map((k) =>
            k.id === id ? { ...k, ...patch, updatedAt: Date.now() } : k
          ),
        })),

      setKidActive: (id, isActive) =>
        set((s) => ({
          kids: s.kids.map((k) =>
            k.id === id ? { ...k, isActive, updatedAt: Date.now() } : k
          ),
        })),

      /* ── Family Members ── */

      addFamilyMember: ({ name, role, color, avatarEmoji }) => {
        const now = Date.now();
        const item: FamilyMember = {
          id: makeId(),
          name,
          role,
          color,
          avatarEmoji,
          isActive: true,
          updatedAt: now,
          createdAt: now,
        };
        set((s) => ({ familyMembers: [item, ...s.familyMembers] }));
        return item;
      },

      updateFamilyMember: (id, patch) =>
        set((s) => ({
          familyMembers: s.familyMembers.map((m) =>
            m.id === id ? { ...m, ...patch, updatedAt: Date.now() } : m
          ),
        })),

      setFamilyMemberActive: (id, isActive) =>
        set((s) => ({
          familyMembers: s.familyMembers.map((m) =>
            m.id === id ? { ...m, isActive, updatedAt: Date.now() } : m
          ),
        })),

      /* ── Budget Categories ── */

      addBudgetCategory: ({ name, icon, color, monthlyCap, sortOrder = 0 }) => {
        const now = Date.now();
        const item: BudgetCategory = { id: makeId(), name, icon, color, monthlyCap, sortOrder, updatedAt: now, createdAt: now };
        set((s) => ({ budgetCategories: [...s.budgetCategories, item] }));
        return item;
      },

      updateBudgetCategory: (id, patch) =>
        set((s) => ({
          budgetCategories: s.budgetCategories.map((c) =>
            c.id === id ? { ...c, ...patch, updatedAt: Date.now() } : c
          ),
        })),

      deleteBudgetCategory: (id) =>
        set((s) => ({ budgetCategories: s.budgetCategories.filter((c) => c.id !== id) })),

      /* ── Expenses ── */

      addExpense: ({ amount, categoryName, payerMemberId, kidId, date, note, isRecurring = false, recurrenceDay }) => {
        const now = Date.now();
        const item: Expense = { id: makeId(), amount, categoryName, payerMemberId, kidId, date, note, isRecurring, recurrenceDay, updatedAt: now, createdAt: now };
        set((s) => ({ expenses: [...s.expenses, item] }));
        return item;
      },

      updateExpense: (id, patch) =>
        set((s) => ({
          expenses: s.expenses.map((e) =>
            e.id === id ? { ...e, ...patch, updatedAt: Date.now() } : e
          ),
        })),

      deleteExpense: (id) =>
        set((s) => ({ expenses: s.expenses.filter((e) => e.id !== id) })),
    }),
    {
      name: "family-os-store-v2",
      version: 15,
      storage: createJSONStorage(() => safeStorage),
      onRehydrateStorage: () => (_state, error) => {
        // Last-line-of-defense: if anything else in the rehydrate path throws
        // (migration error, etc.), log it. The safeStorage wrapper above
        // handles the most common cause (corrupt JSON) before we get here.
        if (error) {
          console.warn(
            "[store] onRehydrateStorage error; continuing with defaults.",
            error,
          );
        }
      },
      partialize: (state) => ({
        familyName: state.familyName,
        grocery: state.grocery,
        notes: state.notes,
        chores: state.chores,
        projects: state.projects,
        kids: state.kids,
        scheduleBlocks: state.scheduleBlocks,
        familyMembers: state.familyMembers,
        familyEvents: state.familyEvents,
        lastSyncedAt: state.lastSyncedAt,
        onboardingComplete: state.onboardingComplete,
        homeSections: state.homeSections,
        customizations: state.customizations,
        budgetCategories: state.budgetCategories,
        expenses: state.expenses,
      }),
      migrate: (persisted: any, version: number) => {
        if (version < 2) {
          // Migrate grocery items: category → subcategory, add shoppingCategory
          const grocery = (persisted.grocery ?? []).map((g: any) => ({
            ...g,
            shoppingCategory: g.shoppingCategory ?? "grocery",
            subcategory: g.subcategory ?? g.category ?? undefined,
          }));
          // Migrate chores: add selectedForToday if missing
          const chores = (persisted.chores ?? []).map((c: any) => ({
            ...c,
            selectedForToday: c.selectedForToday ?? false,
          }));
          persisted = { ...persisted, grocery, chores };
        }
        if (version < 3) {
          // Add familyMembers array + assignedToMemberId to chores
          persisted.familyMembers = persisted.familyMembers ?? [];
          persisted.chores = (persisted.chores ?? []).map((c: any) => ({
            ...c,
            assignedToMemberId: c.assignedToMemberId ?? undefined,
          }));
        }
        if (version < 4) {
          // Enhance kids with isActive + timestamps
          persisted.kids = (persisted.kids ?? []).map((k: any) => ({
            ...k,
            isActive: k.isActive ?? true,
            createdAt: k.createdAt ?? Date.now(),
            updatedAt: k.updatedAt ?? Date.now(),
          }));
        }
        if (version < 5) {
          // Add isRecurring + date to schedule blocks
          persisted.scheduleBlocks = (persisted.scheduleBlocks ?? []).map((b: any) => ({
            ...b,
            isRecurring: b.isRecurring ?? true,
            date: b.date ?? undefined,
          }));
        }
        if (version < 6) {
          // Add familyEvents array
          persisted.familyEvents = persisted.familyEvents ?? [];
        }
        if (version < 7) {
          // Add familyName string
          persisted.familyName = persisted.familyName ?? "";
        }
        if (version < 8) {
          // Add reminders to familyEvents
          persisted.familyEvents = (persisted.familyEvents ?? []).map((e: any) => ({
            ...e,
            reminders: e.reminders ?? undefined,
          }));
        }
        if (version < 9) {
          // Convert dayOfWeek (number) to daysOfWeek (number[])
          persisted.scheduleBlocks = (persisted.scheduleBlocks ?? []).map((b: any) => ({
            ...b,
            daysOfWeek: b.daysOfWeek ?? (b.dayOfWeek != null ? [b.dayOfWeek] : [0]),
          }));
          persisted.familyEvents = (persisted.familyEvents ?? []).map((e: any) => ({
            ...e,
            daysOfWeek: e.daysOfWeek ?? (e.dayOfWeek != null ? [e.dayOfWeek] : [0]),
          }));
        }
        if (version < 10) {
          // Add onboardingComplete flag
          persisted.onboardingComplete = persisted.onboardingComplete ?? false;
        }
        if (version < 11) {
          // Add homeSections collapse/expand state — default all expanded.
          persisted.homeSections = persisted.homeSections ?? {
            notes: true,
            chores: true,
            projects: true,
          };
        }
        if (version < 12) {
          // Add customizations blob — empty means "use Hebrew defaults".
          // pullAll will overwrite with the server's value on next sync.
          persisted.customizations = persisted.customizations ?? {};
        }
        if (version < 13) {
          // Add sortOrder to chores + projects (drag-to-reorder). Seed from
          // current array index so existing order is preserved until reordered.
          persisted.chores = (persisted.chores ?? []).map((c: any, i: number) => ({
            ...c,
            sortOrder: c.sortOrder ?? i,
          }));
          persisted.projects = (persisted.projects ?? []).map((p: any, i: number) => ({
            ...p,
            sortOrder: p.sortOrder ?? i,
          }));
        }
        if (version < 14) {
          // Add sortOrder to notes (drag-to-reorder), seeded from array index.
          persisted.notes = (persisted.notes ?? []).map((n: any, i: number) => ({
            ...n,
            sortOrder: n.sortOrder ?? i,
          }));
        }
        if (version < 15) {
          persisted.expenses = persisted.expenses ?? [];
          persisted.budgetCategories = persisted.budgetCategories ?? [];
        }
        return persisted;
      },
    }
  )
);
