export type ProjectStatus = "idea" | "in_progress" | "done";

export interface Project {
  id: string;
  title: string;
  description?: string;
  status: ProjectStatus;
  progress: number; // 0–100
  updatedAt: number;
  createdAt: number;
}
