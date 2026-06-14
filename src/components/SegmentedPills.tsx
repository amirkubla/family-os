/**
 * SegmentedPills — modern category selector, "colored chips" style (Option B).
 *
 * Each option is its own rounded pill. The active one fills with its category
 * colour (light tint + matching strong text/icon); inactive pills are ghosted
 * (transparent + hairline border + muted text). Optional emoji per option.
 * RTL-aware and generic (string values) so it can replace the Paper
 * SegmentedButtons across the app.
 */

import React from "react";
import { View, Pressable, StyleSheet, Platform } from "react-native";
import { Text } from "react-native-paper";

import { C, S } from "@src/ui/tokens";
import { RTL_ROW, TEXT_RIGHT } from "@src/ui/rtl";

export interface SegmentOption {
  value: string;
  label: string;
  /** Optional leading emoji (e.g. "🛒"). */
  emoji?: string;
  /** Strong accent colour for the active state. Falls back to a default. */
  color?: string;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  options: SegmentOption[];
  /** Test id prefix → `${testIDPrefix}-${value}` per segment. */
  testIDPrefix?: string;
}

const DEFAULT_COLOR = C.selectText;

export default function SegmentedPills({ value, onChange, options, testIDPrefix }: Props) {
  return (
    <View style={styles.row}>
      {options.map((opt) => {
        const active = opt.value === value;
        const accent = opt.color ?? DEFAULT_COLOR;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={opt.label}
            testID={testIDPrefix ? `${testIDPrefix}-${opt.value}` : undefined}
            style={({ pressed, hovered }: any) => [
              styles.chip,
              active
                ? { backgroundColor: accent + "22", borderColor: accent + "55" }
                : { borderColor: C.border },
              hovered && !active && { backgroundColor: C.hoverBg },
              pressed && { opacity: 0.85 },
            ]}
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
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: RTL_ROW,
    gap: S.sm,
  },
  chip: {
    flex: 1,
    flexDirection: RTL_ROW,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    ...(Platform.OS === "web"
      ? ({ cursor: "pointer", transition: "all 0.15s ease" } as any)
      : {}),
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
