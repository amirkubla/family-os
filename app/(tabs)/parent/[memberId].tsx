/**
 * Parent profile — a member's collected items across the app + stats.
 *
 * Reached from the Family page. Read-only overview: a stats strip on top
 * (chores done/total, events, notes, projects, amount paid) followed by the
 * member's assigned items — chores (assignedToMemberId), family events
 * (assigneeType "member"), notes + projects (ownerMemberId), and the expenses
 * they paid (payerMemberId). Mirrors the kid page, member-scoped.
 */

import React, { useMemo } from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";

import { useFamilyStore } from "@src/store/useFamilyStore";
import PageHeader from "@src/components/PageHeader";
import { t, statusLabel } from "@src/i18n";
import { formatILS } from "@src/models/budget";
import { minutesToHHMM } from "@src/utils/time";
import { C, R, S, SHADOW } from "@src/ui/tokens";
import { RTL_ROW, TEXT_RIGHT } from "@src/ui/rtl";

function StatCard({ value, label, accent }: { value: string; label: string; accent: string }) {
  return (
    <View style={[styles.statCard, { borderColor: accent + "33" }]}>
      <Text style={[styles.statValue, { color: accent }]} numberOfLines={1}>{value}</Text>
      <Text style={styles.statLabel} numberOfLines={1}>{label}</Text>
    </View>
  );
}

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  if (count === 0) return null;
  return (
    <>
      <Text style={styles.sectionLabel}>{title}  ({count})</Text>
      <View style={styles.card}>{children}</View>
    </>
  );
}

export default function ParentScreen() {
  const router = useRouter();
  const { memberId } = useLocalSearchParams<{ memberId: string }>();

  const members = useFamilyStore((s) => s.familyMembers);
  const member = members.find((m) => m.id === memberId);
  const accent = member?.color ?? C.purple;

  const allChores = useFamilyStore((s) => s.chores);
  const allEvents = useFamilyStore((s) => s.familyEvents);
  const allNotes = useFamilyStore((s) => s.notes);
  const allProjects = useFamilyStore((s) => s.projects);
  const allExpenses = useFamilyStore((s) => s.expenses);

  const chores = useMemo(
    () => allChores.filter((c) => c.assignedToMemberId === memberId),
    [allChores, memberId],
  );
  const events = useMemo(
    () => allEvents.filter((e) => e.assigneeType === "member" && e.assigneeId === memberId),
    [allEvents, memberId],
  );
  const notes = useMemo(() => allNotes.filter((n) => n.ownerMemberId === memberId), [allNotes, memberId]);
  const projects = useMemo(
    () => allProjects.filter((p) => p.ownerMemberId === memberId),
    [allProjects, memberId],
  );
  const payments = useMemo(
    () =>
      allExpenses
        .filter((e) => e.payerMemberId === memberId)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [allExpenses, memberId],
  );

  const choresDone = chores.filter((c) => c.done).length;
  const paidTotal = payments.reduce((sum, e) => sum + e.amount, 0);
  const totalItems = chores.length + events.length + notes.length + projects.length + payments.length;

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <PageHeader
        title={`${member?.avatarEmoji ?? "👤"}  ${member?.name ?? ""}`}
        onBack={() => router.replace("/family")}
      />
      <ScrollView contentContainerStyle={styles.container}>
        {/* ── Stats strip ── */}
        <View style={styles.statsRow}>
          <StatCard value={`${choresDone}/${chores.length}`} label={t("parent.statChores")} accent={accent} />
          <StatCard value={String(events.length)} label={t("parent.statEvents")} accent={accent} />
          <StatCard value={String(notes.length)} label={t("parent.statNotes")} accent={accent} />
          <StatCard value={String(projects.length)} label={t("parent.statProjects")} accent={accent} />
          <StatCard value={formatILS(paidTotal)} label={t("parent.statPaid")} accent={accent} />
        </View>

        {totalItems === 0 && (
          <Text style={styles.empty}>{t("parent.noItems", { name: member?.name ?? "" })}</Text>
        )}

        {/* ── Chores ── */}
        <Section title={t("parent.chores")} count={chores.length}>
          {chores.map((c) => (
            <View key={c.id} style={styles.row}>
              <Text style={[styles.rowCheck, c.done && { color: accent }]}>{c.done ? "✓" : "○"}</Text>
              <Text style={[styles.rowTitle, c.done && styles.rowTitleDone]} numberOfLines={1}>{c.title}</Text>
            </View>
          ))}
        </Section>

        {/* ── Events ── */}
        <Section title={t("parent.events")} count={events.length}>
          {events.map((e) => (
            <View key={e.id} style={styles.row}>
              <Text style={styles.rowTitle} numberOfLines={1}>{e.title}</Text>
              <Text style={styles.rowMeta} numberOfLines={1}>
                {e.allDay ? t("eventModal.allDay") : `${minutesToHHMM(e.startMinutes)}–${minutesToHHMM(e.endMinutes)}`}
                {"  ·  "}
                {e.isRecurring ? t("parent.recurring") : t("parent.oneTime")}
              </Text>
            </View>
          ))}
        </Section>

        {/* ── Notes ── */}
        <Section title={t("parent.notes")} count={notes.length}>
          {notes.map((n) => (
            <View key={n.id} style={styles.row}>
              <Text style={styles.rowTitle} numberOfLines={1}>{n.title || n.body}</Text>
            </View>
          ))}
        </Section>

        {/* ── Projects ── */}
        <Section title={t("parent.projects")} count={projects.length}>
          {projects.map((p) => (
            <View key={p.id} style={styles.row}>
              <Text style={styles.rowTitle} numberOfLines={1}>{p.title}</Text>
              <Text style={styles.rowMeta} numberOfLines={1}>
                {statusLabel(p.status)}  ·  {p.progress}%
              </Text>
            </View>
          ))}
        </Section>

        {/* ── Payments ── */}
        <Section title={t("parent.payments")} count={payments.length}>
          {payments.map((e) => (
            <View key={e.id} style={styles.row}>
              <Text style={styles.rowTitle} numberOfLines={1}>{e.note || e.categoryName}</Text>
              <Text style={styles.rowMeta} numberOfLines={1}>
                {formatILS(e.amount)}  ·  {e.date.slice(8, 10)}/{e.date.slice(5, 7)}
              </Text>
            </View>
          ))}
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  container: { padding: S.lg, paddingBottom: S.xxl + S.lg },

  statsRow: { flexDirection: RTL_ROW, flexWrap: "wrap", gap: S.sm, marginBottom: S.md },
  statCard: {
    flexGrow: 1,
    minWidth: 88,
    alignItems: "center",
    paddingVertical: S.md,
    paddingHorizontal: S.sm,
    borderRadius: R.lg,
    backgroundColor: C.surface,
    borderWidth: 1,
    ...SHADOW.sm,
  },
  statValue: { fontSize: 20, fontWeight: "800" },
  statLabel: { fontSize: 11, color: C.textSecondary, marginTop: 2, writingDirection: "rtl" },

  empty: {
    fontSize: 14,
    color: C.textMuted,
    textAlign: "center",
    writingDirection: "rtl",
    marginTop: S.xl,
  },

  sectionLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: C.textPrimary,
    textAlign: TEXT_RIGHT,
    writingDirection: "rtl",
    marginTop: S.lg,
    marginBottom: S.sm,
  },
  card: {
    backgroundColor: C.surface,
    borderRadius: R.lg,
    paddingHorizontal: S.md,
    paddingVertical: S.xs,
    ...SHADOW.sm,
  },
  row: {
    flexDirection: RTL_ROW,
    alignItems: "center",
    gap: S.sm,
    paddingVertical: S.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
  },
  rowCheck: { fontSize: 16, color: C.textMuted, width: 18, textAlign: "center" },
  rowTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: C.textPrimary,
    textAlign: TEXT_RIGHT,
    writingDirection: "rtl",
  },
  rowTitleDone: { color: C.textMuted, textDecorationLine: "line-through" },
  rowMeta: { fontSize: 12, color: C.textSecondary, writingDirection: "rtl" },
});
