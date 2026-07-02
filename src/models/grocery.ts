/**
 * A shopping section key. Historically a fixed union (grocery/health/home);
 * now free-form — families can add/rename/remove main categories, each keyed
 * by a stable id (the three above remain the default keys). Kept as `string`
 * so item.shoppingCategory can reference any configured category.
 */
export type ShoppingCategory = string;

export interface GroceryItem {
  id: string;
  title: string;
  shoppingCategory: ShoppingCategory;
  subcategory?: string;
  qty?: string;
  isBought: boolean;
  updatedAt: number;
  createdAt: number;
}

export const SHOPPING_CATEGORIES: ShoppingCategory[] = [
  "grocery",
  "health",
  "home",
];

/** Subcategories per shopping section — keys match ShoppingCategory. */
export const SUBCATEGORIES: Record<ShoppingCategory, readonly string[]> = {
  grocery: [
    "Produce",
    "Dairy",
    "Meat",
    "Bakery",
    "Frozen",
    "Snacks",
    "Beverages",
    "Canned",
    "Spices",
    "Fish",
    "Other",
  ],
  health: [
    "Medications",
    "Vitamins",
    "PersonalCare",
    "BabyCare",
    "FirstAid",
    "Skincare",
    "HairCare",
    "Other",
  ],
  home: [
    "Cleaning",
    "Laundry",
    "Kitchen",
    "Bathroom",
    "PaperGoods",
    "Tools",
    "Decor",
    "Other",
  ],
};

/** @deprecated Use SUBCATEGORIES instead */
export const GROCERY_SUBCATEGORIES = SUBCATEGORIES.grocery;
