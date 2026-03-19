/**
 * Design tokens — shared across the app.
 * Use these instead of hardcoded color/spacing values.
 */

// ---------------------------------------------------------------------------
// Colors
// ---------------------------------------------------------------------------

export const C = {
  // Surfaces
  bg: "#F5F5F7",
  surface: "#FFFFFF",
  surfaceSubtle: "#F8F8FA",

  // Borders
  border: "#EBEBEF",

  // Text
  textPrimary: "#111117",
  textSecondary: "#6B6B8D",
  textMuted: "#A0A0B8",

  // Accent (use for numbers, icons, badges only — not large fills)
  red: "#E5534B",
  teal: "#2BA896",
  purple: "#6C63FF",
  amber: "#D97706",

  // Interactive
  hoverBg: "#F0F0F5",
  pressedBg: "#E8E8F0",
} as const;

// ---------------------------------------------------------------------------
// Spacing (4-point grid)
// ---------------------------------------------------------------------------

export const S = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

// ---------------------------------------------------------------------------
// Border radius
// ---------------------------------------------------------------------------

export const R = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
} as const;

// ---------------------------------------------------------------------------
// Shadows — cross-platform (iOS uses shadow*, Android uses elevation)
// ---------------------------------------------------------------------------

export const SHADOW = {
  sm: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 12,
    elevation: 8,
  },
} as const;
