import { Hono } from "hono";
import { documentsRepo } from "../repos/documentsRepo.js";
import { foldersRepo } from "../repos/foldersRepo.js";

export const documentsRoutes = new Hono();

// GET /v1/family/:familyId/documents — metadata for all of the family's docs.
// (Creation happens via the Phase 2 signed-URL upload flow, not here.)
documentsRoutes.get("/", async (c) => {
  const familyId = c.req.param("familyId")!;
  return c.json(await documentsRepo.listByFamily(familyId));
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

// DELETE /v1/family/:familyId/documents/:id
// Phase 2 will also delete the backing GCS object before removing the row.
documentsRoutes.delete("/:id", async (c) => {
  const familyId = c.req.param("familyId")!;
  const id = c.req.param("id");
  const ok = await documentsRepo.delete(id, familyId);
  if (!ok) return c.json({ error: "Not found" }, 404);
  return c.json({ deleted: true });
});
