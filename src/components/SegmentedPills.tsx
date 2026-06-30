/**
 * SegmentedPills — modern category selector, "underline tabs" style.
 *
 * Minimal tabs (emoji + label) sharing a hairline baseline; the active tab gets
 * a 2px coloured underline that WIPES IN from the right (RTL) when selected,
 * plus matching coloured text. Optional emoji and per-option colour (defaults to
 * the family theme). RTL-aware, generic (string values).
 *
 * This is the single home for the underline-selection look + animation — every
 * "one-time / recurring", calendar-view, payment-type, etc. selector uses it,
 * so the wipe is defined once here and reused everywhere (no duplication).
 */

import React, { useEffect, useRef } from "react";
import { View, Pressable, StyleSheet, Platform, Animated, Easing } from "react-native";
import { Text } from "react-native-paper";

import { C } from "@src/ui/tokens";
import { RTL_ROW, TEXT_RIGHT } from "@src/ui/rtl";
import { useThemeColor } from "@src/ui/useThemeColor";

export interface SegmentOption {
  value: string;
  label: string;
  /** Optional leading emoji (e.g. "🛒"). */
  emoji?: string;
  /** Strong accent colour for the active underline + text. Falls back to default. */
  color?: string;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  options: SegmentOption[];
  /** Test id prefix → `${testIDPrefix}-${value}` per segment. */
  testIDPrefix?: string;
}

export default function SegmentedPills({ value, onChange, options, testIDPrefix }: Props) {
  // Active accent defaults to the family theme; an option may override per-item.
  const theme = useThemeColor();

  // One underline-progress value per option (0 = hidden, 1 = full), keyed by the
  // option value so it survives re-renders even when callers pass a fresh
  // `options` array literal. Lazily created; the active option starts at 1 so
  // there's no wipe on first mount — only on an actual selection change.
  const progress = useRef<Record<string, Animated.Value>>({}).current;
  for (const o of options) {
    if (!progress[o.value]) progress[o.value] = new Animated.Value(o.value === value ? 1 : 0);
  }

  // Animate on selection change. Dep on the option-value set (a stable string)
  // rather than the array identity, so an inline `options={[…]}` prop doesn't
  // restart the animation on every unrelated re-render.
  const optionKeys = options.map((o) => o.value).join("|");
  useEffect(() => {
    for (const o of options) {
      Animated.timing(progress[o.value], {
        toValue: o.value === value ? 1 : 0,
        duration: 380,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: Platform.OS !== "web",
      }).start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, optionKeys]);

  return (
    <View style={styles.row}>
      {options.map((opt) => {
        const active = opt.value === value;
        const accent = opt.color ?? theme;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={opt.label}
            testID={testIDPrefix ? `${testIDPrefix}-${opt.value}` : undefined}
            style={({ pressed }: any) => [styles.tab, pressed && { opacity: 0.7 }]}
          >
            {opt.emoji ? <Text style={styles.emoji}>{opt.emoji}</Text> : null}
            <Text
              style={[
                styles.label,
                { color: active ? accent : C.textSecondary, fontWeight: active ? "700" : "500" },
              ]}
              numberOfLines={1}
            >
              {opt.label}
            </Text>
            {/* Accent underline — grows from the right edge leftward (RTL wipe). */}
            <Animated.View
              pointerEvents="none"
              style={[
                styles.underline,
                {
                  backgroundColor: accent,
                  transform: [{ scaleX: progress[opt.value] }],
                  transformOrigin: "100% 50%",
                } as any,
              ]}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: RTL_ROW,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
  },
  tab: {
    flex: 1,
    flexDirection: RTL_ROW,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    position: "relative",
    ...(Platform.OS === "web" ? ({ cursor: "pointer" } as any) : {}),
  },
  // Sits on the row's hairline baseline; scaleX animates it in/out.
  underline: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: -StyleSheet.hairlineWidth,
    height: 2,
  },
  emoji: {
    fontSize: 15,
  },
  label: {
    fontSize: 14,
    textAlign: TEXT_RIGHT,
    writingDirection: "rtl",
  },
});
