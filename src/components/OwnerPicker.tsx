/**
 * OwnerPicker — chip row that selects the owner of a note/project:
 * a family member (parent), a kid, or nobody (general).
 *
 * Tap a chip → assign to that member/kid (exclusive — clears the other).
 * Tap the selected chip again → unassign (general, the implicit default).
 * No dedicated "general" chip; leaving nothing selected expresses "no owner".
 *
 * Renders nothing if the family has no active members and no active kids.
 */

import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { Text } from "react-native-paper";

import { useFamilyStore } from "@src/store/useFamilyStore";
import { C, R, S } from "@src/ui/tokens";
import { RTL_ROW, TEXT_RIGHT } from "@src/ui/rtl";
import { t } from "@src/i18n";

interface Props {
  /** Currently-owning kid id (if any). */
  kidId?: string;
  /** Currently-owning member id (if any). */
  ownerMemberId?: string;
  /** Emits the new exclusive owner: at most one of kidId / ownerMemberId. */
  onChange: (next: { kidId?: string; ownerMemberId?: string }) => void;
  label?: string;
}

export default function OwnerPicker({ kidId, ownerMemberId, onChange, label }: Props) {
  const members = useFamilyStore((s) => s.familyMembers).filter((m) => m.isActive);
  const kids = useFamilyStore((s) => s.kids).filter((k) => k.isActive);
  if (members.length === 0 && kids.length === 0) return null;

  const chip = (
    key: string,
    selected: boolean,
    color: string,
    emoji: string,
    name: string,
    onPress: () => void,
  ) => (
    <Pressable
      key={key}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={name}
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? color + "20" : C.surface,
          borderColor: selected ? color : C.border,
          borderWidth: selected ? 2 : 1,
        },
      ]}
    >
      <Text style={styles.chipEmoji}>{emoji}</Text>
      <Text style={[styles.chipName, selected && { color, fontWeight: "800" }]}>{name}</Text>
      {selected ? <Text style={styles.chipCheck}>✓</Text> : null}
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label ?? t("noteModal.assignTo")}</Text>

      {members.length > 0 && (
        <View style={styles.group}>
          <Text style={styles.groupLabel}>{t("noteModal.ownerParents")}</Text>
          <View style={styles.row}>
            {members.map((m) =>
              chip(
                m.id,
                ownerMemberId === m.id,
                m.color ?? C.purple,
                m.avatarEmoji ?? "👤",
                m.name,
                () => onChange(ownerMemberId === m.id ? {} : { ownerMemberId: m.id }),
              ),
            )}
          </View>
        </View>
      )}

      {kids.length > 0 && (
        <View style={styles.group}>
          <Text style={styles.groupLabel}>{t("noteModal.ownerKids")}</Text>
          <View style={styles.row}>
            {kids.map((kid) =>
              chip(
                kid.id,
                kidId === kid.id,
                kid.color ?? C.purple,
                kid.emoji ?? "👶",
                kid.name,
                () => onChange(kidId === kid.id ? {} : { kidId: kid.id }),
              ),
            )}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: S.xs, marginTop: S.xl, marginBottom: S.sm },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: C.textSecondary,
    textAlign: TEXT_RIGHT,
    writingDirection: "rtl",
  },
  // One labelled row per group: "הורים  [chips…]" then "ילדים  [chips…]".
  group: {
    flexDirection: RTL_ROW,
    alignItems: "center",
    gap: S.sm,
    marginTop: S.sm,
  },
  groupLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: C.textSecondary,
    writingDirection: "rtl",
    minWidth: 42,
  },
  row: { flex: 1, flexDirection: RTL_ROW, flexWrap: "wrap", gap: S.sm },
  chip: {
    flexDirection: RTL_ROW,
    alignItems: "center",
    gap: S.xs,
    paddingVertical: S.xs + 2,
    paddingHorizontal: S.sm + 2,
    borderRadius: R.lg,
  },
  chipEmoji: { fontSize: 18 },
  chipName: {
    fontSize: 14,
    fontWeight: "600",
    color: C.textPrimary,
    writingDirection: "rtl",
  },
  chipCheck: { fontSize: 12, marginStart: 2 },
});
