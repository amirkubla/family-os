/**
 * SelectChip — the shared "assignee / option" chip used across modals.
 *
 * Matches the project/note owner-picker look: a Pressable pill that, when
 * selected, fills with `color` at 12% (`color + "20"`), gets a 2px `color`
 * border, and bold `color` text. Unselected is white with a hairline border.
 * `color` is the member/kid's own colour, or the family theme for generic
 * options (e.g. "ללא" / "כולם").
 */

import React from "react";
import { Pressable, StyleSheet } from "react-native";
import { Text } from "react-native-paper";

import { C, R, S } from "@src/ui/tokens";
import { RTL_ROW } from "@src/ui/rtl";

interface Props {
  label: string;
  selected: boolean;
  onPress: () => void;
  /** Accent for the selected state — a member/kid colour, or the family theme. */
  color: string;
  emoji?: string;
  testID?: string;
}

export default function SelectChip({ label, selected, onPress, color, emoji, testID }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      onPress={onPress}
      testID={testID}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? color + "20" : C.surface,
          borderColor: selected ? color : C.border,
          borderWidth: selected ? 2 : 1,
        },
      ]}
    >
      {emoji ? <Text style={styles.emoji}>{emoji}</Text> : null}
      <Text style={[styles.name, selected && { color, fontWeight: "800" }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: RTL_ROW,
    alignItems: "center",
    gap: S.xs,
    paddingVertical: S.xs + 2,
    paddingHorizontal: S.sm + 2,
    borderRadius: R.lg,
  },
  emoji: { fontSize: 18 },
  name: { fontSize: 14, fontWeight: "600", color: C.textPrimary, writingDirection: "rtl" },
});
