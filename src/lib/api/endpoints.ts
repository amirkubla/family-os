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
  ApiScheduleBlock,
  ApiFamilyMember,
  ApiFamilyEvent,
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

// ---------------------------------------------------------------------------
// Schedule Blocks
// ---------------------------------------------------------------------------

export const scheduleBlocksApi = {
  list: (fid: string) =>
    http.get<ApiScheduleBlock[]>(`${fam(fid)}/schedule-blocks`),

  create: (fid: string, data: Omit<ApiScheduleBlock, "familyId" | "createdAt" | "updatedAt">) =>
    http.post<ApiScheduleBlock>(`${fam(fid)}/schedule-blocks`, data),

  upsert: (fid: string, data: Omit<ApiScheduleBlock, "familyId" | "createdAt" | "updatedAt">) =>
    http.put<ApiScheduleBlock>(`${fam(fid)}/schedule-blocks/${data.id}`, data),

  update: (fid: string, id: string, data: Partial<ApiScheduleBlock>) =>
    http.patch<ApiScheduleBlock>(`${fam(fid)}/schedule-blocks/${id}`, data),

  delete: (fid: string, id: string) =>
    http.delete<{ deleted: boolean }>(`${fam(fid)}/schedule-blocks/${id}`),
};

// ---------------------------------------------------------------------------
// Family Members
// ---------------------------------------------------------------------------

export const familyMembersApi = {
  list: (fid: string) =>
    http.get<ApiFamilyMember[]>(`${fam(fid)}/members`),

  create: (fid: string, data: Omit<ApiFamilyMember, "familyId" | "createdAt" | "updatedAt">) =>
    http.post<ApiFamilyMember>(`${fam(fid)}/members`, data),

  upsert: (fid: string, data: Omit<ApiFamilyMember, "familyId" | "createdAt" | "updatedAt">) =>
    http.put<ApiFamilyMember>(`${fam(fid)}/members/${data.id}`, data),

  update: (fid: string, id: string, data: Partial<ApiFamilyMember>) =>
    http.patch<ApiFamilyMember>(`${fam(fid)}/members/${id}`, data),

  delete: (fid: string, id: string) =>
    http.delete<{ deleted: boolean }>(`${fam(fid)}/members/${id}`),
};

// ---------------------------------------------------------------------------
// Family Events
// ---------------------------------------------------------------------------

export const familyEventsApi = {
  list: (fid: string) =>
    http.get<ApiFamilyEvent[]>(`${fam(fid)}/family-events`),

  create: (fid: string, data: Omit<ApiFamilyEvent, "familyId" | "createdAt" | "updatedAt">) =>
    http.post<ApiFamilyEvent>(`${fam(fid)}/family-events`, data),

  upsert: (fid: string, data: Omit<ApiFamilyEvent, "familyId" | "createdAt" | "updatedAt">) =>
    http.put<ApiFamilyEvent>(`${fam(fid)}/family-events/${data.id}`, data),

  update: (fid: string, id: string, data: Partial<ApiFamilyEvent>) =>
    http.patch<ApiFamilyEvent>(`${fam(fid)}/family-events/${id}`, data),

  delete: (fid: string, id: string) =>
    http.delete<{ deleted: boolean }>(`${fam(fid)}/family-events/${id}`),
};
