import { Hono } from "hono";
import { choresRepo } from "../repos/choresRepo.js";

export const choresRoutes = new Hono();

// GET  /v1/family/:familyId/chores
choresRoutes.get("/", async (c) => {
  const familyId = c.req.param("familyId")!;
  const rows = await choresRepo.listByFamily(familyId);
  return c.json(rows);
});

// POST /v1/family/:familyId/chores
choresRoutes.post("/", async (c) => {
  const familyId = c.req.param("familyId")!;
  const body = await c.req.json();
  const row = await choresRepo.create({ ...body, familyId });
  return c.json(row, 201);
});

// PUT  /v1/family/:familyId/chores/:id  (upsert)
choresRoutes.put("/:id", async (c) => {
  const familyId = c.req.param("familyId")!;
  const id = c.req.param("id");
  const body = await c.req.json();
  const row = await choresRepo.upsert({ ...body, id, familyId });
  return c.json(row);
});

// PATCH /v1/family/:familyId/chores/:id  (partial update)
choresRoutes.patch("/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const row = await choresRepo.update(id, body);
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json(row);
});

// DELETE /v1/family/:familyId/chores/:id
choresRoutes.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const ok = await choresRepo.delete(id);
  if (!ok) return c.json({ error: "Not found" }, 404);
  return c.json({ deleted: true });
});
