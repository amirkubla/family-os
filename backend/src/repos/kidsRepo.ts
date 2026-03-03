import { eq, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import { kids } from "../db/schema.js";
import type { Kid, NewKid, UpdateKid } from "../types/models.js";

export const kidsRepo = {
  async create(data: NewKid): Promise<Kid> {
    const [row] = await db.insert(kids).values(data).returning();
    return row;
  },

  async getById(id: string): Promise<Kid | undefined> {
    const [row] = await db.select().from(kids).where(eq(kids.id, id));
    return row;
  },

  async listByFamily(familyId: string): Promise<Kid[]> {
    return db.select().from(kids).where(eq(kids.familyId, familyId));
  },

  async update(id: string, data: UpdateKid): Promise<Kid | undefined> {
    const [row] = await db
      .update(kids)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(kids.id, id))
      .returning();
    return row;
  },

  async upsert(data: NewKid & { id: string }): Promise<Kid> {
    const [row] = await db
      .insert(kids)
      .values(data)
      .onConflictDoUpdate({
        target: kids.id,
        set: {
          name: sql`excluded.name`,
          color: sql`excluded.color`,
          emoji: sql`excluded.emoji`,
          updatedAt: new Date(),
        },
      })
      .returning();
    return row;
  },

  async delete(id: string): Promise<boolean> {
    const result = await db
      .delete(kids)
      .where(eq(kids.id, id))
      .returning({ id: kids.id });
    return result.length > 0;
  },
};
