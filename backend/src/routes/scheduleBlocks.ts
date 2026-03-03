import { Hono } from "hono";
import { scheduleBlocksRepo } from "../repos/scheduleBlocksRepo.js";

export const scheduleBlocksRoutes = new Hono();

// GET  /v1/family/:familyId/schedule-blocks
scheduleBlocksRoutes.get("/", async (c) => {
  const familyId = c.req.param("familyId")!;
  const rows = await scheduleBlocksRepo.listByFamily(familyId);
  return c.json(rows);
});

// POST /v1/family/:familyId/schedule-blocks
scheduleBlocksRoutes.post("/", async (c) => {
  const familyId = c.req.param("familyId")!;
  const body = await c.req.json();
  const row = await scheduleBlocksRepo.create({ ...body, familyId });
  return c.json(row, 201);
});

// PUT  /v1/family/:familyId/schedule-blocks/:id  (upsert)
scheduleBlocksRoutes.put("/:id", async (c) => {
  const familyId = c.req.param("familyId")!;
  const id = c.req.param("id");
  const body = await c.req.json();
  const row = await scheduleBlocksRepo.upsert({ ...body, id, familyId });
  return c.json(row);
});

// PATCH /v1/family/:familyId/schedule-blocks/:id  (partial update)
scheduleBlocksRoutes.patch("/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const row = await scheduleBlocksRepo.update(id, body);
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json(row);
});

// DELETE /v1/family/:familyId/schedule-blocks/:id
scheduleBlocksRoutes.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const ok = await scheduleBlocksRepo.delete(id);
  if (!ok) return c.json({ error: "Not found" }, 404);
  return c.json({ deleted: true });
});
