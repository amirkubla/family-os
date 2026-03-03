export interface GroceryItem {
  id: string;
  title: string;
  category: string;
  qty?: string;
  isBought: boolean;
  updatedAt: number;
  createdAt: number;
}

export const GROCERY_CATEGORIES = [
  "Produce",
  "Dairy",
  "Meat",
  "Bakery",
  "Frozen",
  "Snacks",
  "Beverages",
  "Household",
  "Other",
] as const;
