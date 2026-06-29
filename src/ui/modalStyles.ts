/**
 * Shared modal styles — premium design system for all modals.
 * Import these instead of defining per-modal style objects.
 */

import { StyleSheet } from "react-native";
import { C, S, R, SHADOW } from "./tokens";
import { RTL_ROW, RTL_ALIGN_RIGHT, TEXT_RIGHT } from "./rtl";

/** Blue theme for SegmentedButtons — pass as `theme` prop */
export const SEGMENT_THEME = {
  colors: { secondaryContainer: C.selectBg, onSecondaryContainer: C.selectText },
} as const;

/** Props for SegmentedButtons items — checkedColor + uncheckedColor */
export const SEGMENT_COLORS = {
  checkedColor: C.selectText,
  uncheckedColor: C.textSecondary,
} as const;

// Premium accent colors
const MODAL_ACCENT = "#6C63FF";
const MODAL_ACCENT_LIGHT = "#F0EEFF";
const SECTION_BG = "#FFFFFF"; // white cards on the grey modal content area
const SECTION_BORDER = "#EDEDF3";

export const MS = StyleSheet.create({
  // ---------------------------------------------------------------------------
  // Header
  // ---------------------------------------------------------------------------
  headerBar: {
    flexDirection: RTL_ROW,
    alignItems: "center",
    marginTop: S.lg,
    marginBottom: S.xl,
    paddingBottom: S.md,
    borderBottomWidth: 2,
    borderBottomColor: MODAL_ACCENT,
    gap: S.sm,
  },
  headerIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: MODAL_ACCENT_LIGHT,
    justifyContent: "center",
    alignItems: "center",
  },
  headerIcon: {
    fontSize: 20,
  },
  heading: {
    fontWeight: "800",
    color: C.textPrimary,
    fontSize: 20,
    letterSpacing: -0.3,
    flex: 1,
    textAlign: TEXT_RIGHT,
    writingDirection: "rtl",
    marginBottom: S.md,
  },

  // ---------------------------------------------------------------------------
  // Sections — group related fields into subtle cards
  // ---------------------------------------------------------------------------
  section: {
    backgroundColor: SECTION_BG,
    borderRadius: R.lg,
    padding: S.md,
    marginBottom: S.md,
    ...SHADOW.sm,
  },
  sectionHeader: {
    flexDirection: RTL_ROW,
    alignItems: "center",
    gap: 6,
    marginBottom: S.sm + 2,
  },
  sectionIcon: {
    fontSize: 15,
    opacity: 0.7,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: C.textSecondary,
    // RTL hardening — these three lines force the label to render right-to-left
    // even when I18nManager.isRTL hasn't kicked in yet (which happens on the
    // first launch after install on Android — forceRTL only takes effect after
    // an app restart). Without them, on Android the label was rendering with
    // LTR alignment, making the icon→label row look like an LTR layout.
    textAlign: TEXT_RIGHT,
    writingDirection: "rtl",
    // Dropped `textTransform: "uppercase"` + large `letterSpacing: 0.8`. Hebrew
    // has no uppercase, and the combo trips up Android's text shaper on RTL
    // glyphs — the transform step + wide tracking can break the bidi pass and
    // visually mirror the text.
    letterSpacing: 0.2,
  },

  // ---------------------------------------------------------------------------
  // Subtitle (e.g. kid name under heading)
  // ---------------------------------------------------------------------------
  subtitle: {
    fontSize: 13,
    color: MODAL_ACCENT,
    textAlign: TEXT_RIGHT,
    writingDirection: "rtl",
    marginTop: -S.lg,
    marginBottom: S.lg,
  },
  kidBadge: {
    flexDirection: RTL_ROW,
    alignItems: "center",
    // alignSelf controls the badge's position on the cross axis (horizontal in
    // a column). A hardcoded "flex-end" resolves to the LEFT edge in an RTL
    // container — which pushed the owner badge to the top-left. RTL_ALIGN_RIGHT
    // maps to the right edge across all RTL states (web, native pre/post-restart).
    alignSelf: RTL_ALIGN_RIGHT,
    backgroundColor: MODAL_ACCENT_LIGHT,
    borderRadius: R.xl,
    paddingHorizontal: S.md,
    paddingVertical: S.xs + 2,
    gap: S.sm - 2,
    marginTop: -S.md,
    marginBottom: S.lg,
  },

  // ---------------------------------------------------------------------------
  // Form elements
  // ---------------------------------------------------------------------------
  label: {
    textAlign: TEXT_RIGHT,
    writingDirection: "rtl",
    marginTop: S.lg,
    marginBottom: S.xs + 2,
    color: C.textSecondary,
    fontSize: 13,
    fontWeight: "600",
  },
  input: {
    marginBottom: S.md,
    textAlign: TEXT_RIGHT,
    writingDirection: "rtl",
    backgroundColor: "#FFFFFF",
  },
  inputContent: {
    textAlign: TEXT_RIGHT,
    writingDirection: "rtl",
  },
  // Numeric fields (amounts, quantities): numbers are inherently LTR, and a
  // numeric-keyboard TextInput with writingDirection "rtl" SWALLOWS typed
  // digits on iOS. Always use this for keyboardType="numeric" inputs.
  inputContentNumeric: {
    textAlign: TEXT_RIGHT,
    writingDirection: "ltr",
  },
  error: {
    color: C.red,
    fontSize: 12,
    marginBottom: S.xs,
    marginTop: -(S.xs),
    textAlign: TEXT_RIGHT,
    writingDirection: "rtl",
  },

  // ---------------------------------------------------------------------------
  // Chips & segments
  // ---------------------------------------------------------------------------
  chipRow: {
    flexDirection: RTL_ROW,
    flexWrap: "wrap",
    gap: S.sm - 2,
    marginBottom: S.md - 2,
    // width: "100%" ensures the chip row stretches to the full container width.
    // Without it, flexWrap:"wrap" can cause the row to collapse to content width
    // on RN Web, shrinking every sibling View (including MS.actions) below it.
    width: "100%",
  },
  chip: {
    borderRadius: 999,
  },
  chipLabel: {
    fontSize: 12,
    writingDirection: "rtl",
  },
  segmented: {
    marginBottom: S.sm + 2,
    marginTop: S.xs,
  },

  // ---------------------------------------------------------------------------
  // Time pickers
  // ---------------------------------------------------------------------------
  timeRow: {
    flexDirection: RTL_ROW,
    gap: S.md,
    marginBottom: S.sm,
  },
  timeCol: {
    flex: 1,
  },
  timeLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: MODAL_ACCENT,
    textAlign: "center",
    writingDirection: "rtl",
    marginBottom: S.xs + 2,
  },

  // ---------------------------------------------------------------------------
  // Actions — premium buttons
  // ---------------------------------------------------------------------------
  actions: {
    flexDirection: RTL_ROW,
    // In RTL ("row" direction), "flex-start" = RIGHT edge on both native and web.
    // CSS flex-direction:row with direction:rtl flows right→left, so flex-start = right.
    // Confirmed: native (iOS/Android) via I18nManager.isRTL, web via CSS direction:rtl.
    justifyContent: "flex-start",
    gap: S.sm + 2,
    marginTop: S.xl,
    paddingTop: S.lg,
  },
  cancelBtn: {
    borderRadius: R.xl,
    borderColor: SECTION_BORDER,
  },
  cancelLabel: {
    color: C.textSecondary,
    fontWeight: "600",
  },
  saveBtn: {
    borderRadius: R.xl,
    paddingHorizontal: S.xl,
    backgroundColor: MODAL_ACCENT,
  },
  saveBtnLabel: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
  },

  // ---------------------------------------------------------------------------
  // Legacy compat (unused but kept to avoid import errors)
  // ---------------------------------------------------------------------------
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: C.border,
    marginVertical: S.md,
  },
});
