import { Hono } from "hono";
import { familyMembersRepo } from "../repos/familyMembersRepo.js";

export const familyMembersRoutes = new Hono();

// GET  /v1/family/:familyId/members
familyMembersRoutes.get("/", async (c) => {
  const familyId = c.req.param("familyId")!;
  const rows = await familyMembersRepo.listByFamily(familyId);
  return c.json(rows);
});

// POST /v1/family/:familyId/members
familyMembersRoutes.post("/", async (c) => {
  const familyId = c.req.param("familyId")!;
  const body = await c.req.json();
  const row = await familyMembersRepo.create({ ...body, familyId });
  return c.json(row, 201);
});

// PUT  /v1/family/:familyId/members/:id  (upsert)
familyMembersRoutes.put("/:id", async (c) => {
  const familyId = c.req.param("familyId")!;
  const id = c.req.param("id");
  const body = await c.req.json();
  const row = await familyMembersRepo.upsert({ ...body, id, familyId });
  return c.json(row);
});

// PATCH /v1/family/:familyId/members/:id  (partial update)
familyMembersRoutes.patch("/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const row = await familyMembersRepo.update(id, body);
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json(row);
});

// DELETE /v1/family/:familyId/members/:id
familyMembersRoutes.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const ok = await familyMembersRepo.delete(id);
  if (!ok) return c.json({ error: "Not found" }, 404);
  return c.json({ deleted: true });
});
