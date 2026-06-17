import { eq, and, gte, lte, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import { expenses } from "../db/schema.js";
import type { Expense, NewExpense, UpdateExpense } from "../types/models.js";

export const expensesRepo = {
  async listByFamily(familyId: string): Promise<Expense[]> {
    return db
      .select()
      .from(expenses)
      .where(eq(expenses.familyId, familyId))
      .orderBy(expenses.date);
  },

  async listByMonth(familyId: string, yearMonth: string): Promise<Expense[]> {
    // yearMonth = "YYYY-MM"
    const from = `${yearMonth}-01`;
    const to = `${yearMonth}-31`;
    return db
      .select()
      .from(expenses)
      .where(
        and(
          eq(expenses.familyId, familyId),
          gte(expenses.date, from),
          lte(expenses.date, to),
        ),
      )
      .orderBy(expenses.date);
  },

  async create(data: NewExpense): Promise<Expense> {
    const [row] = await db.insert(expenses).values(data).returning();
    return row;
  },

  async upsert(data: NewExpense & { id: string }): Promise<Expense> {
    const [row] = await db
      .insert(expenses)
      .values(data)
      .onConflictDoUpdate({
        target: expenses.id,
        set: {
          amount: sql`excluded.amount`,
          categoryName: sql`excluded.category_name`,
          payerMemberId: sql`excluded.payer_member_id`,
          kidId: sql`excluded.kid_id`,
          date: sql`excluded.date`,
          note: sql`excluded.note`,
          paid: sql`excluded.paid`,
          isRecurring: sql`excluded.is_recurring`,
          recurrenceType: sql`excluded.recurrence_type`,
          recurrenceDay: sql`excluded.recurrence_day`,
          recurrenceMonth: sql`excluded.recurrence_month`,
          updatedAt: new Date(),
        },
      })
      .returning();
    return row;
  },

  async update(id: string, data: UpdateExpense): Promise<Expense | undefined> {
    const [row] = await db
      .update(expenses)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(expenses.id, id))
      .returning();
    return row;
  },

  async delete(id: string): Promise<boolean> {
    const result = await db
      .delete(expenses)
      .where(eq(expenses.id, id))
      .returning({ id: expenses.id });
    return result.length > 0;
  },
};
