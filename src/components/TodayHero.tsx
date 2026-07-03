/**
 * TodayHero — the personalized greeting banner at the top of the Today screen.
 *
 * A playful diagonal gradient (purple → violet → pink, drawn with react-native-
 * svg — no extra gradient dep, same technique as SummaryHeroCard) carrying a
 * time-of-day greeting, a motivational one-liner, and tappable stat chips for
 * the current member's own chores / projects / personal events.
 */

import React, { useState } from "react";
import { View, StyleSheet, Pressable, Platform } from "react-native";
import { Text } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Defs, LinearGradient, Stop, Rect } from "react-native-svg";

import { S, R, SHADOW } from "@src/ui/tokens";
import { RTL_ROW, TEXT_RIGHT } from "@src/ui/rtl";
import { t } from "@src/i18n";
import { heroQuoteForDate } from "@src/lib/heroQuotes";

interface Stat {
  /** Ionicons glyph — same icon set as the nav menu (see CustomTabBar). */
  icon: keyof typeof Ionicons.glyphMap;
  count: number;
  label: string;
  onPress?: () => void;
}

interface Props {
  /** Current member's display name (empty = generic greeting). */
  name: string;
  stats: Stat[];
}

const GRAD_FROM = "#6C63FF";
const GRAD_MID = "#9B7CFF";
const GRAD_TO = "#FF7EB3";

function greetingKey(hour: number): string {
  if (hour >= 5 && hour < 12) return "today.greetingMorning";
  if (hour >= 12 && hour < 17) return "today.greetingNoon";
  if (hour >= 17 && hour < 22) return "today.greetingEvening";
  return "today.greetingNight";
}

export default function TodayHero({ name, stats }: Props) {
  const [size, setSize] = useState({ w: 0, h: 0 });

  const now = new Date();
  const greeting = t(greetingKey(now.getHours()));
  // Productivity quote of the day — rotates daily through a generous pool.
  const subtitle = heroQuoteForDate(now);

  return (
    <View style={styles.shadow}>
      <View
        style={styles.card}
        onLayout={(e) =>
          setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })
        }
      >
        {size.w > 0 && (
          <Svg width={size.w} height={size.h} style={StyleSheet.absoluteFill}>
            <Defs>
              <LinearGradient id="todayHero" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor={GRAD_FROM} />
                <Stop offset="0.55" stopColor={GRAD_MID} />
                <Stop offset="1" stopColor={GRAD_TO} />
              </LinearGradient>
            </Defs>
            <Rect x="0" y="0" width={size.w} height={size.h} fill="url(#todayHero)" />
          </Svg>
        )}

        <Text style={styles.greeting}>
          {name ? `${greeting}, ${name}!` : `${greeting}!`}
        </Text>
        <Text style={styles.subtitle}>{subtitle}</Text>

        <View style={styles.statsRow}>
          {stats.map((s, i) => (
            <Pressable
              key={i}
              style={styles.statChip}
              onPress={s.onPress}
              accessibilityRole="button"
              accessibilityLabel={`${s.count} ${s.label}`}
            >
              <View style={styles.statTop}>
                <Ionicons name={s.icon} size={16} color="#FFFFFF" />
                <Text style={styles.statCount}>{s.count}</Text>
              </View>
              <Text style={styles.statLabel}>{s.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shadow: {
    borderRadius: R.xl,
    marginBottom: S.xl,
    ...SHADOW.md,
    shadowColor: GRAD_FROM,
    shadowOpacity: 0.35,
    shadowRadius: 14,
  },
  card: {
    borderRadius: R.xl,
    overflow: "hidden",
    paddingVertical: S.xl,
    paddingHorizontal: S.xl,
    backgroundColor: GRAD_FROM, // first-frame fallback before layout is measured
  },
  greeting: {
    fontSize: 22,
    fontWeight: "800",
    color: "#FFFFFF",
    textAlign: TEXT_RIGHT,
    writingDirection: "rtl",
  },
  subtitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "rgba(255,255,255,0.9)",
    textAlign: TEXT_RIGHT,
    writingDirection: "rtl",
    marginTop: 4,
    marginBottom: S.lg,
  },
  statsRow: {
    flexDirection: RTL_ROW,
    gap: S.sm,
  },
  statTop: {
    flexDirection: RTL_ROW,
    alignItems: "center",
    gap: 6,
  },
  statChip: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.22)",
    borderRadius: R.md,
    paddingVertical: S.sm + 2,
    paddingHorizontal: S.sm,
    alignItems: "center",
    ...(Platform.OS === "web" ? ({ cursor: "pointer" } as any) : {}),
  },
  statCount: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  statLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "rgba(255,255,255,0.9)",
    marginTop: 2,
    writingDirection: "rtl",
  },
});
