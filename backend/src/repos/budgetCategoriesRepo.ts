import { eq, asc, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import { budgetCategories } from "../db/schema.js";
import type {
  BudgetCategory,
  NewBudgetCategory,
  UpdateBudgetCategory,
} from "../types/models.js";

const DEFAULT_CATEGORIES = [
  { name: "מזון וקניות", icon: "🛒", color: "#2D9F6F", sortOrder: 0 },
  { name: "בית ושירותים", icon: "🏠", color: "#3A7BD5", sortOrder: 1 },
  { name: "ילדים וחוגים", icon: "👶", color: "#E0699B", sortOrder: 2 },
  { name: "תחבורה", icon: "🚗", color: "#F59E0B", sortOrder: 3 },
  { name: "בילויים", icon: "🎉", color: "#9B59B6", sortOrder: 4 },
  { name: "בריאות", icon: "💊", color: "#EF4444", sortOrder: 5 },
  { name: "אחר", icon: "📦", color: "#888888", sortOrder: 6 },
];

export const budgetCategoriesRepo = {
  async listByFamily(familyId: string): Promise<BudgetCategory[]> {
    const rows = await db
      .select()
      .from(budgetCategories)
      .where(eq(budgetCategories.familyId, familyId))
      .orderBy(asc(budgetCategories.sortOrder));

    if (rows.length === 0) {
      // Auto-seed defaults on first access so both family members see them.
      const seeded = await db
        .insert(budgetCategories)
        .values(DEFAULT_CATEGORIES.map((c) => ({ ...c, familyId })))
        .returning();
      return seeded.sort((a, b) => a.sortOrder - b.sortOrder);
    }
    return rows;
  },

  async create(data: NewBudgetCategory): Promise<BudgetCategory> {
    const [row] = await db.insert(budgetCategories).values(data).returning();
    return row;
  },

  async upsert(data: NewBudgetCategory & { id: string }): Promise<BudgetCategory> {
    const [row] = await db
      .insert(budgetCategories)
      .values(data)
      .onConflictDoUpdate({
        target: budgetCategories.id,
        set: {
          name: sql`excluded.name`,
          icon: sql`excluded.icon`,
          color: sql`excluded.color`,
          monthlyCap: sql`excluded.monthly_cap`,
          sortOrder: sql`excluded.sort_order`,
          updatedAt: new Date(),
        },
      })
      .returning();
    return row;
  },

  async update(id: string, data: UpdateBudgetCategory): Promise<BudgetCategory | undefined> {
    const [row] = await db
      .update(budgetCategories)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(budgetCategories.id, id))
      .returning();
    return row;
  },

  async delete(id: string): Promise<boolean> {
    const result = await db
      .delete(budgetCategories)
      .where(eq(budgetCategories.id, id))
      .returning({ id: budgetCategories.id });
    return result.length > 0;
  },
};
