import { eq, and, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import { chores } from "../db/schema.js";
import type { Chore, NewChore, UpdateChore } from "../types/models.js";

// The API sends timestamp fields (dueDate, completedAt) as ISO strings, but
// Drizzle's timestamp columns expect Date objects on write (it calls
// .toISOString() on the value). Coerce those two fields before any insert/update
// so a raw JSON string doesn't crash with "value.toISOString is not a function".
function coerceDates<T extends Record<string, any>>(data: T): T {
  const out: any = { ...data };
  if (typeof out.dueDate === "string") out.dueDate = new Date(out.dueDate);
  if (typeof out.completedAt === "string") out.completedAt = new Date(out.completedAt);
  return out;
}

export const choresRepo = {
  async create(data: NewChore): Promise<Chore> {
    const [row] = await db.insert(chores).values(coerceDates(data)).returning();
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
      .set({ ...coerceDates(data), updatedAt: new Date() })
      .where(eq(chores.id, id))
      .returning();
    return row;
  },

  async upsert(data: NewChore & { id: string }): Promise<Chore> {
    const [row] = await db
      .insert(chores)
      .values(coerceDates(data))
      .onConflictDoUpdate({
        target: chores.id,
        set: {
          title: sql`excluded.title`,
          assignedTo: sql`excluded.assigned_to`,
          assignedToMemberId: sql`excluded.assigned_to_member_id`,
          kidId: sql`excluded.kid_id`,
          done: sql`excluded.done`,
          selectedForToday: sql`excluded.selected_for_today`,
          description: sql`excluded.description`,
          priority: sql`excluded.priority`,
          dueDate: sql`excluded.due_date`,
          completedAt: sql`excluded.completed_at`,
          isRecurring: sql`excluded.is_recurring`,
          repeatUnit: sql`excluded.repeat_unit`,
          repeatInterval: sql`excluded.repeat_interval`,
          daysOfWeek: sql`excluded.days_of_week`,
          sortOrder: sql`excluded.sort_order`,
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
