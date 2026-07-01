import { eq, and } from "drizzle-orm";
import { db } from "../db/client.js";
import { folders } from "../db/schema.js";
import type { Folder, NewFolder, UpdateFolder } from "../types/models.js";

/**
 * Folders repo. Writes are scoped by familyId (not just id) so a leaked id
 * can never be used to touch another family's tree — documents are sensitive.
 */
export const foldersRepo = {
  async create(data: NewFolder): Promise<Folder> {
    const [row] = await db.insert(folders).values(data).returning();
    return row;
  },

  async listByFamily(familyId: string): Promise<Folder[]> {
    return db.select().from(folders).where(eq(folders.familyId, familyId));
  },

  async getById(id: string, familyId: string): Promise<Folder | undefined> {
    const [row] = await db
      .select()
      .from(folders)
      .where(and(eq(folders.id, id), eq(folders.familyId, familyId)));
    return row;
  },

  async update(
    id: string,
    familyId: string,
    data: UpdateFolder,
  ): Promise<Folder | undefined> {
    const [row] = await db
      .update(folders)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(folders.id, id), eq(folders.familyId, familyId)))
      .returning();
    return row;
  },

  async delete(id: string, familyId: string): Promise<boolean> {
    const result = await db
      .delete(folders)
      .where(and(eq(folders.id, id), eq(folders.familyId, familyId)))
      .returning({ id: folders.id });
    return result.length > 0;
  },
};
