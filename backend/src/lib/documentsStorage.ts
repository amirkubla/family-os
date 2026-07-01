/**
 * documentsStorage.ts — GCS access for family documents.
 *
 * Bytes live in a private bucket (DOCUMENTS_BUCKET) at families/{familyId}/{id};
 * this module issues short-lived V4 signed URLs so clients upload/download
 * DIRECTLY to/from GCS (Cloud Run never proxies the bytes).
 *
 * Signing on Cloud Run has no key file: the library signs via the IAM
 * signBlob API using the runtime service account (which was granted
 * roles/iam.serviceAccountTokenCreator on itself in Phase 0). Nothing to wire
 * here beyond ADC — `new Storage()` picks up the runtime credentials.
 */

import { Storage } from "@google-cloud/storage";

const BUCKET = process.env.DOCUMENTS_BUCKET;
const storage = new Storage();

const UPLOAD_TTL_MS = 15 * 60 * 1000; // 15 min
const DOWNLOAD_TTL_MS = 15 * 60 * 1000; // 15 min

/** Whether document storage is wired (DOCUMENTS_BUCKET set). */
export function documentsConfigured(): boolean {
  return !!BUCKET;
}

function bucket() {
  if (!BUCKET) throw new Error("DOCUMENTS_BUCKET is not set");
  return storage.bucket(BUCKET);
}

/** Deterministic object key for a document. */
export function documentObjectKey(familyId: string, documentId: string): string {
  return `families/${familyId}/${documentId}`;
}

/** V4 signed PUT URL. The client MUST send the same Content-Type when uploading. */
export async function signedUploadUrl(
  objectKey: string,
  contentType: string,
): Promise<{ url: string; expiresAt: number }> {
  const expiresAt = Date.now() + UPLOAD_TTL_MS;
  const [url] = await bucket().file(objectKey).getSignedUrl({
    version: "v4",
    action: "write",
    expires: expiresAt,
    contentType,
  });
  return { url, expiresAt };
}

/** V4 signed GET URL for viewing/downloading. */
export async function signedDownloadUrl(
  objectKey: string,
): Promise<{ url: string; expiresAt: number }> {
  const expiresAt = Date.now() + DOWNLOAD_TTL_MS;
  const [url] = await bucket().file(objectKey).getSignedUrl({
    version: "v4",
    action: "read",
    expires: expiresAt,
  });
  return { url, expiresAt };
}

/** Read object metadata to confirm an upload landed (and its real size/type). */
export async function objectStat(
  objectKey: string,
): Promise<{ exists: boolean; size?: number; contentType?: string }> {
  const file = bucket().file(objectKey);
  const [exists] = await file.exists();
  if (!exists) return { exists: false };
  const [meta] = await file.getMetadata();
  return {
    exists: true,
    size: meta.size != null ? Number(meta.size) : undefined,
    contentType: meta.contentType,
  };
}

/** Best-effort delete; a missing object is not an error. */
export async function deleteObject(objectKey: string): Promise<void> {
  await bucket().file(objectKey).delete({ ignoreNotFound: true });
}
