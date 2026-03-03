import { eq, and, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import { notes } from "../db/schema.js";
import type { Note, NewNote, UpdateNote } from "../types/models.js";

export const notesRepo = {
  async create(data: NewNote): Promise<Note> {
    const [row] = await db.insert(notes).values(data).returning();
    return row;
  },

  async getById(id: string): Promise<Note | undefined> {
    const [row] = await db.select().from(notes).where(eq(notes.id, id));
    return row;
  },

  async listByFamily(familyId: string): Promise<Note[]> {
    return db.select().from(notes).where(eq(notes.familyId, familyId));
  },

  async listPinned(familyId: string): Promise<Note[]> {
    return db
      .select()
      .from(notes)
      .where(and(eq(notes.familyId, familyId), eq(notes.pinned, true)));
  },

  async update(id: string, data: UpdateNote): Promise<Note | undefined> {
    const [row] = await db
      .update(notes)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(notes.id, id))
      .returning();
    return row;
  },

  async upsert(data: NewNote & { id: string }): Promise<Note> {
    const [row] = await db
      .insert(notes)
      .values(data)
      .onConflictDoUpdate({
        target: notes.id,
        set: {
          title: sql`excluded.title`,
          body: sql`excluded.body`,
          pinned: sql`excluded.pinned`,
          updatedAt: new Date(),
        },
      })
      .returning();
    return row;
  },

  async delete(id: string): Promise<boolean> {
    const result = await db
      .delete(notes)
      .where(eq(notes.id, id))
      .returning({ id: notes.id });
    return result.length > 0;
  },
};
