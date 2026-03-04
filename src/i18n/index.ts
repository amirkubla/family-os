/**
 * i18n/index.ts — Lightweight Hebrew-only translation layer.
 *
 * Usage:
 *   import { t, dayName, groceryCategoryLabel } from "@src/i18n";
 *   t("today.syncNow")              // => "סנכרן עכשיו"
 *   t("grocery.bought", { count: 3 }) // => "נקנו (3)"
 *   dayName(0)                       // => "יום ראשון"
 */

import he from "./he";

/**
 * Translate a key using dot-notation, with optional {{param}} interpolation.
 */
export function t(key: string, params?: Record<string, string | number>): string {
  const parts = key.split(".");
  let value: any = he;
  for (const part of parts) {
    value = value?.[part];
  }

  if (typeof value !== "string") {
    console.warn(`[i18n] Missing translation: "${key}"`);
    return key;
  }

  if (params) {
    return value.replace(/\{\{(\w+)\}\}/g, (_: string, k: string) =>
      params[k] !== undefined ? String(params[k]) : `{{${k}}}`,
    );
  }
  return value;
}

/** Full Hebrew day name by day-of-week index (0 = Sunday). */
export function dayName(dow: number): string {
  return he.days[dow as keyof typeof he.days] ?? "";
}

/** Short Hebrew day name by day-of-week index (0 = Sunday). */
export function dayNameShort(dow: number): string {
  return he.daysShort[dow as keyof typeof he.daysShort] ?? "";
}

/** Hebrew grocery subcategory label from English data key. */
export function groceryCategoryLabel(englishKey: string): string {
  return (he.groceryCategory as Record<string, string>)[englishKey] ?? englishKey;
}

/** Hebrew shopping category label (grocery/health/home). */
export function shoppingCategoryLabel(key: string): string {
  return (he.shoppingCategory as Record<string, string>)[key] ?? key;
}

/** Hebrew block type label from English type key. */
export function blockTypeLabel(typeKey: string): string {
  return (he.blockType as Record<string, string>)[typeKey] ?? typeKey;
}

/** Hebrew project status label from English status key. */
export function statusLabel(statusKey: string): string {
  return (he.status as Record<string, string>)[statusKey] ?? statusKey;
}

/** Hebrew member role label from English role key. */
export function memberRoleLabel(roleKey: string): string {
  return (he.memberRole as Record<string, string>)[roleKey] ?? roleKey;
}

/** Hebrew assignee type label from English type key. */
export function assigneeTypeLabel(typeKey: string): string {
  return (he.assigneeType as Record<string, string>)[typeKey] ?? typeKey;
}

/** Locale string for toLocaleString/toLocaleTimeString calls. */
export const LOCALE = "he-IL";
