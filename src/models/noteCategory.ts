/**
 * Note categories — a per-family, user-manageable catalog of colored,
 * emoji-tagged buckets used by the Notes page (pills + filtering) and the note
 * editor's picker. Managed like grocery main categories: stored on
 * `customizations.noteCategories`; unset falls back to DEFAULT_NOTE_CATEGORIES.
 *
 * A note stores the category `key`; UI resolves it against the family's active
 * list via resolveNoteCategory(). Colors are curated for the defaults and
 * derived (stably, from the key) for user-added categories, so no color picker
 * is needed in the manager.
 */

export interface NoteCategoryDef {
  /** Stable key persisted on the note (never shown to users). */
  key: string;
  /** Hebrew display name (editable). */
  name: string;
  emoji: string;
  /** Curated accent for the defaults; omitted for user-added ones. */
  color?: string;
}

export const DEFAULT_NOTE_CATEGORIES: NoteCategoryDef[] = [
  { key: "home", name: "בית", emoji: "🏠", color: "#2BA896" },
  { key: "finance", name: "כספים", emoji: "💰", color: "#16A34A" },
  { key: "kids", name: "ילדים", emoji: "👶", color: "#EC4899" },
  { key: "work", name: "עבודה", emoji: "💼", color: "#4F46E5" },
  { key: "recipes", name: "מתכונים", emoji: "🍳", color: "#EA580C" },
  { key: "shopping", name: "קניות", emoji: "🛒", color: "#D97706" },
  { key: "ideas", name: "רעיונות", emoji: "💡", color: "#CA8A04" },
  { key: "learning", name: "לימודים", emoji: "📚", color: "#7C3AED" },
  { key: "travel", name: "טיולים", emoji: "✈️", color: "#0891B2" },
];

/** Accent palette for user-added categories (curated defaults carry their own). */
const PALETTE = [
  "#2BA896", "#16A34A", "#EC4899", "#4F46E5", "#EA580C", "#D97706",
  "#CA8A04", "#7C3AED", "#0891B2", "#DC2626", "#0D9488", "#DB2777",
];

/** Stable accent for a category — curated color if set, else derived from key. */
export function noteCategoryColor(def: NoteCategoryDef): string {
  if (def.color) return def.color;
  let h = 0;
  for (let i = 0; i < def.key.length; i++) h = (h * 31 + def.key.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

/** The family's note categories, or the defaults when none are set. */
export function effectiveNoteCategories(
  customizations: { noteCategories?: NoteCategoryDef[] } | null | undefined,
): NoteCategoryDef[] {
  const raw = customizations?.noteCategories;
  return raw && raw.length > 0 ? raw : DEFAULT_NOTE_CATEGORIES;
}

/** Resolve a category key against a list (undefined when unset/unknown). */
export function resolveNoteCategory(
  key: string | undefined,
  list: NoteCategoryDef[],
): NoteCategoryDef | undefined {
  return key ? list.find((c) => c.key === key) : undefined;
}
