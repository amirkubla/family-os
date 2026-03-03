import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

import type { GroceryItem } from "@src/models/grocery";
import type { Note } from "@src/models/note";
import type { Chore } from "@src/models/chore";
import type { Project, ProjectStatus } from "@src/models/project";
import type { ScheduleBlock, BlockType } from "@src/models/schedule";
import type { Kid } from "@src/models/seed";
import { KIDS } from "@src/models/seed";
import { makeId } from "@src/utils/id";

/* ─── Sync status ─── */

export type SyncStatus = "idle" | "syncing" | "error";

/* ─── State shape ─── */

interface FamilyState {
  grocery: GroceryItem[];
  notes: Note[];
  chores: Chore[];
  projects: Project[];
  kids: Kid[];
  scheduleBlocks: ScheduleBlock[];

  // Sync metadata
  syncStatus: SyncStatus;
  syncError: string | null;
  lastSyncedAt: number | null;

  // Bulk setters (used by sync engine to replace entire collections)
  setGrocery: (items: GroceryItem[]) => void;
  setNotes: (items: Note[]) => void;
  setChores: (items: Chore[]) => void;
  setProjects: (items: Project[]) => void;
  setKids: (items: Kid[]) => void;
  setScheduleBlocks: (items: ScheduleBlock[]) => void;
  setSyncStatus: (status: SyncStatus, error?: string | null) => void;
  setLastSyncedAt: (ts: number) => void;

  // Grocery actions
  addGrocery: (input: {
    title: string;
    category: string;
    qty?: string;
  }) => GroceryItem;
  toggleGroceryBought: (id: string) => void;
  deleteGrocery: (id: string) => void;
  clearBought: () => string[];

  // Notes actions
  addNote: (input: { title?: string; body: string }) => Note;
  updateNote: (id: string, patch: Partial<Pick<Note, "title" | "body">>) => void;
  toggleNotePinned: (id: string) => void;
  deleteNote: (id: string) => void;

  // Chores actions
  addChore: (input: { title: string; assignedTo?: string }) => Chore;
  toggleChoreDone: (id: string) => void;
  toggleChoreSelectedForToday: (id: string) => void;
  deleteChore: (id: string) => void;

  // Projects actions
  addProject: (input: { title: string; description?: string }) => Project;
  updateProject: (
    id: string,
    patch: Partial<Pick<Project, "title" | "description" | "status" | "progress">>
  ) => void;
  deleteProject: (id: string) => void;

  // Schedule actions
  addScheduleBlock: (input: {
    kidId: string;
    dayOfWeek: number;
    title: string;
    type: BlockType;
    startMinutes: number;
    endMinutes: number;
    location?: string;
    color?: string;
  }) => ScheduleBlock;
  updateScheduleBlock: (
    id: string,
    patch: Partial<
      Pick<
        ScheduleBlock,
        "dayOfWeek" | "title" | "type" | "startMinutes" | "endMinutes" | "location" | "color"
      >
    >
  ) => void;
  deleteScheduleBlock: (id: string) => void;
}

/* ─── Store ─── */

export const useFamilyStore = create<FamilyState>()(
  persist(
    (set, get) => ({
      grocery: [],
      notes: [],
      chores: [],
      projects: [],
      kids: [],
      scheduleBlocks: [],

      syncStatus: "idle" as SyncStatus,
      syncError: null,
      lastSyncedAt: null,

      /* ── Bulk setters ── */

      setGrocery: (items) => set({ grocery: items }),
      setNotes: (items) => set({ notes: items }),
      setChores: (items) => set({ chores: items }),
      setProjects: (items) => set({ projects: items }),
      setKids: (items) => set({ kids: items }),
      setScheduleBlocks: (items) => set({ scheduleBlocks: items }),
      setSyncStatus: (status, error = null) =>
        set({ syncStatus: status, syncError: error }),
      setLastSyncedAt: (ts) => set({ lastSyncedAt: ts }),

      /* ── Grocery ── */

      addGrocery: ({ title, category, qty }) => {
        const now = Date.now();
        const item: GroceryItem = {
          id: makeId(),
          title,
          category,
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

      deleteGrocery: (id) =>
        set((s) => ({
          grocery: s.grocery.filter((g) => g.id !== id),
        })),

      clearBought: () => {
        const bought = get().grocery.filter((g) => g.isBought);
        const ids = bought.map((g) => g.id);
        set((s) => ({
          grocery: s.grocery.filter((g) => !g.isBought),
        }));
        return ids;
      },

      /* ── Notes ── */

      addNote: ({ title, body }) => {
        const now = Date.now();
        const item: Note = {
          id: makeId(),
          title,
          body,
          pinned: false,
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

      /* ── Chores ── */

      addChore: ({ title, assignedTo }) => {
        const now = Date.now();
        const item: Chore = {
          id: makeId(),
          title,
          assignedTo,
          done: false,
          selectedForToday: false,
          updatedAt: now,
          createdAt: now,
        };
        set((s) => ({ chores: [item, ...s.chores] }));
        return item;
      },

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

      addProject: ({ title, description }) => {
        const now = Date.now();
        const item: Project = {
          id: makeId(),
          title,
          description,
          status: "idea" as ProjectStatus,
          progress: 0,
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

      /* ── Schedule ── */

      addScheduleBlock: (input) => {
        const now = Date.now();
        const block: ScheduleBlock = {
          id: makeId(),
          ...input,
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
    }),
    {
      name: "family-os-store-v1",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        grocery: state.grocery,
        notes: state.notes,
        chores: state.chores,
        projects: state.projects,
        kids: state.kids,
        scheduleBlocks: state.scheduleBlocks,
        lastSyncedAt: state.lastSyncedAt,
      }),
    }
  )
);
