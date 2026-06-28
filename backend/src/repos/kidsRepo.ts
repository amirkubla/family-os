import { eq, and, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import {
  kids,
  scheduleBlocks,
  notes,
  projects,
  expenses,
  familyEvents,
} from "../db/schema.js";
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
          isActive: sql`excluded.is_active`,
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

  /**
   * Hard-delete a kid AND all content that belongs to them: schedule blocks,
   * their notes/projects, their kid-payments, and family events assigned to
   * them. Returns the schedule-block + event ids so the caller can cancel any
   * Cloud Tasks reminders, or null if the kid doesn't exist in this family.
   *
   * Deletes related rows first and the kid row last, so a partial failure
   * leaves the kid in place and the operation is safe to retry. (The neon-http
   * driver has no interactive transactions, hence the sequential approach.)
   */
  async purge(
    familyId: string,
    kidId: string,
  ): Promise<{ scheduleBlockIds: string[]; eventIds: string[] } | null> {
    const kid = await this.getById(kidId);
    if (!kid || kid.familyId !== familyId) return null;

    const blockRows = await db
      .select({ id: scheduleBlocks.id })
      .from(scheduleBlocks)
      .where(eq(scheduleBlocks.kidId, kidId));
    const eventRows = await db
      .select({ id: familyEvents.id })
      .from(familyEvents)
      .where(
        and(
          eq(familyEvents.familyId, familyId),
          eq(familyEvents.assigneeType, "kid"),
          eq(familyEvents.assigneeId, kidId),
        ),
      );

    await db.delete(scheduleBlocks).where(eq(scheduleBlocks.kidId, kidId));
    await db.delete(notes).where(eq(notes.kidId, kidId));
    await db.delete(projects).where(eq(projects.kidId, kidId));
    await db.delete(expenses).where(eq(expenses.kidId, kidId));
    await db
      .delete(familyEvents)
      .where(
        and(
          eq(familyEvents.familyId, familyId),
          eq(familyEvents.assigneeType, "kid"),
          eq(familyEvents.assigneeId, kidId),
        ),
      );
    await db.delete(kids).where(eq(kids.id, kidId));

    return {
      scheduleBlockIds: blockRows.map((r) => r.id),
      eventIds: eventRows.map((r) => r.id),
    };
  },
};
