import { Hono } from "hono";
import { notesRepo } from "../repos/notesRepo.js";

export const notesRoutes = new Hono();

// GET  /v1/family/:familyId/notes
notesRoutes.get("/", async (c) => {
  const familyId = c.req.param("familyId")!;
  const rows = await notesRepo.listByFamily(familyId);
  return c.json(rows);
});

// POST /v1/family/:familyId/notes
notesRoutes.post("/", async (c) => {
  const familyId = c.req.param("familyId")!;
  const body = await c.req.json();
  const row = await notesRepo.create({ ...body, familyId });
  return c.json(row, 201);
});

// PUT  /v1/family/:familyId/notes/:id  (upsert)
notesRoutes.put("/:id", async (c) => {
  const familyId = c.req.param("familyId")!;
  const id = c.req.param("id");
  const body = await c.req.json();
  const row = await notesRepo.upsert({ ...body, id, familyId });
  return c.json(row);
});

// PATCH /v1/family/:familyId/notes/:id  (partial update)
notesRoutes.patch("/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const row = await notesRepo.update(id, body);
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json(row);
});

// DELETE /v1/family/:familyId/notes/:id
notesRoutes.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const ok = await notesRepo.delete(id);
  if (!ok) return c.json({ error: "Not found" }, 404);
  return c.json({ deleted: true });
});
