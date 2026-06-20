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
  "👩", "👨", "🧑", "👩‍🦰", "👨‍🦱", "🧔", "👱", "🧕",
  // Family stages
  "🤰", "🤱", "🧓", "👴", "🧑‍🍳", "🧑‍💻", "🧑‍🎨", "🧑‍🏫",
  // More roles
  "🧑‍⚕️", "🧑‍🔬", "👷", "🧑‍💼", "🦸", "🕵️", "🏋️", "🧘",
  // Cool / funny
  "🤠", "🥷", "🧙", "🦸‍♀️", "🦊", "🐺", "🤡", "🏃",
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

/**
 * Large avatar emoji pool (~120) — faces, people, roles, fantasy, animals, fun.
 * Used by the paginated avatar picker (members + kids). Broad and family-
 * friendly; ZWJ sequences (🧑‍🍳 etc.) degrade gracefully on older renderers.
 */
export const AVATAR_EMOJI_OPTIONS: readonly string[] = [
  // Faces / moods
  "😀", "😄", "😁", "😎", "🤩", "🥳", "😇", "🤓", "🤠", "🥸", "🤡", "😺", "😻", "🙂", "😉", "😌",
  // People
  "👶", "🧒", "👦", "👧", "🧑", "👩", "👨", "🧓", "👴", "👵", "👱", "🧔", "👲", "🧕", "👳", "🤴",
  "👸", "👮", "🕵️", "💂", "👷", "🧑‍🍳", "🧑‍🌾", "🧑‍🏫",
  // Roles / professions
  "🧑‍💻", "🧑‍🔬", "🧑‍🎨", "🧑‍🚀", "🧑‍✈️", "🧑‍⚕️", "🧑‍🏭", "🧑‍🔧", "🧑‍⚖️", "🧑‍🚒", "👨‍🍳", "👩‍🎤", "🦸", "🦹", "🧙", "🧚",
  // Fantasy / fun
  "🧛", "🧜", "🧝", "🧞", "🧟", "🥷", "🤖", "👽", "👾", "🦸‍♀️", "🦸‍♂️", "🎅",
  // Animals
  "🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐨", "🐯", "🦁", "🐮", "🐷", "🐸", "🐵", "🐔",
  "🐧", "🐦", "🦄", "🐝", "🦋", "🐢", "🐙", "🦕", "🦖", "🦅", "🦉", "🦦", "🦥", "🐳", "🐬", "🦈",
  // Nature / food / objects
  "🌸", "🌻", "🌈", "⭐", "🌟", "🔥", "⚡", "❄️", "🍓", "🍎", "🍭", "🍩", "🎀", "🧸", "🚀", "⚽",
  "🏀", "🎮", "🎨", "🎸",
  // More faces / moods
  "😅", "😆", "😂", "🤣", "😊", "😍", "😘", "😜", "🤪", "😝", "🤗", "🤔", "🥰", "😋", "😛", "🙃",
  // People variants
  "👰", "🤵", "🧑‍🦰", "🧑‍🦱", "🧑‍🦳", "🧑‍🦲", "👩‍🦰", "👨‍🦱", "👩‍🦳", "👨‍🦲", "🧜‍♀️", "🧚‍♀️", "🧝‍♀️", "🧙‍♀️", "🦹‍♀️", "🧛‍♀️",
  // More animals
  "🐺", "🦝", "🐗", "🐴", "🦓", "🦒", "🐘", "🦛", "🐪", "🦙", "🐑", "🐐", "🦌", "🐕", "🐈", "🦔",
  // Birds / sea / bugs
  "🦚", "🦜", "🦢", "🦩", "🐓", "🐡", "🐟", "🦐", "🦀", "🦞", "🦑", "🐌", "🐞", "🦗", "🕷️", "🦂",
  // Food / objects / nature
  "🍕", "🍔", "🍟", "🌮", "🍰", "🍪", "🍫", "🍦", "🎯", "🎲", "🧩", "🎤", "🎧", "🎺", "🥁", "🌙",
] as const;

// HSL → #RRGGBB. Standalone (no deps) so the colour pool builds at module load.
function hslToHex(h: number, s: number, l: number): string {
  const sN = s / 100;
  const lN = l / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = sN * Math.min(lN, 1 - lN);
  const f = (n: number) => {
    const c = lN - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return Math.round(255 * c).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`.toUpperCase();
}

// 16 hues × 6 tones (96) + 8 neutrals = 104 swatches spanning the wheel.
function buildColorPool(): string[] {
  const hues = [0, 15, 30, 45, 60, 80, 120, 150, 170, 190, 210, 230, 260, 285, 310, 335];
  const tones = [
    { s: 75, l: 65 }, // light vivid
    { s: 82, l: 52 }, // vivid
    { s: 70, l: 42 }, // deep
    { s: 55, l: 30 }, // dark
    { s: 48, l: 78 }, // pastel
    { s: 35, l: 55 }, // muted
  ];
  const out: string[] = [];
  for (const tone of tones) for (const h of hues) out.push(hslToHex(h, tone.s, tone.l));
  out.push("#1F2937", "#475569", "#64748B", "#94A3B8", "#CBD5E1", "#8D6E63", "#A1887F", "#5D4037");
  return out;
}

/** Large colour pool (~104) for the paginated avatar colour picker. */
export const COLOR_SWATCHES_LARGE: readonly string[] = buildColorPool();

/**
 * Category icon pool (96) for grocery subcategories + budget categories —
 * food, drinks, health/care, home, kids, money/bills, clothing/leisure.
 * Object/food emojis (not avatars). Multiple of 8 so picker rows stay full.
 */
export const CATEGORY_ICON_OPTIONS: readonly string[] = [
  // Food & groceries
  "🛒", "🛍️", "🥬", "🥦", "🥕", "🌽", "🍅", "🥑", "🍎", "🍌", "🍓", "🫐", "🍇", "🍉", "🍊", "🍋",
  "🥖", "🍞", "🥐", "🧀", "🥚", "🥩", "🍗", "🐟", "🦐", "🍤", "🍚", "🍝", "🍕", "🍔", "🌮", "🥗",
  // Drinks & snacks
  "☕", "🍵", "🥤", "🧃", "🍿", "🍪", "🍫", "🍩",
  // Health & care
  "💊", "🩹", "🩺", "💉", "🌡️", "🧴", "🧼", "🪥", "🧻", "🧽", "💇", "✨", "💪", "🧘", "🦷", "🌿",
  // Home & household
  "🏠", "🛋️", "🛏️", "🚿", "🚽", "🧹", "🧺", "🍳", "🔧", "🔨", "🪛", "🪜", "💡", "🔌", "🪴", "🖼️",
  // Kids & misc
  "👶", "🍼", "🧸", "🎒", "📚", "✏️", "🖍️", "🎨",
  // Money / bills / transport
  "💰", "💳", "🧾", "🏦", "⚡", "💧", "🚗", "⛽",
  // Clothing / leisure / pets
  "👕", "👗", "👟", "🎉", "🎮", "✈️", "🐾", "📦",
] as const;

// 16 hues × 3 tones = 48 swatches for the category colour picker.
function buildCategoryColors(): string[] {
  const hues = [0, 15, 30, 45, 60, 80, 120, 150, 170, 190, 210, 230, 260, 285, 310, 335];
  const tones = [
    { s: 80, l: 55 }, // vivid
    { s: 68, l: 42 }, // deep
    { s: 55, l: 70 }, // light
  ];
  const out: string[] = [];
  for (const tone of tones) for (const h of hues) out.push(hslToHex(h, tone.s, tone.l));
  return out;
}

/** Category colour pool (48) for the paginated category colour picker. */
export const CATEGORY_COLOR_SWATCHES: readonly string[] = buildCategoryColors();
