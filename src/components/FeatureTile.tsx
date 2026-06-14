/**
 * FeatureTile — FamilyWall-style launcher tile.
 *
 * A white rounded card with a bold title, a small live-count subtitle, and a
 * large tinted emoji icon on the leading edge. Used in the home dashboard
 * grid as a 2-up tile (flex: 1 inside an RTL_ROW that wraps).
 *
 * Layout is RTL_ROW: text column sits on the RIGHT (natural Hebrew reading),
 * the icon badge on the LEFT — robust across web + native RTL without
 * physical left/right positioning.
 */

import React, { useState } from "react";
import { View, Pressable, StyleSheet, Platform } from "react-native";
import { Text } from "react-native-paper";

import { C, R, S, SHADOW } from "@src/ui/tokens";
import { RTL_ROW, TEXT_RIGHT } from "@src/ui/rtl";

interface Props {
  title: string;
  subtitle?: string;
  emoji: string;
  /** Accent colour — tints the icon badge + active border. */
  accent: string;
  onPress: () => void;
  testID?: string;
}

export default function FeatureTile({
  title,
  subtitle,
  emoji,
  accent,
  onPress,
  testID,
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
        hovered && styles.tileHover,
        pressed && styles.tilePressed,
      ]}
      {...webHover}
    >
      {/* Text column (right in RTL) */}
      <View style={styles.textCol}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {/* Icon badge (left in RTL) */}
      <View style={[styles.iconBadge, { backgroundColor: accent + "1A" }]}>
        <Text style={styles.emoji}>{emoji}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    flexBasis: "47%",
    flexGrow: 1,
    minWidth: 150,
    flexDirection: RTL_ROW,
    alignItems: "center",
    gap: S.sm,
    backgroundColor: C.surface,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: "rgba(226, 232, 240, 0.7)",
    paddingVertical: S.lg,
    paddingHorizontal: S.md,
    minHeight: 120,
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
  textCol: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 16,
    fontWeight: "800",
    color: C.textPrimary,
    textAlign: TEXT_RIGHT,
    writingDirection: "rtl",
  },
  subtitle: {
    fontSize: 12.5,
    fontWeight: "500",
    color: C.textSecondary,
    textAlign: TEXT_RIGHT,
    writingDirection: "rtl",
    marginTop: 2,
  },
  iconBadge: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  emoji: {
    fontSize: 26,
  },
});
