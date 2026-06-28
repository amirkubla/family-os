import { eq, and, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import {
  familyMembers,
  notes,
  projects,
  chores,
  expenses,
  familyEvents,
} from "../db/schema.js";
import type {
  FamilyMember,
  NewFamilyMember,
  UpdateFamilyMember,
} from "../types/models.js";

export const familyMembersRepo = {
  async create(data: NewFamilyMember): Promise<FamilyMember> {
    const [row] = await db.insert(familyMembers).values(data).returning();
    return row;
  },

  async getById(id: string): Promise<FamilyMember | undefined> {
    const [row] = await db
      .select()
      .from(familyMembers)
      .where(eq(familyMembers.id, id));
    return row;
  },

  async listByFamily(familyId: string): Promise<FamilyMember[]> {
    return db
      .select()
      .from(familyMembers)
      .where(eq(familyMembers.familyId, familyId));
  },

  async update(
    id: string,
    data: UpdateFamilyMember,
  ): Promise<FamilyMember | undefined> {
    const [row] = await db
      .update(familyMembers)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(familyMembers.id, id))
      .returning();
    return row;
  },

  async upsert(data: NewFamilyMember & { id: string }): Promise<FamilyMember> {
    const [row] = await db
      .insert(familyMembers)
      .values(data)
      .onConflictDoUpdate({
        target: familyMembers.id,
        set: {
          displayName: sql`excluded.display_name`,
          role: sql`excluded.role`,
          color: sql`excluded.color`,
          avatarEmoji: sql`excluded.avatar_emoji`,
          isActive: sql`excluded.is_active`,
          updatedAt: new Date(),
        },
      })
      .returning();
    return row;
  },

  async delete(id: string): Promise<boolean> {
    const result = await db
      .delete(familyMembers)
      .where(eq(familyMembers.id, id))
      .returning({ id: familyMembers.id });
    return result.length > 0;
  },

  /**
   * Hard-delete a member AND all content tied to them: notes/projects they
   * own, chores assigned to them, expenses they paid, and family events
   * assigned to them. Leaves their linked user account (if any) intact — they
   * can re-claim a member on next sign-in. Returns the event ids so the caller
   * can cancel Cloud Tasks reminders, or null if the member isn't in this family.
   *
   * Related rows first, member row last (safe to retry); no interactive
   * transaction because the neon-http driver doesn't support one.
   */
  async purge(
    familyId: string,
    memberId: string,
  ): Promise<{ eventIds: string[] } | null> {
    const member = await this.getById(memberId);
    if (!member || member.familyId !== familyId) return null;

    const eventRows = await db
      .select({ id: familyEvents.id })
      .from(familyEvents)
      .where(
        and(
          eq(familyEvents.familyId, familyId),
          eq(familyEvents.assigneeType, "member"),
          eq(familyEvents.assigneeId, memberId),
        ),
      );

    await db
      .delete(notes)
      .where(and(eq(notes.familyId, familyId), eq(notes.ownerMemberId, memberId)));
    await db
      .delete(projects)
      .where(
        and(eq(projects.familyId, familyId), eq(projects.ownerMemberId, memberId)),
      );
    await db
      .delete(chores)
      .where(
        and(
          eq(chores.familyId, familyId),
          eq(chores.assignedToMemberId, memberId),
        ),
      );
    await db
      .delete(expenses)
      .where(
        and(eq(expenses.familyId, familyId), eq(expenses.payerMemberId, memberId)),
      );
    await db
      .delete(familyEvents)
      .where(
        and(
          eq(familyEvents.familyId, familyId),
          eq(familyEvents.assigneeType, "member"),
          eq(familyEvents.assigneeId, memberId),
        ),
      );
    await db.delete(familyMembers).where(eq(familyMembers.id, memberId));

    return { eventIds: eventRows.map((r) => r.id) };
  },
};
