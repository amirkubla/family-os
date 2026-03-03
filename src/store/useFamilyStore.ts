import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

import type { GroceryItem } from "@src/models/grocery";
import type { Note } from "@src/models/note";
import type { Chore } from "@src/models/chore";
import type { Project, ProjectStatus } from "@src/models/project";
import { makeId } from "@src/utils/id";

/* ─── State shape ─── */

interface FamilyState {
  grocery: GroceryItem[];
  notes: Note[];
  chores: Chore[];
  projects: Project[];

  // Grocery actions
  addGrocery: (input: {
    title: string;
    category: string;
    qty?: string;
  }) => void;
  toggleGroceryBought: (id: string) => void;
  deleteGrocery: (id: string) => void;
  clearBought: () => void;

  // Notes actions
  addNote: (input: { title?: string; body: string }) => void;
  updateNote: (id: string, patch: Partial<Pick<Note, "title" | "body">>) => void;
  toggleNotePinned: (id: string) => void;
  deleteNote: (id: string) => void;

  // Chores actions
  addChore: (input: { title: string; assignedTo?: string }) => void;
  toggleChoreDone: (id: string) => void;
  deleteChore: (id: string) => void;

  // Projects actions
  addProject: (input: { title: string; description?: string }) => void;
  updateProject: (
    id: string,
    patch: Partial<Pick<Project, "title" | "description" | "status" | "progress">>
  ) => void;
  deleteProject: (id: string) => void;
}

/* ─── Store ─── */

export const useFamilyStore = create<FamilyState>()(
  persist(
    (set) => ({
      grocery: [],
      notes: [],
      chores: [],
      projects: [],

      /* ── Grocery ── */

      addGrocery: ({ title, category, qty }) =>
        set((s) => ({
          grocery: [
            {
              id: makeId(),
              title,
              category,
              qty,
              isBought: false,
              createdAt: Date.now(),
            },
            ...s.grocery,
          ],
        })),

      toggleGroceryBought: (id) =>
        set((s) => ({
          grocery: s.grocery.map((g) =>
            g.id === id ? { ...g, isBought: !g.isBought } : g
          ),
        })),

      deleteGrocery: (id) =>
        set((s) => ({
          grocery: s.grocery.filter((g) => g.id !== id),
        })),

      clearBought: () =>
        set((s) => ({
          grocery: s.grocery.filter((g) => !g.isBought),
        })),

      /* ── Notes ── */

      addNote: ({ title, body }) =>
        set((s) => ({
          notes: [
            {
              id: makeId(),
              title,
              body,
              pinned: false,
              updatedAt: Date.now(),
              createdAt: Date.now(),
            },
            ...s.notes,
          ],
        })),

      updateNote: (id, patch) =>
        set((s) => ({
          notes: s.notes.map((n) =>
            n.id === id ? { ...n, ...patch, updatedAt: Date.now() } : n
          ),
        })),

      toggleNotePinned: (id) =>
        set((s) => ({
          notes: s.notes.map((n) =>
            n.id === id ? { ...n, pinned: !n.pinned } : n
          ),
        })),

      deleteNote: (id) =>
        set((s) => ({
          notes: s.notes.filter((n) => n.id !== id),
        })),

      /* ── Chores ── */

      addChore: ({ title, assignedTo }) =>
        set((s) => ({
          chores: [
            {
              id: makeId(),
              title,
              assignedTo,
              done: false,
              createdAt: Date.now(),
            },
            ...s.chores,
          ],
        })),

      toggleChoreDone: (id) =>
        set((s) => ({
          chores: s.chores.map((c) =>
            c.id === id ? { ...c, done: !c.done } : c
          ),
        })),

      deleteChore: (id) =>
        set((s) => ({
          chores: s.chores.filter((c) => c.id !== id),
        })),

      /* ── Projects ── */

      addProject: ({ title, description }) =>
        set((s) => ({
          projects: [
            {
              id: makeId(),
              title,
              description,
              status: "idea" as ProjectStatus,
              progress: 0,
              updatedAt: Date.now(),
              createdAt: Date.now(),
            },
            ...s.projects,
          ],
        })),

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
    }),
    {
      name: "family-os-store-v1",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
