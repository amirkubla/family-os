import React from "react";
import { View, StyleSheet, StyleProp, ViewStyle } from "react-native";
import { Text } from "react-native-paper";
import { useFamilyStore } from "@src/store/useFamilyStore";
import { C, S } from "@src/ui/tokens";
import { RTL_ROW } from "@src/ui/rtl";

/**
 * Small pill showing which kid a note/project/payment belongs to — the kid's
 * emoji + name, tinted with the kid's color. Renders nothing when the item
 * isn't kid-owned (or the kid no longer exists). Shown wherever kid-owned items
 * appear OUTSIDE the kid's own page (today, main notes/projects pages, etc.).
 */
export default function KidOwnerBadge({
  kidId,
  style,
}: {
  kidId?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const kids = useFamilyStore((s) => s.kids);
  if (!kidId) return null;
  const kid = kids.find((k) => k.id === kidId);
  if (!kid) return null;
  const color = kid.color ?? C.purple;
  return (
    <View style={[styles.badge, { backgroundColor: color + "22" }, style]}>
      <Text style={styles.emoji}>{kid.emoji}</Text>
      <Text style={[styles.name, { color }]} numberOfLines={1}>
        {kid.name}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: RTL_ROW,
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 4,
    paddingHorizontal: S.sm,
    paddingVertical: 2,
    borderRadius: 999,
  },
  emoji: { fontSize: 12 },
  name: { fontSize: 11, fontWeight: "700", writingDirection: "rtl" },
});
