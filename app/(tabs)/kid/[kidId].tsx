/**
 * Kid Schedule screen — Calendar + Template views.
 *
 * Route: /kid/:kidId
 */

import React, { useState, useMemo, useLayoutEffect, useCallback } from "react";
import { View, StyleSheet, ScrollView, Pressable, Platform } from "react-native";
import {
  Text,
  Card,
  IconButton,
  Chip,
  FAB,
} from "react-native-paper";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import SegmentedPills from "@src/components/SegmentedPills";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useNavigation } from "@react-navigation/native";

import { useFamilyStore } from "@src/store/useFamilyStore";
import {
  useKidBlocks,
  useKidBlocksForDate,
  useKidOneTimeBlocks,
} from "@src/store/scheduleSelectors";
import {
  useFamilyEventsForDate,
  useFamilyEventOneTimeBlocks,
  useFamilyEventRecurringByDay,
} from "@src/store/familyEventSelectors";
import {
  addScheduleBlockRemote,
  updateScheduleBlockRemote,
  deleteScheduleBlockRemote,
  updateFamilyEventRemote,
  deleteFamilyEventRemote,
  deleteNoteRemote,
  deleteProjectRemote,
  reorderNotesRemote,
  reorderProjectsRemote,
  deleteExpenseRemote,
  markKidPaymentPaidRemote,
  markKidPaymentUnpaidRemote,
} from "@src/lib/sync/remoteCrud";
import type { ScheduleBlock, BlockType } from "@src/models/schedule";
import type { FamilyEvent, AssigneeType } from "@src/models/familyEvent";
import type { Note } from "@src/models/note";
import type { Project } from "@src/models/project";
import type { Expense } from "@src/models/budget";
import { formatILS } from "@src/models/budget";
import { minutesToHHMM } from "@src/utils/time";
import { toYMD, dayOfWeekFromYMD } from "@src/utils/date";
import { t, dayName, blockTypeLabel, statusLabel } from "@src/i18n";
import { RTL_ROW, TEXT_RIGHT } from "@src/ui/rtl";
import { C, R, S, SHADOW } from "@src/ui/tokens";
import { TYPE_COLORS, STATUS_COLORS } from "@src/ui/semanticColors";

import MonthCalendar from "@src/components/Calendar/MonthCalendar";
import WeekCalendar from "@src/components/Calendar/WeekCalendar";
import DayCalendar from "@src/components/Calendar/DayCalendar";
import ScheduleBlockModal from "@src/components/ScheduleBlockModal";
import FamilyEventModal from "@src/components/FamilyEventModal";
import NoteModal from "@src/components/NoteModal";
import ProjectModal from "@src/components/ProjectModal";
import KidPaymentModal from "@src/components/KidPaymentModal";
import type { ModalCarousel } from "@src/components/ModalWrapper";
import SectionHeader from "@src/components/SectionHeader";
import ConfirmDeleteModal from "@src/components/ConfirmDeleteModal";
import { useConfirmDelete } from "@src/hooks/useConfirmDelete";

type CalendarView = "month" | "week" | "day";

// The kid-view FAB opens an "add" carousel that cycles through these in order.
type AddType = "event" | "note" | "project" | "payment";
const ADD_ORDER: AddType[] = ["event", "note", "project", "payment"];

// Same palette as /home so kid-owned notes/projects look identical.
const NOTE_COLORS = {
  accent: "#D97706",
  bg: "#FFFBF0",
  border: "#F5E6C8",
  barDefault: "#E8D5B0",
  hover: "#FFF3D6",
} as const;

const PROJECT_COLORS = {
  accent: "#6C63FF",
  bg: "#F8F7FF",
  border: "#E8E5FF",
  hover: "#EEEAFF",
} as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function BlockRow({
  block,
  kidColor,
  onEdit,
  onDelete,
}: {
  block: ScheduleBlock;
  kidColor: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const color = block.color ?? kidColor;
  const typeColor = TYPE_COLORS[block.type] ?? C.purple;
  return (
    <Pressable
      style={({ hovered }: any) => [
        styles.blockRow,
        hovered && styles.blockRowHover,
      ]}
      onPress={onEdit}
    >
      <View style={[styles.blockStripe, { backgroundColor: color }]} />
      <View style={styles.blockInfo}>
        <View style={styles.blockTitleRow}>
          <Text variant="bodyMedium" style={styles.blockTitle}>
            {block.title}
          </Text>
          {!block.isRecurring && (
            <Text style={styles.oneTimeBadge}>{t("kid.oneTimeEvent")}</Text>
          )}
        </View>
        <Text variant="bodySmall" style={styles.blockTime}>
          {minutesToHHMM(block.startMinutes)} – {minutesToHHMM(block.endMinutes)}
          {block.location ? `  ·  ${block.location}` : ""}
        </Text>
      </View>
      <Chip
        compact
        textStyle={{ fontSize: 10, color: typeColor }}
        style={[
          styles.typeChip,
          { backgroundColor: typeColor + "22" },
        ]}
      >
        {blockTypeLabel(block.type)}
      </Chip>
      <IconButton icon="trash-can-outline" size={18} onPress={onDelete} />
    </Pressable>
  );
}

function KidEventRow({
  event,
  onEdit,
  onDelete,
}: {
  event: FamilyEvent;
  onEdit: () => void;
  onDelete: () => void;
}) {
  // Kid-assigned family event. We're already scoped to one kid, so no
  // assignee badge — just a small "event" tag to distinguish it from a
  // schedule block (which carries a type chip instead).
  const color = event.color ?? C.purple;
  return (
    <Pressable
      style={({ hovered }: any) => [
        styles.blockRow,
        hovered && styles.blockRowHover,
      ]}
      onPress={onEdit}
    >
      <View style={[styles.blockStripe, { backgroundColor: color }]} />
      <View style={styles.blockInfo}>
        <View style={styles.blockTitleRow}>
          <Text variant="bodyMedium" style={styles.blockTitle}>
            {event.title}
          </Text>
          {!event.isRecurring && (
            <Text style={styles.oneTimeBadge}>{t("kid.oneTimeEvent")}</Text>
          )}
        </View>
        <Text variant="bodySmall" style={styles.blockTime}>
          {minutesToHHMM(event.startMinutes)} – {minutesToHHMM(event.endMinutes)}
          {event.location ? `  ·  ${event.location}` : ""}
        </Text>
      </View>
      <Chip
        compact
        textStyle={{ fontSize: 10, color: C.purple }}
        style={[styles.typeChip, { backgroundColor: C.purple + "22" }]}
      >
        {t("kid.familyEventTag")}
      </Chip>
      <IconButton icon="trash-can-outline" size={18} onPress={onDelete} />
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function KidScheduleScreen() {
  const insets = useSafeAreaInsets();
  const { kidId } = useLocalSearchParams<{ kidId: string }>();
  const storeKids = useFamilyStore((s) => s.kids);

  const navigation = useNavigation();
  const router = useRouter();
  const kid = storeKids.find((k) => k.id === kidId);
  const kidColor = kid?.color ?? C.purple;

  // Cyclic prev/next over the family's ACTIVE kids, in the store's natural
  // order. Wraps at the ends. If only one (or zero) active kid exists, both
  // ids are null and the arrows hide.
  const activeKids = useMemo(
    () => storeKids.filter((k) => k.isActive),
    [storeKids],
  );
  const { prevKidId, nextKidId } = useMemo(() => {
    if (activeKids.length <= 1) return { prevKidId: null, nextKidId: null };
    const idx = activeKids.findIndex((k) => k.id === kidId);
    if (idx === -1) return { prevKidId: null, nextKidId: null };
    const len = activeKids.length;
    return {
      prevKidId: activeKids[(idx - 1 + len) % len]!.id,
      nextKidId: activeKids[(idx + 1) % len]!.id,
    };
  }, [activeKids, kidId]);

  // replace (not push) so repeated kid swaps don't grow the back stack —
  // back from /kid/A → /kid/B → /kid/C should still pop to wherever the
  // user came from (today/calendar), not walk back through each kid.
  const goToKid = useCallback(
    (id: string) => router.replace(`/kid/${id}` as any),
    [router],
  );

  // Set header options \u2014 title + prev/next kid arrows in the nav bar.
  // headerRight — single arrow cycles to the next kid (wraps around).
  // Hidden when there's only one active kid.
  useLayoutEffect(() => {
    navigation.setOptions({
      title: kid ? `${kid.emoji}  ${kid.name}` : t("kid.schedule"),
      headerTintColor: kidColor,
      headerBackTitle: t("tabs.today"),
      headerRight: () =>
        nextKidId ? (
          <IconButton
            icon="chevron-left"
            size={32}
            iconColor={kidColor}
            onPress={() => goToKid(nextKidId)}
            accessibilityLabel={t("kid.nextKid")}
          />
        ) : null,
    });
  }, [navigation, kid?.name, kid?.emoji, kidColor, nextKidId, goToKid]);

  // Tab + calendar sub-view (month/week/day, mirroring the main /calendar)
  const [tab, setTab] = useState("calendar");
  const [calendarView, setCalendarView] = useState<CalendarView>("month");

  // Calendar state
  const [selectedDate, setSelectedDate] = useState(toYMD(new Date()));
  const selectedDow = dayOfWeekFromYMD(selectedDate);

  // ── This kid's items for the selected date: schedule blocks + any family
  //    events assigned to this kid. ──
  const dayBlocks = useKidBlocksForDate(kidId!, selectedDate, selectedDow);
  const familyEventsForDate = useFamilyEventsForDate(selectedDate, selectedDow);
  const dayEvents = useMemo(
    () =>
      familyEventsForDate.filter(
        (e) => e.assigneeType === "kid" && e.assigneeId === kidId,
      ),
    [familyEventsForDate, kidId],
  );

  // Template — all recurring blocks grouped by day
  const allBlocks = useKidBlocks(kidId!);
  const blocksByDay = useMemo(() => {
    const map: Record<number, ScheduleBlock[]> = {};
    for (let d = 0; d < 7; d++) map[d] = [];
    for (const b of allBlocks) {
      for (const dow of b.daysOfWeek) {
        map[dow]?.push(b);
      }
    }
    return map;
  }, [allBlocks]);

  // For calendar dots + grid-press lookup: one-time blocks, plus this kid's
  // recurring + one-time family events.
  const oneTimeBlocks = useKidOneTimeBlocks(kidId!);
  const familyRecurringByDay = useFamilyEventRecurringByDay();
  const familyOneTime = useFamilyEventOneTimeBlocks();
  const kidRecurringEventsByDay = useMemo(() => {
    const map: Record<number, FamilyEvent[]> = {};
    for (let d = 0; d < 7; d++) {
      map[d] = (familyRecurringByDay[d] ?? []).filter(
        (e) => e.assigneeType === "kid" && e.assigneeId === kidId,
      );
    }
    return map;
  }, [familyRecurringByDay, kidId]);
  const kidOneTimeEvents = useMemo(
    () =>
      familyOneTime.filter(
        (e) => e.assigneeType === "kid" && e.assigneeId === kidId,
      ),
    [familyOneTime, kidId],
  );

  const { confirmVisible, requestDelete, confirmDelete, dismissConfirm } = useConfirmDelete();

  // Block modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBlock, setEditingBlock] = useState<ScheduleBlock | null>(null);
  const [modalDay, setModalDay] = useState(1);
  // Pre-filled time from a calendar time-slot tap (HH:MM); undefined otherwise.
  const [slotStart, setSlotStart] = useState<string | undefined>(undefined);
  const [slotEnd, setSlotEnd] = useState<string | undefined>(undefined);
  // Family-event modal (edit/delete only — new events are created on /calendar)
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<FamilyEvent | null>(null);
  // Note + Project modals — owned by this kid. New ones get defaultKidId=kidId.
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  // Payment modal — owned by this kid.
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Expense | null>(null);
  // "Add" carousel — the FAB opens the add-event modal with arrows that cycle
  // through the four add modals (event → note → project → payment).
  const [addType, setAddType] = useState<AddType | null>(null);
  const cycleAdd = useCallback((dir: 1 | -1) => {
    setAddType((prev) => {
      const i = ADD_ORDER.indexOf(prev ?? "event");
      return ADD_ORDER[(i + dir + ADD_ORDER.length) % ADD_ORDER.length];
    });
  }, []);
  const addCarousel = (type: AddType): ModalCarousel | undefined =>
    addType === type
      ? { onPrev: () => cycleAdd(-1), onNext: () => cycleAdd(1) }
      : undefined;

  // Section-collapse state (local; doesn't need to persist across sessions).
  const [notesExpanded, setNotesExpanded] = useState(true);
  const [projectsExpanded, setProjectsExpanded] = useState(true);
  const [paymentsExpanded, setPaymentsExpanded] = useState(true);

  // This kid's notes + projects (kidId === kidId), in manual sortOrder.
  const allNotes = useFamilyStore((s) => s.notes);
  const kidNotes = useMemo(
    () =>
      allNotes
        .filter((n) => n.kidId === kidId)
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
    [allNotes, kidId],
  );
  const allProjects = useFamilyStore((s) => s.projects);
  const kidProjects = useMemo(
    () =>
      allProjects
        .filter((p) => p.kidId === kidId)
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
    [allProjects, kidId],
  );

  // This kid's payments (expenses tagged to the kid). Unpaid ("to pay") first,
  // ordered by due date; settled payments below, most recent first.
  const allExpenses = useFamilyStore((s) => s.expenses);
  const kidPayments = useMemo(
    () =>
      allExpenses
        .filter((e) => e.kidId === kidId)
        .sort((a, b) => {
          const aUnpaid = a.paid === false;
          const bUnpaid = b.paid === false;
          if (aUnpaid !== bUnpaid) return aUnpaid ? -1 : 1;
          return aUnpaid ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date);
        }),
    [allExpenses, kidId],
  );
  const todayYMD = toYMD(new Date());

  // Up/down reorder for the kid's notes/projects. (Drag isn't used here —
  // these lists are nested in the calendar scroll, where nested drag is
  // unreliable; arrows work regardless of layout.)
  const moveKidNote = useCallback(
    (index: number, dir: -1 | 1) => {
      const j = index + dir;
      if (j < 0 || j >= kidNotes.length) return;
      const next = [...kidNotes];
      [next[index], next[j]] = [next[j], next[index]];
      reorderNotesRemote(next.map((n) => n.id));
    },
    [kidNotes],
  );
  const moveKidProject = useCallback(
    (index: number, dir: -1 | 1) => {
      const j = index + dir;
      if (j < 0 || j >= kidProjects.length) return;
      const next = [...kidProjects];
      [next[index], next[j]] = [next[j], next[index]];
      reorderProjectsRemote(next.map((p) => p.id));
    },
    [kidProjects],
  );

  const handleMarkPaid = useCallback((pay: Expense) => markKidPaymentPaidRemote(pay), []);
  const handleMarkUnpaid = useCallback((pay: Expense) => markKidPaymentUnpaidRemote(pay), []);

  const openAdd = (dayOfWeek?: number) => {
    setEditingBlock(null);
    setModalDay(dayOfWeek ?? (tab === "calendar" ? selectedDow : 1));
    setSlotStart(undefined);
    setSlotEnd(undefined);
    setModalOpen(true);
  };

  // The FAB opens the add carousel starting at the event modal.
  const openAddCarousel = () => {
    setEditingBlock(null);
    setEditingNote(null);
    setEditingProject(null);
    setEditingPayment(null);
    setModalDay(tab === "calendar" ? selectedDow : 1);
    setSlotStart(undefined);
    setSlotEnd(undefined);
    setAddType("event");
  };

  const openEdit = (block: ScheduleBlock) => {
    setEditingBlock(block);
    setModalDay(block.daysOfWeek[0] ?? 0);
    setSlotStart(undefined);
    setSlotEnd(undefined);
    setModalOpen(true);
  };

  const openEditEvent = (event: FamilyEvent) => {
    setEditingEvent(event);
    setEventModalOpen(true);
  };

  // Route a tap from the week/day grid to the right editor.
  const handleGridPress = useCallback(
    (id: string, source: "event" | "block") => {
      if (source === "block") {
        const block =
          dayBlocks.find((b) => b.id === id) ??
          allBlocks.find((b) => b.id === id) ??
          oneTimeBlocks.find((b) => b.id === id);
        if (block) openEdit(block);
      } else {
        const event =
          dayEvents.find((e) => e.id === id) ??
          kidOneTimeEvents.find((e) => e.id === id) ??
          [...Array(7)].reduce<FamilyEvent | undefined>(
            (found, _, dow) =>
              found ?? kidRecurringEventsByDay[dow]?.find((e) => e.id === id),
            undefined,
          );
        if (event) openEditEvent(event);
      }
    },
    [dayBlocks, allBlocks, oneTimeBlocks, dayEvents, kidOneTimeEvents, kidRecurringEventsByDay],
  );

  // Slot tap (week/day grid) → new schedule block on that date.
  const handleSlotPress = useCallback(
    (date: string, start: number, end: number) => {
      setSelectedDate(date);
      setEditingBlock(null);
      setModalDay(dayOfWeekFromYMD(date));
      setSlotStart(minutesToHHMM(start));
      setSlotEnd(minutesToHHMM(end));
      setModalOpen(true);
    },
    [],
  );

  const handleSubmit = (data: {
    title: string;
    type: BlockType;
    daysOfWeek: number[];
    startMinutes: number;
    endMinutes: number;
    location?: string;
    isRecurring: boolean;
    date?: string;
    reminders?: number[];
  }) => {
    if (editingBlock) {
      updateScheduleBlockRemote(editingBlock.id, data);
    } else {
      addScheduleBlockRemote({ ...data, kidId: kidId! });
    }
  };

  const handleEventSubmit = (data: {
    title: string;
    assigneeType: AssigneeType;
    assigneeId?: string;
    daysOfWeek: number[];
    startMinutes: number;
    endMinutes: number;
    location?: string;
    isRecurring: boolean;
    date?: string;
    reminders?: number[];
  }) => {
    if (editingEvent) {
      updateFamilyEventRemote(editingEvent.id, data);
    }
  };

  // Build markedDates: days with this kid's blocks OR kid-assigned events.
  const markedDates = useMemo(() => {
    const marks: Record<string, { dotColor: string }> = {};
    const now = new Date();
    for (let offset = -30; offset <= 30; offset++) {
      const d = new Date(now);
      d.setDate(d.getDate() + offset);
      const ymd = toYMD(d);
      const dow = d.getDay();
      if (
        blocksByDay[dow]?.length > 0 ||
        kidRecurringEventsByDay[dow]?.length > 0
      ) {
        marks[ymd] = { dotColor: kidColor };
      }
    }
    for (const b of oneTimeBlocks) {
      if (b.date) marks[b.date] = { dotColor: kidColor };
    }
    for (const e of kidOneTimeEvents) {
      if (e.date) marks[e.date] = { dotColor: kidColor };
    }
    return marks;
  }, [blocksByDay, oneTimeBlocks, kidRecurringEventsByDay, kidOneTimeEvents, kidColor]);

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
        <ScrollView contentContainerStyle={styles.container}>
          {/* Tabs */}
          <View style={styles.tabs}>
            <SegmentedPills
              value={tab}
              onChange={setTab}
              options={[
                { value: "calendar", label: t("kid.calendar"), color: kidColor },
                { value: "template", label: t("kid.template"), color: kidColor },
              ]}
              testIDPrefix="kid-tab"
            />
          </View>

          {/* --- Calendar View (month / week / day) --- */}
          {tab === "calendar" && (
            <>
              {/* Month / Week / Day sub-toggle — mirrors the main /calendar */}
              <View style={styles.viewToggle}>
                <SegmentedPills
                  value={calendarView}
                  onChange={(v) => setCalendarView(v as CalendarView)}
                  options={[
                    { value: "month", label: t("calendar.monthView"), color: kidColor },
                    { value: "week", label: t("calendar.weekView"), color: kidColor },
                    { value: "day", label: t("calendar.dayView"), color: kidColor },
                  ]}
                  testIDPrefix="kid-view"
                />
              </View>

              <Card style={styles.card} mode="elevated">
                <Card.Content>
                  {calendarView === "month" && (
                    <MonthCalendar
                      selectedDate={selectedDate}
                      onSelectDate={setSelectedDate}
                      markedDates={markedDates}
                      accentColor={kidColor}
                    />
                  )}
                  {calendarView === "week" && (
                    <WeekCalendar
                      selectedDate={selectedDate}
                      onSelectDate={setSelectedDate}
                      markedDates={markedDates}
                      accentColor={kidColor}
                      kidId={kidId}
                      onEventPress={handleGridPress}
                      onSlotPress={handleSlotPress}
                    />
                  )}
                  {calendarView === "day" && (
                    <DayCalendar
                      selectedDate={selectedDate}
                      onSelectDate={setSelectedDate}
                      accentColor={kidColor}
                      kidId={kidId}
                      onEventPress={handleGridPress}
                      onSlotPress={handleSlotPress}
                    />
                  )}
                </Card.Content>
              </Card>

              <SectionHeader label={t("kid.daySchedule", { day: dayName(selectedDow) })} />

              {dayBlocks.length === 0 && dayEvents.length === 0 ? (
                <Text style={styles.emptyText}>
                  {t("kid.nothingScheduled", { day: dayName(selectedDow) })}
                </Text>
              ) : (
                <Card style={styles.card} mode="elevated">
                  <Card.Content>
                    {dayBlocks.map((b) => (
                      <BlockRow
                        key={b.id}
                        block={b}
                        kidColor={kidColor}
                        onEdit={() => openEdit(b)}
                        onDelete={() => requestDelete(() => deleteScheduleBlockRemote(b.id))}
                      />
                    ))}
                    {dayEvents.map((e) => (
                      <KidEventRow
                        key={e.id}
                        event={e}
                        onEdit={() => openEditEvent(e)}
                        onDelete={() => requestDelete(() => deleteFamilyEventRemote(e.id))}
                      />
                    ))}
                  </Card.Content>
                </Card>
              )}

              {/* --- This kid's notes (kidId === kidId) --- */}
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionHeaderLabel}>
                  <SectionHeader
                    label={t("kid.notesOf", { name: kid?.name ?? "" })}
                    collapsible
                    expanded={notesExpanded}
                    onToggle={() => setNotesExpanded((v) => !v)}
                    testID="kid-section-notes"
                  />
                </View>
                <IconButton
                  icon="plus-circle"
                  size={28}
                  iconColor={kidColor}
                  accessibilityLabel={t("kid.addNote")}
                  onPress={() => {
                    setEditingNote(null);
                    setNoteModalOpen(true);
                  }}
                />
              </View>
              {notesExpanded && (
                kidNotes.length === 0 ? (
                  <Text style={styles.emptyText}>{t("kid.noNotes")}</Text>
                ) : (
                  <View style={styles.notesGrid}>
                    {kidNotes.map((note, index) => (
                      <Pressable
                        key={note.id}
                        style={({ pressed, hovered }: any) => [
                          styles.noteCard,
                          hovered && styles.noteCardHover,
                          pressed && styles.noteCardPressed,
                        ]}
                        onPress={() => {
                          setEditingNote(note);
                          setNoteModalOpen(true);
                        }}
                      >
                        {/* Top row: 📝 icon + reorder + delete */}
                        <View style={styles.noteTopRow}>
                          <View style={styles.noteIcon}>
                            <Text style={{ fontSize: 18 }}>📝</Text>
                          </View>
                          <View style={{ flex: 1 }} />
                          <IconButton
                            icon="chevron-up"
                            size={16}
                            disabled={index === 0}
                            iconColor={C.textMuted}
                            style={styles.noteActionBtn}
                            onPress={() => moveKidNote(index, -1)}
                          />
                          <IconButton
                            icon="chevron-down"
                            size={16}
                            disabled={index === kidNotes.length - 1}
                            iconColor={C.textMuted}
                            style={styles.noteActionBtn}
                            onPress={() => moveKidNote(index, 1)}
                          />
                          <IconButton
                            icon="trash-can-outline"
                            size={16}
                            iconColor={C.textMuted}
                            style={styles.noteActionBtn}
                            onPress={() => requestDelete(() => deleteNoteRemote(note.id))}
                          />
                        </View>

                        <Text style={styles.noteTitle} numberOfLines={1}>
                          {note.title || t("home.note")}
                        </Text>
                        {note.body ? (
                          <Text style={styles.noteBody} numberOfLines={3}>
                            {note.body}
                          </Text>
                        ) : null}

                        {/* Bottom accent bar */}
                        <View style={styles.noteAccentBar} />
                      </Pressable>
                    ))}
                  </View>
                )
              )}

              {/* --- This kid's projects --- */}
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionHeaderLabel}>
                  <SectionHeader
                    label={t("kid.projectsOf", { name: kid?.name ?? "" })}
                    collapsible
                    expanded={projectsExpanded}
                    onToggle={() => setProjectsExpanded((v) => !v)}
                    testID="kid-section-projects"
                  />
                </View>
                <IconButton
                  icon="plus-circle"
                  size={28}
                  iconColor={kidColor}
                  accessibilityLabel={t("kid.addProject")}
                  onPress={() => {
                    setEditingProject(null);
                    setProjectModalOpen(true);
                  }}
                />
              </View>
              {projectsExpanded && (
                kidProjects.length === 0 ? (
                  <Text style={styles.emptyText}>{t("kid.noProjects")}</Text>
                ) : (
                  <View style={styles.projectsContainer}>
                    {kidProjects.map((proj, index) => {
                      const statusColor = STATUS_COLORS[proj.status];
                      const statusEmoji = proj.status === "done" ? "✅" : proj.status === "in_progress" ? "🔨" : "💡";
                      return (
                        <Pressable
                          key={proj.id}
                          style={({ pressed, hovered }: any) => [
                            styles.projectCard,
                            hovered && styles.projectCardHover,
                            pressed && { transform: [{ scale: 0.98 }] },
                          ]}
                          onPress={() => {
                            setEditingProject(proj);
                            setProjectModalOpen(true);
                          }}
                        >
                          {/* Left accent stripe */}
                          <View style={[styles.projectStripe, { backgroundColor: statusColor }]} />

                          {/* Main content */}
                          <View style={styles.projectBody}>
                            <View style={styles.projectTopRow}>
                              <View style={[styles.projectStatusChip, { backgroundColor: statusColor + "18" }]}>
                                <Text style={{ fontSize: 12 }}>{statusEmoji}</Text>
                                <Text style={[styles.projectStatusText, { color: statusColor }]}>
                                  {statusLabel(proj.status)}
                                </Text>
                              </View>
                              <View style={{ flex: 1 }} />
                              <IconButton
                                icon="chevron-up"
                                size={16}
                                disabled={index === 0}
                                iconColor={C.textMuted}
                                style={styles.projectActionBtn}
                                onPress={() => moveKidProject(index, -1)}
                              />
                              <IconButton
                                icon="chevron-down"
                                size={16}
                                disabled={index === kidProjects.length - 1}
                                iconColor={C.textMuted}
                                style={styles.projectActionBtn}
                                onPress={() => moveKidProject(index, 1)}
                              />
                              <IconButton
                                icon="trash-can-outline"
                                size={16}
                                iconColor={C.textMuted}
                                style={styles.projectActionBtn}
                                onPress={() => requestDelete(() => deleteProjectRemote(proj.id))}
                              />
                            </View>

                            <Text style={styles.projectTitle} numberOfLines={1}>
                              {proj.title}
                            </Text>

                            {proj.description ? (
                              <Text style={styles.projDesc} numberOfLines={2}>
                                {proj.description}
                              </Text>
                            ) : null}

                            {/* Progress bar */}
                            <View style={styles.projectProgressRow}>
                              <View style={styles.projectProgressTrack}>
                                <View
                                  style={[
                                    styles.projectProgressFill,
                                    {
                                      backgroundColor: statusColor,
                                      width: `${proj.progress}%` as any,
                                    },
                                  ]}
                                />
                              </View>
                              <Text style={[styles.projectProgressLabel, { color: statusColor }]}>
                                {proj.progress}%
                              </Text>
                            </View>
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>
                )
              )}

              {/* --- This kid's payments (תשלומים) --- */}
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionHeaderLabel}>
                  <SectionHeader
                    label={t("kid.paymentsOf", { name: kid?.name ?? "" })}
                    collapsible
                    expanded={paymentsExpanded}
                    onToggle={() => setPaymentsExpanded((v) => !v)}
                    testID="kid-section-payments"
                  />
                </View>
                <IconButton
                  icon="plus-circle"
                  size={28}
                  iconColor={kidColor}
                  accessibilityLabel={t("kid.addPayment")}
                  onPress={() => {
                    setEditingPayment(null);
                    setPaymentModalOpen(true);
                  }}
                />
              </View>
              {paymentsExpanded && (
                kidPayments.length === 0 ? (
                  <Text style={styles.emptyText}>{t("kid.noPayments")}</Text>
                ) : (
                  <View style={styles.paymentsContainer}>
                    {kidPayments.map((pay) => {
                      const unpaid = pay.paid === false;
                      const overdue = unpaid && pay.date < todayYMD;
                      const dateLabel = `${pay.date.slice(8, 10)}/${pay.date.slice(5, 7)}`;
                      const recurLabel = !pay.isRecurring
                        ? ""
                        : pay.recurrenceType === "weekly"
                          ? `${t("payment.everyWeek")}, ${dayName(pay.recurrenceDay ?? 0)}`
                          : pay.recurrenceDay != null
                            ? `${t("payment.everyMonth")}, ${pay.recurrenceDay} ${t("payment.inMonth")}`
                            : t("payment.everyMonth");
                      const metaText = [overdue ? t("payment.overdue") : "", recurLabel, dateLabel]
                        .filter(Boolean)
                        .join(" • ");
                      return (
                        <Pressable
                          key={pay.id}
                          style={({ hovered }: any) => [
                            styles.paymentCard,
                            hovered && styles.paymentCardHover,
                          ]}
                          onPress={() => {
                            setEditingPayment(pay);
                            setPaymentModalOpen(true);
                          }}
                          testID={`kid-payment-${pay.id}`}
                        >
                          {/* Status label (non-interactive — use the actions below) */}
                          <View
                            style={[
                              styles.statusPill,
                              unpaid ? styles.statusPillUnpaid : styles.statusPillPaid,
                            ]}
                          >
                            <Text
                              style={[
                                styles.statusPillText,
                                unpaid ? styles.statusPillTextUnpaid : styles.statusPillTextPaid,
                              ]}
                            >
                              {unpaid ? t("payment.toPay") : t("payment.paid")}
                            </Text>
                          </View>

                          <View style={styles.paymentInfo}>
                            <Text
                              style={[styles.paymentName, !unpaid && styles.paymentNamePaid]}
                              numberOfLines={1}
                            >
                              {pay.note || t("payment.add")}
                            </Text>
                            <Text style={[styles.paymentMeta, overdue && styles.paymentMetaOverdue]}>
                              {metaText}
                            </Text>
                          </View>

                          <Text style={styles.paymentAmount}>{formatILS(pay.amount)}</Text>

                          {/* Mark paid / undo — explicit action beside delete */}
                          {unpaid ? (
                            <IconButton
                              icon="check-circle-outline"
                              size={20}
                              iconColor={C.teal}
                              accessibilityLabel={t("payment.markPaid")}
                              testID={`kid-payment-markpaid-${pay.id}`}
                              onPress={() => handleMarkPaid(pay)}
                            />
                          ) : (
                            <IconButton
                              icon="undo-variant"
                              size={18}
                              iconColor={C.textMuted}
                              accessibilityLabel={t("payment.markUnpaid")}
                              testID={`kid-payment-undo-${pay.id}`}
                              onPress={() => handleMarkUnpaid(pay)}
                            />
                          )}

                          <IconButton
                            icon="trash-can-outline"
                            size={16}
                            iconColor={C.textMuted}
                            onPress={() => requestDelete(() => deleteExpenseRemote(pay.id))}
                          />
                        </Pressable>
                      );
                    })}
                  </View>
                )
              )}
            </>
          )}

          {/* --- Template View (recurring only) --- */}
          {tab === "template" && (
            <>
              {Array.from({ length: 7 }, (_, dow) => (
                <View key={dow} style={styles.templateDay}>
                  <Pressable
                    style={({ hovered }: any) => [
                      styles.templateHeader,
                      hovered && styles.templateHeaderHover,
                    ]}
                    onPress={() => openAdd(dow)}
                  >
                    <Text variant="titleSmall" style={styles.templateDayName}>
                      {dayName(dow)}
                    </Text>
                    <IconButton
                      icon="plus"
                      size={18}
                      pointerEvents="none"
                    />
                  </Pressable>

                  {blocksByDay[dow].length === 0 ? (
                    <Text variant="bodySmall" style={styles.emptyText}>
                      {t("kid.noBlocks")}
                    </Text>
                  ) : (
                    blocksByDay[dow].map((b) => (
                      <BlockRow
                        key={b.id}
                        block={b}
                        kidColor={kidColor}
                        onEdit={() => openEdit(b)}
                        onDelete={() => requestDelete(() => deleteScheduleBlockRemote(b.id))}
                      />
                    ))
                  )}
                </View>
              ))}
            </>
          )}
        </ScrollView>

        {/* FAB */}
        <FAB
          icon="plus"
          style={[styles.fab, { bottom: insets.bottom + S.lg, backgroundColor: kidColor }]}
          color="#FFF"
          onPress={openAddCarousel}
        />

        <ScheduleBlockModal
          visible={modalOpen || addType === "event"}
          onDismiss={() => {
            setModalOpen(false);
            setEditingBlock(null);
            setAddType(null);
          }}
          editBlock={editingBlock}
          defaultDaysOfWeek={[modalDay]}
          defaultDate={tab === "calendar" ? selectedDate : undefined}
          defaultStartTime={slotStart}
          defaultEndTime={slotEnd}
          onSubmit={handleSubmit}
          carousel={addCarousel("event")}
        />

        {/* Edit/delete for kid-assigned family events (created on /calendar). */}
        <FamilyEventModal
          visible={eventModalOpen}
          onDismiss={() => {
            setEventModalOpen(false);
            setEditingEvent(null);
          }}
          editEvent={editingEvent}
          defaultDaysOfWeek={[selectedDow]}
          defaultDate={selectedDate}
          onSubmit={handleEventSubmit}
          onDelete={
            editingEvent
              ? () => requestDelete(() => deleteFamilyEventRemote(editingEvent.id))
              : undefined
          }
        />
        {/* This kid's notes — locked to this kid (picker hidden, name in title). */}
        <NoteModal
          visible={noteModalOpen || addType === "note"}
          onDismiss={() => {
            setNoteModalOpen(false);
            setEditingNote(null);
            setAddType(null);
          }}
          editNote={editingNote}
          defaultKidId={kidId}
          lockedKidName={kid?.name}
          carousel={addCarousel("note")}
        />

        {/* Same for projects. */}
        <ProjectModal
          visible={projectModalOpen || addType === "project"}
          onDismiss={() => {
            setProjectModalOpen(false);
            setEditingProject(null);
            setAddType(null);
          }}
          editProject={editingProject}
          defaultKidId={kidId}
          lockedKidName={kid?.name}
          carousel={addCarousel("project")}
        />

        {/* This kid's payments (תשלומים) — new ones start as "to pay". */}
        <KidPaymentModal
          visible={paymentModalOpen || addType === "payment"}
          onDismiss={() => {
            setPaymentModalOpen(false);
            setEditingPayment(null);
            setAddType(null);
          }}
          kidId={kidId}
          editExpense={editingPayment}
          lockedKidName={kid?.name}
          carousel={addCarousel("payment")}
        />

        <ConfirmDeleteModal
          visible={confirmVisible}
          onConfirm={confirmDelete}
          onDismiss={dismissConfirm}
        />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  container: { padding: S.lg, paddingBottom: S.xxl + S.xxl },

  accentBar: {
    borderRadius: R.md,
    paddingVertical: S.sm,
    paddingHorizontal: S.sm,
    marginBottom: S.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  accentText: {
    fontSize: 16,
    fontWeight: "800",
    textAlign: "center",
    flex: 1,
  },
  // Reserves the same width as an IconButton so the title stays centered
  // when only one of prev/next arrows is hidden (shouldn't happen with
  // cyclic nav, but defends against a single-kid family where both are
  // null and the centered text would otherwise be the whole row).
  accentArrowSpacer: { width: 40, height: 40 },

  tabs: { marginBottom: S.lg },
  viewToggle: { marginBottom: S.md },

  card: { borderRadius: R.lg, backgroundColor: C.surface, marginBottom: S.lg },

  emptyText: {
    color: C.textMuted,
    textAlign: TEXT_RIGHT,
    fontSize: 14,
    paddingVertical: S.xs,
  },

  // Section header row — collapsible label + add button, RTL-aware.
  sectionHeaderRow: {
    flexDirection: RTL_ROW,
    alignItems: "center",
    justifyContent: "space-between",
  },
  // Wraps the SectionHeader so it takes the available width and the trailing
  // "+" IconButton always has room. Without this, on native (Yoga) the long
  // RTL label pushes the IconButton off-screen (web's flexbox shrinks it).
  sectionHeaderLabel: {
    flex: 1,
  },

  // ── Payments (תשלומים) ──
  paymentsContainer: {
    gap: S.sm,
    marginBottom: S.lg,
  },
  paymentCard: {
    flexDirection: RTL_ROW,
    alignItems: "center",
    backgroundColor: C.surface,
    borderRadius: R.md,
    paddingVertical: S.sm,
    paddingHorizontal: S.md,
    gap: S.sm,
    ...SHADOW.sm,
  },
  paymentCardHover: { backgroundColor: C.surfaceSubtle },
  statusPill: {
    paddingHorizontal: S.sm,
    paddingVertical: 4,
    borderRadius: 999,
    minWidth: 64,
    alignItems: "center",
  },
  statusPillUnpaid: { backgroundColor: C.amber + "22" },
  statusPillPaid: { backgroundColor: C.teal + "22" },
  statusPillText: { fontSize: 12, fontWeight: "700", writingDirection: "rtl" },
  statusPillTextUnpaid: { color: "#92400E" },
  statusPillTextPaid: { color: C.teal },
  paymentInfo: { flex: 1 },
  paymentName: {
    fontSize: 14,
    fontWeight: "600",
    color: C.textPrimary,
    textAlign: TEXT_RIGHT,
    writingDirection: "rtl",
  },
  paymentNamePaid: { color: C.textMuted, textDecorationLine: "line-through" },
  paymentMeta: {
    fontSize: 11,
    color: C.textMuted,
    textAlign: TEXT_RIGHT,
    marginTop: 2,
    writingDirection: "rtl",
  },
  paymentMetaOverdue: { color: C.red, fontWeight: "700" },
  paymentAmount: { fontSize: 15, fontWeight: "700", color: C.textPrimary },

  // ── Notes (identical to /home) ──
  notesGrid: {
    flexDirection: RTL_ROW,
    flexWrap: "wrap",
    gap: S.md,
    marginBottom: S.lg,
  },
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
    ...(Platform.OS === "web"
      ? { cursor: "pointer" as any, transition: "all 0.2s ease" }
      : {}),
    overflow: "hidden" as const,
  },
  noteCardHover: {
    backgroundColor: NOTE_COLORS.hover,
    borderColor: "#EAD49B",
    transform: [{ translateY: -2 }],
    ...SHADOW.md,
  },
  noteCardPressed: {
    transform: [{ scale: 0.97 }],
  },
  noteTopRow: {
    flexDirection: RTL_ROW,
    alignItems: "center",
    marginBottom: S.sm,
  },
  noteIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: NOTE_COLORS.accent + "14",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  noteActionBtn: {
    margin: 0,
    width: 28,
    height: 28,
  },
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
  noteAccentBar: {
    height: 3,
    borderRadius: 2,
    backgroundColor: NOTE_COLORS.barDefault,
    marginTop: S.md,
  },

  // ── Projects (identical to /home) ──
  projectsContainer: {
    gap: S.xs,
    marginBottom: S.lg,
  },
  projectCard: {
    flexDirection: RTL_ROW,
    backgroundColor: PROJECT_COLORS.bg,
    borderWidth: 1,
    borderColor: PROJECT_COLORS.border,
    borderRadius: R.lg,
    marginBottom: S.md,
    overflow: "hidden" as const,
    ...SHADOW.sm,
    ...(Platform.OS === "web"
      ? { cursor: "pointer" as any, transition: "all 0.2s ease" }
      : {}),
  },
  projectCardHover: {
    backgroundColor: PROJECT_COLORS.hover,
    borderColor: PROJECT_COLORS.accent + "40",
    transform: [{ translateY: -2 }],
    ...SHADOW.md,
  },
  projectStripe: {
    width: 5,
    alignSelf: "stretch" as const,
  },
  projectBody: {
    flex: 1,
    padding: S.lg,
    gap: S.xs,
  },
  projectTopRow: {
    flexDirection: RTL_ROW,
    alignItems: "center",
    marginBottom: S.xs,
  },
  projectStatusChip: {
    flexDirection: RTL_ROW,
    alignItems: "center",
    gap: 4,
    paddingHorizontal: S.sm + 2,
    paddingVertical: 3,
    borderRadius: 12,
  },
  projectStatusText: {
    fontSize: 11,
    fontWeight: "700",
  },
  projectActionBtn: {
    margin: 0,
    width: 28,
    height: 28,
  },
  projectTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: C.textPrimary,
    textAlign: TEXT_RIGHT,
    writingDirection: "rtl",
  },
  projDesc: {
    fontSize: 13,
    color: C.textSecondary,
    textAlign: TEXT_RIGHT,
    writingDirection: "rtl",
    lineHeight: 19,
  },
  projectProgressRow: {
    flexDirection: RTL_ROW,
    alignItems: "center",
    gap: S.sm,
    marginTop: S.sm,
  },
  projectProgressTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: PROJECT_COLORS.accent + "15",
    overflow: "hidden" as const,
  },
  projectProgressFill: {
    height: 6,
    borderRadius: 3,
  },
  projectProgressLabel: {
    fontSize: 12,
    fontWeight: "700",
    minWidth: 36,
    textAlign: "left" as const,
  },

  // Block row — matches Today's blockRow pattern
  blockRow: {
    flexDirection: RTL_ROW,
    alignItems: "center",
    paddingVertical: S.md,
    borderRadius: R.sm,
    paddingHorizontal: S.xs,
    ...(Platform.OS === "web" ? ({ cursor: "pointer" } as any) : {}),
  },
  blockRowHover: {
    backgroundColor: C.hoverBg,
  },
  blockStripe: {
    width: 3,
    borderRadius: 2,
    alignSelf: "stretch",
    marginEnd: S.md,
    marginStart: S.xs,
  },
  blockInfo: { flex: 1 },
  blockTitleRow: {
    flexDirection: RTL_ROW,
    alignItems: "center",
    gap: S.sm,
  },
  blockTitle: { fontSize: 15, fontWeight: "600", color: C.textPrimary, textAlign: TEXT_RIGHT },
  blockTime: { fontSize: 12, color: C.textSecondary, marginTop: 2, textAlign: TEXT_RIGHT },
  typeChip: { borderRadius: R.sm, marginStart: S.sm, marginEnd: S.xs },
  oneTimeBadge: {
    fontSize: 10,
    color: C.amber,
    backgroundColor: C.amber + "18",
    paddingHorizontal: S.sm,
    paddingVertical: 3,
    borderRadius: R.sm,
    overflow: "hidden",
    fontWeight: "600",
  },

  // Template
  templateDay: {
    marginBottom: S.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
    paddingBottom: S.sm,
  },
  templateHeader: {
    flexDirection: RTL_ROW,
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: R.sm,
    paddingHorizontal: S.xs,
    ...(Platform.OS === "web" ? ({ cursor: "pointer" } as any) : {}),
  },
  templateHeaderHover: {
    backgroundColor: C.hoverBg,
  },
  templateDayName: { fontSize: 15, fontWeight: "700", color: C.textPrimary, textAlign: TEXT_RIGHT },

  fab: {
    position: "absolute",
    left: S.lg,
    bottom: S.lg,
    borderRadius: R.lg,
  },
});
