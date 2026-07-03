export type ProjectStatus = "idea" | "in_progress" | "done";

/**
 * A single subtask inside a project. Each carries its own 0–100 progress; a
 * subtask at 100% counts as "done" for the project's task count. When a project
 * has subtasks, its overall `progress` is derived from them (see
 * `computeProjectProgress`); with no subtasks, `progress` is set manually.
 */
export interface SubTask {
  id: string;
  title: string;
  progress: number; // 0–100
}

export interface Project {
  id: string;
  title: string;
  description?: string;
  status: ProjectStatus;
  progress: number; // 0–100
  /** Manual drag-to-reorder position; lower sorts first. */
  sortOrder: number;
  /**
   * Ownership — at most one of these is set:
   *   kidId          → belongs to that kid (shown on /kid/[kidId]).
   *   ownerMemberId  → belongs to that family member (parent).
   *   both undefined → family-wide / general (no owner).
   */
  kidId?: string;
  ownerMemberId?: string;
  /** Contextual icon (🏠 🍳 🚗 …). Optional — falls back to a status glyph. */
  emoji?: string;
  /** Optional target date (ms epoch). Omitted = no due date. */
  dueDate?: number;
  /** Ordered subtasks, each with its own progress. May be empty. */
  subTasks: SubTask[];
  /** Family members assigned to this project (member ids). May be empty. */
  memberIds: string[];
  updatedAt: number;
  createdAt: number;
}

/**
 * A project's overall progress: the rounded average of its subtasks' progress
 * when it has any, otherwise the manually-set `fallback` value. This is the
 * single source of truth used when writing `project.progress`, so every screen
 * that reads `progress` (dashboard, carousel, kid/parent pages) stays in sync.
 */
export function computeProjectProgress(subTasks: SubTask[], fallback: number): number {
  if (!subTasks || subTasks.length === 0) return Math.round(fallback);
  const sum = subTasks.reduce((acc, s) => acc + (s.progress || 0), 0);
  return Math.round(sum / subTasks.length);
}
