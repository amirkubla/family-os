/**
 * SegmentedPills — modern iOS/Linear-style segmented control.
 *
 * A soft rounded track with the active segment rendered as a clean white
 * pill (subtle shadow). Optional emoji per option. RTL-aware.
 *
 * Built generic (string values) so it can replace the Paper SegmentedButtons
 * across the app — grocery categories, calendar month/week/day, etc.
 */

import React from "react";
import { View, Pressable, StyleSheet, Platform } from "react-native";
import { Text } from "react-native-paper";

import { C, R, S, SHADOW } from "@src/ui/tokens";
import { RTL_ROW, TEXT_RIGHT } from "@src/ui/rtl";

export interface SegmentOption {
  value: string;
  label: string;
  /** Optional leading emoji (e.g. "🛒"). */
  emoji?: string;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  options: SegmentOption[];
  /** Test id prefix → `${testIDPrefix}-${value}` per segment. */
  testIDPrefix?: string;
}

// Track sits just below the page bg so the white active pill pops.
const TRACK_BG = "#E8E8EE";

export default function SegmentedPills({ value, onChange, options, testIDPrefix }: Props) {
  return (
    <View style={styles.track}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={opt.label}
            testID={testIDPrefix ? `${testIDPrefix}-${opt.value}` : undefined}
            style={({ pressed, hovered }: any) => [
              styles.segment,
              active && styles.segmentActive,
              hovered && !active && styles.segmentHover,
              pressed && { opacity: 0.85 },
            ]}
          >
            {opt.emoji ? <Text style={styles.emoji}>{opt.emoji}</Text> : null}
            <Text
              style={[styles.label, active ? styles.labelActive : styles.labelInactive]}
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
  track: {
    flexDirection: RTL_ROW,
    backgroundColor: TRACK_BG,
    borderRadius: 999,
    padding: 4,
    gap: 2,
  },
  segment: {
    flex: 1,
    flexDirection: RTL_ROW,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 9,
    borderRadius: 999,
    ...(Platform.OS === "web"
      ? ({ cursor: "pointer", transition: "background-color 0.15s ease" } as any)
      : {}),
  },
  segmentActive: {
    backgroundColor: C.surface,
    ...SHADOW.sm,
  },
  segmentHover: {
    backgroundColor: "rgba(255,255,255,0.45)",
  },
  emoji: {
    fontSize: 15,
  },
  label: {
    fontSize: 14,
    textAlign: TEXT_RIGHT,
    writingDirection: "rtl",
  },
  labelActive: {
    color: C.textPrimary,
    fontWeight: "700",
  },
  labelInactive: {
    color: C.textSecondary,
    fontWeight: "500",
  },
});
