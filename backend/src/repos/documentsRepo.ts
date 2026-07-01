import { eq, and } from "drizzle-orm";
import { db } from "../db/client.js";
import { documents } from "../db/schema.js";
import type { Document, NewDocument, UpdateDocument } from "../types/models.js";

/**
 * Documents repo — metadata only (the bytes live in GCS). Writes are scoped by
 * familyId so a leaked id can't reach another family's files.
 */
export const documentsRepo = {
  async create(data: NewDocument): Promise<Document> {
    const [row] = await db.insert(documents).values(data).returning();
    return row;
  },

  async listByFamily(familyId: string): Promise<Document[]> {
    return db.select().from(documents).where(eq(documents.familyId, familyId));
  },

  async getById(id: string, familyId: string): Promise<Document | undefined> {
    const [row] = await db
      .select()
      .from(documents)
      .where(and(eq(documents.id, id), eq(documents.familyId, familyId)));
    return row;
  },

  async update(
    id: string,
    familyId: string,
    data: UpdateDocument,
  ): Promise<Document | undefined> {
    const [row] = await db
      .update(documents)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(documents.id, id), eq(documents.familyId, familyId)))
      .returning();
    return row;
  },

  async delete(id: string, familyId: string): Promise<boolean> {
    const result = await db
      .delete(documents)
      .where(and(eq(documents.id, id), eq(documents.familyId, familyId)))
      .returning({ id: documents.id });
    return result.length > 0;
  },
};
