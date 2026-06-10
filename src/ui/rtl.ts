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

// Whether the native RTL engine is active at this module-load instant.
// On Android: forceRTL persists fast, isRTL = true by the time JS loads ✓
// On iOS standalone (prod / dev-client): isRTL = true after Updates.reloadAsync ✓
// On iOS Expo Go: isRTL stays false until a full Expo Go process restart —
//   the Expo Go bridge does NOT reinitialize TurboModule constants on a
//   DevSettings.reload() JS bundle reload, so isRTL is stuck at bridge-init
//   time. We handle this by falling back to explicit RTL values (row-reverse,
//   flex-end, "right") when the engine is not yet active.
const _engineRTL = Platform.OS === "web" || I18nManager.isRTL;

/**
 * FlexDirection for a row that should flow right-to-left (Hebrew reading order).
 *
 * - Engine active (web / Android / iOS after restart): `"row"` — the layout
 *   engine mirrors it to RTL automatically.
 * - Engine not yet active (iOS Expo Go first-launch): `"row-reverse"` — manual
 *   RTL so components look correct even before the engine flips.
 *
 * Why the old "always row" broke iOS Expo Go: Expo Go reuses the native bridge
 * across JS bundle reloads, so isRTL is read once at bridge init. forceRTL +
 * DevSettings.reload() doesn't refresh the constant. Without the fallback,
 * "row" + no engine mirroring = LTR forever in Expo Go.
 */
export const RTL_ROW: "row" | "row-reverse" = _engineRTL ? "row" : "row-reverse";

/**
 * alignSelf value that places an item on the RIGHT side of a column.
 * - Engine active: `"flex-start"` → engine maps logical start to physical right.
 * - Engine not active: `"flex-end"` → physical right in a non-mirrored layout.
 */
export const RTL_ALIGN_RIGHT: "flex-start" | "flex-end" = _engineRTL ? "flex-start" : "flex-end";

/**
 * textAlign value for right-aligned text.
 * - Web: always `"right"` (CSS dir="rtl" does NOT auto-align RN Text).
 * - Native, engine active (isRTL = true): `undefined` — engine default is RTL.
 * - Native, engine not active (isRTL = false, iOS Expo Go): `"right"` — explicit.
 */
export const TEXT_RIGHT: "right" | undefined =
  _engineRTL && Platform.OS !== "web" ? undefined : "right";

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
