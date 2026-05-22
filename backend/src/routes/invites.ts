/**
 * routes/invites.ts — Create and manage family invite codes.
 *
 * POST /                     — Generate a new invite code (authenticated)
 * GET  /v1/auth/invite/:code — Validate an invite code (public, used during registration)
 */

import { Hono } from "hono";
import { invitesRepo } from "../repos/invitesRepo.js";
import { db } from "../db/client.js";
import { families } from "../db/schema.js";
import { eq } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Family-scoped routes (mounted under /v1/family/:familyId/invites)
// ---------------------------------------------------------------------------

export const inviteRoutes = new Hono();

/** POST / — Generate a new invite code for this family. */
inviteRoutes.post("/", async (c) => {
  const user = c.get("user");
  const familyId = c.req.param("familyId")!;

  const invite = await invitesRepo.create(familyId, user.sub);

  return c.json(
    {
      id: invite.id,
      code: invite.code,
      expiresAt: invite.expiresAt.getTime(),
    },
    201,
  );
});

/** GET / — List invites for this family. */
inviteRoutes.get("/", async (c) => {
  const familyId = c.req.param("familyId")!;
  const all = await invitesRepo.getByFamilyId(familyId);

  return c.json(
    all.map((inv) => ({
      id: inv.id,
      code: inv.code,
      createdAt: inv.createdAt.getTime(),
      expiresAt: inv.expiresAt.getTime(),
      used: inv.usedByUserId !== null,
    })),
  );
});

// ---------------------------------------------------------------------------
// Public route (mounted on /v1/auth)
// ---------------------------------------------------------------------------

export const inviteValidateRoute = new Hono();

/** GET /invite/:code — Validate an invite code, return family name. */
inviteValidateRoute.get("/invite/:code", async (c) => {
  const code = c.req.param("code");

  const invite = await invitesRepo.getValidByCode(code);
  if (!invite) {
    return c.json({ error: "INVALID_INVITE" }, 404);
  }

  // Fetch family name to show in the registration UI
  const [family] = await db
    .select({ name: families.name })
    .from(families)
    .where(eq(families.id, invite.familyId));

  return c.json({
    valid: true,
    familyId: invite.familyId,
    familyName: family?.name ?? "",
    expiresAt: invite.expiresAt.getTime(),
  });
});
