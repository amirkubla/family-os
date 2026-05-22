/**
 * FamilyBadge — Decorative pill showing "משפחת {name} ✨"
 *
 * Renders a colorful, small badge with the family name.
 * Returns null when no name is set, so screens are unaffected.
 */

import React from "react";
import { View, StyleSheet } from "react-native";
import type { ViewStyle } from "react-native";
import { Text } from "react-native-paper";
import { useFamilyStore } from "@src/store/useFamilyStore";
import { t } from "@src/i18n";
import { RTL_ROW, RTL_ALIGN_RIGHT, TEXT_RIGHT } from "@src/ui/rtl";

interface FamilyBadgeProps {
  style?: ViewStyle;
}

export default function FamilyBadge({ style }: FamilyBadgeProps) {
  const familyName = useFamilyStore((s) => s.familyName);

  if (!familyName) return null;

  return (
    <View style={[styles.badge, style]}>
      <Text style={styles.sparkle}>✨</Text>
      <Text style={styles.text}>
        {t("familyBadge.prefix")} {familyName}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: RTL_ALIGN_RIGHT,
    flexDirection: RTL_ROW,
    alignItems: "center",
    backgroundColor: "#E8E6FF",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#6C63FF33",
    marginBottom: 8,
    gap: 6,
  },
  text: {
    fontSize: 13,
    fontWeight: "700",
    color: "#6C63FF",
    textAlign: TEXT_RIGHT,
  },
  sparkle: {
    fontSize: 12,
  },
});
