import { Hono } from "hono";
import { foldersRepo } from "../repos/foldersRepo.js";

export const foldersRoutes = new Hono();

// GET /v1/family/:familyId/folders — the family's whole flat folder list
// (the client builds the tree from parentId).
foldersRoutes.get("/", async (c) => {
  const familyId = c.req.param("familyId")!;
  return c.json(await foldersRepo.listByFamily(familyId));
});

// POST /v1/family/:familyId/folders  { name, parentId?, createdByMemberId? }
foldersRoutes.post("/", async (c) => {
  const familyId = c.req.param("familyId")!;
  const body = await c.req.json();
  const name = String(body?.name ?? "").trim();
  if (!name) return c.json({ error: "name is required" }, 400);

  // A given parent must belong to this family.
  if (body.parentId) {
    const parent = await foldersRepo.getById(body.parentId, familyId);
    if (!parent) return c.json({ error: "parent not found" }, 400);
  }

  const row = await foldersRepo.create({
    familyId,
    name,
    parentId: body.parentId ?? null,
    createdByMemberId: body.createdByMemberId ?? null,
  });
  return c.json(row, 201);
});

// PATCH /v1/family/:familyId/folders/:id  { name?, parentId? } — rename / move
foldersRoutes.patch("/:id", async (c) => {
  const familyId = c.req.param("familyId")!;
  const id = c.req.param("id");
  const body = await c.req.json();

  const patch: { name?: string; parentId?: string | null } = {};

  if (typeof body.name === "string") {
    const name = body.name.trim();
    if (!name) return c.json({ error: "name cannot be empty" }, 400);
    patch.name = name;
  }

  if ("parentId" in body) {
    const parentId: string | null = body.parentId ?? null;
    if (parentId) {
      if (parentId === id) {
        return c.json({ error: "a folder cannot be its own parent" }, 400);
      }
      // Cycle guard: walk up from the target parent; if we hit this folder,
      // the move would put a folder inside its own subtree and corrupt the tree.
      const all = await foldersRepo.listByFamily(familyId);
      const byId = new Map(all.map((f) => [f.id, f]));
      if (!byId.has(parentId)) return c.json({ error: "parent not found" }, 400);
      let cur: string | null = parentId;
      while (cur) {
        if (cur === id) {
          return c.json({ error: "cannot move a folder into its own subtree" }, 400);
        }
        cur = byId.get(cur)?.parentId ?? null;
      }
    }
    patch.parentId = parentId;
  }

  const row = await foldersRepo.update(id, familyId, patch);
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json(row);
});

// DELETE /v1/family/:familyId/folders/:id
// Subfolders cascade (FK); documents in the subtree fall back to the root
// (documents.folderId onDelete: "set null"), so no file is destroyed here.
foldersRoutes.delete("/:id", async (c) => {
  const familyId = c.req.param("familyId")!;
  const id = c.req.param("id");
  const ok = await foldersRepo.delete(id, familyId);
  if (!ok) return c.json({ error: "Not found" }, 404);
  return c.json({ deleted: true });
});
