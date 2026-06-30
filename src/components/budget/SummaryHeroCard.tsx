/**
 * SummaryHeroCard — the budget page's "total spent" hero.
 *
 * A diagonal gradient background drawn with react-native-svg (no extra gradient
 * dependency). The gradient <Rect> is measured via onLayout and clipped by the
 * card's rounded corners; a solid fallback color covers the first frame before
 * the layout size is known. The coloured shadow lives on an outer wrapper so
 * `overflow: "hidden"` on the card doesn't clip it (iOS).
 *
 * RTL: row uses RTL_ROW (text leads on the right, icon badge on the left); the
 * SVG gradient is geometry, direction-agnostic.
 */

import React, { useState } from "react";
import { View, StyleSheet } from "react-native";
import { Text } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Defs, LinearGradient, Stop, Rect } from "react-native-svg";

import { S, R, SHADOW } from "@src/ui/tokens";
import { RTL_ROW, TEXT_RIGHT } from "@src/ui/rtl";
import { useThemeColor } from "@src/ui/useThemeColor";

interface Props {
  label: string;
  amount: string;
}

/** Lighten a hex colour toward white by `amount` (0–1) — used for the second
 *  gradient stop so the hero is a single-hue wash of the family theme. */
function lighten(hex: string, amount: number): string {
  const n = parseInt(hex.replace("#", ""), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const hx = (c: number) => Math.round(c + (255 - c) * amount).toString(16).padStart(2, "0");
  return `#${hx(r)}${hx(g)}${hx(b)}`;
}

export default function SummaryHeroCard({ label, amount }: Props) {
  const theme = useThemeColor();
  const gradFrom = theme;
  const gradTo = lighten(theme, 0.45);
  const [size, setSize] = useState({ w: 0, h: 0 });

  return (
    <View style={[styles.shadow, { shadowColor: gradFrom }]}>
      <View
        style={[styles.card, { backgroundColor: gradFrom }]}
        onLayout={(e) =>
          setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })
        }
      >
        {size.w > 0 && (
          <Svg width={size.w} height={size.h} style={StyleSheet.absoluteFill}>
            <Defs>
              <LinearGradient id="budgetHero" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor={gradFrom} />
                <Stop offset="1" stopColor={gradTo} />
              </LinearGradient>
            </Defs>
            <Rect x="0" y="0" width={size.w} height={size.h} fill="url(#budgetHero)" />
          </Svg>
        )}

        <View style={styles.textWrap}>
          <Text style={styles.subtitle}>{label}</Text>
          <Text style={styles.amount}>{amount}</Text>
        </View>
        <View style={styles.iconBadge}>
          <Ionicons name="wallet" size={26} color="#FFFFFF" />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shadow: {
    borderRadius: R.xl,
    marginBottom: S.lg,
    ...SHADOW.md,
    shadowOpacity: 0.4,
    shadowRadius: 14,
  },
  card: {
    borderRadius: R.xl,
    overflow: "hidden",
    paddingVertical: S.lg,
    paddingHorizontal: S.xl,
    flexDirection: RTL_ROW,
    alignItems: "center",
    justifyContent: "space-between",
    // backgroundColor applied inline (theme) as the first-frame fallback.
  },
  textWrap: { flex: 1 },
  subtitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(255,255,255,0.85)",
    textAlign: TEXT_RIGHT,
    marginBottom: 4,
    writingDirection: "rtl",
  },
  amount: {
    fontSize: 34,
    fontWeight: "800",
    color: "#FFFFFF",
    textAlign: TEXT_RIGHT,
    writingDirection: "rtl",
  },
  iconBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
    marginStart: S.md,
  },
});
