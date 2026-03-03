import { Hono } from "hono";
import { db } from "../db/client.js";
import { families } from "../db/schema.js";

export const familyRoutes = new Hono();

// GET /v1/family — list all families
familyRoutes.get("/", async (c) => {
  const rows = await db.select().from(families);
  return c.json(rows);
});
