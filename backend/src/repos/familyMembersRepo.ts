import { eq, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import { familyMembers } from "../db/schema.js";
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
};
