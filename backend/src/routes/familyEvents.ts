import { Hono } from "hono";
import { familyEventsRepo } from "../repos/familyEventsRepo.js";

export const familyEventsRoutes = new Hono();

// GET  /v1/family/:familyId/family-events
familyEventsRoutes.get("/", async (c) => {
  const familyId = c.req.param("familyId")!;
  const rows = await familyEventsRepo.listByFamily(familyId);
  return c.json(rows);
});

// POST /v1/family/:familyId/family-events
familyEventsRoutes.post("/", async (c) => {
  const familyId = c.req.param("familyId")!;
  const body = await c.req.json();
  const row = await familyEventsRepo.create({ ...body, familyId });
  return c.json(row, 201);
});

// PUT  /v1/family/:familyId/family-events/:id  (upsert)
familyEventsRoutes.put("/:id", async (c) => {
  const familyId = c.req.param("familyId")!;
  const id = c.req.param("id");
  const body = await c.req.json();
  const row = await familyEventsRepo.upsert({ ...body, id, familyId });
  return c.json(row);
});

// PATCH /v1/family/:familyId/family-events/:id  (partial update)
familyEventsRoutes.patch("/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const row = await familyEventsRepo.update(id, body);
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json(row);
});

// DELETE /v1/family/:familyId/family-events/:id
familyEventsRoutes.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const ok = await familyEventsRepo.delete(id);
  if (!ok) return c.json({ error: "Not found" }, 404);
  return c.json({ deleted: true });
});
