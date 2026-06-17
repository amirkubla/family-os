/**
 * KidOwnerPicker — horizontal chip row that selects which kid (if any)
 * owns a note or project.
 *
 * Tap a kid → assign to that kid.
 * Tap the selected kid again → unassign (family-wide).
 * Family-wide is the implicit default (no chip selected); we don't render
 * a dedicated "family-wide" chip — leaving the row with no selection is
 * the way to express "no owner".
 *
 * Only renders active kids. If a family has no kids at all, the whole
 * row stays hidden — there's nothing to pick.
 */

import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { Text } from "react-native-paper";

import { useFamilyStore } from "@src/store/useFamilyStore";
import { C, R, S } from "@src/ui/tokens";
import { RTL_ROW, TEXT_RIGHT } from "@src/ui/rtl";
import { t } from "@src/i18n";

interface Props {
  /** Selected kid's id, or undefined for family-wide. */
  value: string | undefined;
  /** Called with the new kid id (or undefined for "no owner"). */
  onChange: (kidId: string | undefined) => void;
  /** Override the default label (e.g., to use a project-specific phrasing). */
  label?: string;
}

export default function KidOwnerPicker({ value, onChange, label }: Props) {
  const kids = useFamilyStore((s) => s.kids).filter((k) => k.isActive);
  if (kids.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label ?? t("noteModal.assignToKid")}</Text>
      <View style={styles.row}>
        {kids.map((kid) => {
          const selected = value === kid.id;
          const kidColor = kid.color ?? C.purple;
          return (
            <Pressable
              key={kid.id}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={kid.name}
              onPress={() => onChange(selected ? undefined : kid.id)}
              style={[
                styles.chip,
                {
                  backgroundColor: selected ? kidColor + "20" : C.surface,
                  borderColor: selected ? kidColor : C.border,
                  borderWidth: selected ? 2 : 1,
                },
              ]}
            >
              <Text style={styles.chipEmoji}>{kid.emoji ?? "👶"}</Text>
              <Text
                style={[
                  styles.chipName,
                  selected && { color: kidColor, fontWeight: "800" },
                ]}
              >
                {kid.name}
              </Text>
              {selected ? <Text style={styles.chipCheck}>✓</Text> : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: S.xs,
    marginTop: S.xl,
    marginBottom: S.sm,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: C.textSecondary,
    textAlign: TEXT_RIGHT,
    writingDirection: "rtl",
  },
  row: {
    flexDirection: RTL_ROW,
    flexWrap: "wrap",
    gap: S.sm,
  },
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
