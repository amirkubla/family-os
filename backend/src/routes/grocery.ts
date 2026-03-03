import { Hono } from "hono";
import { groceryRepo } from "../repos/groceryRepo.js";

export const groceryRoutes = new Hono();

// GET  /v1/family/:familyId/grocery
groceryRoutes.get("/", async (c) => {
  const familyId = c.req.param("familyId")!;
  const rows = await groceryRepo.listByFamily(familyId);
  return c.json(rows);
});

// POST /v1/family/:familyId/grocery
groceryRoutes.post("/", async (c) => {
  const familyId = c.req.param("familyId")!;
  const body = await c.req.json();
  const row = await groceryRepo.create({ ...body, familyId });
  return c.json(row, 201);
});

// PUT  /v1/family/:familyId/grocery/:id  (upsert)
groceryRoutes.put("/:id", async (c) => {
  const familyId = c.req.param("familyId")!;
  const id = c.req.param("id");
  const body = await c.req.json();
  const row = await groceryRepo.upsert({ ...body, id, familyId });
  return c.json(row);
});

// PATCH /v1/family/:familyId/grocery/:id  (partial update)
groceryRoutes.patch("/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const row = await groceryRepo.update(id, body);
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json(row);
});

// DELETE /v1/family/:familyId/grocery/:id
groceryRoutes.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const ok = await groceryRepo.delete(id);
  if (!ok) return c.json({ error: "Not found" }, 404);
  return c.json({ deleted: true });
});
