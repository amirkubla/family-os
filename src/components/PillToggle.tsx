/**
 * PillToggle — a clean two-option segmented control for a boolean choice.
 *
 * Replaces the native RN <Switch> (ugly + ambiguous "which side is on" in RTL)
 * with two explicit, labelled pills. The active option is filled; both states
 * are always visible, so there's no guessing. RTL-safe (uses RTL_ROW, no
 * absolute left/right that would mirror inconsistently across platforms).
 */

import React from "react";
import { View, Pressable, Text, StyleSheet } from "react-native";
import { C, S } from "@src/ui/tokens";
import { RTL_ROW } from "@src/ui/rtl";

interface Props {
  value: boolean;
  onChange: (v: boolean) => void;
  /** Label for the `true` state (shown first → right side in RTL). */
  onLabel: string;
  /** Label for the `false` state. */
  offLabel: string;
  /** Fill colour for the active pill. */
  activeColor?: string;
  testID?: string;
}

export default function PillToggle({
  value,
  onChange,
  onLabel,
  offLabel,
  activeColor = C.purple,
  testID,
}: Props) {
  const opts: { v: boolean; label: string }[] = [
    { v: true, label: onLabel },
    { v: false, label: offLabel },
  ];
  return (
    <View style={styles.track} testID={testID}>
      {opts.map((o) => {
        const active = value === o.v;
        return (
          <Pressable
            key={String(o.v)}
            onPress={() => onChange(o.v)}
            style={[styles.pill, active && { backgroundColor: activeColor }]}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={o.label}
            testID={testID ? `${testID}-${o.v ? "on" : "off"}` : undefined}
          >
            <Text style={[styles.label, active && styles.labelActive]} numberOfLines={1}>
              {o.label}
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
    backgroundColor: C.surfaceSubtle,
    borderRadius: 999,
    padding: 3,
    gap: 3,
    marginBottom: S.sm,
  },
  pill: {
    flex: 1,
    paddingVertical: S.xs + 2,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: C.textSecondary,
    writingDirection: "rtl",
  },
  labelActive: { color: "#FFFFFF" },
});
