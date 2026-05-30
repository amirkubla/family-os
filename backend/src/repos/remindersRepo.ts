/**
 * remindersRepo.ts — data access for the new minute-precision reminder system.
 *
 * One row per (source × lead_minutes), live for the lifetime of the series:
 * on each fire we update the same row in place with the next occurrence's
 * fire_at and a fresh Cloud Task name. The unique (source_kind, source_id,
 * lead_minutes) index enforces that invariant.
 *
 * The interesting bit is `claim()` — it's the at-least-once → at-most-once
 * gate. Cloud Tasks retries on 5xx and may also re-deliver a task that
 * already 200'd if the response was slow; both manifest as the handler
 * being invoked more than once for the same reminder. The conditional
 * UPDATE … WHERE status='pending' is the atomic transition that lets only
 * one caller proceed; everyone else gets a 0-row result and short-circuits.
 */
import { and, eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { reminders } from "../db/schema.js";
import type {
  NewReminder,
  Reminder,
  ReminderSourceKind,
  UpdateReminder,
} from "../types/models.js";

export const remindersRepo = {
  async create(data: NewReminder): Promise<Reminder> {
    const [row] = await db.insert(reminders).values(data).returning();
    return row;
  },

  async getById(id: string): Promise<Reminder | undefined> {
    const [row] = await db
      .select()
      .from(reminders)
      .where(eq(reminders.id, id));
    return row;
  },

  async listBySource(
    sourceKind: ReminderSourceKind,
    sourceId: string,
  ): Promise<Reminder[]> {
    return db
      .select()
      .from(reminders)
      .where(
        and(
          eq(reminders.sourceKind, sourceKind),
          eq(reminders.sourceId, sourceId),
        ),
      );
  },

  async update(id: string, data: UpdateReminder): Promise<Reminder | undefined> {
    const [row] = await db
      .update(reminders)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(reminders.id, id))
      .returning();
    return row;
  },

  /**
   * Atomic pending → processing transition. Returns the claimed row if we
   * won the race, undefined if someone else already claimed it (or it's
   * already past the pending state). Callers MUST short-circuit on
   * undefined — that's the "deliver-exactly-once" guarantee.
   */
  async claim(id: string): Promise<Reminder | undefined> {
    const [row] = await db
      .update(reminders)
      .set({ status: "processing", updatedAt: new Date() })
      .where(and(eq(reminders.id, id), eq(reminders.status, "pending")))
      .returning();
    return row;
  },

  async delete(id: string): Promise<boolean> {
    const result = await db
      .delete(reminders)
      .where(eq(reminders.id, id))
      .returning({ id: reminders.id });
    return result.length > 0;
  },

  async deleteBySource(
    sourceKind: ReminderSourceKind,
    sourceId: string,
  ): Promise<Reminder[]> {
    // Returns the deleted rows so callers can delete the matching Cloud
    // Tasks by task_name without a second query.
    return db
      .delete(reminders)
      .where(
        and(
          eq(reminders.sourceKind, sourceKind),
          eq(reminders.sourceId, sourceId),
        ),
      )
      .returning();
  },
};
