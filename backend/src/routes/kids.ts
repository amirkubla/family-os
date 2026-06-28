import { Hono } from "hono";
import { kidsRepo } from "../repos/kidsRepo.js";
import { cancelForSource } from "../services/reminderService.js";

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
// Hard-delete the kid AND all their content (schedule blocks, notes, projects,
// payments, assigned events). Reminders are cancelled fire-and-forget.
kidsRoutes.delete("/:id", async (c) => {
  const familyId = c.req.param("familyId")!;
  const id = c.req.param("id");
  const purged = await kidsRepo.purge(familyId, id);
  if (!purged) return c.json({ error: "Not found" }, 404);
  for (const sid of purged.scheduleBlockIds) {
    cancelForSource("schedule_block", sid).catch((err) =>
      console.error("[kids] cancelForSource(schedule_block) failed:", err),
    );
  }
  for (const eid of purged.eventIds) {
    cancelForSource("family_event", eid).catch((err) =>
      console.error("[kids] cancelForSource(family_event) failed:", err),
    );
  }
  return c.json({ deleted: true });
});
