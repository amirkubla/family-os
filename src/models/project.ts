export type ProjectStatus = "idea" | "in_progress" | "done";

export interface Project {
  id: string;
  title: string;
  description?: string;
  status: ProjectStatus;
  progress: number; // 0–100
  /**
   * Optional kid ownership. undefined = family-wide project (shown on /home).
   * Non-null = project belongs to that kid (shown on /kid/[kidId]).
   */
  kidId?: string;
  updatedAt: number;
  createdAt: number;
}
