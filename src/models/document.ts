/**
 * document.ts — Family document storage models (frontend).
 *
 * Metadata only — the file bytes live in GCS and are fetched on demand via
 * short-lived signed URLs (never cached in the store). Folders form a tree via
 * `parentId` (undefined = root); documents live in a folder (`folderId`
 * undefined = root).
 *
 * Named `FamilyDocument` (not `Document`) to avoid clashing with the DOM
 * `Document` global on web.
 */

export interface Folder {
  id: string;
  /** undefined = a root folder. */
  parentId?: string;
  name: string;
  createdByMemberId?: string;
  createdAt: number;
  updatedAt: number;
}

export type DocumentStatus = "pending" | "ready";

export interface FamilyDocument {
  id: string;
  /** undefined = lives at the root of the document tree. */
  folderId?: string;
  name: string;
  contentType: string;
  sizeBytes: number;
  pageCount?: number;
  /** 'pending' until the upload is confirmed, then 'ready'. */
  status: DocumentStatus;
  uploadedByMemberId?: string;
  createdAt: number;
  updatedAt: number;
}
