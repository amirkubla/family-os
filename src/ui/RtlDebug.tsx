/**
 * RtlDebug — Lightweight dev-only RTL visual audit tool.
 *
 * Enable: set EXPO_PUBLIC_RTL_DEBUG=1 in .env (or env vars).
 *
 * When enabled, wraps children and highlights components that still have
 * suspect LTR styles (textAlign:"left", writingDirection:"ltr",
 * or flexDirection:"row" on rows that should be RTL).
 *
 * Usage:
 *   import { RtlDebugRow, RtlDebugText } from "@src/ui/RtlDebug";
 *   <RtlDebugRow style={styles.myRow}>...</RtlDebugRow>
 *   <RtlDebugText style={styles.myText}>...</RtlDebugText>
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import type { ViewStyle, TextStyle, StyleProp } from "react-native";

const ENABLED = process.env.EXPO_PUBLIC_RTL_DEBUG === "1";

// ── Helpers ──

function flattenStyle(style: StyleProp<ViewStyle | TextStyle>): Record<string, any> {
  if (!style) return {};
  if (Array.isArray(style)) {
    return (style as any[]).reduce<Record<string, any>>(
      (acc, s) => ({ ...acc, ...flattenStyle(s) }),
      {},
    );
  }
  return style as Record<string, any>;
}

// ── Debug wrappers ──

interface RtlDebugRowProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Override: mark this row as intentionally LTR (e.g. time picker). */
  ltrOk?: boolean;
}

/**
 * Wrap a "content row" (label+value, checkbox+text, etc.) to highlight
 * any remaining LTR flex directions.
 */
export function RtlDebugRow({ children, style, ltrOk }: RtlDebugRowProps) {
  if (!ENABLED || ltrOk) {
    return <View style={style}>{children}</View>;
  }

  const flat = flattenStyle(style);
  const suspect =
    flat.flexDirection === "row-reverse" ||
    flat.writingDirection === "ltr" ||
    flat.direction === "ltr";

  return (
    <View style={[style, suspect && debugStyles.rowWarn]}>
      {suspect && <Text style={debugStyles.badge}>RTL?</Text>}
      {children}
    </View>
  );
}

interface RtlDebugTextProps {
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
}

/**
 * Wrap a Text element to highlight if it has textAlign:"left" or
 * writingDirection:"ltr".
 */
export function RtlDebugText({ children, style }: RtlDebugTextProps) {
  if (!ENABLED) {
    return <Text style={style}>{children}</Text>;
  }

  const flat = flattenStyle(style);
  const suspect =
    flat.textAlign === "left" || flat.writingDirection === "ltr";

  return (
    <Text style={[style, suspect && debugStyles.textWarn]}>
      {children}
    </Text>
  );
}

// ── Styles ──

const debugStyles = StyleSheet.create({
  rowWarn: {
    borderWidth: 2,
    borderColor: "#FF0000",
    borderStyle: "dashed",
  },
  textWarn: {
    backgroundColor: "#FF000022",
  },
  badge: {
    position: "absolute",
    top: -8,
    right: 0,
    fontSize: 8,
    color: "#FF0000",
    backgroundColor: "#FFEEEE",
    paddingHorizontal: 4,
    borderRadius: 4,
    zIndex: 999,
    fontWeight: "700",
  },
});
