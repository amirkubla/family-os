import { Hono } from "hono";
import { expensesRepo } from "../repos/expensesRepo.js";

export const expensesRoutes = new Hono();

// GET  /v1/family/:familyId/expenses?month=YYYY-MM
expensesRoutes.get("/", async (c) => {
  const familyId = c.req.param("familyId")!;
  const month = c.req.query("month");
  const rows = month
    ? await expensesRepo.listByMonth(familyId, month)
    : await expensesRepo.listByFamily(familyId);
  return c.json(rows);
});

// POST /v1/family/:familyId/expenses
expensesRoutes.post("/", async (c) => {
  const familyId = c.req.param("familyId")!;
  const body = await c.req.json();
  const row = await expensesRepo.create({ ...body, familyId });
  return c.json(row, 201);
});

// PUT  /v1/family/:familyId/expenses/:id  (upsert)
expensesRoutes.put("/:id", async (c) => {
  const familyId = c.req.param("familyId")!;
  const id = c.req.param("id");
  const body = await c.req.json();
  const row = await expensesRepo.upsert({ ...body, id, familyId });
  return c.json(row);
});

// PATCH /v1/family/:familyId/expenses/:id
expensesRoutes.patch("/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const row = await expensesRepo.update(id, body);
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json(row);
});

// DELETE /v1/family/:familyId/expenses/:id
expensesRoutes.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const ok = await expensesRepo.delete(id);
  if (!ok) return c.json({ error: "Not found" }, 404);
  return c.json({ deleted: true });
});
