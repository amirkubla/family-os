/**
 * FeatureTile — launcher tile, "Reminders"-style.
 *
 * A rounded card tinted with its accent colour: a line icon in the top
 * (leading) corner, then the title and a large live-count number at the
 * bottom. Used in the home dashboard grid as a 2-up tile.
 *
 * RTL: content aligns to the leading (right) edge via alignItems "flex-start"
 * (= right under RTL) — no physical left/right, so it's robust on web + native.
 * Kid tiles pass an `emoji` + `subtitle` instead of `icon` + `count`.
 */

import React, { useState } from "react";
import { View, Pressable, StyleSheet, Platform } from "react-native";
import { Text } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";

import { C, R, S, SHADOW } from "@src/ui/tokens";
import { TEXT_RIGHT } from "@src/ui/rtl";

interface Props {
  title: string;
  /** Accent colour — tints the card + icon + number. */
  accent: string;
  onPress: () => void;
  testID?: string;
  /** Line icon (main tiles). */
  icon?: keyof typeof Ionicons.glyphMap;
  /** Emoji fallback (kid tiles). */
  emoji?: string;
  /** Big live-count number. */
  count?: number;
  /** Shown instead of the count when no count is given (kid tiles). */
  subtitle?: string;
}

export default function FeatureTile({
  title,
  accent,
  onPress,
  testID,
  icon,
  emoji,
  count,
  subtitle,
}: Props) {
  const [hovered, setHovered] = useState(false);

  const webHover =
    Platform.OS === "web"
      ? {
          onMouseEnter: () => setHovered(true),
          onMouseLeave: () => setHovered(false),
        }
      : {};

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      testID={testID}
      style={({ pressed }: any) => [
        styles.tile,
        { backgroundColor: accent + "14", borderColor: accent + "29" },
        hovered && styles.tileHover,
        pressed && styles.tilePressed,
      ]}
      {...webHover}
    >
      {/* Icon — top, leading corner */}
      {icon ? (
        <Ionicons name={icon} size={24} color={accent} />
      ) : (
        <Text style={styles.emoji}>{emoji}</Text>
      )}

      <View style={styles.spacer} />

      {/* Title + big count (or subtitle) — bottom, leading */}
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      {count != null ? (
        <Text style={styles.count}>{count}</Text>
      ) : subtitle ? (
        <Text style={styles.subtitle} numberOfLines={1}>
          {subtitle}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    flexBasis: "47%",
    flexGrow: 1,
    minWidth: 150,
    minHeight: 118,
    alignItems: "flex-start", // leading = right under RTL
    borderRadius: R.xl,
    borderWidth: 1,
    paddingVertical: S.md,
    paddingHorizontal: S.md,
    ...SHADOW.sm,
    ...(Platform.OS === "web"
      ? ({ cursor: "pointer", transition: "all 0.18s ease" } as any)
      : {}),
  },
  tileHover: {
    transform: [{ translateY: -2 }],
    ...SHADOW.md,
  },
  tilePressed: {
    transform: [{ scale: 0.98 }],
  },
  spacer: { flex: 1, minHeight: S.md },
  emoji: { fontSize: 24 },
  title: {
    fontSize: 14,
    fontWeight: "700",
    color: C.textPrimary,
    textAlign: TEXT_RIGHT,
    writingDirection: "rtl",
    alignSelf: "stretch",
  },
  count: {
    fontSize: 30,
    fontWeight: "800",
    color: C.textPrimary,
    textAlign: TEXT_RIGHT,
    writingDirection: "rtl",
    alignSelf: "stretch",
    marginTop: 2,
  },
  subtitle: {
    fontSize: 12.5,
    fontWeight: "500",
    color: C.textSecondary,
    textAlign: TEXT_RIGHT,
    writingDirection: "rtl",
    alignSelf: "stretch",
    marginTop: 2,
  },
});
