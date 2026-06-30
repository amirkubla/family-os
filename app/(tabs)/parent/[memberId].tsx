/**
 * Parent (member) profile — an editable "person page", mirroring the kid page.
 *
 * Reached from the Family page. A stats strip on top, a month calendar + day
 * agenda of the member's events, then their collected items — chores
 * (assignedToMemberId), notes + projects (ownerMemberId), and the expenses they
 * paid (payerMemberId). Notes / projects / chores are fully editable here via
 * the shared modals (locked to this member); events + payments are tap-to-edit
 * (they're created on /calendar and /budget respectively).
 */

import React, { useMemo, useState, useCallback } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import ScreenScrollView from "@src/components/ScreenScrollView";
import { Text, IconButton, Card } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";

import { useFamilyStore } from "@src/store/useFamilyStore";
import {
  useFamilyEventsForDate,
  useFamilyEventRecurringByDay,
  useFamilyEventOneTimeBlocks,
} from "@src/store/familyEventSelectors";
import {
  toggleChoreDoneRemote,
  deleteChoreRemote,
  deleteNoteRemote,
  deleteProjectRemote,
  deleteExpenseRemote,
  deleteFamilyEventRemote,
  updateFamilyEventRemote,
} from "@src/lib/sync/remoteCrud";
import type { Expense } from "@src/models/budget";
import type { Note } from "@src/models/note";
import type { Project } from "@src/models/project";
import type { Chore } from "@src/models/chore";
import type { FamilyEvent, AssigneeType } from "@src/models/familyEvent";

import PageHeader from "@src/components/PageHeader";
import PersonStats from "@src/components/person/PersonStats";
import MonthCalendar from "@src/components/Calendar/MonthCalendar";
import SectionHeader from "@src/components/SectionHeader";
import ConfirmDeleteModal from "@src/components/ConfirmDeleteModal";
import ChoreAddModal from "@src/components/ChoreAddModal";
import NoteModal from "@src/components/NoteModal";
import ProjectModal from "@src/components/ProjectModal";
import FamilyEventModal from "@src/components/FamilyEventModal";
import ExpenseModal from "@src/components/ExpenseModal";
import { useConfirmDelete } from "@src/hooks/useConfirmDelete";

import { t, statusLabel, dayName } from "@src/i18n";
import { formatILS } from "@src/models/budget";
import { minutesToHHMM } from "@src/utils/time";
import { toYMD, dayOfWeekFromYMD } from "@src/utils/date";
import { C, R, S, SHADOW } from "@src/ui/tokens";
import { RTL_ROW, TEXT_RIGHT } from "@src/ui/rtl";
import { STATUS_COLORS } from "@src/ui/semanticColors";

function SectionShell({
  title,
  count,
  accent,
  onAdd,
  children,
}: {
  title: string;
  count: number;
  accent: string;
  onAdd?: () => void;
  children: React.ReactNode;
}) {
  return (
    <>
      <View style={styles.sectionHeaderRow}>
        <View style={{ flex: 1 }}>
          <SectionHeader label={`${title}  (${count})`} />
        </View>
        {onAdd ? (
          <IconButton
            icon="plus-circle"
            size={28}
            iconColor={accent}
            onPress={onAdd}
            accessibilityLabel={title}
          />
        ) : null}
      </View>
      {count === 0 ? (
        <Text style={styles.emptyText}>{t("parent.noneYet")}</Text>
      ) : (
        <Card style={styles.card} mode="elevated">
          <Card.Content style={{ paddingVertical: S.xs }}>{children}</Card.Content>
        </Card>
      )}
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

  // ── Calendar: the member's events ──
  const [selectedDate, setSelectedDate] = useState(toYMD(new Date()));
  const selectedDow = dayOfWeekFromYMD(selectedDate);
  const eventsForDate = useFamilyEventsForDate(selectedDate, selectedDow);
  const dayEvents = useMemo(
    () => eventsForDate.filter((e) => e.assigneeType === "member" && e.assigneeId === memberId),
    [eventsForDate, memberId],
  );
  const recurringByDay = useFamilyEventRecurringByDay();
  const oneTime = useFamilyEventOneTimeBlocks();
  const markedDates = useMemo(() => {
    const marks: Record<string, { dotColor: string }> = {};
    const now = new Date();
    for (let offset = -30; offset <= 30; offset++) {
      const d = new Date(now);
      d.setDate(d.getDate() + offset);
      const dow = d.getDay();
      if ((recurringByDay[dow] ?? []).some((e) => e.assigneeType === "member" && e.assigneeId === memberId)) {
        marks[toYMD(d)] = { dotColor: accent };
      }
    }
    for (const e of oneTime) {
      if (e.date && e.assigneeType === "member" && e.assigneeId === memberId) marks[e.date] = { dotColor: accent };
    }
    return marks;
  }, [recurringByDay, oneTime, memberId, accent]);

  // ── Modals ──
  const { confirmVisible, requestDelete, confirmDelete, dismissConfirm } = useConfirmDelete();
  const [choreModal, setChoreModal] = useState(false);
  const [editChore, setEditChore] = useState<Chore | null>(null);
  const [noteModal, setNoteModal] = useState(false);
  const [editNote, setEditNote] = useState<Note | null>(null);
  const [projectModal, setProjectModal] = useState(false);
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [eventModal, setEventModal] = useState(false);
  const [editEvent, setEditEvent] = useState<FamilyEvent | null>(null);
  const [expenseModal, setExpenseModal] = useState(false);
  const [editExpense, setEditExpense] = useState<Expense | null>(null);

  const handleEventSubmit = useCallback(
    (data: { title: string; assigneeType: AssigneeType; assigneeId?: string; daysOfWeek: number[]; startMinutes: number; endMinutes: number; location?: string; isRecurring: boolean; date?: string; endDate?: string; allDay?: boolean; reminders?: number[] }) => {
      if (editEvent) updateFamilyEventRemote(editEvent.id, data);
    },
    [editEvent],
  );

  if (!member) {
    return (
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <PageHeader title={t("family.parents")} onBack={() => router.replace("/family")} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <PageHeader
        title={`${member.avatarEmoji ?? "👤"}  ${member.name}`}
        onBack={() => router.replace("/family")}
      />
      <ScreenScrollView contentContainerStyle={styles.container}>
        {/* ── Stats strip ── */}
        <PersonStats
          accent={accent}
          stats={[
            { value: `${choresDone}/${chores.length}`, label: t("parent.statChores") },
            { value: String(events.length), label: t("parent.statEvents") },
            { value: String(notes.length), label: t("parent.statNotes") },
            { value: String(projects.length), label: t("parent.statProjects") },
            { value: formatILS(paidTotal), label: t("parent.statPaid") },
          ]}
        />

        {/* ── Calendar + day agenda (member's events) ── */}
        <Card style={styles.card} mode="elevated">
          <Card.Content>
            <MonthCalendar
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              markedDates={markedDates}
              accentColor={accent}
            />
          </Card.Content>
        </Card>
        <SectionHeader label={t("kid.daySchedule", { day: dayName(selectedDow) })} />
        {dayEvents.length === 0 ? (
          <Text style={styles.emptyText}>{t("kid.nothingScheduled", { day: dayName(selectedDow) })}</Text>
        ) : (
          <Card style={styles.card} mode="elevated">
            <Card.Content style={{ paddingVertical: S.xs }}>
              {dayEvents.map((e) => (
                <Pressable
                  key={e.id}
                  style={styles.row}
                  onPress={() => { setEditEvent(e); setEventModal(true); }}
                >
                  <View style={[styles.stripe, { backgroundColor: accent }]} />
                  <Text style={styles.rowTitle} numberOfLines={1}>{e.title}</Text>
                  <Text style={styles.rowMeta} numberOfLines={1}>
                    {e.allDay ? t("eventModal.allDay") : `${minutesToHHMM(e.startMinutes)}–${minutesToHHMM(e.endMinutes)}`}
                  </Text>
                </Pressable>
              ))}
            </Card.Content>
          </Card>
        )}

        {/* ── Chores ── */}
        <SectionShell
          title={t("parent.chores")}
          count={chores.length}
          accent={accent}
          onAdd={() => { setEditChore(null); setChoreModal(true); }}
        >
          {chores.map((c) => (
            <View key={c.id} style={styles.row}>
              <Pressable onPress={() => toggleChoreDoneRemote(c.id)} hitSlop={8}>
                <Text style={[styles.rowCheck, c.done && { color: accent }]}>{c.done ? "✓" : "○"}</Text>
              </Pressable>
              <Pressable style={styles.rowMain} onPress={() => { setEditChore(c); setChoreModal(true); }}>
                <Text style={[styles.rowTitle, c.done && styles.rowTitleDone]} numberOfLines={1}>{c.title}</Text>
              </Pressable>
              <IconButton icon="trash-can-outline" size={16} iconColor={C.textMuted}
                onPress={() => requestDelete(() => deleteChoreRemote(c.id))} />
            </View>
          ))}
        </SectionShell>

        {/* ── Notes ── */}
        <SectionShell
          title={t("parent.notes")}
          count={notes.length}
          accent={accent}
          onAdd={() => { setEditNote(null); setNoteModal(true); }}
        >
          {notes.map((n) => (
            <View key={n.id} style={styles.row}>
              <Pressable style={styles.rowMain} onPress={() => { setEditNote(n); setNoteModal(true); }}>
                <Text style={styles.rowTitle} numberOfLines={1}>{n.title || n.body}</Text>
              </Pressable>
              <IconButton icon="trash-can-outline" size={16} iconColor={C.textMuted}
                onPress={() => requestDelete(() => deleteNoteRemote(n.id))} />
            </View>
          ))}
        </SectionShell>

        {/* ── Projects ── */}
        <SectionShell
          title={t("parent.projects")}
          count={projects.length}
          accent={accent}
          onAdd={() => { setEditProject(null); setProjectModal(true); }}
        >
          {projects.map((p) => (
            <View key={p.id} style={styles.row}>
              <View style={[styles.stripe, { backgroundColor: STATUS_COLORS[p.status] }]} />
              <Pressable style={styles.rowMain} onPress={() => { setEditProject(p); setProjectModal(true); }}>
                <Text style={styles.rowTitle} numberOfLines={1}>{p.title}</Text>
              </Pressable>
              <Text style={styles.rowMeta} numberOfLines={1}>{statusLabel(p.status)}  ·  {p.progress}%</Text>
              <IconButton icon="trash-can-outline" size={16} iconColor={C.textMuted}
                onPress={() => requestDelete(() => deleteProjectRemote(p.id))} />
            </View>
          ))}
        </SectionShell>

        {/* ── Payments (paid by this member) ── */}
        <SectionShell title={t("parent.payments")} count={payments.length} accent={accent}>
          {payments.map((e) => (
            <View key={e.id} style={styles.row}>
              <Pressable style={styles.rowMain} onPress={() => { setEditExpense(e); setExpenseModal(true); }}>
                <Text style={styles.rowTitle} numberOfLines={1}>{e.note || e.categoryName}</Text>
              </Pressable>
              <Text style={styles.rowMeta} numberOfLines={1}>
                {formatILS(e.amount)}  ·  {e.date.slice(8, 10)}/{e.date.slice(5, 7)}
              </Text>
              <IconButton icon="trash-can-outline" size={16} iconColor={C.textMuted}
                onPress={() => requestDelete(() => deleteExpenseRemote(e.id))} />
            </View>
          ))}
        </SectionShell>
      </ScreenScrollView>

      {/* ── Modals ── */}
      <ChoreAddModal
        visible={choreModal}
        onDismiss={() => { setChoreModal(false); setEditChore(null); }}
        editChore={editChore}
        defaultMemberId={editChore ? undefined : memberId}
        lockedMemberName={editChore ? undefined : member.name}
      />
      <NoteModal
        visible={noteModal}
        onDismiss={() => { setNoteModal(false); setEditNote(null); }}
        editNote={editNote}
        defaultOwnerMemberId={editNote ? undefined : memberId}
        lockedMemberName={editNote ? undefined : member.name}
      />
      <ProjectModal
        visible={projectModal}
        onDismiss={() => { setProjectModal(false); setEditProject(null); }}
        editProject={editProject}
        defaultOwnerMemberId={editProject ? undefined : memberId}
        lockedMemberName={editProject ? undefined : member.name}
      />
      <FamilyEventModal
        visible={eventModal}
        onDismiss={() => { setEventModal(false); setEditEvent(null); }}
        editEvent={editEvent}
        defaultDaysOfWeek={[selectedDow]}
        defaultDate={selectedDate}
        onSubmit={handleEventSubmit}
        onDelete={editEvent ? () => requestDelete(() => deleteFamilyEventRemote(editEvent.id)) : undefined}
      />
      <ExpenseModal
        visible={expenseModal}
        onDismiss={() => { setExpenseModal(false); setEditExpense(null); }}
        editExpense={editExpense}
        onSave={() => { /* ExpenseModal commits via remoteCrud */ }}
      />
      <ConfirmDeleteModal visible={confirmVisible} onConfirm={confirmDelete} onDismiss={dismissConfirm} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  container: { padding: S.lg, paddingBottom: S.xxl + S.lg },

  emptyText: {
    fontSize: 13,
    color: C.textMuted,
    textAlign: "center",
    writingDirection: "rtl",
    marginVertical: S.sm,
  },

  sectionHeaderRow: { flexDirection: RTL_ROW, alignItems: "center" },

  card: {
    backgroundColor: C.surface,
    borderRadius: R.lg,
    marginBottom: S.sm,
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
  rowMain: { flex: 1 },
  stripe: { width: 4, height: 28, borderRadius: 2 },
  rowCheck: { fontSize: 18, color: C.textMuted, width: 22, textAlign: "center" },
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
