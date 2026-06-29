/**
 * Per-family preferences ("התאמה אישית" / Customization in the UI).
 *
 * Mirrored from backend/src/db/schema.ts's `FamilyCustomizations`. The
 * backend stores this as a JSONB blob on `families.customizations` — keep
 * the shape in lockstep when adding keys.
 *
 * Optional everywhere: a missing key means "use the default below". This
 * keeps backward compatibility when we add new knobs without forcing a
 * data migration on every family.
 */

import type { ShoppingCategory } from "@src/models/grocery";

export interface GrocerySubcategory {
  name: string;
  icon: string;
  color: string;
}

export interface FamilyCustomizations {
  grocerySubcategories?: Partial<Record<ShoppingCategory, GrocerySubcategory[]>>;
  /** Family avatar shown at the top of the home screen. */
  familyEmoji?: string;
  /**
   * Brand/theme accent (hex). Applied app-wide to modal buttons, the nav menu,
   * and the floating action buttons. Falls back to `C.primary` (#003333) when
   * unset — see `useThemeColor`. Picked from the family-member colour palette.
   */
  themeColor?: string;
}

/** Default family icon when none has been set. */
export const DEFAULT_FAMILY_EMOJI = "🏡";

/** Default theme accent when the family hasn't picked one (mirrors C.primary). */
export const DEFAULT_THEME_COLOR = "#003333";

/**
 * Hebrew defaults with icons and colors, used when a family hasn't set its
 * own subcategories yet.
 *
 * IMPORTANT — names align EXACTLY with the Hebrew labels in
 * `src/i18n/he.ts → groceryCategory`. That table maps the legacy English
 * subcategory keys stored on existing items ("Produce", "Dairy", …) to
 * Hebrew. By keeping the defaults identical to those labels, the grouping
 * logic can bucket old items via `groceryCategoryLabel(item.subcategory)`
 * without a DB migration. If you drift these strings, existing items will
 * silently fall into the "אחר" bucket — keep them in lockstep with the
 * i18n table.
 */
export const DEFAULT_GROCERY_SUBCATEGORIES: Record<ShoppingCategory, GrocerySubcategory[]> = {
  grocery: [
    { name: "ירקות ופירות", icon: "🥬", color: "#2D9F6F" },
    { name: "מוצרי חלב",   icon: "🧀", color: "#F59E0B" },
    { name: "בשר",          icon: "🥩", color: "#EF4444" },
    { name: "דגים",         icon: "🐟", color: "#3A7BD5" },
    { name: "מאפים",        icon: "🥖", color: "#E0699B" },
    { name: "קפואים",       icon: "🧊", color: "#20B2AA" },
    { name: "חטיפים",       icon: "🍿", color: "#9B59B6" },
    { name: "משקאות",       icon: "🥤", color: "#E67E22" },
    { name: "שימורים",      icon: "🥫", color: "#888888" },
    { name: "תבלינים ורטבים", icon: "🌶️", color: "#E67E22" },
    { name: "אחר",          icon: "📦", color: "#888888" },
  ],
  health: [
    { name: "תרופות",      icon: "💊", color: "#EF4444" },
    { name: "ויטמינים",    icon: "💪", color: "#2D9F6F" },
    { name: "טיפוח אישי",  icon: "🧴", color: "#9B59B6" },
    { name: "תינוקות",     icon: "🍼", color: "#E0699B" },
    { name: "עזרה ראשונה", icon: "🩹", color: "#E67E22" },
    { name: "טיפוח עור",   icon: "✨", color: "#F59E0B" },
    { name: "טיפוח שיער",  icon: "💇", color: "#3A7BD5" },
    { name: "אחר",         icon: "📦", color: "#888888" },
  ],
  home: [
    { name: "ניקיון",       icon: "🧹", color: "#20B2AA" },
    { name: "כביסה",        icon: "👕", color: "#3A7BD5" },
    { name: "מטבח",         icon: "🍳", color: "#E67E22" },
    { name: "אמבטיה",       icon: "🚿", color: "#3A7BD5" },
    { name: "מוצרי נייר",   icon: "🧻", color: "#888888" },
    { name: "כלי עבודה",    icon: "🔧", color: "#F59E0B" },
    { name: "קישוט ועיצוב", icon: "🖼️", color: "#9B59B6" },
    { name: "אחר",          icon: "📦", color: "#888888" },
  ],
};

/** Maps legacy English & Hebrew subcategory keys to emoji, for backward
 *  compatibility when old string[] data is loaded from the server. */
const LEGACY_ICON_MAP: Record<string, string> = {
  // English keys
  Produce: "🥬", Dairy: "🧀", Meat: "🥩", Fish: "🐟", Bakery: "🥖",
  Frozen: "🧊", Snacks: "🍿", Beverages: "🥤", Canned: "🥫", Spices: "🌶️",
  Medications: "💊", Vitamins: "💪", PersonalCare: "🧴", BabyCare: "🍼",
  FirstAid: "🩹", Skincare: "✨", HairCare: "💇",
  Cleaning: "🧹", Laundry: "👕", Kitchen: "🍳", Bathroom: "🚿",
  PaperGoods: "🧻", Tools: "🔧", Decor: "🖼️", Household: "🏠", Other: "📦",
  // Hebrew keys
  "ירקות ופירות": "🥬", "מוצרי חלב": "🧀", "בשר": "🥩", "דגים": "🐟",
  "מאפים": "🥖", "קפואים": "🧊", "חטיפים": "🍿", "משקאות": "🥤",
  "שימורים": "🥫", "תבלינים ורטבים": "🌶️",
  "תרופות": "💊", "ויטמינים": "💪", "טיפוח אישי": "🧴", "תינוקות": "🍼",
  "עזרה ראשונה": "🩹", "טיפוח עור": "✨", "טיפוח שיער": "💇",
  "ניקיון": "🧹", "כביסה": "👕", "מטבח": "🍳", "אמבטיה": "🚿",
  "מוצרי נייר": "🧻", "כלי עבודה": "🔧", "קישוט ועיצוב": "🖼️", "אחר": "📦",
};

const LEGACY_COLOR_MAP: Record<string, string> = {
  Produce: "#2D9F6F", Dairy: "#F59E0B", Meat: "#EF4444", Fish: "#3A7BD5",
  Bakery: "#E0699B", Frozen: "#20B2AA", Snacks: "#9B59B6", Beverages: "#E67E22",
  "ירקות ופירות": "#2D9F6F", "מוצרי חלב": "#F59E0B", "בשר": "#EF4444",
  "דגים": "#3A7BD5", "מאפים": "#E0699B", "קפואים": "#20B2AA",
  "חטיפים": "#9B59B6", "משקאות": "#E67E22",
  "תרופות": "#EF4444", "ויטמינים": "#2D9F6F", "טיפוח אישי": "#9B59B6",
  "תינוקות": "#E0699B", "עזרה ראשונה": "#E67E22",
  "ניקיון": "#20B2AA", "כביסה": "#3A7BD5", "מטבח": "#E67E22",
};

/** Fallback bucket name for items whose `subcategory` isn't in the active list. */
export const OTHER_SUBCATEGORY = "אחר";

const OTHER_ENTRY: GrocerySubcategory = { name: OTHER_SUBCATEGORY, icon: "📦", color: "#888888" };

/**
 * Resolve the effective subcategory list for a main category: the family's
 * customized list if present, otherwise the Hebrew defaults. Always returns
 * a non-empty array ending with the "אחר" bucket.
 *
 * Backward-compatible: if old `string[]` data is loaded from the server it
 * is silently normalized to `GrocerySubcategory[]`.
 */
export function effectiveSubcategories(
  customizations: FamilyCustomizations | null | undefined,
  category: ShoppingCategory,
): GrocerySubcategory[] {
  const raw = customizations?.grocerySubcategories?.[category];
  let list: GrocerySubcategory[];

  if (!raw || raw.length === 0) {
    list = DEFAULT_GROCERY_SUBCATEGORIES[category];
  } else {
    // Normalize legacy string[] format that may still be in some families' JSONB.
    list = (raw as (string | GrocerySubcategory)[]).map((item) =>
      typeof item === "string"
        ? { name: item, icon: LEGACY_ICON_MAP[item] ?? "📦", color: LEGACY_COLOR_MAP[item] ?? "#888888" }
        : item,
    );
  }

  return list.some((s) => s.name === OTHER_SUBCATEGORY) ? list : [...list, OTHER_ENTRY];
}
