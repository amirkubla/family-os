import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { families } from "../db/schema.js";

export const familyRoutes = new Hono();

// GET /v1/family — list all families
familyRoutes.get("/", async (c) => {
  const rows = await db.select().from(families);
  return c.json(rows);
});

// PUT /v1/family/:familyId — update family (e.g. name)
familyRoutes.put("/:familyId", async (c) => {
  const familyId = c.req.param("familyId");
  const body = await c.req.json();
  const [row] = await db
    .update(families)
    .set({ name: body.name, updatedAt: new Date() })
    .where(eq(families.id, familyId))
    .returning();
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json(row);
});
