import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { pushTokens } from "../db/schema.js";

export const pushTokensRepo = {
  /**
   * Register a device's Expo push token for a family. The unique constraint
   * is on `token` alone — if the same device previously registered under
   * a different family (user switched accounts on the device), the existing
   * row's `familyId` is updated to point at the new family. The old family
   * stops sending pushes to this device. See QA Pass 2 BUG-N3 and migration
   * 0014_push_token_unique_per_device.
   */
  async register(familyId: string, token: string) {
    const [row] = await db
      .insert(pushTokens)
      .values({ familyId, token })
      .onConflictDoUpdate({
        target: pushTokens.token,
        set: { familyId, updatedAt: new Date() },
      })
      .returning();
    return row;
  },

  async listByFamily(familyId: string) {
    return db
      .select()
      .from(pushTokens)
      .where(eq(pushTokens.familyId, familyId));
  },

  async deleteByToken(token: string) {
    await db.delete(pushTokens).where(eq(pushTokens.token, token));
  },
};
