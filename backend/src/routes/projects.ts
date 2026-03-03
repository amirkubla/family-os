import { Hono } from "hono";
import { projectsRepo } from "../repos/projectsRepo.js";

export const projectsRoutes = new Hono();

// GET  /v1/family/:familyId/projects
projectsRoutes.get("/", async (c) => {
  const familyId = c.req.param("familyId")!;
  const rows = await projectsRepo.listByFamily(familyId);
  return c.json(rows);
});

// POST /v1/family/:familyId/projects
projectsRoutes.post("/", async (c) => {
  const familyId = c.req.param("familyId")!;
  const body = await c.req.json();
  const row = await projectsRepo.create({ ...body, familyId });
  return c.json(row, 201);
});

// PUT  /v1/family/:familyId/projects/:id  (upsert)
projectsRoutes.put("/:id", async (c) => {
  const familyId = c.req.param("familyId")!;
  const id = c.req.param("id");
  const body = await c.req.json();
  const row = await projectsRepo.upsert({ ...body, id, familyId });
  return c.json(row);
});

// PATCH /v1/family/:familyId/projects/:id  (partial update)
projectsRoutes.patch("/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const row = await projectsRepo.update(id, body);
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json(row);
});

// DELETE /v1/family/:familyId/projects/:id
projectsRoutes.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const ok = await projectsRepo.delete(id);
  if (!ok) return c.json({ error: "Not found" }, 404);
  return c.json({ deleted: true });
});
