import React from "react";
import { View, StyleSheet, StyleProp, ViewStyle } from "react-native";
import { Text } from "react-native-paper";
import { useFamilyStore } from "@src/store/useFamilyStore";
import { C, S } from "@src/ui/tokens";
import { RTL_ROW } from "@src/ui/rtl";

/**
 * Small pill showing who owns a note/project — a kid OR a family member
 * (parent), tinted with their color. Renders nothing when the item is
 * general (no owner) or the owner no longer exists. Shown wherever owned
 * items appear OUTSIDE their owner's own page (today, notes/projects pages).
 *
 * kidId wins if both are somehow set (ownership is meant to be exclusive).
 */
export default function OwnerBadge({
  kidId,
  ownerMemberId,
  style,
}: {
  kidId?: string;
  ownerMemberId?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const kids = useFamilyStore((s) => s.kids);
  const members = useFamilyStore((s) => s.familyMembers);

  let emoji: string;
  let name: string;
  let color: string;

  if (kidId) {
    const kid = kids.find((k) => k.id === kidId);
    if (!kid) return null;
    emoji = kid.emoji ?? "👶";
    name = kid.name;
    color = kid.color ?? C.purple;
  } else if (ownerMemberId) {
    const m = members.find((x) => x.id === ownerMemberId);
    if (!m) return null;
    emoji = m.avatarEmoji ?? "👤";
    name = m.name;
    color = m.color ?? C.purple;
  } else {
    return null;
  }

  return (
    <View style={[styles.badge, { backgroundColor: color + "22" }, style]}>
      <Text style={styles.emoji}>{emoji}</Text>
      <Text style={[styles.name, { color }]} numberOfLines={1}>
        {name}
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
