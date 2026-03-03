import { Hono } from "hono";
import { kidsRepo } from "../repos/kidsRepo.js";

export const kidsRoutes = new Hono();

// GET  /v1/family/:familyId/kids
kidsRoutes.get("/", async (c) => {
  const familyId = c.req.param("familyId")!;
  const rows = await kidsRepo.listByFamily(familyId);
  return c.json(rows);
});

// POST /v1/family/:familyId/kids
kidsRoutes.post("/", async (c) => {
  const familyId = c.req.param("familyId")!;
  const body = await c.req.json();
  const row = await kidsRepo.create({ ...body, familyId });
  return c.json(row, 201);
});

// PUT  /v1/family/:familyId/kids/:id  (upsert)
kidsRoutes.put("/:id", async (c) => {
  const familyId = c.req.param("familyId")!;
  const id = c.req.param("id");
  const body = await c.req.json();
  const row = await kidsRepo.upsert({ ...body, id, familyId });
  return c.json(row);
});

// PATCH /v1/family/:familyId/kids/:id  (partial update)
kidsRoutes.patch("/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const row = await kidsRepo.update(id, body);
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json(row);
});

// DELETE /v1/family/:familyId/kids/:id
kidsRoutes.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const ok = await kidsRepo.delete(id);
  if (!ok) return c.json({ error: "Not found" }, 404);
  return c.json({ deleted: true });
});
