export type ShoppingCategory = "grocery" | "health" | "home";

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
