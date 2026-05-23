/**
 * Shared RTL style helpers for a Hebrew-first app.
 *
 * RTL activation depends on context:
 *  - Web: dir="rtl" on <html> takes effect immediately.
 *  - Native: I18nManager.forceRTL(true) persists to UserDefaults but only
 *    takes effect after a FULL app restart. Until then, isRTL remains false.
 *
 * To handle both states, use the exported constants:
 *  - RTL_ROW: flexDirection that flows right-to-left regardless of isRTL.
 *  - RTL_ALIGN_RIGHT: alignSelf value that maps to the right side of a column.
 */

import { I18nManager, Platform, StyleSheet } from "react-native";

/**
 * True when the layout engine is in RTL mode.
 *  - Web: always true (dir="rtl" is set on document root).
 *  - Native: true only after forceRTL has taken effect (post-restart).
 */
export const isRTLActive: boolean = Platform.OS === "web" || I18nManager.isRTL;

/** Runtime RTL flag — true after I18nManager.forceRTL(true) takes effect. */
export const isRTL = I18nManager.isRTL;

/**
 * FlexDirection for a row that should flow right-to-left (Hebrew reading order).
 *
 * **Always "row"** — we rely on the layout engine to mirror it when RTL is
 * active (both RN Web with `dir="rtl"` and native with `I18nManager.isRTL`).
 *
 * History: this used to evaluate to `"row-reverse"` as a manual fallback when
 * `isRTLActive === false` at module load. That backfired on Android: if the
 * native engine had already flipped to RTL by render time (a race between
 * forceRTL persistence and JS module loading), the engine would mirror
 * `"row-reverse"` again, producing an effectively LTR layout. The MonthCalendar
 * week-row using plain `"row"` rendered correctly while modal section headers
 * using `RTL_ROW` rendered backwards. See `Updates.reloadAsync()` in
 * `app/_layout.tsx` for the first-launch handling that ensures the engine is
 * in RTL mode before anything renders.
 */
export const RTL_ROW: "row" = "row";

/**
 * alignSelf value that places an item on the RIGHT side of a column.
 * Always `"flex-start"` — the engine maps `start` to the physical right edge
 * when in RTL mode. Same rationale as `RTL_ROW`: let the engine handle it.
 */
export const RTL_ALIGN_RIGHT: "flex-start" = "flex-start";

/**
 * textAlign value for right-aligned text.
 *  - Web: "right" (dir="rtl" on <html> does NOT auto-align Text components).
 *  - Native with RTL active: the engine auto-mirrors "right" → "left",
 *    so we omit it (undefined) and let the RTL default handle it.
 */
export const TEXT_RIGHT: "right" | undefined =
  Platform.OS === "web" ? "right" : undefined;

/**
 * textAlign value for left-aligned text (e.g. numbers, progress labels).
 *  - Web: "left" works as-is.
 *  - Native RTL: "left" gets mirrored to "right", so we use "right"
 *    to get physical left.
 */
export const TEXT_LEFT: "left" | "right" =
  isRTLActive && Platform.OS !== "web" ? "right" : "left";

export const rtl = StyleSheet.create({
  /** Right-aligned text with RTL writing direction (use on TextInputs). */
  text: {
    writingDirection: "rtl",
  },
  /** Semantic RTL row — items flow right-to-left in all modes. */
  row: {
    flexDirection: RTL_ROW,
  },
  /** RTL row with space-between (label ↔ action pattern). */
  rowBetween: {
    flexDirection: RTL_ROW,
    justifyContent: "space-between",
    alignItems: "center",
  },
  /** Push items to the trailing edge (left in Hebrew). */
  rowEnd: {
    flexDirection: RTL_ROW,
    justifyContent: "flex-end",
  },
});
