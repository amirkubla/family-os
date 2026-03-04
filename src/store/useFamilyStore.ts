import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

import type { GroceryItem, ShoppingCategory } from "@src/models/grocery";
import type { Note } from "@src/models/note";
import type { Chore } from "@src/models/chore";
import type { Project, ProjectStatus } from "@src/models/project";
import type { ScheduleBlock, BlockType } from "@src/models/schedule";
import type { Kid } from "@src/models/kid";
import type { FamilyMember, MemberRole } from "@src/models/familyMember";
import type { FamilyEvent, AssigneeType } from "@src/models/familyEvent";
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
  familyMembers: FamilyMember[];
  familyEvents: FamilyEvent[];

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
  setFamilyMembers: (items: FamilyMember[]) => void;
  setFamilyEvents: (items: FamilyEvent[]) => void;
  setSyncStatus: (status: SyncStatus, error?: string | null) => void;
  setLastSyncedAt: (ts: number) => void;

  // Grocery actions
  addGrocery: (input: {
    title: string;
    shoppingCategory: ShoppingCategory;
    subcategory?: string;
    qty?: string;
  }) => GroceryItem;
  toggleGroceryBought: (id: string) => void;
  deleteGrocery: (id: string) => void;
  clearBought: (shoppingCategory?: ShoppingCategory) => string[];

  // Notes actions
  addNote: (input: { title?: string; body: string }) => Note;
  updateNote: (id: string, patch: Partial<Pick<Note, "title" | "body">>) => void;
  toggleNotePinned: (id: string) => void;
  deleteNote: (id: string) => void;

  // Chores actions
  addChore: (input: { title: string; assignedTo?: string; assignedToMemberId?: string }) => Chore;
  toggleChoreDone: (id: string) => void;
  toggleChoreSelectedForToday: (id: string) => void;
  deleteChore: (id: string) => void;

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
  addProject: (input: { title: string; description?: string }) => Project;
  updateProject: (
    id: string,
    patch: Partial<Pick<Project, "title" | "description" | "status" | "progress">>
  ) => void;
  deleteProject: (id: string) => void;

  // Family Events actions
  addFamilyEvent: (input: {
    title: string;
    assigneeType: AssigneeType;
    assigneeId?: string;
    dayOfWeek: number;
    startMinutes: number;
    endMinutes: number;
    location?: string;
    color?: string;
    isRecurring?: boolean;
    date?: string;
  }) => FamilyEvent;
  updateFamilyEvent: (
    id: string,
    patch: Partial<
      Pick<
        FamilyEvent,
        "title" | "assigneeType" | "assigneeId" | "dayOfWeek" | "startMinutes" | "endMinutes" | "location" | "color" | "isRecurring" | "date"
      >
    >
  ) => void;
  deleteFamilyEvent: (id: string) => void;

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
    isRecurring?: boolean;
    date?: string;
  }) => ScheduleBlock;
  updateScheduleBlock: (
    id: string,
    patch: Partial<
      Pick<
        ScheduleBlock,
        "dayOfWeek" | "title" | "type" | "startMinutes" | "endMinutes" | "location" | "color" | "isRecurring" | "date"
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
      familyMembers: [],
      familyEvents: [],

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
      setFamilyMembers: (items) => set({ familyMembers: items }),
      setFamilyEvents: (items) => set({ familyEvents: items }),
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

      addChore: ({ title, assignedTo, assignedToMemberId }) => {
        const now = Date.now();
        const item: Chore = {
          id: makeId(),
          title,
          assignedTo,
          assignedToMemberId,
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
    }),
    {
      name: "family-os-store-v2",
      version: 6,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        grocery: state.grocery,
        notes: state.notes,
        chores: state.chores,
        projects: state.projects,
        kids: state.kids,
        scheduleBlocks: state.scheduleBlocks,
        familyMembers: state.familyMembers,
        familyEvents: state.familyEvents,
        lastSyncedAt: state.lastSyncedAt,
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
        return persisted;
      },
    }
  )
);
