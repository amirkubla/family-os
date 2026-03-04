import { eq, and, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import { chores } from "../db/schema.js";
import type { Chore, NewChore, UpdateChore } from "../types/models.js";

export const choresRepo = {
  async create(data: NewChore): Promise<Chore> {
    const [row] = await db.insert(chores).values(data).returning();
    return row;
  },

  async getById(id: string): Promise<Chore | undefined> {
    const [row] = await db.select().from(chores).where(eq(chores.id, id));
    return row;
  },

  async listByFamily(familyId: string): Promise<Chore[]> {
    return db.select().from(chores).where(eq(chores.familyId, familyId));
  },

  async listUndone(familyId: string): Promise<Chore[]> {
    return db
      .select()
      .from(chores)
      .where(and(eq(chores.familyId, familyId), eq(chores.done, false)));
  },

  async update(id: string, data: UpdateChore): Promise<Chore | undefined> {
    const [row] = await db
      .update(chores)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(chores.id, id))
      .returning();
    return row;
  },

  async upsert(data: NewChore & { id: string }): Promise<Chore> {
    const [row] = await db
      .insert(chores)
      .values(data)
      .onConflictDoUpdate({
        target: chores.id,
        set: {
          title: sql`excluded.title`,
          assignedTo: sql`excluded.assigned_to`,
          assignedToMemberId: sql`excluded.assigned_to_member_id`,
          done: sql`excluded.done`,
          selectedForToday: sql`excluded.selected_for_today`,
          updatedAt: new Date(),
        },
      })
      .returning();
    return row;
  },

  async delete(id: string): Promise<boolean> {
    const result = await db
      .delete(chores)
      .where(eq(chores.id, id))
      .returning({ id: chores.id });
    return result.length > 0;
  },
};
