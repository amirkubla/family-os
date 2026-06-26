/**
 * Calendar tab — Family-level events (not kid-specific).
 *
 * Shows a month calendar with event dots and a list of events for the selected date.
 * FAB to add new family events.
 */

import React, { useState, useMemo, useCallback, useEffect } from "react";
import { View, StyleSheet, ScrollView, Pressable } from "react-native";
import {
  Card,
  Text,
  IconButton,
  FAB,
} from "react-native-paper";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import SegmentedPills from "@src/components/SegmentedPills";
import { useLocalSearchParams } from "expo-router";

import { useFamilyStore } from "@src/store/useFamilyStore";
import {
  useFamilyEventsForDate,
  useFamilyEventOneTimeBlocks,
  useFamilyEventRecurringByDay,
} from "@src/store/familyEventSelectors";
import {
  useAllKidBlocksForDate,
  useAllKidRecurringByDay,
  useAllKidOneTimeBlocks,
} from "@src/store/scheduleSelectors";
import {
  addFamilyEventRemote,
  updateFamilyEventRemote,
  deleteFamilyEventRemote,
  updateScheduleBlockRemote,
  deleteScheduleBlockRemote,
} from "@src/lib/sync/remoteCrud";
import type { FamilyEvent, AssigneeType } from "@src/models/familyEvent";
import type { ScheduleBlock, BlockType } from "@src/models/schedule";
import { minutesToHHMM } from "@src/utils/time";
import { toYMD, dayOfWeekFromYMD } from "@src/utils/date";
import { t, dayName, assigneeTypeLabel, blockTypeLabel } from "@src/i18n";
import { RTL_ROW, TEXT_RIGHT } from "@src/ui/rtl";
import { C, R, S } from "@src/ui/tokens";
import { TYPE_COLORS, ASSIGNEE_COLORS } from "@src/ui/semanticColors";

import MonthCalendar from "@src/components/Calendar/MonthCalendar";
import WeekCalendar from "@src/components/Calendar/WeekCalendar";
import DayCalendar from "@src/components/Calendar/DayCalendar";
import FamilyEventModal from "@src/components/FamilyEventModal";
import ScheduleBlockModal from "@src/components/ScheduleBlockModal";
import SectionHeader from "@src/components/SectionHeader";
import ConfirmDeleteModal from "@src/components/ConfirmDeleteModal";
import { useConfirmDelete } from "@src/hooks/useConfirmDelete";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function EventRow({
  event,
  onEdit,
  onDelete,
}: {
  event: FamilyEvent;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const familyMembers = useFamilyStore((s) => s.familyMembers);
  const kids = useFamilyStore((s) => s.kids);

  const color = event.color ?? ASSIGNEE_COLORS[event.assigneeType];

  let assigneeDisplay = assigneeTypeLabel("family");
  if (event.assigneeType === "member" && event.assigneeId) {
    const member = familyMembers.find((m) => m.id === event.assigneeId);
    assigneeDisplay = member
      ? `${member.avatarEmoji ?? ""} ${member.name}`
      : assigneeTypeLabel("member");
  } else if (event.assigneeType === "kid" && event.assigneeId) {
    const kid = kids.find((k) => k.id === event.assigneeId);
    assigneeDisplay = kid
      ? `${kid.emoji}  ${kid.name}`
      : assigneeTypeLabel("kid");
  }

  return (
    <Pressable
      testID={"event-row-" + event.title}
      style={styles.eventRow}
      onPress={onEdit}
    >
      <View style={[styles.eventStripe, { backgroundColor: color }]} />
      <View style={styles.eventInfo}>
        <View style={styles.eventTitleRow}>
          <Text variant="bodyMedium" style={styles.eventTitle}>
            {event.title}
          </Text>
          {!event.isRecurring && (
            <Text style={styles.oneTimeBadge}>{t("calendar.oneTimeEvent")}</Text>
          )}
        </View>
        <View style={styles.eventMetaRow}>
          <Text variant="bodySmall" style={styles.eventTime}>
            {event.allDay
              ? t("eventModal.allDay")
              : `${minutesToHHMM(event.startMinutes)} – ${minutesToHHMM(event.endMinutes)}`}
            {event.endDate && event.date && event.endDate > event.date
              ? `  ·  ${event.date.slice(8, 10)}/${event.date.slice(5, 7)}–${event.endDate.slice(8, 10)}/${event.endDate.slice(5, 7)}`
              : ""}
            {event.location ? `  ·  ${event.location}` : ""}
          </Text>
          <Text
            style={[
              styles.assigneeBadge,
              { color: ASSIGNEE_COLORS[event.assigneeType], backgroundColor: ASSIGNEE_COLORS[event.assigneeType] + "22" },
            ]}
          >
            {assigneeDisplay}
          </Text>
        </View>
      </View>
      <IconButton
        icon="trash-can-outline"
        size={18}
        onPress={onDelete}
        testID={"event-delete-" + event.title}
      />
    </Pressable>
  );
}

function KidBlockRow({
  block,
  onEdit,
  onDelete,
}: {
  block: ScheduleBlock;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const kids = useFamilyStore((s) => s.kids);
  const kid = kids.find((k) => k.id === block.kidId);
  const color = block.color ?? kid?.color ?? C.red;
  const typeColor = TYPE_COLORS[block.type] ?? C.red;

  return (
    <Pressable style={styles.eventRow} onPress={onEdit}>
      <View style={[styles.eventStripe, { backgroundColor: color }]} />
      <View style={styles.eventInfo}>
        <View style={styles.eventTitleRow}>
          <Text variant="bodyMedium" style={styles.eventTitle}>
            {block.title}
          </Text>
          {kid && (
            <Text
              style={[
                styles.assigneeBadge,
                { color: C.red, backgroundColor: C.red + "22" },
              ]}
            >
              {kid.emoji}{"  "}{kid.name}
            </Text>
          )}
        </View>
        <View style={styles.eventMetaRow}>
          <Text variant="bodySmall" style={styles.eventTime}>
            {minutesToHHMM(block.startMinutes)} – {minutesToHHMM(block.endMinutes)}
            {block.location ? `  ·  ${block.location}` : ""}
          </Text>
          <Text
            style={[
              styles.assigneeBadge,
              { color: typeColor, backgroundColor: typeColor + "22" },
            ]}
          >
            {blockTypeLabel(block.type)}
          </Text>
        </View>
      </View>
      <IconButton icon="trash-can-outline" size={18} onPress={onDelete} />
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

type CalendarView = "month" | "week" | "day";

export default function CalendarScreen() {
  const insets = useSafeAreaInsets();
  const { modal } = useLocalSearchParams<{ modal?: string }>();
  const [calendarView, setCalendarView] = useState<CalendarView>("month");
  const [selectedDate, setSelectedDate] = useState(toYMD(new Date()));
  const selectedDow = dayOfWeekFromYMD(selectedDate);
  const dayEvents = useFamilyEventsForDate(selectedDate, selectedDow);
  const dayBlocks = useAllKidBlocksForDate(selectedDate, selectedDow);

  // Single agenda for the selected day, events + kid blocks merged and ordered
  // by start time (each list is already time-sorted; this interleaves them).
  const dayAgenda = useMemo(
    () => [
      ...dayEvents.map((e) => ({ kind: "event" as const, item: e })),
      ...dayBlocks.map((b) => ({ kind: "block" as const, item: b })),
    ].sort((a, b) => a.item.startMinutes - b.item.startMinutes),
    [dayEvents, dayBlocks],
  );

  // For calendar dots — family events
  const recurringByDay = useFamilyEventRecurringByDay();
  const oneTimeEvents = useFamilyEventOneTimeBlocks();
  // For calendar dots — kid schedule blocks
  const kidRecurringByDay = useAllKidRecurringByDay();
  const kidOneTimeBlocks = useAllKidOneTimeBlocks();

  const { confirmVisible, requestDelete, confirmDelete, dismissConfirm } = useConfirmDelete();

  // Modal state — family events
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<FamilyEvent | null>(null);
  // Modal state — kid schedule blocks
  const [blockModalOpen, setBlockModalOpen] = useState(false);
  const [editingBlock, setEditingBlock] = useState<ScheduleBlock | null>(null);

  // Pre-filled time for slot-click creation
  const [slotStartTime, setSlotStartTime] = useState<string | undefined>();
  const [slotEndTime, setSlotEndTime] = useState<string | undefined>();

  // Deep-link modal opener: familyos://calendar?modal=add
  // Used by QA flows to bypass RTL tap issues — no physical FAB tap needed.
  useEffect(() => {
    if (modal === "add") {
      setSlotStartTime(undefined);
      setSlotEndTime(undefined);
      setEditingEvent(null);
      setModalOpen(true);
    }
  }, [modal]);

  const openAdd = () => {
    setSlotStartTime(undefined);
    setSlotEndTime(undefined);
    setEditingEvent(null);
    setModalOpen(true);
  };

  const handleSlotPress = useCallback((date: string, startMinutes: number, endMinutes: number) => {
    setSelectedDate(date);
    setSlotStartTime(minutesToHHMM(startMinutes));
    setSlotEndTime(minutesToHHMM(endMinutes));
    setEditingEvent(null);
    setModalOpen(true);
  }, []);

  const openEdit = (event: FamilyEvent) => {
    setEditingEvent(event);
    setModalOpen(true);
  };

  const openEditBlock = (block: ScheduleBlock) => {
    setEditingBlock(block);
    setBlockModalOpen(true);
  };

  const handleSubmit = (data: {
    title: string;
    assigneeType: AssigneeType;
    assigneeId?: string;
    daysOfWeek: number[];
    startMinutes: number;
    endMinutes: number;
    location?: string;
    isRecurring: boolean;
    date?: string;
    endDate?: string;
    allDay?: boolean;
  }) => {
    if (editingEvent) {
      updateFamilyEventRemote(editingEvent.id, data);
    } else {
      addFamilyEventRemote(data);
    }
  };

  const handleGridEventPress = useCallback((id: string, source: "event" | "block") => {
    if (source === "event") {
      const event = dayEvents.find((e) => e.id === id)
        ?? oneTimeEvents.find((e) => e.id === id)
        ?? [...Array(7)].reduce<FamilyEvent | undefined>(
          (found, _, dow) => found ?? recurringByDay[dow]?.find((e) => e.id === id),
          undefined,
        );
      if (event) openEdit(event);
    } else {
      const block = dayBlocks.find((b) => b.id === id)
        ?? kidOneTimeBlocks.find((b) => b.id === id)
        ?? [...Array(7)].reduce<ScheduleBlock | undefined>(
          (found, _, dow) => found ?? kidRecurringByDay[dow]?.find((b) => b.id === id),
          undefined,
        );
      if (block) openEditBlock(block);
    }
  }, [dayEvents, dayBlocks, oneTimeEvents, kidOneTimeBlocks, recurringByDay, kidRecurringByDay]);

  const hasAnyItems = dayEvents.length > 0 || dayBlocks.length > 0;

  // Build markedDates
  const markedDates = useMemo(() => {
    const marks: Record<string, { dotColor: string }> = {};
    const now = new Date();
    for (let offset = -30; offset <= 30; offset++) {
      const d = new Date(now);
      d.setDate(d.getDate() + offset);
      const ymd = toYMD(d);
      const dow = d.getDay();
      if (recurringByDay[dow]?.length > 0 || kidRecurringByDay[dow]?.length > 0) {
        marks[ymd] = { dotColor: C.purple };
      }
    }
    for (const e of oneTimeEvents) {
      if (!e.date) continue;
      // Multi-day events: mark every day in the [date…endDate] range.
      const end = e.endDate && e.endDate > e.date ? e.endDate : e.date;
      const cur = new Date(e.date + "T00:00:00");
      const last = new Date(end + "T00:00:00");
      for (let i = 0; i < 366 && cur <= last; i++) {
        marks[toYMD(cur)] = { dotColor: C.purple };
        cur.setDate(cur.getDate() + 1);
      }
    }
    for (const b of kidOneTimeBlocks) {
      if (b.date) marks[b.date] = { dotColor: C.purple };
    }
    return marks;
  }, [recurringByDay, oneTimeEvents, kidRecurringByDay, kidOneTimeBlocks]);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Month / Week / Day toggle */}
        <View style={styles.viewToggle}>
          <SegmentedPills
            value={calendarView}
            onChange={(v) => setCalendarView(v as CalendarView)}
            options={[
              { value: "month", label: t("calendar.monthView") },
              { value: "week", label: t("calendar.weekView") },
              { value: "day", label: t("calendar.dayView") },
            ]}
            testIDPrefix="calendar-view"
          />
        </View>

        {/* Calendar */}
        <Card style={styles.card} mode="elevated">
          <Card.Content>
            {calendarView === "month" && (
              <MonthCalendar
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
                markedDates={markedDates}
                accentColor={C.purple}
              />
            )}
            {calendarView === "week" && (
              <WeekCalendar
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
                markedDates={markedDates}
                accentColor={C.purple}
                onEventPress={handleGridEventPress}
                onSlotPress={handleSlotPress}
              />
            )}
            {calendarView === "day" && (
              <DayCalendar
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
                accentColor={C.purple}
                onEventPress={handleGridEventPress}
                onSlotPress={handleSlotPress}
              />
            )}
          </Card.Content>
        </Card>

        {/* Events for selected date */}
        <SectionHeader label={t("calendar.eventsForDate", { day: dayName(selectedDow) })} />

        {!hasAnyItems ? (
          <Text style={styles.emptyText}>
            {t("calendar.noEvents")}
          </Text>
        ) : (
          <Card style={styles.card} mode="elevated">
            <Card.Content>
              {dayAgenda.map((row) =>
                row.kind === "event" ? (
                  <EventRow
                    key={`e-${row.item.id}`}
                    event={row.item}
                    onEdit={() => openEdit(row.item)}
                    onDelete={() => requestDelete(() => deleteFamilyEventRemote(row.item.id))}
                  />
                ) : (
                  <KidBlockRow
                    key={`b-${row.item.id}`}
                    block={row.item}
                    onEdit={() => openEditBlock(row.item)}
                    onDelete={() => requestDelete(() => deleteScheduleBlockRemote(row.item.id))}
                  />
                ),
              )}
            </Card.Content>
          </Card>
        )}
      </ScrollView>

      {/* FAB */}
      <FAB
        icon="plus"
        style={[styles.fab, { bottom: insets.bottom + S.lg }]}
        color="#FFF"
        onPress={openAdd}
        // a11y + automation hooks (QA Pass 2 BUG #8 — FAB had zero a11y props,
        // its DOM tree had no role/cursor/aria/testID anywhere on web).
        accessibilityRole="button"
        accessibilityLabel={t("calendar.addEvent")}
        testID="add-event-fab"
      />

      <FamilyEventModal
        visible={modalOpen}
        onDismiss={() => {
          setModalOpen(false);
          setEditingEvent(null);
          setSlotStartTime(undefined);
          setSlotEndTime(undefined);
        }}
        editEvent={editingEvent}
        defaultDaysOfWeek={[selectedDow]}
        defaultDate={selectedDate}
        defaultStartTime={slotStartTime}
        defaultEndTime={slotEndTime}
        onSubmit={handleSubmit}
        onDelete={editingEvent ? () => requestDelete(() => deleteFamilyEventRemote(editingEvent.id)) : undefined}
      />

      <ScheduleBlockModal
        visible={blockModalOpen}
        onDismiss={() => {
          setBlockModalOpen(false);
          setEditingBlock(null);
        }}
        editBlock={editingBlock}
        defaultDaysOfWeek={[selectedDow]}
        defaultDate={selectedDate}
        onSubmit={(data) => {
          if (editingBlock) {
            updateScheduleBlockRemote(editingBlock.id, data);
          }
        }}
        onDelete={editingBlock ? () => requestDelete(() => deleteScheduleBlockRemote(editingBlock.id)) : undefined}
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

  viewToggle: { marginBottom: S.md },
  card: { borderRadius: R.lg, backgroundColor: C.surface, marginBottom: S.lg },
  emptyText: {
    color: C.textMuted,
    textAlign: TEXT_RIGHT,
    fontSize: 14,
    paddingVertical: S.xs,
  },

  // Event row — matches Today's blockRow pattern
  eventRow: {
    flexDirection: RTL_ROW,
    alignItems: "center",
    paddingVertical: S.md,
    borderRadius: R.sm,
    paddingHorizontal: S.xs,
  },
  eventStripe: {
    width: 3,
    borderRadius: 2,
    alignSelf: "stretch",
    marginEnd: S.md,
    marginStart: S.xs,
  },
  eventInfo: { flex: 1 },
  eventTitleRow: {
    flexDirection: RTL_ROW,
    alignItems: "center",
    gap: S.sm,
  },
  eventTitle: { fontSize: 15, fontWeight: "600", color: C.textPrimary, textAlign: TEXT_RIGHT },
  eventMetaRow: { flexDirection: RTL_ROW, alignItems: "center", gap: S.sm, marginTop: 2 },
  eventTime: { fontSize: 12, color: C.textSecondary, textAlign: TEXT_RIGHT },
  assigneeBadge: {
    fontSize: 10,
    fontWeight: "600",
    paddingHorizontal: S.sm,
    paddingVertical: 3,
    borderRadius: R.sm,
    overflow: "hidden",
  },
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

  fab: {
    position: "absolute",
    left: S.lg,
    bottom: S.lg,
    borderRadius: R.lg,
    backgroundColor: C.purple,
  },
});
