/**
 * useThemeColor — the family's chosen brand accent.
 *
 * Returns `customizations.themeColor` (set on the customization screen from the
 * family-member colour palette), falling back to `C.primary` (#003333) when the
 * family hasn't picked one. This is the single seam for the per-family theme:
 * components that paint the accent (modal header + Save, the floating nav menu,
 * and the page FABs) read from here instead of the static `C.primary` token.
 */

import { useFamilyStore } from "@src/store/useFamilyStore";
import { C } from "./tokens";

export function useThemeColor(): string {
  return useFamilyStore((s) => s.customizations.themeColor) || C.primary;
}
