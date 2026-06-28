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

import React from "react";
import { View, ScrollView, StyleSheet } from "react-native";
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
}

const BAR_AREA_HEIGHT = 120;
const BAR_COL_WIDTH = 52;
const PIE_SIZE = 168;

/** Build SVG wedge path data for a pie slice spanning [start, end] radians. */
function wedgePath(cx: number, cy: number, r: number, start: number, end: number): string {
  const x1 = cx + r * Math.cos(start);
  const y1 = cy + r * Math.sin(start);
  const x2 = cx + r * Math.cos(end);
  const y2 = cy + r * Math.sin(end);
  const largeArc = end - start > Math.PI ? 1 : 0;
  return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
}

export default function SpendByCategoryCharts({ slices, total, formatAmount }: Props) {
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
      {/* Bar chart — vertical bars, scrollable for many categories. */}
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

      {/* Pie chart + legend. */}
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
  barRow: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "flex-end",
    paddingHorizontal: S.xs,
    gap: S.sm,
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
  },
  bar: {
    width: 28,
    borderTopLeftRadius: R.sm,
    borderTopRightRadius: R.sm,
    minHeight: 4,
  },
  barEmoji: { fontSize: 18, marginTop: 4 },

  // Pie + legend — centered cluster that wraps the legend below the pie on
  // narrow screens. The legend is width-capped so it never stretches the row
  // (which on wide web flung the pie right and the percentages far left).
  pieWrap: {
    flexDirection: RTL_ROW,
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
    gap: S.lg,
  },
  legend: { minWidth: 200, maxWidth: 280, gap: S.xs },
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
