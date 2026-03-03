import { eq, and, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import { projects } from "../db/schema.js";
import type {
  Project,
  NewProject,
  UpdateProject,
  ProjectStatus,
} from "../types/models.js";

export const projectsRepo = {
  async create(data: NewProject): Promise<Project> {
    const [row] = await db.insert(projects).values(data).returning();
    return row;
  },

  async getById(id: string): Promise<Project | undefined> {
    const [row] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, id));
    return row;
  },

  async listByFamily(familyId: string): Promise<Project[]> {
    return db.select().from(projects).where(eq(projects.familyId, familyId));
  },

  async listByStatus(
    familyId: string,
    status: ProjectStatus,
  ): Promise<Project[]> {
    return db
      .select()
      .from(projects)
      .where(
        and(eq(projects.familyId, familyId), eq(projects.status, status)),
      );
  },

  async update(id: string, data: UpdateProject): Promise<Project | undefined> {
    const [row] = await db
      .update(projects)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();
    return row;
  },

  async upsert(data: NewProject & { id: string }): Promise<Project> {
    const [row] = await db
      .insert(projects)
      .values(data)
      .onConflictDoUpdate({
        target: projects.id,
        set: {
          title: sql`excluded.title`,
          description: sql`excluded.description`,
          status: sql`excluded.status`,
          progress: sql`excluded.progress`,
          updatedAt: new Date(),
        },
      })
      .returning();
    return row;
  },

  async delete(id: string): Promise<boolean> {
    const result = await db
      .delete(projects)
      .where(eq(projects.id, id))
      .returning({ id: projects.id });
    return result.length > 0;
  },
};
