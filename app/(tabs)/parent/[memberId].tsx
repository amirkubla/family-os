/**
 * Parent (member) profile — an editable "person page", mirroring the kid page.
 *
 * A stats strip on top, a month calendar + day agenda of the member's events,
 * then their collected items in the same card language as the kid page —
 * chores (assignedToMemberId), notes + projects (ownerMemberId), and the
 * expenses they paid (payerMemberId). Notes / projects / chores are fully
 * editable here via the shared modals (locked to this member); events +
 * payments are tap-to-edit (created on /calendar and /budget respectively).
 */

import React, { useMemo, useState, useCallback } from "react";
import { View, StyleSheet, Pressable, Platform } from "react-native";
import ScreenScrollView from "@src/components/ScreenScrollView";
import { Text, IconButton, Card } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";

import { useFamilyStore } from "@src/store/useFamilyStore";
import { useBlurRemountKey } from "@src/hooks/useBlurRemountKey";
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
import type { FamilyMember } from "@src/models/familyMember";
import type { FamilyEvent, AssigneeType } from "@src/models/familyEvent";

import PersonStats from "@src/components/person/PersonStats";
import MonthCalendar from "@src/components/Calendar/MonthCalendar";
import SectionHeader from "@src/components/SectionHeader";
import ProjectCard from "@src/components/ProjectCard";
import ConfirmDeleteModal from "@src/components/ConfirmDeleteModal";
import ChoreAddModal from "@src/components/ChoreAddModal";
import NoteModal from "@src/components/NoteModal";
import ProjectModal from "@src/components/ProjectModal";
import FamilyEventModal from "@src/components/FamilyEventModal";
import ExpenseModal from "@src/components/ExpenseModal";
import { useConfirmDelete } from "@src/hooks/useConfirmDelete";

import { t, dayName } from "@src/i18n";
import { formatILS } from "@src/models/budget";
import { minutesToHHMM } from "@src/utils/time";
import { toYMD, dayOfWeekFromYMD } from "@src/utils/date";
import { C, R, S, SHADOW } from "@src/ui/tokens";
import { RTL_ROW, TEXT_RIGHT } from "@src/ui/rtl";

// Notes card palette — identical to /home, /notes and the kid page.
const NOTE_COLORS = {
  accent: "#D97706",
  bg: "#FFFBF0",
  border: "#F5E6C8",
  barDefault: "#E8D5B0",
  hover: "#FFF3D6",
} as const;

/** A collapsible section: header (label + collapse chevron) + trailing add "+". */
function Section({
  label,
  accent,
  onAdd,
  expanded,
  onToggle,
  children,
}: {
  label: string;
  accent: string;
  onAdd?: () => void;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <>
      <View style={styles.sectionHeaderRow}>
        <View style={styles.sectionHeaderLabel}>
          <SectionHeader label={label} collapsible expanded={expanded} onToggle={onToggle} />
        </View>
        {onAdd ? (
          <IconButton icon="plus-circle" size={28} iconColor={accent} onPress={onAdd} accessibilityLabel={label} />
        ) : null}
      </View>
      {expanded && children}
    </>
  );
}

export default function ParentScreenRoute() {
  return <ParentScreen key={useBlurRemountKey()} />;
}

function ParentScreen() {
  const { memberId } = useLocalSearchParams<{ memberId: string }>();

  const members = useFamilyStore((s) => s.familyMembers);
  const member = members.find((m) => m.id === memberId);
  const accent = member?.color ?? C.purple;
  const memberById = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);

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

  // ── Section collapse state ──
  const [choresExpanded, setChoresExpanded] = useState(true);
  const [notesExpanded, setNotesExpanded] = useState(true);
  const [projectsExpanded, setProjectsExpanded] = useState(true);
  const [paymentsExpanded, setPaymentsExpanded] = useState(true);

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
    return <SafeAreaView style={styles.safe} edges={["top", "bottom"]} />;
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <ScreenScrollView contentContainerStyle={styles.container}>
        {/* Member identity — name + avatar as a plain heading (nav is via the
            floating drawer, so there's no back-button header). */}
        <Text style={styles.personTitle}>
          {`${member.avatarEmoji ?? "👤"}  ${member.name}`}
        </Text>
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
        <Section
          label={t("parent.chores")}
          accent={accent}
          expanded={choresExpanded}
          onToggle={() => setChoresExpanded((v) => !v)}
          onAdd={() => { setEditChore(null); setChoreModal(true); }}
        >
          {chores.length === 0 ? (
            <Text style={styles.emptyText}>{t("parent.noneYet")}</Text>
          ) : (
            <View style={styles.itemList}>
              {chores.map((c) => (
                <View key={c.id} style={styles.itemCard}>
                  <Pressable onPress={() => toggleChoreDoneRemote(c.id)} hitSlop={8}>
                    <Text style={[styles.choreCheck, c.done && { color: accent }]}>{c.done ? "✓" : "○"}</Text>
                  </Pressable>
                  <Pressable style={{ flex: 1 }} onPress={() => { setEditChore(c); setChoreModal(true); }}>
                    <Text style={[styles.itemTitle, c.done && styles.choreTitleDone]} numberOfLines={1}>{c.title}</Text>
                  </Pressable>
                  <IconButton icon="trash-can-outline" size={16} iconColor={C.textMuted} style={styles.itemTrash}
                    onPress={() => requestDelete(() => deleteChoreRemote(c.id))} />
                </View>
              ))}
            </View>
          )}
        </Section>

        {/* ── Notes (kid-page note grid) ── */}
        <Section
          label={t("parent.notes")}
          accent={accent}
          expanded={notesExpanded}
          onToggle={() => setNotesExpanded((v) => !v)}
          onAdd={() => { setEditNote(null); setNoteModal(true); }}
        >
          {notes.length === 0 ? (
            <Text style={styles.emptyText}>{t("parent.noneYet")}</Text>
          ) : (
            <View style={styles.notesGrid}>
              {notes.map((n) => (
                <Pressable
                  key={n.id}
                  style={({ pressed, hovered }: any) => [
                    styles.noteCard,
                    hovered && styles.noteCardHover,
                    pressed && styles.noteCardPressed,
                  ]}
                  onPress={() => { setEditNote(n); setNoteModal(true); }}
                >
                  <View style={styles.noteTopRow}>
                    <View style={styles.noteIcon}>
                      <Text style={{ fontSize: 18 }}>📝</Text>
                    </View>
                    <View style={{ flex: 1 }} />
                    <IconButton icon="trash-can-outline" size={16} iconColor={C.textMuted} style={styles.noteActionBtn}
                      onPress={() => requestDelete(() => deleteNoteRemote(n.id))} />
                  </View>
                  <Text style={styles.noteTitle} numberOfLines={1}>{n.title || t("home.note")}</Text>
                  {n.body ? <Text style={styles.noteBody} numberOfLines={3}>{n.body}</Text> : null}
                  <View style={styles.noteAccentBar} />
                </Pressable>
              ))}
            </View>
          )}
        </Section>

        {/* ── Projects (shared ProjectCard — same as dashboard + kid page) ── */}
        <Section
          label={t("parent.projects")}
          accent={accent}
          expanded={projectsExpanded}
          onToggle={() => setProjectsExpanded((v) => !v)}
          onAdd={() => { setEditProject(null); setProjectModal(true); }}
        >
          {projects.length === 0 ? (
            <Text style={styles.emptyText}>{t("parent.noneYet")}</Text>
          ) : (
            <View style={styles.itemList}>
              {projects.map((p, index) => (
                <ProjectCard
                  key={p.id}
                  proj={p}
                  index={index}
                  members={(p.memberIds ?? []).map((id) => memberById.get(id)).filter(Boolean) as FamilyMember[]}
                  onPress={() => { setEditProject(p); setProjectModal(true); }}
                  onDelete={() => requestDelete(() => deleteProjectRemote(p.id))}
                />
              ))}
            </View>
          )}
        </Section>

        {/* ── Payments (paid by this member) ── */}
        <Section
          label={t("parent.payments")}
          accent={accent}
          expanded={paymentsExpanded}
          onToggle={() => setPaymentsExpanded((v) => !v)}
        >
          {payments.length === 0 ? (
            <Text style={styles.emptyText}>{t("parent.noneYet")}</Text>
          ) : (
            <View style={styles.itemList}>
              {payments.map((e) => (
                <View key={e.id} style={styles.itemCard}>
                  <Pressable style={{ flex: 1 }} onPress={() => { setEditExpense(e); setExpenseModal(true); }}>
                    <Text style={styles.itemTitle} numberOfLines={1}>{e.note || e.categoryName}</Text>
                  </Pressable>
                  <Text style={styles.paymentAmount} numberOfLines={1}>{formatILS(e.amount)}</Text>
                  <Text style={styles.paymentMeta} numberOfLines={1}>{e.date.slice(8, 10)}/{e.date.slice(5, 7)}</Text>
                  <IconButton icon="trash-can-outline" size={16} iconColor={C.textMuted} style={styles.itemTrash}
                    onPress={() => requestDelete(() => deleteExpenseRemote(e.id))} />
                </View>
              ))}
            </View>
          )}
        </Section>
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

  personTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: C.textPrimary,
    textAlign: TEXT_RIGHT,
    writingDirection: "rtl",
    marginBottom: S.md,
  },

  emptyText: {
    fontSize: 13,
    color: C.textMuted,
    textAlign: "center",
    writingDirection: "rtl",
    marginVertical: S.sm,
  },

  sectionHeaderRow: { flexDirection: RTL_ROW, alignItems: "center", justifyContent: "space-between" },
  sectionHeaderLabel: { flex: 1 },

  // Calendar + day-agenda card.
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
  stripe: { width: 4, height: 28, borderRadius: 2 },
  rowTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: C.textPrimary,
    textAlign: TEXT_RIGHT,
    writingDirection: "rtl",
  },
  rowMeta: { fontSize: 12, color: C.textSecondary, writingDirection: "rtl" },

  // ── Generic item cards (chores + payments) ──
  itemList: { gap: S.sm, marginBottom: S.lg },
  itemCard: {
    flexDirection: RTL_ROW,
    alignItems: "center",
    gap: S.sm,
    backgroundColor: C.surface,
    borderRadius: R.md,
    paddingVertical: S.sm,
    paddingHorizontal: S.md,
    ...SHADOW.sm,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: C.textPrimary,
    textAlign: TEXT_RIGHT,
    writingDirection: "rtl",
  },
  itemTrash: { margin: 0, width: 28, height: 28 },
  choreCheck: { fontSize: 20, color: C.textMuted, width: 24, textAlign: "center" },
  choreTitleDone: { color: C.textMuted, textDecorationLine: "line-through" },
  paymentAmount: { fontSize: 15, fontWeight: "700", color: C.textPrimary },
  paymentMeta: { fontSize: 12, color: C.textSecondary, writingDirection: "rtl" },

  // ── Notes grid (identical to /home + kid page) ──
  notesGrid: { flexDirection: RTL_ROW, flexWrap: "wrap", gap: S.md, marginBottom: S.lg },
  noteCard: {
    backgroundColor: NOTE_COLORS.bg,
    borderWidth: 1,
    borderColor: NOTE_COLORS.border,
    borderRadius: R.lg,
    padding: S.lg,
    minWidth: 160,
    flex: 1,
    maxWidth: "100%" as any,
    ...SHADOW.sm,
    ...(Platform.OS === "web" ? ({ cursor: "pointer", transition: "all 0.2s ease" } as any) : {}),
    overflow: "hidden",
  },
  noteCardHover: {
    backgroundColor: NOTE_COLORS.hover,
    borderColor: "#EAD49B",
    transform: [{ translateY: -2 }],
    ...SHADOW.md,
  },
  noteCardPressed: { transform: [{ scale: 0.97 }] },
  noteTopRow: { flexDirection: RTL_ROW, alignItems: "center", marginBottom: S.sm },
  noteIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: NOTE_COLORS.accent + "14",
    alignItems: "center",
    justifyContent: "center",
  },
  noteActionBtn: { margin: 0, width: 28, height: 28 },
  noteTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: C.textPrimary,
    textAlign: TEXT_RIGHT,
    writingDirection: "rtl",
    marginBottom: 4,
  },
  noteBody: {
    fontSize: 13,
    color: C.textSecondary,
    textAlign: TEXT_RIGHT,
    writingDirection: "rtl",
    lineHeight: 19,
  },
  noteAccentBar: { height: 3, borderRadius: 2, backgroundColor: NOTE_COLORS.barDefault, marginTop: S.md },
});
