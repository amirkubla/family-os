/**
 * fabAnchor — absolute-position insets for floating buttons that must stay on a
 * FIXED physical screen side regardless of platform.
 *
 * Native (iOS/Android) mirrors absolute `left`/`right` under RTL
 * (I18nManager.swapLeftAndRightInRTL); RN-Web does not. So a bare `left: 16`
 * lands on the left on web but flips to the right on a phone. These helpers
 * pick the inset that resolves to the intended side on each platform, keeping
 * the layout identical everywhere (web is the reference):
 *   FAB_LEFT  → always bottom-left  (page "+" add buttons)
 *   FAB_RIGHT → always bottom-right (the nav speed-dial FAB)
 */

import { Platform } from "react-native";

export const FAB_LEFT = Platform.OS === "web" ? { left: 16 } : { right: 16 };
export const FAB_RIGHT = Platform.OS === "web" ? { right: 16 } : { left: 16 };
