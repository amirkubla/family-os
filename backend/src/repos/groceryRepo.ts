import { eq, and, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import { groceryItems } from "../db/schema.js";
import type {
  GroceryItem,
  NewGroceryItem,
  UpdateGroceryItem,
} from "../types/models.js";

export const groceryRepo = {
  async create(data: NewGroceryItem): Promise<GroceryItem> {
    const [row] = await db.insert(groceryItems).values(data).returning();
    return row;
  },

  async getById(id: string): Promise<GroceryItem | undefined> {
    const [row] = await db
      .select()
      .from(groceryItems)
      .where(eq(groceryItems.id, id));
    return row;
  },

  async listByFamily(familyId: string): Promise<GroceryItem[]> {
    return db
      .select()
      .from(groceryItems)
      .where(eq(groceryItems.familyId, familyId));
  },

  async listUnbought(familyId: string): Promise<GroceryItem[]> {
    return db
      .select()
      .from(groceryItems)
      .where(
        and(
          eq(groceryItems.familyId, familyId),
          eq(groceryItems.isBought, false),
        ),
      );
  },

  async update(
    id: string,
    data: UpdateGroceryItem,
  ): Promise<GroceryItem | undefined> {
    const [row] = await db
      .update(groceryItems)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(groceryItems.id, id))
      .returning();
    return row;
  },

  async upsert(data: NewGroceryItem & { id: string }): Promise<GroceryItem> {
    const [row] = await db
      .insert(groceryItems)
      .values(data)
      .onConflictDoUpdate({
        target: groceryItems.id,
        set: {
          title: sql`excluded.title`,
          category: sql`excluded.category`,
          qty: sql`excluded.qty`,
          isBought: sql`excluded.is_bought`,
          updatedAt: new Date(),
        },
      })
      .returning();
    return row;
  },

  async delete(id: string): Promise<boolean> {
    const result = await db
      .delete(groceryItems)
      .where(eq(groceryItems.id, id))
      .returning({ id: groceryItems.id });
    return result.length > 0;
  },
};
