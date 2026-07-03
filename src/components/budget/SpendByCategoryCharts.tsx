/**
 * SpendByCategoryCharts — two read-only visualizations of a month's spend
 * broken down by category: a vertical bar chart and a pie chart (+ legend).
 *
 * Pure presentational: the parent computes the per-category slices (already
 * filtered to amount > 0 and sorted descending) and passes a formatter.
 *
 * RTL: bars scroll right-to-left (largest first on the right); the legend uses
 * RTL_ROW. The pie is geometry, direction-agnostic.
 */

import React, { useEffect, useRef } from "react";
import { View, ScrollView, StyleSheet, Animated, Easing, Platform } from "react-native";
import { Text } from "react-native-paper";
import Svg, { Path, Circle } from "react-native-svg";

import { C, S, R, SHADOW } from "@src/ui/tokens";
import { RTL_ROW, TEXT_RIGHT } from "@src/ui/rtl";
import { t } from "@src/i18n";

export interface SpendSlice {
  /** Category display name. */
  name: string;
  /** Amount in agorot. */
  amount: number;
  /** Category color (hex). */
  color: string;
  /** Category emoji. */
  icon: string;
}

interface Props {
  slices: SpendSlice[];
  total: number;
  formatAmount: (agorot: number) => string;
  /** When it flips true, the bar chart slides in from the left and the pie
   *  from the right. Driven by the parent's scroll-into-view detection. */
  revealed?: boolean;
}

const BAR_AREA_HEIGHT = 120;
// Bars sit flush against each other (no gap) — each column IS the bar width.
const BAR_COL_WIDTH = 44;
const PIE_SIZE = 168;
const SLIDE_MS = 1600; // gentle, deliberate reveal
const SLIDE_DX = 60;
// Last-resort reveal if the scroll signal never fires — long enough that a
// user scrolling to the charts triggers the real reveal (and its animation)
// first, short enough that the card is never left blank.
const SLIDE_FALLBACK_MS = 2500;

/** Build SVG wedge path data for a pie slice spanning [start, end] radians. */
function wedgePath(cx: number, cy: number, r: number, start: number, end: number): string {
  const x1 = cx + r * Math.cos(start);
  const y1 = cy + r * Math.sin(start);
  const x2 = cx + r * Math.cos(end);
  const y2 = cy + r * Math.sin(end);
  const largeArc = end - start > Math.PI ? 1 : 0;
  return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
}

export default function SpendByCategoryCharts({ slices, total, formatAmount, revealed }: Props) {
  // Slide-in reveal. When `revealed` is undefined the caller isn't driving it,
  // so render fully shown (p=1); otherwise start hidden and animate in on true.
  const p = useRef(new Animated.Value(revealed === undefined ? 1 : 0)).current;
  const settled = useRef(revealed === undefined);
  useEffect(() => {
    const play = () => {
      if (settled.current) return;
      settled.current = true;
      Animated.timing(p, {
        toValue: 1,
        duration: SLIDE_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: Platform.OS !== "web",
      }).start();
    };
    if (revealed) {
      play();
      return;
    }
    // Fail-safe: if the scroll-into-view signal never arrives (edge platforms /
    // non-scrollable layouts), reveal anyway so the charts never stay blank.
    const id = setTimeout(play, SLIDE_FALLBACK_MS);
    return () => clearTimeout(id);
  }, [revealed, p]);
  const barSlide = {
    opacity: p,
    transform: [{ translateX: p.interpolate({ inputRange: [0, 1], outputRange: [-SLIDE_DX, 0] }) }],
  };
  const pieSlide = {
    opacity: p,
    transform: [{ translateX: p.interpolate({ inputRange: [0, 1], outputRange: [SLIDE_DX, 0] }) }],
  };

  if (slices.length === 0 || total <= 0) {
    return <Text style={styles.empty}>{t("budget.noSpendThisMonth")}</Text>;
  }

  const maxAmount = Math.max(...slices.map((s) => s.amount));

  // Pie geometry — wedges around the circle, starting at the top (-90°).
  const cx = PIE_SIZE / 2;
  const cy = PIE_SIZE / 2;
  const r = PIE_SIZE / 2 - 2;
  let angle = -Math.PI / 2;
  const wedges = slices.map((s) => {
    const frac = s.amount / total;
    const start = angle;
    const end = angle + frac * 2 * Math.PI;
    angle = end;
    return { d: wedgePath(cx, cy, r, start, end), color: s.color };
  });
  const singleSlice = slices.length === 1;

  return (
    <View style={styles.card}>
      {/* Bar chart — vertical bars, scrollable for many categories.
          Slides in from the left on reveal. */}
      <Animated.View style={barSlide}>
        <Text style={styles.chartTitle}>{t("budget.chartByCategory")}</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.barRow, { flexDirection: RTL_ROW }]}
        >
          {slices.map((s) => {
            const h = Math.max(4, (s.amount / maxAmount) * BAR_AREA_HEIGHT);
            return (
              <View key={s.name} style={styles.barCol}>
                <Text style={styles.barValue} numberOfLines={1}>
                  {formatAmount(s.amount)}
                </Text>
                <View style={styles.barTrack}>
                  <View style={[styles.bar, { height: h, backgroundColor: s.color }]} />
                </View>
                <Text style={styles.barEmoji}>{s.icon}</Text>
              </View>
            );
          })}
        </ScrollView>
      </Animated.View>

      {/* Pie chart + legend — slides in from the right on reveal. */}
      <Animated.View style={pieSlide}>
        <Text style={[styles.chartTitle, styles.pieTitle]}>{t("budget.chartShare")}</Text>
        <View style={styles.pieWrap}>
          <Svg width={PIE_SIZE} height={PIE_SIZE}>
            {singleSlice ? (
              <Circle cx={cx} cy={cy} r={r} fill={slices[0].color} />
            ) : (
              wedges.map((w, i) => <Path key={i} d={w.d} fill={w.color} />)
            )}
          </Svg>
          <View style={styles.legend}>
            {slices.map((s) => {
              const pct = Math.round((s.amount / total) * 100);
              return (
                <View key={s.name} style={styles.legendRow}>
                  <View style={[styles.legendDot, { backgroundColor: s.color }]} />
                  <Text style={styles.legendName} numberOfLines={1}>
                    {s.icon} {s.name}
                  </Text>
                  <Text style={styles.legendPct}>{pct}%</Text>
                </View>
              );
            })}
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: C.surface,
    borderRadius: R.md,
    padding: S.md,
    marginBottom: S.sm,
    ...SHADOW.sm,
  },
  empty: {
    textAlign: TEXT_RIGHT,
    color: C.textSecondary,
    fontSize: 14,
    marginVertical: S.md,
    writingDirection: "rtl",
  },
  chartTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: C.textSecondary,
    textAlign: TEXT_RIGHT,
    writingDirection: "rtl",
    marginBottom: S.sm,
  },
  pieTitle: { marginTop: S.md },

  // Bar chart — flexGrow + center so the bars sit next to each other as a
  // centered cluster (and stay scrollable when there are too many to fit).
  // No gap: adjacent columns touch, and each bar fills its column, so the bars
  // read as one flush histogram (wider than the old spaced-out thin bars).
  barRow: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "flex-end",
    paddingHorizontal: S.xs,
    gap: 0,
    minHeight: BAR_AREA_HEIGHT + 44,
  },
  barCol: {
    width: BAR_COL_WIDTH,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  barValue: {
    fontSize: 10,
    fontWeight: "600",
    color: C.textSecondary,
    marginBottom: 2,
  },
  barTrack: {
    height: BAR_AREA_HEIGHT,
    justifyContent: "flex-end",
    alignSelf: "stretch",
  },
  bar: {
    alignSelf: "stretch",
    borderTopLeftRadius: R.sm,
    borderTopRightRadius: R.sm,
    minHeight: 4,
  },
  barEmoji: { fontSize: 18, marginTop: 4 },

  // Pie + legend — a centered column: the pie sits on top, the legend directly
  // below it (never beside/under it), everything horizontally centered.
  pieWrap: {
    alignItems: "center",
    gap: S.md,
  },
  legend: { width: "100%", maxWidth: 280, gap: S.xs },
  legendRow: {
    flexDirection: RTL_ROW,
    alignItems: "center",
    gap: S.sm,
  },
  legendDot: { width: 12, height: 12, borderRadius: 6 },
  legendName: {
    flex: 1,
    fontSize: 13,
    color: C.textPrimary,
    textAlign: TEXT_RIGHT,
    writingDirection: "rtl",
  },
  legendPct: { fontSize: 13, fontWeight: "700", color: C.textPrimary },
});
