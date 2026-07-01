import { Hono } from "hono";
import { documentsRepo } from "../repos/documentsRepo.js";
import { foldersRepo } from "../repos/foldersRepo.js";
import {
  documentsConfigured,
  documentObjectKey,
  signedUploadUrl,
  signedDownloadUrl,
  objectStat,
  deleteObject,
} from "../lib/documentsStorage.js";

export const documentsRoutes = new Hono();

// Scans/photos + PDFs only; cap keeps a single file well under Cloud Run limits
// (the bytes go straight to GCS, but this bounds abuse).
const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/heic",
  "image/heif",
  "image/webp",
];
const MAX_SIZE = 25 * 1024 * 1024; // 25 MB

// GET /v1/family/:familyId/documents — metadata for all of the family's docs.
documentsRoutes.get("/", async (c) => {
  const familyId = c.req.param("familyId")!;
  return c.json(await documentsRepo.listByFamily(familyId));
});

// POST /v1/family/:familyId/documents/init-upload
// { name, contentType, folderId?, sizeBytes?, uploadedByMemberId? }
// Creates a 'pending' doc row and returns a V4 signed PUT URL. The client PUTs
// the bytes straight to GCS (with the same Content-Type), then calls /confirm.
documentsRoutes.post("/init-upload", async (c) => {
  const familyId = c.req.param("familyId")!;
  if (!documentsConfigured()) {
    return c.json({ error: "document storage is not configured" }, 503);
  }
  const body = await c.req.json();
  const name = String(body?.name ?? "").trim();
  const contentType = String(body?.contentType ?? "").trim();
  if (!name) return c.json({ error: "name is required" }, 400);
  if (!ALLOWED_TYPES.includes(contentType)) {
    return c.json({ error: "unsupported content type" }, 400);
  }
  const sizeBytes = Number(body?.sizeBytes ?? 0);
  if (sizeBytes && sizeBytes > MAX_SIZE) {
    return c.json({ error: "file too large" }, 413);
  }
  if (body.folderId) {
    const folder = await foldersRepo.getById(body.folderId, familyId);
    if (!folder) return c.json({ error: "folder not found" }, 400);
  }

  // Create the row first so the id becomes the object key, then record the key.
  const created = await documentsRepo.create({
    familyId,
    folderId: body.folderId ?? null,
    name,
    contentType,
    sizeBytes: sizeBytes || 0,
    gcsObject: "",
    status: "pending",
    uploadedByMemberId: body.uploadedByMemberId ?? null,
  });
  const gcsObject = documentObjectKey(familyId, created.id);
  const document = await documentsRepo.update(created.id, familyId, { gcsObject });
  const upload = await signedUploadUrl(gcsObject, contentType);
  return c.json({ document, upload }, 201);
});

// POST /v1/family/:familyId/documents/:id/confirm  { pageCount? }
// Verifies the bytes landed in GCS, then flips the row to 'ready' and records
// the real size / content-type.
documentsRoutes.post("/:id/confirm", async (c) => {
  const familyId = c.req.param("familyId")!;
  const id = c.req.param("id");
  if (!documentsConfigured()) {
    return c.json({ error: "document storage is not configured" }, 503);
  }
  const doc = await documentsRepo.getById(id, familyId);
  if (!doc) return c.json({ error: "Not found" }, 404);

  const stat = await objectStat(doc.gcsObject);
  if (!stat.exists) return c.json({ error: "upload not found in storage" }, 409);
  if (stat.size != null && stat.size > MAX_SIZE) {
    // Reject an oversized upload and remove the bytes.
    await deleteObject(doc.gcsObject);
    await documentsRepo.delete(id, familyId);
    return c.json({ error: "file too large" }, 413);
  }

  const body = await c.req.json().catch(() => ({}));
  const row = await documentsRepo.update(id, familyId, {
    status: "ready",
    sizeBytes: stat.size ?? doc.sizeBytes,
    ...(stat.contentType ? { contentType: stat.contentType } : {}),
    ...(typeof body?.pageCount === "number" ? { pageCount: body.pageCount } : {}),
  });
  return c.json(row);
});

// GET /v1/family/:familyId/documents/:id/download-url — short-TTL signed GET URL.
documentsRoutes.get("/:id/download-url", async (c) => {
  const familyId = c.req.param("familyId")!;
  const id = c.req.param("id");
  if (!documentsConfigured()) {
    return c.json({ error: "document storage is not configured" }, 503);
  }
  const doc = await documentsRepo.getById(id, familyId);
  if (!doc) return c.json({ error: "Not found" }, 404);
  if (doc.status !== "ready") return c.json({ error: "document not ready" }, 409);
  const dl = await signedDownloadUrl(doc.gcsObject);
  return c.json({ ...dl, name: doc.name, contentType: doc.contentType });
});

// PATCH /v1/family/:familyId/documents/:id  { name?, folderId? } — rename / move
documentsRoutes.patch("/:id", async (c) => {
  const familyId = c.req.param("familyId")!;
  const id = c.req.param("id");
  const body = await c.req.json();

  const patch: { name?: string; folderId?: string | null } = {};

  if (typeof body.name === "string") {
    const name = body.name.trim();
    if (!name) return c.json({ error: "name cannot be empty" }, 400);
    patch.name = name;
  }

  if ("folderId" in body) {
    const folderId: string | null = body.folderId ?? null;
    if (folderId) {
      const folder = await foldersRepo.getById(folderId, familyId);
      if (!folder) return c.json({ error: "folder not found" }, 400);
    }
    patch.folderId = folderId;
  }

  const row = await documentsRepo.update(id, familyId, patch);
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json(row);
});

// DELETE /v1/family/:familyId/documents/:id — removes the GCS object then the row.
documentsRoutes.delete("/:id", async (c) => {
  const familyId = c.req.param("familyId")!;
  const id = c.req.param("id");
  const doc = await documentsRepo.getById(id, familyId);
  if (!doc) return c.json({ error: "Not found" }, 404);
  if (documentsConfigured() && doc.gcsObject) {
    await deleteObject(doc.gcsObject);
  }
  await documentsRepo.delete(id, familyId);
  return c.json({ deleted: true });
});
