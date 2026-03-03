/**
 * endpoints.ts — Typed API functions per resource.
 */

import { http } from "./http";
import type {
  ApiFamily,
  ApiGroceryItem,
  ApiNote,
  ApiChore,
  ApiProject,
  ApiKid,
} from "./types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const fam = (familyId: string) => `/v1/family/${familyId}`;

// ---------------------------------------------------------------------------
// Family
// ---------------------------------------------------------------------------

export const familyApi = {
  list: () => http.get<ApiFamily[]>("/v1/family"),
};

// ---------------------------------------------------------------------------
// Grocery
// ---------------------------------------------------------------------------

export const groceryApi = {
  list: (fid: string) =>
    http.get<ApiGroceryItem[]>(`${fam(fid)}/grocery`),

  create: (fid: string, data: Omit<ApiGroceryItem, "familyId" | "createdAt" | "updatedAt">) =>
    http.post<ApiGroceryItem>(`${fam(fid)}/grocery`, data),

  upsert: (fid: string, data: Omit<ApiGroceryItem, "familyId" | "createdAt" | "updatedAt">) =>
    http.put<ApiGroceryItem>(`${fam(fid)}/grocery/${data.id}`, data),

  update: (fid: string, id: string, data: Partial<ApiGroceryItem>) =>
    http.patch<ApiGroceryItem>(`${fam(fid)}/grocery/${id}`, data),

  delete: (fid: string, id: string) =>
    http.delete<{ deleted: boolean }>(`${fam(fid)}/grocery/${id}`),
};

// ---------------------------------------------------------------------------
// Notes
// ---------------------------------------------------------------------------

export const notesApi = {
  list: (fid: string) =>
    http.get<ApiNote[]>(`${fam(fid)}/notes`),

  create: (fid: string, data: Omit<ApiNote, "familyId" | "createdAt" | "updatedAt">) =>
    http.post<ApiNote>(`${fam(fid)}/notes`, data),

  upsert: (fid: string, data: Omit<ApiNote, "familyId" | "createdAt" | "updatedAt">) =>
    http.put<ApiNote>(`${fam(fid)}/notes/${data.id}`, data),

  update: (fid: string, id: string, data: Partial<ApiNote>) =>
    http.patch<ApiNote>(`${fam(fid)}/notes/${id}`, data),

  delete: (fid: string, id: string) =>
    http.delete<{ deleted: boolean }>(`${fam(fid)}/notes/${id}`),
};

// ---------------------------------------------------------------------------
// Chores
// ---------------------------------------------------------------------------

export const choresApi = {
  list: (fid: string) =>
    http.get<ApiChore[]>(`${fam(fid)}/chores`),

  create: (fid: string, data: Omit<ApiChore, "familyId" | "createdAt" | "updatedAt">) =>
    http.post<ApiChore>(`${fam(fid)}/chores`, data),

  upsert: (fid: string, data: Omit<ApiChore, "familyId" | "createdAt" | "updatedAt">) =>
    http.put<ApiChore>(`${fam(fid)}/chores/${data.id}`, data),

  update: (fid: string, id: string, data: Partial<ApiChore>) =>
    http.patch<ApiChore>(`${fam(fid)}/chores/${id}`, data),

  delete: (fid: string, id: string) =>
    http.delete<{ deleted: boolean }>(`${fam(fid)}/chores/${id}`),
};

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

export const projectsApi = {
  list: (fid: string) =>
    http.get<ApiProject[]>(`${fam(fid)}/projects`),

  create: (fid: string, data: Omit<ApiProject, "familyId" | "createdAt" | "updatedAt">) =>
    http.post<ApiProject>(`${fam(fid)}/projects`, data),

  upsert: (fid: string, data: Omit<ApiProject, "familyId" | "createdAt" | "updatedAt">) =>
    http.put<ApiProject>(`${fam(fid)}/projects/${data.id}`, data),

  update: (fid: string, id: string, data: Partial<ApiProject>) =>
    http.patch<ApiProject>(`${fam(fid)}/projects/${id}`, data),

  delete: (fid: string, id: string) =>
    http.delete<{ deleted: boolean }>(`${fam(fid)}/projects/${id}`),
};

// ---------------------------------------------------------------------------
// Kids
// ---------------------------------------------------------------------------

export const kidsApi = {
  list: (fid: string) =>
    http.get<ApiKid[]>(`${fam(fid)}/kids`),

  create: (fid: string, data: Omit<ApiKid, "familyId" | "createdAt" | "updatedAt">) =>
    http.post<ApiKid>(`${fam(fid)}/kids`, data),

  upsert: (fid: string, data: Omit<ApiKid, "familyId" | "createdAt" | "updatedAt">) =>
    http.put<ApiKid>(`${fam(fid)}/kids/${data.id}`, data),

  update: (fid: string, id: string, data: Partial<ApiKid>) =>
    http.patch<ApiKid>(`${fam(fid)}/kids/${id}`, data),

  delete: (fid: string, id: string) =>
    http.delete<{ deleted: boolean }>(`${fam(fid)}/kids/${id}`),
};
