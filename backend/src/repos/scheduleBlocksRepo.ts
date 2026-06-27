import { eq, and, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import { scheduleBlocks } from "../db/schema.js";
import type {
  ScheduleBlock,
  NewScheduleBlock,
  UpdateScheduleBlock,
} from "../types/models.js";

export const scheduleBlocksRepo = {
  async create(data: NewScheduleBlock): Promise<ScheduleBlock> {
    const [row] = await db.insert(scheduleBlocks).values(data).returning();
    return row;
  },

  async getById(id: string): Promise<ScheduleBlock | undefined> {
    const [row] = await db
      .select()
      .from(scheduleBlocks)
      .where(eq(scheduleBlocks.id, id));
    return row;
  },

  async listByFamily(familyId: string): Promise<ScheduleBlock[]> {
    return db
      .select()
      .from(scheduleBlocks)
      .where(eq(scheduleBlocks.familyId, familyId));
  },

  async listByKid(kidId: string): Promise<ScheduleBlock[]> {
    return db
      .select()
      .from(scheduleBlocks)
      .where(eq(scheduleBlocks.kidId, kidId));
  },

  async listByKidAndDay(
    kidId: string,
    dayOfWeek: number,
  ): Promise<ScheduleBlock[]> {
    return db
      .select()
      .from(scheduleBlocks)
      .where(
        and(
          eq(scheduleBlocks.kidId, kidId),
          sql`${scheduleBlocks.daysOfWeek} @> ${JSON.stringify([dayOfWeek])}::jsonb`,
        ),
      );
  },

  async update(
    id: string,
    data: UpdateScheduleBlock,
  ): Promise<ScheduleBlock | undefined> {
    const [row] = await db
      .update(scheduleBlocks)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(scheduleBlocks.id, id))
      .returning();
    return row;
  },

  async upsert(data: NewScheduleBlock & { id: string }): Promise<ScheduleBlock> {
    const [row] = await db
      .insert(scheduleBlocks)
      .values(data)
      .onConflictDoUpdate({
        target: scheduleBlocks.id,
        set: {
          kidId: sql`excluded.kid_id`,
          daysOfWeek: sql`excluded.days_of_week`,
          title: sql`excluded.title`,
          startMinutes: sql`excluded.start_minutes`,
          endMinutes: sql`excluded.end_minutes`,
          location: sql`excluded.location`,
          color: sql`excluded.color`,
          date: sql`excluded.date`,
          isRecurring: sql`excluded.is_recurring`,
          reminders: sql`excluded.reminders`,
          updatedAt: new Date(),
        },
      })
      .returning();
    return row;
  },

  async delete(id: string): Promise<boolean> {
    const result = await db
      .delete(scheduleBlocks)
      .where(eq(scheduleBlocks.id, id))
      .returning({ id: scheduleBlocks.id });
    return result.length > 0;
  },
};
