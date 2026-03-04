import { eq, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import { familyEvents } from "../db/schema.js";
import type {
  FamilyEvent,
  NewFamilyEvent,
  UpdateFamilyEvent,
} from "../types/models.js";

export const familyEventsRepo = {
  async create(data: NewFamilyEvent): Promise<FamilyEvent> {
    const [row] = await db.insert(familyEvents).values(data).returning();
    return row;
  },

  async getById(id: string): Promise<FamilyEvent | undefined> {
    const [row] = await db
      .select()
      .from(familyEvents)
      .where(eq(familyEvents.id, id));
    return row;
  },

  async listByFamily(familyId: string): Promise<FamilyEvent[]> {
    return db
      .select()
      .from(familyEvents)
      .where(eq(familyEvents.familyId, familyId));
  },

  async update(
    id: string,
    data: UpdateFamilyEvent,
  ): Promise<FamilyEvent | undefined> {
    const [row] = await db
      .update(familyEvents)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(familyEvents.id, id))
      .returning();
    return row;
  },

  async upsert(data: NewFamilyEvent & { id: string }): Promise<FamilyEvent> {
    const [row] = await db
      .insert(familyEvents)
      .values(data)
      .onConflictDoUpdate({
        target: familyEvents.id,
        set: {
          title: sql`excluded.title`,
          assigneeType: sql`excluded.assignee_type`,
          assigneeId: sql`excluded.assignee_id`,
          dayOfWeek: sql`excluded.day_of_week`,
          startMinutes: sql`excluded.start_minutes`,
          endMinutes: sql`excluded.end_minutes`,
          location: sql`excluded.location`,
          color: sql`excluded.color`,
          date: sql`excluded.date`,
          isRecurring: sql`excluded.is_recurring`,
          updatedAt: new Date(),
        },
      })
      .returning();
    return row;
  },

  async delete(id: string): Promise<boolean> {
    const result = await db
      .delete(familyEvents)
      .where(eq(familyEvents.id, id))
      .returning({ id: familyEvents.id });
    return result.length > 0;
  },
};
