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

// Dedupe a pool and trim to the largest multiple of 8, so the paginated picker
// (8 columns) never renders a duplicate cell or a ragged final row.
function uniqMul8(arr: string[]): readonly string[] {
  const u = Array.from(new Set(arr));
  return u.slice(0, Math.floor(u.length / 8) * 8);
}

/**
 * Large avatar emoji pool (~400) — faces, gestures, people, roles, fantasy,
 * animals, food, nature, sports, objects, transport, hearts. Used by the
 * paginated avatar picker (members + kids); deduped + trimmed to a multiple
 * of 8. ZWJ sequences (🧑‍🍳 etc.) degrade gracefully on older renderers.
 */
const AVATAR_EMOJI_RAW: string[] = [
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
  // ── doubled set ──
  // More positive faces & fun (no sad / sick / angry)
  "😃", "😗", "😙", "😚", "☺️", "🫠", "😏", "😸", "😹", "😼", "😽", "🫶", "🤲", "🤩", "🥰", "😻",
  "🌞", "🌝", "🌛", "🌜", "🎉", "🎊", "🎈", "🎁", "🪩", "🎆", "🎇", "🧧", "🏆", "🏅", "🥇", "👑",
  "🐥", "🐤", "🐣", "🐩", "🦮", "🍀", "🪅", "🎠", "🎡", "🎢", "🛝", "🍧", "🍨", "🍬", "🍡", "🧋",
  // Hands / gestures
  "👋", "🤚", "✋", "🖐️", "🖖", "👌", "🤌", "🤏", "✌️", "🤞", "🤟", "🤘", "🤙", "👈", "👉", "👆",
  "👇", "☝️", "👍", "🫰", "✊", "👊", "🤛", "🤜", "👏", "🙌", "👐", "🙏", "✍️", "💪", "🦾", "🦿",
  // People / activities
  "🤹", "🧗", "🏌️", "🏄", "🚣", "🏊", "🚴", "🚵", "🤽", "🤾", "🏋️", "🤺", "⛹️", "🏇", "🧘", "🛀",
  // More animals
  "🦬", "🐂", "🐃", "🐄", "🐖", "🐏", "🐀", "🐁", "🐇", "🦫", "🐅", "🐆", "🦣", "🐊", "🦎", "🐍",
  "🐲", "🐉", "🦤", "🦃", "🦆", "🕊️", "🦇", "🦨", "🦡", "🐿️", "🪶", "🐾", "🦘", "🦭", "🐋", "🐡",
  // More food
  "🍇", "🍈", "🍉", "🍊", "🍋", "🍌", "🍍", "🥭", "🍑", "🍒", "🥝", "🥥", "🍆", "🥕", "🌽", "🥔",
  "🥨", "🥯", "🧇", "🥞", "🥓", "🌭", "🍖", "🥪", "🌯", "🫔", "🥙", "🧆", "🥘", "🍲", "🍜", "🍣",
  "🍱", "🥟", "🍙", "🍘", "🍥", "🥮", "🍢", "🧁", "🎂", "🥧", "🍮", "🍯", "🍷", "🍺", "🥂", "🧉",
  // Sports / games / objects
  "🏈", "⚾", "🎾", "🏐", "🏉", "🥏", "🎱", "🏓", "🏸", "🥅", "🥊", "🛹", "🛼", "🎳", "🎰", "🎟️",
  // Transport
  "🚗", "🚕", "🚙", "🚌", "🚎", "🚓", "🚑", "🚒", "🚐", "🚚", "🚛", "🏍️", "🛵", "🚲", "🛴", "⛵",
  // Nature / sky
  "🌷", "🌹", "🌺", "🌼", "🌵", "🌲", "🌳", "🌴", "🍄", "🌊", "☀️", "⛅", "☁️", "💧", "💫", "🪐",
  // Hearts / symbols
  "❤️", "🧡", "💛", "💚", "💙", "💜", "🤍", "🤎", "🖤", "💖", "💗", "💓", "💕", "✨", "💯", "🎉",
  // ── doubled set (all positive / fun) ──
  // More happy faces
  "😃", "🤣", "☺️", "🫶", "🫡", "🫠", "🤙", "🤟", "😸", "😹", "😼", "😽", "🙌", "👏", "🤝", "💁",
  // People & professions
  "👨‍⚕️", "👩‍⚕️", "👨‍🎓", "👩‍🎓", "👨‍🏫", "👩‍🏫", "👨‍🌾", "👩‍🌾", "👨‍🍳", "👩‍🍳", "👨‍🔧", "👩‍🔧", "👨‍🏭", "👩‍🏭", "👨‍💼", "👩‍💼",
  "👨‍🔬", "👩‍🔬", "👨‍💻", "👩‍💻", "👨‍🎤", "👩‍🎤", "👨‍🎨", "👩‍🎨", "👨‍✈️", "👩‍✈️", "👨‍🚀", "👩‍🚀", "👨‍🚒", "👩‍🚒", "👮‍♀️", "👮‍♂️",
  "🕵️‍♀️", "🕵️‍♂️", "💂‍♀️", "💂‍♂️", "👷‍♀️", "👷‍♂️", "🤵‍♀️", "🤵‍♂️", "👰‍♀️", "👰‍♂️", "🧙‍♂️", "🧚‍♂️", "🧛‍♂️", "🧜‍♂️", "🧝‍♂️", "🧞‍♂️",
  "🦸‍♀️", "🦸‍♂️", "🦹‍♂️", "🤶", "🧑‍🎄", "🫅", "🤰", "🤱", "🧌", "🧑‍🤝‍🧑", "👬", "👭", "👫", "🦮", "🐕‍🦺", "🐈‍⬛",
  // Animals (more)
  "🐝", "🐛", "🐜", "🦗", "🪲", "🦋", "🐌", "🐞", "🐠", "🐡", "🦓", "🦏", "🦍", "🦧", "🐎", "🦬",
  "🐃", "🐄", "🐖", "🐏", "🐑", "🐐", "🦙", "🦥", "🦨", "🦡", "🐿️", "🦫", "🦃", "🦤", "🐓", "🦅",
  "🦆", "🦢", "🦩", "🦜", "🕊️", "🐲", "🐉", "🦦", "🦔", "🐇", "🐀", "🐁", "🐅", "🐆", "🦒", "🐘",
  // Food & treats
  "🍏", "🍐", "🍊", "🍋", "🍌", "🍍", "🥭", "🍑", "🍒", "🍈", "🍅", "🥝", "🥥", "🥑", "🌽", "🥕",
  "🍞", "🥐", "🥨", "🧀", "🥚", "🥓", "🍗", "🍖", "🌭", "🍔", "🍟", "🥪", "🌮", "🌯", "🥗", "🍜",
  "🍣", "🍱", "🍤", "🍚", "🍙", "🍰", "🧁", "🍩", "🍪", "🍫", "🍬", "🍭", "🍮", "🍯", "🥧", "🍡",
  "🥟", "🧇", "🥞", "🍿", "🍼", "🥛", "☕", "🧃", "🧋", "🍹", "🍉", "🍇", "🍓", "🥨", "🧊", "🍶",
  // Sports, music & hobbies
  "⚾", "🏈", "🏐", "🏉", "🎾", "🥎", "🏓", "🏸", "🥏", "🎱", "🏒", "🏑", "🥍", "🏏", "⛳", "🥊",
  "🥋", "🛹", "🛼", "⛸️", "🎿", "🏂", "🪂", "🏹", "🎣", "🤿", "🎹", "🎷", "🎺", "🎻", "🪕", "🥁",
  "🎬", "🎭", "🎪", "🖌️", "🪄", "🔮", "♟️", "🧶", "🪀", "🎰", "🃏", "🕹️", "📷", "📸", "🎼", "🎵",
  // Nature, weather & space
  "🌲", "🌴", "🌵", "🌾", "🌿", "☘️", "🍀", "🍁", "🌹", "🌷", "🌼", "💐", "⚡", "☄️", "🌈", "⛄",
  "🌙", "🌛", "🌜", "🌚", "🌝", "🌞", "🪐", "🌍", "🌎", "🌏", "🔆", "🌠", "❄️", "🌊", "🔥", "💫",
  // Fun objects & rides
  "🚀", "🛸", "🎈", "🎁", "🎊", "🪩", "🏆", "🥇", "🥈", "🥉", "🎖️", "💎", "👑", "🎲", "🎮", "📚",
  "🚲", "🛴", "🛵", "🏎️", "🚓", "🚑", "🚒", "🚜", "🚁", "⛵", "🚂", "🎡", "🎢", "🎠", "🪁", "🛝",
  // Drinks, rides, hobbies, food, sky (more distinct picks)
  "🍷", "🍸", "🍺", "🍻", "🥂", "🥃", "🫖", "🧉", "🥦", "🫑", "🍠", "🥯", "🥖", "🌶️", "🫙", "🥫",
  "🚎", "🚃", "🛺", "🛻", "🦽", "🦼", "🛩️", "🚤", "🛥️", "🚢", "🚆", "🚇", "🚊", "🛼", "🛞", "🚠",
  "🪡", "🧵", "🪢", "🔭", "🔬", "🧪", "⚗️", "🎟️", "🎫", "🪈", "🎙️", "📻", "🪗", "🪘", "🪭", "🎏",
  "🌌", "🌅", "🌄", "🌇", "🌉", "🌃", "🏔️", "🗻", "🌋", "🏕️", "🏝️", "🏜️", "🦭", "🐊", "🦣", "🐃",
];

export const AVATAR_EMOJI_OPTIONS: readonly string[] = uniqMul8(AVATAR_EMOJI_RAW);

/** Family avatar pool (~96) — homes, family groups, hearts, nature, fun. */
export const FAMILY_EMOJI_OPTIONS: readonly string[] = uniqMul8([
  // Homes & family
  "🏡", "🏠", "🏘️", "👨‍👩‍👧‍👦", "👨‍👩‍👧", "👨‍👩‍👦", "👩‍👩‍👧", "👨‍👨‍👦", "👪", "🧑‍🧑‍🧒", "🏰", "⛺", "🏕️", "🏖️", "🌍", "🗺️",
  // Hearts & symbols
  "❤️", "🧡", "💛", "💚", "💙", "💜", "🤍", "🩷", "⭐", "🌟", "✨", "🌈", "🔥", "💫", "🎉", "🎈",
  // Nature
  "🌻", "🌺", "🌸", "🌷", "🌴", "🌳", "🍀", "🌙", "🌞", "🦋", "🐝", "🌊", "🍉", "🍓", "🍯", "🌵",
  // Animals
  "🦄", "🐻", "🐼", "🦊", "🦁", "🐯", "🐰", "🐨", "🐶", "🐱", "🐸", "🦉", "🐢", "🐬", "🐥", "🦔",
  // Fun & celebration
  "🎀", "🎁", "🏆", "👑", "💎", "🚀", "⚽", "🏀", "🎨", "🎸", "🎮", "🍕", "🍦", "🍩", "🧁", "🎯",
  // Faces
  "😀", "😎", "🤩", "🥳", "😇", "🤗", "🥰", "😺", "🤖", "🦸", "🧚", "🧙", "🦸‍♀️", "🦸‍♂️", "🌝", "🪅",
  // ── doubled: more family-relevant ──
  // Homes & places
  "🏯", "⛪", "🕌", "🛖", "🏞️", "🏝️", "⛱️", "🌅", "🌄", "🌠", "🗽", "🎡", "🎠", "🎢", "🛝", "🌎",
  // Family & people
  "👨‍👩‍👧‍👧", "👩‍👦", "👩‍👧", "👨‍👦", "👨‍👧", "👩‍👩‍👦", "👨‍👨‍👧", "👩‍👧‍👦", "👨‍👧‍👦", "🧑‍🤝‍🧑", "👬", "👭", "👫", "🤱", "🤰", "🧓",
  // Hearts & celebration
  "💝", "💗", "💓", "💞", "💕", "💟", "♥️", "🫶", "🎊", "🎉", "🎀", "🥰", "😍", "🏅", "🥇", "🏆",
  // Nature & animals
  "🌷", "🌹", "🌺", "🌼", "💐", "🌿", "🍃", "🌲", "🐣", "🐤", "🐥", "🐦", "🦜", "🐠", "🐙", "🦒",
  // Fun, food & play
  "🎈", "🎁", "🎲", "🧩", "🎨", "🎤", "📚", "🚲", "🛴", "🍰", "🍪", "🍫", "🍓", "🍉", "🍕", "🚗",
  // More buildings & places
  "🏢", "🏬", "🏗️", "🏛️", "🗼", "🌉", "⛩️", "🏟️", "🎪", "🏰", "🌌", "🌃", "🌇", "🏙️", "🗻", "🏔️",
  // More nature & animals
  "🍁", "🍂", "🌾", "🪻", "🪷", "🪴", "🌱", "🎄", "🐧", "🦦", "🦥", "🦓", "🦌", "🦕", "🐳", "🐡",
  // More hearts, sweets & toys
  "💘", "💌", "💟", "❣️", "🍭", "🍬", "🥧", "🎂", "🍡", "🍧", "🧸", "🪀", "🎏", "🎐", "🪁", "🛼",
]);

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

// 24 hues × 8 tones (192) + 16 neutrals = 208 swatches spanning the wheel.
function buildColorPool(): string[] {
  const hues = Array.from({ length: 24 }, (_, i) => i * 15); // 0,15,…,345
  const tones = [
    { s: 78, l: 70 }, // light vivid
    { s: 85, l: 60 }, // bright
    { s: 84, l: 50 }, // vivid
    { s: 72, l: 42 }, // deep
    { s: 58, l: 33 }, // dark
    { s: 45, l: 80 }, // pastel
    { s: 38, l: 60 }, // muted
    { s: 30, l: 47 }, // muted-dark
  ];
  const out: string[] = [];
  for (const tone of tones) for (const h of hues) out.push(hslToHex(h, tone.s, tone.l));
  out.push(
    "#0F172A", "#1E293B", "#334155", "#475569", "#64748B", "#94A3B8", "#CBD5E1", "#E2E8F0",
    "#3E2723", "#5D4037", "#6D4C41", "#8D6E63", "#A1887F", "#BCAAA4", "#78716C", "#292524",
  );
  return out;
}

/** Large colour pool (~208) for the paginated avatar colour picker. */
export const COLOR_SWATCHES_LARGE: readonly string[] = buildColorPool();

/**
 * Category icon pool (~192) for grocery subcategories + budget categories —
 * food, drinks, health/care, home, tools, kids, money/bills, transport,
 * clothing, leisure, pets/garden. Object/food emojis (not avatars). Deduped +
 * trimmed to a multiple of 8 so picker rows stay full.
 */
const CATEGORY_ICON_RAW: string[] = [
  // Fruit & veg
  "🛒", "🛍️", "🥬", "🥦", "🥕", "🌽", "🍅", "🥑", "🥔", "🧅", "🧄", "🫑", "🥒", "🍆", "🍄", "🫘",
  "🍇", "🍈", "🍉", "🍊", "🍋", "🍌", "🍍", "🥭", "🍎", "🍐", "🍑", "🍒", "🍓", "🫐", "🥝", "🥥",
  // Bakery, dairy, protein, pantry
  "🥖", "🍞", "🥐", "🥯", "🥨", "🧇", "🥞", "🧀", "🥚", "🥛", "🧈", "🍯", "🥩", "🍗", "🍖", "🥓",
  "🐟", "🦐", "🦀", "🦪", "🍤", "🥫", "🫙", "🧂", "🌰", "🥜", "🍚", "🍙",
  // Prepared meals
  "🍕", "🍔", "🍟", "🌭", "🥪", "🌮", "🌯", "🫔", "🥙", "🧆", "🥗", "🍝", "🍜", "🍲", "🍛", "🍣",
  "🍱", "🥟", "🍳", "🥘", "🫕", "🍿",
  // Sweets & drinks
  "🍦", "🍧", "🍨", "🍩", "🍪", "🎂", "🍰", "🧁", "🥧", "🍫", "🍬", "🍭", "🍮", "☕", "🍵", "🧃",
  "🥤", "🧋", "🧉", "🍶", "🍷", "🍺", "🍻", "🥂", "🥃", "🍸", "🍹", "🧊",
  // Health & medicine
  "💊", "💉", "🩹", "🩺", "🩻", "🌡️", "🦷", "🩼", "🚑", "🏥", "🧘", "💪", "🏋️", "🧬", "🫀", "🧠",
  // Personal care & beauty
  "🧴", "🧼", "🧽", "🪥", "🪮", "🧻", "🧷", "💅", "💄", "💇", "💆", "🛁", "🚿", "🪒", "🧖", "🌸",
  // Home & furniture
  "🏠", "🏡", "🛋️", "🛏️", "🪑", "🚪", "🪟", "🚽", "🛗", "🖼️", "🪞", "🧺", "🧹", "🪠", "🪣", "🕯️",
  // Tools, DIY & utilities
  "🔧", "🔨", "🪛", "🪚", "🔩", "⚙️", "🪜", "🧰", "🧲", "💡", "🔌", "🔋", "🚰", "🔥", "⚡", "💧",
  // Money, bills & finance
  "💰", "💳", "🧾", "🏦", "🏧", "💵", "💶", "💷", "💴", "🪙", "💸", "🧧", "📈", "📉", "💹", "🧮",
  // Shopping & retail
  "🏪", "🏬", "🏷️", "🎁", "📦", "🛎️", "🧳", "🪪",
  // Transport & auto
  "🚗", "🚕", "🚙", "🚌", "🚐", "🚚", "🛻", "🏍️", "🛵", "🚲", "⛽", "🅿️", "🚆", "🚇", "✈️", "⛴️",
  // Tech & communication
  "📱", "💻", "🖥️", "⌨️", "🖨️", "📷", "📺", "🎧", "🎮", "📡", "📶", "☎️", "🔌", "🔭",
  // Clothing & accessories
  "👕", "👖", "👗", "👔", "👚", "🧥", "🧦", "🧤", "🧣", "👒", "🎩", "🧢", "👟", "👞", "👠", "👡",
  "🥿", "🥾", "👜", "🎒", "💼", "👓", "🕶️", "💍", "⌚",
  // Kids & baby
  "👶", "🍼", "🧸", "🖍️", "✏️", "📚", "🎨", "🪀", "🧩", "🎈", "🪅", "🚼",
  // Pets
  "🐶", "🐱", "🐾", "🦴", "🐠", "🐦", "🐹", "🐰", "🦮", "🪴",
  // Garden & outdoor
  "🌱", "🌳", "🌲", "🌵", "🌷", "🌹", "🌻", "🍀", "🪨", "⛲", "🏖️", "⛺",
  // Leisure & entertainment
  "🎉", "🎊", "🎬", "🎟️", "🎫", "🎤", "🎸", "🎲", "🎯", "🎳", "⚽", "🏀", "🎾", "🏊", "🚴", "🎢",
  // Education, work & office
  "📖", "📝", "📐", "📎", "🖊️", "🏫", "🎓", "🖇️",
  // Services & misc
  "✉️", "📮", "🔑", "🧯", "♻️", "🗑️", "🛠️", "🧫",
  // ── doubled: more sensible category icons ──
  // More produce & food
  "🍏", "🫒", "🌶️", "🫓", "🥠", "🥡", "🦞", "🦑", "🐙", "🍢", "🍡", "🍘", "🍥", "🥮", "🍠", "🥣",
  "🥗", "🍲", "🫕", "🥩", "🍗", "🌭", "🥟", "🍳", "🧇", "🥞", "🍰", "🥧", "🍮", "🍭", "🥨", "🌰",
  // More drinks
  "🍾", "🥛", "🍼", "🫖", "🧊", "🥤", "🧋", "☕", "🍵", "🧃", "🍶", "🍹",
  // More household & cleaning
  "🧹", "🧺", "🧻", "🧼", "🧽", "🪣", "🪥", "🪮", "🚿", "🛁", "🚽", "🪠", "🛋️", "🛏️", "🪑", "🚪",
  "🪟", "🪞", "🖼️", "🕯️", "🪔", "🗑️", "🧴", "💡",
  // More tools & DIY
  "🔧", "🔨", "🪛", "🪚", "🔩", "⚙️", "🪜", "🧰", "🧲", "🪝", "🧱", "⛏️", "🪓", "🔗", "📏", "📐",
  // More health & medical
  "💊", "💉", "🩹", "🩺", "🩻", "🩼", "🌡️", "🦷", "🧬", "🫁", "🦴", "🚑", "🏥", "🧘", "🏋️", "🧠",
  // More beauty & personal care
  "💄", "💅", "💇", "💆", "🧖", "🪒", "👓", "🕶️", "🧢", "👁️", "💈", "🪞",
  // More money & finance
  "💰", "💳", "🧾", "🏦", "🏧", "💵", "💶", "💷", "💴", "🪙", "💸", "🧧", "📈", "📉", "💹", "🪪",
  // More transport & auto
  "🚗", "🚕", "🚙", "🚌", "🚐", "🚚", "🚛", "🛻", "🏍️", "🛵", "🚲", "🛴", "⛽", "🅿️", "🚦", "🚆",
  "🚇", "🚊", "✈️", "🛫", "🚁", "⛴️", "🛳️", "⚓",
  // More tech & devices
  "📱", "💻", "🖥️", "⌨️", "🖨️", "🖱️", "🕹️", "💾", "💿", "📷", "📹", "📺", "📻", "🎧", "📡", "📶",
  "☎️", "📠", "🔋", "🪫", "🎮", "💡",
  // More clothing & accessories
  "👕", "👖", "👗", "👔", "👚", "🧥", "🧦", "🧤", "🧣", "🩳", "👙", "👘", "🥻", "👒", "🎩", "🧢",
  "👟", "👞", "👠", "👡", "🥿", "🥾", "👜", "👛", "🎒", "💼", "👓", "🕶️", "💍", "⌚", "🧳", "☂️",
  // More kids, baby & toys
  "👶", "🍼", "🧸", "🪅", "🎈", "🪀", "🧩", "🖍️", "✏️", "📓", "🎨", "🚼", "🧷", "🪁",
  // More pets
  "🐶", "🐱", "🐕", "🐈", "🐾", "🦴", "🐠", "🐦", "🐹", "🐰", "🐢", "🐇", "🦮", "🪺",
  // More garden & outdoor
  "🌱", "🌳", "🌲", "🌵", "🪴", "🌷", "🌹", "🌻", "🌼", "💐", "🍀", "🍃", "🪨", "⛲", "🪵", "🌾",
  // More leisure, sports & hobbies
  "🎉", "🎊", "🎬", "🎟️", "🎫", "🎤", "🎸", "🎹", "🎺", "🎻", "🥁", "🎲", "🎯", "🎳", "🎮", "⚽",
  "🏀", "🏈", "⚾", "🎾", "🏐", "🏓", "🏸", "🥊", "🏊", "🚴", "🎢", "🎡", "🎿", "🏂", "🏕️", "🧗",
  // More education, work & office
  "📚", "📖", "📓", "📒", "📝", "📐", "📎", "🖇️", "🖊️", "🖋️", "✂️", "📌", "🗂️", "🏫", "🎓", "🖍️",
  // More travel & services
  "🧳", "🗺️", "🧭", "🏝️", "⛱️", "🏨", "🛎️", "📦", "🔑", "🪧", "🎁", "🛒",
  // Time, subscriptions & reminders
  "⏰", "🕰️", "⌛", "⏳", "🔔", "📅", "📆", "🗓️",
  // Security, insurance & safety
  "🔒", "🗝️", "🛡️", "🚨", "🧯", "🪪", "🆔", "📋",
  // Utilities, energy & science
  "🛢️", "🔆", "🔬", "⚗️", "🧪", "🔭", "📊", "🗄️",
  // Finance, fitness, pets & beauty (more)
  "💱", "💲", "🏛️", "🤸", "🤾", "⛹️", "🐕‍🦺", "🐈‍⬛", "💈", "✂️", "🪵", "🧱",
];

export const CATEGORY_ICON_OPTIONS: readonly string[] = uniqMul8(CATEGORY_ICON_RAW);

// 16 hues × 6 tones = 96 swatches for the category colour picker.
function buildCategoryColors(): string[] {
  const hues = [0, 15, 30, 45, 60, 80, 120, 150, 170, 190, 210, 230, 260, 285, 310, 335];
  const tones = [
    { s: 82, l: 66 }, // light vivid
    { s: 84, l: 54 }, // vivid
    { s: 72, l: 44 }, // deep
    { s: 58, l: 34 }, // dark
    { s: 50, l: 76 }, // pastel
    { s: 40, l: 58 }, // muted
  ];
  const out: string[] = [];
  for (const tone of tones) for (const h of hues) out.push(hslToHex(h, tone.s, tone.l));
  return out;
}

/** Category colour pool (96) for the paginated category colour picker. */
export const CATEGORY_COLOR_SWATCHES: readonly string[] = buildCategoryColors();
