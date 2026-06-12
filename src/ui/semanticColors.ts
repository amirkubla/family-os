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

/**
 * Kid avatar emoji options — playful, child-friendly picks.
 * 32 options arranged in rows of 8 for the picker grid.
 */
export const KID_EMOJI_OPTIONS: readonly string[] = [
  // Animals
  "🦄", "🐱", "🐶", "🐰", "🐻", "🦊", "🐼", "🐧",
  // More animals / creatures
  "🦁", "🐯", "🐸", "🦋", "🐝", "🐠", "🦖", "🐉",
  // Nature / food / objects
  "🌸", "🌈", "🌻", "🍓", "🍭", "⭐", "🎀", "🧸",
  // Characters / activities
  "👸", "🤴", "🧚", "🦸‍♂️", "🏎️", "🚀", "🎮", "⚽",
] as const;

/**
 * Parent / adult avatar emoji options.
 * 24 options — people, roles, and lifestyle icons.
 */
export const MEMBER_EMOJI_OPTIONS: readonly string[] = [
  // People
  "👩", "👨", "🧑", "👩‍🦰", "👨‍🦱", "🧔",
  "👱", "🧕", "🤰", "🤱", "🧓", "👴",
  // Roles / activities
  "🧑‍🍳", "🧑‍💻", "🧑‍🎨", "🧑‍🏫", "🦸", "🏋️",
  // Lifestyle / hobbies
  "🧘", "🏃", "🎸", "🎵", "📚", "☕",
] as const;

/**
 * 20 curated swatch colours for kid profiles and family members.
 * Arranged in 4 rows of 5 — visually balanced across the full hue wheel,
 * avoiding colours that look too similar side by side.
 *
 * Row 1 — warm reds / pinks / oranges
 * Row 2 — yellows / greens / teals
 * Row 3 — blues / purples / indigos
 * Row 4 — neutrals / muted / earthy
 */
export const KID_COLOR_SWATCHES: readonly string[] = [
  // Row 1 — warm
  "#FF5252",  // vivid red
  "#FF6B9D",  // hot pink
  "#FF8C42",  // tangerine
  "#FFCA3A",  // golden yellow
  "#FFA726",  // amber

  // Row 2 — cool-warm bridge / greens
  "#A8E063",  // lime green
  "#66BB6A",  // medium green
  "#26C6DA",  // cyan
  "#4ECDC4",  // teal mint
  "#00897B",  // deep teal

  // Row 3 — blues / purples
  "#42A5F5",  // sky blue
  "#5C6BC0",  // slate indigo
  "#6C63FF",  // electric violet
  "#AB47BC",  // amethyst
  "#EC407A",  // rose

  // Row 4 — muted / earthy / unique
  "#78909C",  // blue-grey
  "#8D6E63",  // mocha brown
  "#D4AC0D",  // olive gold
  "#F06292",  // bubblegum
  "#7E57C2",  // lavender purple
] as const;
