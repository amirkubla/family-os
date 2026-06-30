/**
 * SegmentedPills — modern category selector, "underline tabs" style (Option C).
 *
 * Minimal tabs (emoji + label) sharing a hairline baseline; the active tab
 * gets a 2px coloured underline + matching coloured text. Optional emoji and
 * per-option colour. RTL-aware, generic (string values) so it can replace the
 * Paper SegmentedButtons across the app.
 */

import React from "react";
import { View, Pressable, StyleSheet, Platform } from "react-native";
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
            style={({ pressed, hovered }: any) => [
              styles.tab,
              { borderBottomColor: active ? accent : "transparent" },
              hovered && !active && { borderBottomColor: C.border },
              pressed && { opacity: 0.7 },
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
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
    marginBottom: -StyleSheet.hairlineWidth,
    ...(Platform.OS === "web"
      ? ({ cursor: "pointer", transition: "border-bottom-color 0.15s ease" } as any)
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
