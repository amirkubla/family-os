/**
 * kid.ts — Kid data model for Family OS.
 *
 * A kid represents a child in the family.
 * Kids are linked to schedule blocks and appear in the Today screen.
 */

export interface Kid {
  id: string;
  name: string;
  color: string;
  emoji: string;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

/** Default seed kids — created on first run if kids array is empty. */
export const DEFAULT_KIDS: Omit<Kid, "id" | "createdAt" | "updatedAt">[] = [
  { name: "ילד/ה 1", emoji: "🌸", color: "#FF6B6B", isActive: true },
  { name: "ילד/ה 2", emoji: "🚀", color: "#4ECDC4", isActive: true },
];
