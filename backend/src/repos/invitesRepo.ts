import { eq, and, isNull, gt } from "drizzle-orm";
import { db } from "../db/client.js";
import { invites } from "../db/schema.js";
import type { Invite } from "../types/models.js";
import crypto from "node:crypto";

/** Generate a 6-character uppercase alphanumeric code. */
function generateCode(): string {
  return crypto.randomBytes(4).toString("hex").slice(0, 6).toUpperCase();
}

/** Default invite TTL: 7 days. */
const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export const invitesRepo = {
  /** Create a new invite code for a family. */
  async create(familyId: string, createdByUserId: string): Promise<Invite> {
    const code = generateCode();
    const expiresAt = new Date(Date.now() + INVITE_TTL_MS);

    const [row] = await db
      .insert(invites)
      .values({ familyId, code, createdByUserId, expiresAt })
      .returning();
    return row;
  },

  /** Find a valid (unused, not expired) invite by code. */
  async getValidByCode(code: string): Promise<Invite | undefined> {
    const [row] = await db
      .select()
      .from(invites)
      .where(
        and(
          eq(invites.code, code.toUpperCase()),
          isNull(invites.usedByUserId),
          gt(invites.expiresAt, new Date()),
        ),
      );
    return row;
  },

  /** Mark an invite as used by a user. */
  async markUsed(id: string, usedByUserId: string): Promise<void> {
    await db
      .update(invites)
      .set({ usedByUserId })
      .where(eq(invites.id, id));
  },

  /** Get all invites for a family (for display in settings). */
  async getByFamilyId(familyId: string): Promise<Invite[]> {
    return db
      .select()
      .from(invites)
      .where(eq(invites.familyId, familyId));
  },
};
