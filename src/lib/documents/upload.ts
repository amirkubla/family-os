/**
 * upload.ts — the 3-step document upload: init-upload → PUT bytes to GCS →
 * confirm. A 'pending' row is added to the store immediately (shows as
 * "בהעלאה…"), flipped to 'ready' on confirm, or removed on failure.
 *
 * Web PUTs a Blob; native streams the file via expo-file-system's binary
 * upload (a raw file:// body isn't supported by RN fetch).
 */

import { Platform } from "react-native";

import { documentsApi } from "@src/lib/api/endpoints";
import { apiToLocalDocument } from "@src/lib/api/mappers";
import { getFamilyId } from "@src/lib/familyContext";
import { useFamilyStore } from "@src/store/useFamilyStore";
import type { FamilyDocument } from "@src/models/document";
import type { PickedFile } from "./capture";

async function putBytes(url: string, file: PickedFile): Promise<void> {
  if (Platform.OS === "web") {
    const blob = await (await fetch(file.uri)).blob();
    const res = await fetch(url, {
      method: "PUT",
      headers: { "Content-Type": file.contentType },
      body: blob,
    });
    if (!res.ok) throw new Error(`GCS PUT ${res.status}`);
  } else {
    const { uploadAsync, FileSystemUploadType } = await import("expo-file-system/legacy");
    const res = await uploadAsync(url, file.uri, {
      httpMethod: "PUT",
      uploadType: FileSystemUploadType.BINARY_CONTENT,
      headers: { "Content-Type": file.contentType },
    });
    if (res.status < 200 || res.status >= 300) throw new Error(`GCS PUT ${res.status}`);
  }
}

/**
 * Upload a picked file into `folderId` (undefined = root). Returns the ready
 * document, or throws on failure (the caller surfaces a message).
 */
export async function uploadDocument(
  file: PickedFile,
  folderId?: string,
  uploadedByMemberId?: string,
): Promise<FamilyDocument> {
  const store = useFamilyStore.getState();
  const fid = await getFamilyId();

  const { document: pendingApi, upload } = await documentsApi.initUpload(fid, {
    name: file.name,
    contentType: file.contentType,
    folderId: folderId ?? null,
    sizeBytes: file.size,
    uploadedByMemberId: uploadedByMemberId ?? null,
  });
  const pending = apiToLocalDocument(pendingApi);
  store.addDocument(pending); // optimistic — shows "בהעלאה…" immediately

  try {
    await putBytes(upload.url, file);
    const readyApi = await documentsApi.confirm(fid, pending.id);
    const ready = apiToLocalDocument(readyApi);
    store.updateDocument(pending.id, ready);
    store.setLastSyncedAt(Date.now());
    return ready;
  } catch (err) {
    // Roll back the optimistic row; the orphaned GCS object (if any) is swept
    // by the pending-cleanup job.
    store.deleteDocument(pending.id);
    throw err;
  }
}
