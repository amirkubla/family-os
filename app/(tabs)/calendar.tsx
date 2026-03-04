/**
 * Calendar tab — Family-level events (not kid-specific).
 *
 * Shows a month calendar with event dots and a list of events for the selected date.
 * FAB to add new family events.
 */

import React, { useState, useMemo } from "react";
import { View, StyleSheet, ScrollView, Pressable, Platform } from "react-native";
import {
  Card,
  Text,
  IconButton,
  FAB,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

import { useFamilyStore } from "@src/store/useFamilyStore";
import {
  useFamilyEventsForDate,
  useFamilyEventOneTimeBlocks,
  useFamilyEventRecurringByDay,
} from "@src/store/familyEventSelectors";
import {
  addFamilyEventRemote,
  updateFamilyEventRemote,
  deleteFamilyEventRemote,
} from "@src/lib/sync/remoteCrud";
import type { FamilyEvent, AssigneeType } from "@src/models/familyEvent";
import { minutesToHHMM } from "@src/utils/time";
import { toYMD, dayOfWeekFromYMD } from "@src/utils/date";
import { t, dayName, assigneeTypeLabel } from "@src/i18n";

import MonthCalendar from "@src/components/Calendar/MonthCalendar";
import FamilyEventModal from "@src/components/FamilyEventModal";
import FamilyBadge from "@src/components/FamilyBadge";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ACCENT_COLOR = "#6C63FF";

const ASSIGNEE_COLORS: Record<AssigneeType, string> = {
  family: "#4ECDC4",
  member: "#6C63FF",
  kid: "#FF6B6B",
};

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
      ? `${kid.emoji} ${kid.name}`
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

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function CalendarScreen() {
  const [selectedDate, setSelectedDate] = useState(toYMD(new Date()));
  const selectedDow = dayOfWeekFromYMD(selectedDate);
  const dayEvents = useFamilyEventsForDate(selectedDate, selectedDow);

  // For calendar dots
  const recurringByDay = useFamilyEventRecurringByDay();
  const oneTimeEvents = useFamilyEventOneTimeBlocks();

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<FamilyEvent | null>(null);

  const openAdd = () => {
    setEditingEvent(null);
    setModalOpen(true);
  };

  const openEdit = (event: FamilyEvent) => {
    setEditingEvent(event);
    setModalOpen(true);
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

  // Build markedDates
  const markedDates = useMemo(() => {
    const marks: Record<string, { dotColor: string }> = {};
    // Recurring events: mark 60 days around today
    const now = new Date();
    for (let offset = -30; offset <= 30; offset++) {
      const d = new Date(now);
      d.setDate(d.getDate() + offset);
      const ymd = toYMD(d);
      const dow = d.getDay();
      if (recurringByDay[dow]?.length > 0) {
        marks[ymd] = { dotColor: ACCENT_COLOR };
      }
    }
    // One-time events
    for (const e of oneTimeEvents) {
      if (e.date) {
        marks[e.date] = { dotColor: ACCENT_COLOR };
      }
    }
    return marks;
  }, [recurringByDay, oneTimeEvents]);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text variant="headlineLarge" style={styles.title}>
          {t("calendar.title")}
        </Text>
        <FamilyBadge />

        {/* Calendar */}
        <Card style={styles.card} mode="elevated">
          <Card.Content>
            <MonthCalendar
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              markedDates={markedDates}
              accentColor={ACCENT_COLOR}
            />
          </Card.Content>
        </Card>

        {/* Events for selected date */}
        <Text variant="titleMedium" style={styles.sectionTitle}>
          {t("calendar.eventsForDate", { day: dayName(selectedDow) })}
        </Text>

        {dayEvents.length === 0 ? (
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
                  onDelete={() => deleteFamilyEventRemote(event.id)}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FAFAFE" },
  container: { padding: 20, paddingBottom: 80 },
  title: {
    fontWeight: "800",
    color: "#1A1A2E",
    marginBottom: 20,
    textAlign: "right",
  },

  card: { borderRadius: 16, backgroundColor: "#FFFFFF", marginBottom: 16 },
  sectionTitle: {
    fontWeight: "700",
    color: "#1A1A2E",
    marginBottom: 8,
    textAlign: "right",
  },
  emptyText: { color: "#8E8BA8", marginBottom: 12, textAlign: "right" },

  // Event row
  eventRow: {
    flexDirection: Platform.OS === "web" ? "row-reverse" : "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#F0EEFF",
  },
  eventStripe: {
    width: 4,
    height: 36,
    borderRadius: 2,
    marginEnd: 10,
  },
  eventInfo: { flex: 1 },
  eventTitleRow: {
    flexDirection: Platform.OS === "web" ? "row-reverse" : "row",
    alignItems: "center",
    gap: 8,
  },
  eventTitle: { fontWeight: "600", color: "#1A1A2E", textAlign: "right" },
  eventMetaRow: { flexDirection: Platform.OS === "web" ? "row-reverse" : "row", alignItems: "center", gap: 8, marginTop: 2 },
  eventTime: { color: "#6B6B8D", textAlign: "right" },
  assigneeBadge: {
    fontSize: 11,
    fontWeight: "600",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    overflow: "hidden",
  },
  oneTimeBadge: {
    fontSize: 9,
    color: "#FFA726",
    backgroundColor: "#FFA72622",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    overflow: "hidden",
    fontWeight: "600",
  },

  fab: {
    position: "absolute",
    left: 20,
    bottom: 24,
    borderRadius: 16,
    backgroundColor: "#6C63FF",
  },
});
