import type { ShoppingCategory } from "@src/models/grocery";

/**
 * Lightweight Hebrew keyword → subcategory inference for grocery items.
 *
 * Why this exists:
 *   The "Add item" modal used to default the subcategory to the first option
 *   ("Produce"), so adding "חלב" landed in vegetables instead of dairy. This
 *   helper matches common Hebrew item names against keyword sets to pick a
 *   sensible default. The user can still override the picker.
 *
 * Matching strategy:
 *   - Case-insensitive substring match against the trimmed title.
 *   - First match wins (order in KEYWORD_MAP matters slightly — list more
 *     specific keywords first if ambiguity is possible).
 *   - Falls back to "Other" if no match.
 *
 * Keep keywords short and uniquely identifying — false positives are worse
 * than no inference, because the user has to undo them.
 */

// Hebrew root forms — substring match handles common suffixes (ים, ות, etc.)
const KEYWORD_MAP: Record<ShoppingCategory, Record<string, string[]>> = {
  grocery: {
    Dairy: ["חלב", "גבינה", "יוגורט", "חמאה", "ביצים", "שמנת", "קוטג", "לבן"],
    Meat: ["בשר", "עוף", "נקניק", "סטייק", "הודו", "שניצל", "כבד", "המבורגר"],
    Fish: ["דג", "סלמון", "טונה", "הרינג"],
    Bakery: ["לחם", "פיתה", "חלה", "עוגה", "עוגיות", "לחמני", "באגט", "קרואסון"],
    Frozen: ["גלידה", "קפוא", "ארטיק"],
    Beverages: ["מים", "מיץ", "סודה", "יין", "בירה", "קולה", "פפסי", "תה", "קפה"],
    Snacks: ["ביסלי", "במבה", "צ'יפס", "חטיף", "שוקולד", "סוכריות", "ופל", "אפרופו"],
    Canned: ["שימורים", "רסק", "חומוס", "טחינה", "זיתים"],
    Spices: ["מלח", "פפריקה", "כורכום", "סוכר", "קמח", "אורז", "פסטה", "שמן", "חומץ"],
    Produce: [
      "עגבני", "מלפפון", "גזר", "פלפל", "חסה", "תפוח", "בננה", "ענב", "אבטיח",
      "מלון", "ירק", "פרי", "פירות", "ירקות", "תפוז", "לימון", "תות", "אפרסק",
      "בצל", "שום", "תפו\"א", "בטטה", "כרוב", "ברוקולי", "כרובית", "אבוקדו",
    ],
  },
  health: {
    Medications: ["תרופה", "כדור", "סירופ", "אקמול", "אופטלגין", "נורופן"],
    Vitamins: ["ויטמין", "מולטי", "סידן", "ברזל", "אומגה"],
    BabyCare: ["חיתול", "מטרנה", "מגבונים", "תינוק"],
    FirstAid: ["פלסטר", "גזה", "תחבושת", "אלכוהול"],
    Skincare: ["קרם פנים", "סרום", "מסכת פנים"],
    HairCare: ["שמפו", "מרכך", "ג'ל שיער"],
    PersonalCare: ["סבון", "דאודורנט", "מברשת", "משחה", "ניטוק"],
  },
  home: {
    Cleaning: ["סנו", "ניקוי", "מטהר", "אקונומיקה", "ספוג"],
    Laundry: ["כביסה", "אבקת כביסה", "מרכך כביסה"],
    Kitchen: ["שקית", "ניילון נצמד", "כפות", "מגבות נייר", "נייר אפיה"],
    Bathroom: ["נייר טואלט", "ממחטות"],
    PaperGoods: ["מחברת", "דפים", "עיפרון", "עט"],
    Tools: ["סוללה", "נורה", "ברגים", "פטיש"],
    Decor: ["נר", "פרח"],
  },
};

/**
 * Infer the best-fit subcategory for a grocery item.
 * @returns Matched subcategory string, or "Other" if no keyword matched.
 */
export function inferGrocerySubcategory(
  title: string,
  shoppingCategory: ShoppingCategory,
): string {
  const normalized = title.trim().toLowerCase();
  if (!normalized) return "Other";

  const map = KEYWORD_MAP[shoppingCategory];
  for (const [subcategory, keywords] of Object.entries(map)) {
    for (const kw of keywords) {
      if (normalized.includes(kw.toLowerCase())) return subcategory;
    }
  }
  return "Other";
}
