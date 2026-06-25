import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { users } from "../db/schema.js";
import type { User, NewUser } from "../types/models.js";

export const usersRepo = {
  async create(data: NewUser): Promise<User> {
    const [row] = await db.insert(users).values(data).returning();
    return row;
  },

  async getById(id: string): Promise<User | undefined> {
    const [row] = await db.select().from(users).where(eq(users.id, id));
    return row;
  },

  async getByUsername(username: string): Promise<User | undefined> {
    const [row] = await db
      .select()
      .from(users)
      .where(eq(users.username, username));
    return row;
  },

  async getByGoogleSub(googleSub: string): Promise<User | undefined> {
    const [row] = await db
      .select()
      .from(users)
      .where(eq(users.googleSub, googleSub));
    return row;
  },

  async getByAppleSub(appleSub: string): Promise<User | undefined> {
    const [row] = await db
      .select()
      .from(users)
      .where(eq(users.appleSub, appleSub));
    return row;
  },

  async getByEmail(email: string): Promise<User | undefined> {
    const [row] = await db.select().from(users).where(eq(users.email, email));
    return row;
  },

  async getByFamilyId(familyId: string): Promise<User[]> {
    return db.select().from(users).where(eq(users.familyId, familyId));
  },
};
