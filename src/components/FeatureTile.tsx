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
 *
 * Optional `sweepDelay` (ms): plays a one-shot diagonal light "shine" sweeping
 * top-left → bottom-right across the tile on mount, after the delay. Stagger it
 * per tile to make a magical wave flow across a grid (see the family page).
 */

import React, { useEffect, useRef, useState } from "react";
import { View, Pressable, StyleSheet, Platform, Animated, Easing } from "react-native";
import { Text } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

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
  /** When set, play a diagonal shine sweep on mount after this many ms. */
  sweepDelay?: number;
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
  sweepDelay,
}: Props) {
  const [hovered, setHovered] = useState(false);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const sweep = useRef(new Animated.Value(0)).current;

  // One-shot diagonal shine on mount (once the tile size is known).
  useEffect(() => {
    if (sweepDelay == null || size.w === 0) return;
    sweep.setValue(0);
    const anim = Animated.timing(sweep, {
      toValue: 1,
      duration: 1600,
      delay: sweepDelay,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [sweepDelay, size.w, sweep]);

  const webHover =
    Platform.OS === "web"
      ? {
          onMouseEnter: () => setHovered(true),
          onMouseLeave: () => setHovered(false),
        }
      : {};

  // The band travels along the tile's diagonal; the range covers entry→exit.
  const diag = Math.sqrt(size.w * size.w + size.h * size.h) || 200;
  const translate = sweep.interpolate({
    inputRange: [0, 1],
    outputRange: [-diag * 0.9, diag * 0.9],
  });
  const shineOpacity = sweep.interpolate({
    inputRange: [0, 0.12, 0.85, 1],
    outputRange: [0, 1, 1, 0],
  });

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      testID={testID}
      onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
      style={({ pressed }: any) => [
        styles.tile,
        { backgroundColor: accent + "14", borderColor: accent + "29" },
        hovered && styles.tileHover,
        pressed && styles.tilePressed,
      ]}
      {...webHover}
    >
      {/* Large icon centred in the card, title directly below it. */}
      {icon ? (
        <Ionicons name={icon} size={40} color={accent} />
      ) : (
        <Text style={styles.emoji}>{emoji}</Text>
      )}
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>

      {/* Count (or subtitle) — out of flow so the icon stays centred; pinned to
          the bottom leading (right in RTL) corner. */}
      {count != null ? (
        <Text style={styles.count}>{count}</Text>
      ) : subtitle ? (
        <Text style={styles.subtitle} numberOfLines={1}>
          {subtitle}
        </Text>
      ) : null}

      {/* Magical diagonal shine sweep (opt-in) — clipped to the tile, above the
          content, non-interactive. Centred by the clip, then rotated + swept. */}
      {sweepDelay != null && size.w > 0 && (
        <View pointerEvents="none" style={styles.shineClip}>
          <Animated.View
            style={{
              width: diag,
              height: diag * 2.2,
              opacity: shineOpacity,
              transform: [{ rotate: "45deg" }, { translateX: translate }],
            }}
          >
            <LinearGradient
              colors={[
                "transparent",
                accent + "00",
                "rgba(255,255,255,0.75)",
                accent + "55",
                "transparent",
              ]}
              locations={[0, 0.42, 0.5, 0.58, 1]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    flexBasis: "47%",
    flexGrow: 1,
    minWidth: 150,
    minHeight: 124,
    // Centre the icon + title in the whole rectangle (count is absolute).
    alignItems: "center",
    justifyContent: "center",
    gap: S.xs,
    borderRadius: R.xl,
    borderWidth: 1,
    paddingVertical: S.md,
    paddingHorizontal: S.md,
    overflow: "hidden", // clip the shine sweep to the rounded card
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
  emoji: { fontSize: 40 },
  title: {
    fontSize: 14,
    fontWeight: "700",
    color: C.textPrimary,
    textAlign: "center",
    writingDirection: "rtl",
  },
  count: {
    position: "absolute",
    bottom: S.md,
    left: S.md,
    right: S.md,
    fontSize: 17,
    fontWeight: "800",
    color: C.textPrimary,
    textAlign: TEXT_RIGHT,
    writingDirection: "rtl",
  },
  subtitle: {
    position: "absolute",
    bottom: S.md,
    left: S.md,
    right: S.md,
    fontSize: 12,
    fontWeight: "500",
    color: C.textSecondary,
    textAlign: TEXT_RIGHT,
    writingDirection: "rtl",
  },
  shineClip: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: R.xl,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
});
