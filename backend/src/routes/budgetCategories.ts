import { Hono } from "hono";
import { budgetCategoriesRepo } from "../repos/budgetCategoriesRepo.js";

export const budgetCategoriesRoutes = new Hono();

// GET  /v1/family/:familyId/budget-categories
budgetCategoriesRoutes.get("/", async (c) => {
  const familyId = c.req.param("familyId")!;
  const rows = await budgetCategoriesRepo.listByFamily(familyId);
  return c.json(rows);
});

// POST /v1/family/:familyId/budget-categories
budgetCategoriesRoutes.post("/", async (c) => {
  const familyId = c.req.param("familyId")!;
  const body = await c.req.json();
  const row = await budgetCategoriesRepo.create({ ...body, familyId });
  return c.json(row, 201);
});

// PUT  /v1/family/:familyId/budget-categories/:id  (upsert)
budgetCategoriesRoutes.put("/:id", async (c) => {
  const familyId = c.req.param("familyId")!;
  const id = c.req.param("id");
  const body = await c.req.json();
  const row = await budgetCategoriesRepo.upsert({ ...body, id, familyId });
  return c.json(row);
});

// PATCH /v1/family/:familyId/budget-categories/:id
budgetCategoriesRoutes.patch("/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const row = await budgetCategoriesRepo.update(id, body);
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json(row);
});

// DELETE /v1/family/:familyId/budget-categories/:id
budgetCategoriesRoutes.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const ok = await budgetCategoriesRepo.delete(id);
  if (!ok) return c.json({ error: "Not found" }, 404);
  return c.json({ deleted: true });
});
