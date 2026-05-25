/**
 * Internal API surface for service-to-service calls.
 *
 * Mounted at /v1/internal/family/:familyId/* and guarded by the shared
 * SERVICE_TOKEN (see middleware/serviceToken.ts). Currently used by the
 * Telegram-bot Assistant to create events and grocery items on behalf of
 * a user without a per-user JWT.
 *
 * Scope is intentionally narrow — only POST endpoints for the resources
 * the Telegram bot needs to write. Reads, updates, and deletes stay on the
 * user-JWT surface.
 */

import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { familyEventsRepo } from "../repos/familyEventsRepo.js";
import { groceryRepo } from "../repos/groceryRepo.js";
import { createFamilyEventSchema } from "../schemas/familyEvents.js";

export const internalRoutes = new Hono();

// ── family events ────────────────────────────────────────────────────────

internalRoutes.post(
  "/family/:familyId/family-events",
  zValidator("json", createFamilyEventSchema, (result, c) => {
    if (!result.success) {
      return c.json(
        { error: "Validation failed", issues: result.error.issues },
        400,
      );
    }
  }),
  async (c) => {
    const familyId = c.req.param("familyId")!;
    const body = c.req.valid("json");
    const row = await familyEventsRepo.create({ ...body, familyId });
    return c.json(row, 201);
  },
);

// ── grocery ──────────────────────────────────────────────────────────────
//
// We pass shape through to the repo as-is. The user-facing grocery route
// also lacks Zod validation (the broader BUG-N5 backfill is deferred), so
// no schema is enforced here either. The Assistant is a trusted caller.

internalRoutes.post("/family/:familyId/grocery", async (c) => {
  const familyId = c.req.param("familyId")!;
  const body = await c.req.json();
  if (typeof body?.title !== "string" || body.title.trim().length === 0) {
    return c.json({ error: "title is required" }, 400);
  }
  const row = await groceryRepo.create({ ...body, familyId });
  return c.json(row, 201);
});
