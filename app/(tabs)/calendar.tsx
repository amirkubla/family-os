/**
 * Calendar tab — Family-level events (not kid-specific).
 *
 * Shows a month calendar with event dots and a list of events for the selected date.
 * FAB to add new family events.
 */

import React, { useState, useMemo } from "react";
import { View, StyleSheet, ScrollView, Pressable } from "react-native";
import {
  Card,
  Text,
  IconButton,
  FAB,
  SegmentedButtons,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

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
import { RTL_ROW } from "@src/ui/rtl";
import { C, R, S } from "@src/ui/tokens";
import { TYPE_COLORS, ASSIGNEE_COLORS } from "@src/ui/semanticColors";

import MonthCalendar from "@src/components/Calendar/MonthCalendar";
import WeekCalendar from "@src/components/Calendar/WeekCalendar";
import FamilyEventModal from "@src/components/FamilyEventModal";
import ScheduleBlockModal from "@src/components/ScheduleBlockModal";
import FamilyBadge from "@src/components/FamilyBadge";
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
    <Pressable style={styles.eventRow} onPress={onEdit}>
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
            {minutesToHHMM(event.startMinutes)} – {minutesToHHMM(event.endMinutes)}
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
      <IconButton icon="trash-can-outline" size={18} onPress={onDelete} />
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
  const typeColor = TYPE_COLORS[block.type];

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

type CalendarView = "month" | "week";

export default function CalendarScreen() {
  const [calendarView, setCalendarView] = useState<CalendarView>("month");
  const [selectedDate, setSelectedDate] = useState(toYMD(new Date()));
  const selectedDow = dayOfWeekFromYMD(selectedDate);
  const dayEvents = useFamilyEventsForDate(selectedDate, selectedDow);
  const dayBlocks = useAllKidBlocksForDate(selectedDate, selectedDow);

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

  const openAdd = () => {
    setEditingEvent(null);
    setModalOpen(true);
  };

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
    dayOfWeek: number;
    startMinutes: number;
    endMinutes: number;
    location?: string;
    isRecurring: boolean;
    date?: string;
  }) => {
    if (editingEvent) {
      updateFamilyEventRemote(editingEvent.id, data);
    } else {
      addFamilyEventRemote(data);
    }
  };

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
      if (e.date) marks[e.date] = { dotColor: C.purple };
    }
    for (const b of kidOneTimeBlocks) {
      if (b.date) marks[b.date] = { dotColor: C.purple };
    }
    return marks;
  }, [recurringByDay, oneTimeEvents, kidRecurringByDay, kidOneTimeBlocks]);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text variant="headlineLarge" style={styles.title}>
          {t("calendar.title")}
        </Text>
        <FamilyBadge />

        {/* Month / Week toggle */}
        <SegmentedButtons
          value={calendarView}
          onValueChange={(v) => setCalendarView(v as CalendarView)}
          buttons={[
            { value: "month", label: t("calendar.monthView") },
            { value: "week", label: t("calendar.weekView") },
          ]}
          style={styles.viewToggle}
        />

        {/* Calendar */}
        <Card style={styles.card} mode="elevated">
          <Card.Content>
            {calendarView === "month" ? (
              <MonthCalendar
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
                markedDates={markedDates}
                accentColor={C.purple}
              />
            ) : (
              <WeekCalendar
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
                markedDates={markedDates}
                accentColor={C.purple}
              />
            )}
          </Card.Content>
        </Card>

        {/* Events for selected date */}
        <Text variant="titleMedium" style={styles.sectionTitle}>
          {t("calendar.eventsForDate", { day: dayName(selectedDow) })}
        </Text>

        {!hasAnyItems ? (
          <Text variant="bodyMedium" style={styles.emptyText}>
            {t("calendar.noEvents")}
          </Text>
        ) : (
          <Card style={styles.card} mode="elevated">
            <Card.Content>
              {dayEvents.map((event) => (
                <EventRow
                  key={event.id}
                  event={event}
                  onEdit={() => openEdit(event)}
                  onDelete={() => requestDelete(() => deleteFamilyEventRemote(event.id))}
                />
              ))}
              {dayBlocks.map((block) => (
                <KidBlockRow
                  key={block.id}
                  block={block}
                  onEdit={() => openEditBlock(block)}
                  onDelete={() => requestDelete(() => deleteScheduleBlockRemote(block.id))}
                />
              ))}
            </Card.Content>
          </Card>
        )}
      </ScrollView>

      {/* FAB */}
      <FAB
        icon="plus"
        style={styles.fab}
        color="#FFF"
        onPress={openAdd}
      />

      <FamilyEventModal
        visible={modalOpen}
        onDismiss={() => {
          setModalOpen(false);
          setEditingEvent(null);
        }}
        editEvent={editingEvent}
        defaultDayOfWeek={selectedDow}
        defaultDate={selectedDate}
        onSubmit={handleSubmit}
      />

      <ScheduleBlockModal
        visible={blockModalOpen}
        onDismiss={() => {
          setBlockModalOpen(false);
          setEditingBlock(null);
        }}
        editBlock={editingBlock}
        defaultDayOfWeek={selectedDow}
        defaultDate={selectedDate}
        onSubmit={(data) => {
          if (editingBlock) {
            updateScheduleBlockRemote(editingBlock.id, data);
          }
        }}
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
  container: { padding: S.xl, paddingBottom: 80 },
  title: {
    fontWeight: "800",
    color: C.textPrimary,
    marginBottom: S.xl,
    textAlign: "right",
  },

  viewToggle: { marginBottom: S.md },
  card: { borderRadius: R.lg, backgroundColor: C.surface, marginBottom: S.lg },
  sectionTitle: {
    fontWeight: "700",
    color: C.textPrimary,
    marginBottom: S.sm,
    textAlign: "right",
  },
  emptyText: { color: C.textSecondary, marginBottom: S.md, textAlign: "right" },

  // Event row
  eventRow: {
    flexDirection: RTL_ROW,
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
  },
  eventStripe: {
    width: 4,
    height: 36,
    borderRadius: 2,
    marginEnd: S.md,
    marginStart: S.xs,
  },
  eventInfo: { flex: 1 },
  eventTitleRow: {
    flexDirection: RTL_ROW,
    alignItems: "center",
    gap: S.sm,
  },
  eventTitle: { fontWeight: "600", color: C.textPrimary, textAlign: "right" },
  eventMetaRow: { flexDirection: RTL_ROW, alignItems: "center", gap: S.sm, marginTop: 2 },
  eventTime: { color: C.textSecondary, textAlign: "right" },
  assigneeBadge: {
    fontSize: 11,
    fontWeight: "600",
    paddingHorizontal: S.sm,
    paddingVertical: 2,
    borderRadius: R.sm,
    overflow: "hidden",
  },
  oneTimeBadge: {
    fontSize: 9,
    color: C.amber,
    backgroundColor: C.amber + "22",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: R.sm,
    overflow: "hidden",
    fontWeight: "600",
  },

  fab: {
    position: "absolute",
    left: S.xl,
    bottom: S.xl,
    borderRadius: R.lg,
    backgroundColor: C.purple,
  },
});
