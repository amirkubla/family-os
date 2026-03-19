/**
 * Semantic colors for domain-specific UI elements.
 * These map data types to consistent accent colors across the app.
 */

import { C } from "./tokens";
import type { BlockType } from "@src/models/schedule";
import type { AssigneeType } from "@src/models/familyEvent";
import type { ProjectStatus } from "@src/models/project";

export const TYPE_COLORS: Record<BlockType, string> = {
  school: C.purple,
  hobby: C.red,
  other: C.teal,
};

export const ASSIGNEE_COLORS: Record<AssigneeType, string> = {
  family: C.teal,
  member: C.purple,
  kid: C.red,
};

export const STATUS_COLORS: Record<ProjectStatus, string> = {
  idea: C.textMuted,
  in_progress: C.purple,
  done: C.teal,
};
