/**
 * Shared RTL style helpers for a Hebrew-first app.
 *
 * With I18nManager.forceRTL(true) (native) and dir="rtl" (web),
 * flexDirection: "row" already flows right-to-left. Do NOT use
 * "row-reverse" for RTL — it double-reverses back to LTR.
 */

import { I18nManager, StyleSheet } from "react-native";

/** Runtime RTL flag — true after I18nManager.forceRTL(true). */
export const isRTL = I18nManager.isRTL;

export const rtl = StyleSheet.create({
  /** Right-aligned text with RTL writing direction (use on TextInputs). */
  text: {
    textAlign: "right",
    writingDirection: "rtl",
  },
  /** Semantic RTL row — items flow right-to-left when RTL is enabled. */
  row: {
    flexDirection: "row",
  },
  /** RTL row with space-between (label ↔ action pattern). */
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  /** Push items to the trailing edge (left in RTL). */
  rowEnd: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
});
