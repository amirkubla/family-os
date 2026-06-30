/**
 * FamilyStats — a per-person roll-up of all family stats, shown on the home
 * dashboard below the launcher grid. One card per active family member and
 * kid: an avatar + name header and a compact strip of their totals (chores,
 * events, notes, projects, amount paid). Tapping a card opens that person's
 * page. The figures match each person page exactly (members count all expenses
 * they paid; kids count only settled ones — same as the detail pages).
 */

import React, { useMemo } from "react";
import { View, StyleSheet, Pressable, Platform } from "react-native";
import { Text } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { useFamilyStore } from "@src/store/useFamilyStore";
import { t } from "@src/i18n";
import { formatILS } from "@src/models/budget";
import { C, R, S, SHADOW } from "@src/ui/tokens";
import { RTL_ROW, TEXT_RIGHT } from "@src/ui/rtl";

interface StatCell {
  value: string;
  label: string;
}
interface PersonRow {
  id: string;
  name: string;
  emoji: string;
  color: string;
  onPress: () => void;
  stats: StatCell[];
}

export default function FamilyStats() {
  const router = useRouter();
  const members = useFamilyStore((s) => s.familyMembers);
  const kids = useFamilyStore((s) => s.kids);
  const chores = useFamilyStore((s) => s.chores);
  const events = useFamilyStore((s) => s.familyEvents);
  const notes = useFamilyStore((s) => s.notes);
  const projects = useFamilyStore((s) => s.projects);
  const expenses = useFamilyStore((s) => s.expenses);

  const rows = useMemo<PersonRow[]>(() => {
    const cells = (done: number, total: number, ev: number, nt: number, pr: number, paid: number): StatCell[] => [
      { value: `${done}/${total}`, label: t("parent.statChores") },
      { value: String(ev), label: t("parent.statEvents") },
      { value: String(nt), label: t("parent.statNotes") },
      { value: String(pr), label: t("parent.statProjects") },
      { value: formatILS(paid), label: t("parent.statPaid") },
    ];

    const memberRows: PersonRow[] = members
      .filter((m) => m.isActive)
      .map((m) => {
        const mc = chores.filter((c) => c.assignedToMemberId === m.id);
        const ev = events.filter((e) => e.assigneeType === "member" && e.assigneeId === m.id).length;
        const nt = notes.filter((n) => n.ownerMemberId === m.id).length;
        const pr = projects.filter((p) => p.ownerMemberId === m.id).length;
        const paid = expenses.filter((e) => e.payerMemberId === m.id).reduce((sum, e) => sum + e.amount, 0);
        return {
          id: m.id,
          name: m.name,
          emoji: m.avatarEmoji ?? "👤",
          color: m.color ?? C.purple,
          onPress: () => router.push(`/parent/${m.id}` as any),
          stats: cells(mc.filter((c) => c.done).length, mc.length, ev, nt, pr, paid),
        };
      });

    const kidRows: PersonRow[] = kids
      .filter((k) => k.isActive)
      .map((k) => {
        const kc = chores.filter((c) => c.kidId === k.id);
        const ev = events.filter((e) => e.assigneeType === "kid" && e.assigneeId === k.id).length;
        const nt = notes.filter((n) => n.kidId === k.id).length;
        const pr = projects.filter((p) => p.kidId === k.id).length;
        const paid = expenses
          .filter((e) => e.kidId === k.id && e.paid === true)
          .reduce((sum, e) => sum + e.amount, 0);
        return {
          id: k.id,
          name: k.name,
          emoji: k.emoji,
          color: k.color,
          onPress: () => router.push(`/kid/${k.id}` as any),
          stats: cells(kc.filter((c) => c.done).length, kc.length, ev, nt, pr, paid),
        };
      });

    return [...memberRows, ...kidRows];
  }, [members, kids, chores, events, notes, projects, expenses, router]);

  if (rows.length === 0) return null;

  return (
    <View>
      <Text style={styles.sectionLabel}>{t("home.familyStats")}</Text>
      <View style={styles.list}>
        {rows.map((p) => (
          <Pressable
            key={p.id}
            onPress={p.onPress}
            testID={`family-stat-${p.id}`}
            accessibilityRole="button"
            accessibilityLabel={p.name}
            style={({ pressed, hovered }: any) => [
              styles.card,
              hovered && styles.cardHover,
              pressed && styles.cardPressed,
            ]}
          >
            <View style={styles.headerRow}>
              <View style={[styles.avatar, { backgroundColor: p.color + "22" }]}>
                <Text style={styles.avatarEmoji}>{p.emoji}</Text>
              </View>
              <Text style={styles.name} numberOfLines={1}>{p.name}</Text>
              <Ionicons name="chevron-back" size={18} color={C.textMuted} />
            </View>

            <View style={styles.statRow}>
              {p.stats.map((s, i) => (
                <View key={i} style={[styles.cell, i > 0 && styles.cellDivider]}>
                  <Text style={[styles.cellValue, { color: p.color }]} numberOfLines={1}>
                    {s.value}
                  </Text>
                  <Text style={styles.cellLabel} numberOfLines={1}>
                    {s.label}
                  </Text>
                </View>
              ))}
            </View>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: C.textMuted,
    letterSpacing: 0.6,
    textAlign: TEXT_RIGHT,
    writingDirection: "rtl",
    marginBottom: S.sm,
  },
  list: { gap: S.sm },
  card: {
    backgroundColor: C.surface,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.border,
    padding: S.md,
    ...SHADOW.sm,
    ...(Platform.OS === "web" ? { cursor: "pointer" as any, transition: "all 0.2s ease" } : {}),
  },
  cardHover: { transform: [{ translateY: -2 }], ...SHADOW.md },
  cardPressed: { transform: [{ scale: 0.98 }] },
  headerRow: {
    flexDirection: RTL_ROW,
    alignItems: "center",
    gap: S.sm,
    marginBottom: S.sm,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarEmoji: { fontSize: 17 },
  name: {
    flex: 1,
    fontSize: 15,
    fontWeight: "800",
    color: C.textPrimary,
    textAlign: TEXT_RIGHT,
    writingDirection: "rtl",
  },
  statRow: { flexDirection: RTL_ROW, alignItems: "stretch" },
  cell: {
    flex: 1,
    alignItems: "center",
    paddingVertical: S.xs,
    paddingHorizontal: 2,
  },
  cellDivider: {
    borderStartWidth: StyleSheet.hairlineWidth,
    borderStartColor: C.border,
  },
  cellValue: { fontSize: 15, fontWeight: "800" },
  cellLabel: { fontSize: 10, color: C.textSecondary, marginTop: 2, writingDirection: "rtl" },
});
