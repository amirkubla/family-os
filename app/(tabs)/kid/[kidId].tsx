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
  SegmentedButtons,
  FAB,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
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
} from "@src/lib/sync/remoteCrud";
import type { ScheduleBlock, BlockType } from "@src/models/schedule";
import type { FamilyEvent, AssigneeType } from "@src/models/familyEvent";
import type { Note } from "@src/models/note";
import type { Project } from "@src/models/project";
import { minutesToHHMM } from "@src/utils/time";
import { toYMD, dayOfWeekFromYMD } from "@src/utils/date";
import { t, dayName, blockTypeLabel, statusLabel } from "@src/i18n";
import { RTL_ROW, TEXT_RIGHT } from "@src/ui/rtl";
import { C, R, S } from "@src/ui/tokens";
import { TYPE_COLORS } from "@src/ui/semanticColors";

import MonthCalendar from "@src/components/Calendar/MonthCalendar";
import WeekCalendar from "@src/components/Calendar/WeekCalendar";
import DayCalendar from "@src/components/Calendar/DayCalendar";
import ScheduleBlockModal from "@src/components/ScheduleBlockModal";
import FamilyEventModal from "@src/components/FamilyEventModal";
import NoteModal from "@src/components/NoteModal";
import ProjectModal from "@src/components/ProjectModal";
import SectionHeader from "@src/components/SectionHeader";
import ConfirmDeleteModal from "@src/components/ConfirmDeleteModal";
import { useConfirmDelete } from "@src/hooks/useConfirmDelete";

type CalendarView = "month" | "week" | "day";

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

  // Set header options once
  useLayoutEffect(() => {
    navigation.setOptions({
      title: kid ? `${kid.emoji}\u2003\u2003${kid.name}` : t("kid.schedule"),
      headerTintColor: kidColor,
      headerBackTitle: t("tabs.today"),
    });
  }, [navigation, kid?.name, kid?.emoji, kidColor]);

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
  // Family-event modal (edit/delete only — new events are created on /calendar)
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<FamilyEvent | null>(null);
  // Note + Project modals — owned by this kid. New ones get defaultKidId=kidId.
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  // Section-collapse state (local; doesn't need to persist across sessions).
  const [notesExpanded, setNotesExpanded] = useState(true);
  const [projectsExpanded, setProjectsExpanded] = useState(true);

  // This kid's notes + projects (kidId === kidId).
  const allNotes = useFamilyStore((s) => s.notes);
  const kidNotes = useMemo(
    () => allNotes.filter((n) => n.kidId === kidId),
    [allNotes, kidId],
  );
  const allProjects = useFamilyStore((s) => s.projects);
  const kidProjects = useMemo(
    () => allProjects.filter((p) => p.kidId === kidId),
    [allProjects, kidId],
  );

  const openAdd = (dayOfWeek?: number) => {
    setEditingBlock(null);
    setModalDay(dayOfWeek ?? (tab === "calendar" ? selectedDow : 1));
    setModalOpen(true);
  };

  const openEdit = (block: ScheduleBlock) => {
    setEditingBlock(block);
    setModalDay(block.daysOfWeek[0] ?? 0);
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
    (date: string, _start: number, _end: number) => {
      setSelectedDate(date);
      setEditingBlock(null);
      setModalDay(dayOfWeekFromYMD(date));
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
          {/* Header accent bar — with prev/next arrows to switch kids.
              Plain "row" (not RTL_ROW) to match WeekCalendar's header — RN
              Web auto-mirrors row in RTL, putting chevron-right on the
              right visual edge. Arrows hide if there's only one active kid. */}
          <View style={[styles.accentBar, { backgroundColor: kidColor + "22" }]}>
            {prevKidId ? (
              <IconButton
                icon="chevron-right"
                size={22}
                iconColor={kidColor}
                onPress={() => goToKid(prevKidId)}
                accessibilityLabel={t("kid.prevKid")}
              />
            ) : (
              <View style={styles.accentArrowSpacer} />
            )}
            <Text style={[styles.accentText, { color: kidColor }]}>
              {kid?.emoji} {t("kid.kidSchedule", { name: kid?.name ?? "" })}
            </Text>
            {nextKidId ? (
              <IconButton
                icon="chevron-left"
                size={22}
                iconColor={kidColor}
                onPress={() => goToKid(nextKidId)}
                accessibilityLabel={t("kid.nextKid")}
              />
            ) : (
              <View style={styles.accentArrowSpacer} />
            )}
          </View>

          {/* Tabs */}
          <SegmentedButtons
            value={tab}
            onValueChange={setTab}
            buttons={[
              { value: "calendar", label: t("kid.calendar") },
              { value: "template", label: t("kid.template") },
            ]}
            style={styles.tabs}
          />

          {/* --- Calendar View (month / week / day) --- */}
          {tab === "calendar" && (
            <>
              {/* Month / Week / Day sub-toggle — mirrors the main /calendar */}
              <SegmentedButtons
                value={calendarView}
                onValueChange={(v) => setCalendarView(v as CalendarView)}
                buttons={[
                  { value: "month", label: t("calendar.monthView"), checkedColor: C.selectText, uncheckedColor: C.textSecondary },
                  { value: "week", label: t("calendar.weekView"), checkedColor: C.selectText, uncheckedColor: C.textSecondary },
                  { value: "day", label: t("calendar.dayView"), checkedColor: C.selectText, uncheckedColor: C.textSecondary },
                ]}
                style={styles.viewToggle}
                theme={{ colors: { secondaryContainer: C.selectBg, onSecondaryContainer: C.selectText } }}
              />

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
                <SectionHeader
                  label={t("kid.notes")}
                  collapsible
                  expanded={notesExpanded}
                  onToggle={() => setNotesExpanded((v) => !v)}
                  testID="kid-section-notes"
                />
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
                  <Card style={styles.card} mode="elevated">
                    <Card.Content>
                      {kidNotes.map((note) => (
                        <Pressable
                          key={note.id}
                          style={({ hovered }: any) => [
                            styles.kidItemRow,
                            hovered && styles.kidItemRowHover,
                          ]}
                          onPress={() => {
                            setEditingNote(note);
                            setNoteModalOpen(true);
                          }}
                        >
                          <View
                            style={[styles.kidItemStripe, { backgroundColor: kidColor }]}
                          />
                          <View style={styles.kidItemBody}>
                            <Text style={styles.kidItemTitle} numberOfLines={1}>
                              {note.title || note.body.split("\n")[0] || t("home.note")}
                            </Text>
                            {note.body ? (
                              <Text style={styles.kidItemSub} numberOfLines={2}>
                                {note.body}
                              </Text>
                            ) : null}
                          </View>
                          <IconButton
                            icon="trash-can-outline"
                            size={18}
                            iconColor={C.textMuted}
                            onPress={() =>
                              requestDelete(() => deleteNoteRemote(note.id))
                            }
                          />
                        </Pressable>
                      ))}
                    </Card.Content>
                  </Card>
                )
              )}

              {/* --- This kid's projects --- */}
              <View style={styles.sectionHeaderRow}>
                <SectionHeader
                  label={t("kid.projects")}
                  collapsible
                  expanded={projectsExpanded}
                  onToggle={() => setProjectsExpanded((v) => !v)}
                  testID="kid-section-projects"
                />
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
                  <Card style={styles.card} mode="elevated">
                    <Card.Content>
                      {kidProjects.map((proj) => (
                        <Pressable
                          key={proj.id}
                          style={({ hovered }: any) => [
                            styles.kidItemRow,
                            hovered && styles.kidItemRowHover,
                          ]}
                          onPress={() => {
                            setEditingProject(proj);
                            setProjectModalOpen(true);
                          }}
                        >
                          <View
                            style={[styles.kidItemStripe, { backgroundColor: kidColor }]}
                          />
                          <View style={styles.kidItemBody}>
                            <Text style={styles.kidItemTitle} numberOfLines={1}>
                              {proj.title}
                            </Text>
                            <Text style={styles.kidItemSub} numberOfLines={1}>
                              {statusLabel(proj.status)} · {proj.progress}%
                            </Text>
                          </View>
                          <IconButton
                            icon="trash-can-outline"
                            size={18}
                            iconColor={C.textMuted}
                            onPress={() =>
                              requestDelete(() => deleteProjectRemote(proj.id))
                            }
                          />
                        </Pressable>
                      ))}
                    </Card.Content>
                  </Card>
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
          style={[styles.fab, { backgroundColor: kidColor }]}
          color="#FFF"
          onPress={() => openAdd()}
        />

        <ScheduleBlockModal
          visible={modalOpen}
          onDismiss={() => {
            setModalOpen(false);
            setEditingBlock(null);
          }}
          editBlock={editingBlock}
          defaultDaysOfWeek={[modalDay]}
          defaultDate={tab === "calendar" ? selectedDate : undefined}
          onSubmit={handleSubmit}
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
        {/* This kid's notes — defaultKidId pre-fills the picker so the add
            button doesn't accidentally create family-wide notes from here. */}
        <NoteModal
          visible={noteModalOpen}
          onDismiss={() => {
            setNoteModalOpen(false);
            setEditingNote(null);
          }}
          editNote={editingNote}
          defaultKidId={kidId}
        />

        {/* Same for projects. */}
        <ProjectModal
          visible={projectModalOpen}
          onDismiss={() => {
            setProjectModalOpen(false);
            setEditingProject(null);
          }}
          editProject={editingProject}
          defaultKidId={kidId}
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

  // Header row with collapsible label on one side and add button on the other.
  // RTL_ROW so it mirrors with the rest of the page (label sits on the right
  // visual edge in Hebrew, add button on the left).
  sectionHeaderRow: {
    flexDirection: RTL_ROW,
    alignItems: "center",
    justifyContent: "space-between",
  },

  // Note/project row — accent stripe + title/sub + delete. Pressable opens
  // the modal. Mirrors the schedule blockRow style on purpose so the kid view
  // feels cohesive.
  kidItemRow: {
    flexDirection: RTL_ROW,
    alignItems: "center",
    paddingVertical: S.sm,
    borderRadius: R.sm,
    ...(Platform.OS === "web" ? ({ cursor: "pointer" } as any) : {}),
  },
  kidItemRowHover: {
    backgroundColor: C.bg,
  },
  kidItemStripe: {
    width: 4,
    height: 36,
    borderRadius: 2,
    marginEnd: S.md,
  },
  kidItemBody: {
    flex: 1,
    gap: 2,
  },
  kidItemTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: C.textPrimary,
    textAlign: TEXT_RIGHT,
    writingDirection: "rtl",
  },
  kidItemSub: {
    fontSize: 13,
    color: C.textSecondary,
    textAlign: TEXT_RIGHT,
    writingDirection: "rtl",
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
