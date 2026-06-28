import { Hono } from "hono";
import { familyMembersRepo } from "../repos/familyMembersRepo.js";
import { cancelForSource } from "../services/reminderService.js";

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

// POST /v1/family/:familyId/members/:id/claim — link current user to this member
familyMembersRoutes.post("/:id/claim", async (c) => {
  const familyId = c.req.param("familyId")!;
  const memberId = c.req.param("id");
  const user = c.get("user");

  const member = await familyMembersRepo.getById(memberId);
  if (!member || member.familyId !== familyId) {
    return c.json({ error: "Not found" }, 404);
  }
  if (member.userId && member.userId !== user.sub) {
    return c.json({ error: "Member already claimed by another user" }, 409);
  }

  const updated = await familyMembersRepo.update(memberId, { userId: user.sub });
  return c.json(updated);
});

// DELETE /v1/family/:familyId/members/:id
// Hard-delete the member AND all their content (owned notes/projects, assigned
// chores, expenses they paid, assigned events). The linked user account (if
// any) is left intact. Reminders are cancelled fire-and-forget.
familyMembersRoutes.delete("/:id", async (c) => {
  const familyId = c.req.param("familyId")!;
  const id = c.req.param("id");
  const purged = await familyMembersRepo.purge(familyId, id);
  if (!purged) return c.json({ error: "Not found" }, 404);
  for (const eid of purged.eventIds) {
    cancelForSource("family_event", eid).catch((err) =>
      console.error("[members] cancelForSource(family_event) failed:", err),
    );
  }
  return c.json({ deleted: true });
});
