/**
 * DayCalendar — Single-day time-grid view.
 *
 * Shows a scrollable grid with:
 *   - Date navigation header (prev/next day + formatted date)
 *   - Hour labels on the left axis (07:00–21:00)
 *   - Single wide column with events as positioned colored blocks
 *   - Overlapping events rendered side-by-side
 */

import React, { useMemo, useCallback } from "react";
import { View, StyleSheet, ScrollView, Pressable, Platform } from "react-native";
import { Text, IconButton } from "react-native-paper";
import { minutesToHHMM } from "@src/utils/time";
import { dayOfWeekFromYMD } from "@src/utils/date";
import { formatDateHe } from "@src/components/DatePicker";
import { useFamilyEventsForDate } from "@src/store/familyEventSelectors";
import { useAllKidBlocksForDate } from "@src/store/scheduleSelectors";
import { useFamilyStore } from "@src/store/useFamilyStore";
import { C, S, R } from "@src/ui/tokens";
import { TEXT_RIGHT } from "@src/ui/rtl";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Props {
  selectedDate: string; // YYYY-MM-DD
  onSelectDate: (date: string) => void;
  accentColor?: string;
  onEventPress?: (id: string, source: "event" | "block") => void;
  onSlotPress?: (date: string, startMinutes: number, endMinutes: number) => void;
}

interface EventItem {
  id: string;
  title: string;
  color: string;
  startMinutes: number;
  endMinutes: number;
  source: "event" | "block";
  icon: string;
  location?: string;
}

interface LayoutedEvent extends EventItem {
  column: number;
  totalColumns: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_ACCENT = "#6C63FF";
const FAMILY_COLOR = "#4ECDC4";
const KID_COLOR = "#FF6B6B";
const MEMBER_COLOR = "#6C63FF";

const GRID_START_HOUR = 7;
const GRID_END_HOUR = 21;
const HOUR_HEIGHT = 60;
const TIME_LABEL_WIDTH = 44;
const GRID_HEIGHT = (GRID_END_HOUR - GRID_START_HOUR) * HOUR_HEIGHT;

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function addDaysToYMD(dateStr: string, offset: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + offset);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// ---------------------------------------------------------------------------
// Overlap layout (same algorithm as WeekCalendar)
// ---------------------------------------------------------------------------

function layoutEvents(events: EventItem[]): LayoutedEvent[] {
  if (events.length === 0) return [];

  const sorted = [...events].sort(
    (a, b) => a.startMinutes - b.startMinutes || a.endMinutes - b.endMinutes,
  );
  const result: LayoutedEvent[] = [];
  const columns: number[] = [];

  for (const ev of sorted) {
    let col = -1;
    for (let c = 0; c < columns.length; c++) {
      if (columns[c] <= ev.startMinutes) {
        col = c;
        break;
      }
    }
    if (col === -1) {
      col = columns.length;
      columns.push(0);
    }
    columns[col] = ev.endMinutes;
    result.push({ ...ev, column: col, totalColumns: 0 });
  }

  const groups: number[][] = [];
  for (let i = 0; i < result.length; i++) {
    let placed = false;
    for (const group of groups) {
      const overlaps = group.some((gi) => {
        const a = result[gi];
        const b = result[i];
        return a.startMinutes < b.endMinutes && b.startMinutes < a.endMinutes;
      });
      if (overlaps) {
        group.push(i);
        placed = true;
        break;
      }
    }
    if (!placed) {
      groups.push([i]);
    }
  }

  for (const group of groups) {
    const maxCol = Math.max(...group.map((i) => result[i].column)) + 1;
    for (const i of group) {
      result[i].totalColumns = maxCol;
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const SLOT_HEIGHT = HOUR_HEIGHT / 2;

export default function DayCalendar({
  selectedDate,
  onSelectDate,
  accentColor = DEFAULT_ACCENT,
  onEventPress,
  onSlotPress,
}: Props) {
  const selectedDow = dayOfWeekFromYMD(selectedDate);
  const familyEvents = useFamilyEventsForDate(selectedDate, selectedDow);
  const kidBlocks = useAllKidBlocksForDate(selectedDate, selectedDow);
  const kids = useFamilyStore((s) => s.kids);
  const familyMembers = useFamilyStore((s) => s.familyMembers);

  const goBack = useCallback(
    () => onSelectDate(addDaysToYMD(selectedDate, -1)),
    [selectedDate, onSelectDate],
  );
  const goForward = useCallback(
    () => onSelectDate(addDaysToYMD(selectedDate, 1)),
    [selectedDate, onSelectDate],
  );

  const dayItems = useMemo<LayoutedEvent[]>(() => {
    const items: EventItem[] = [];

    for (const e of familyEvents) {
      const icon =
        e.assigneeType === "kid" && e.assigneeId
          ? (kids.find((k) => k.id === e.assigneeId)?.emoji ?? "👨‍👩‍👧‍👦")
          : e.assigneeType === "member" && e.assigneeId
            ? (familyMembers.find((m) => m.id === e.assigneeId)?.avatarEmoji ?? "👤")
            : "👨‍👩‍👧‍👦";
      items.push({
        id: e.id,
        title: e.title,
        color:
          e.color ??
          (e.assigneeType === "family"
            ? FAMILY_COLOR
            : e.assigneeType === "member"
              ? MEMBER_COLOR
              : KID_COLOR),
        startMinutes: e.startMinutes,
        endMinutes: e.endMinutes,
        source: "event",
        icon,
        location: e.location,
      });
    }

    for (const b of kidBlocks) {
      const kid = kids.find((k) => k.id === b.kidId);
      items.push({
        id: b.id,
        title: b.title,
        color: b.color ?? kid?.color ?? KID_COLOR,
        startMinutes: b.startMinutes,
        endMinutes: b.endMinutes,
        source: "block",
        icon: kid?.emoji ?? "👶",
        location: b.location,
      });
    }

    return layoutEvents(items);
  }, [familyEvents, kidBlocks, kids, familyMembers]);

  const hours = useMemo(() => {
    const h: number[] = [];
    for (let i = GRID_START_HOUR; i <= GRID_END_HOUR; i++) h.push(i);
    return h;
  }, []);

  return (
    <View style={styles.root}>
      {/* Header: prev  date label  next */}
      <View style={styles.header}>
        <IconButton icon="chevron-right" size={22} onPress={goForward} />
        <Text variant="titleMedium" style={styles.dateLabel}>
          {formatDateHe(selectedDate)}
        </Text>
        <IconButton icon="chevron-left" size={22} onPress={goBack} />
      </View>

      {/* Time grid */}
      <ScrollView style={styles.gridScroll} nestedScrollEnabled>
        <View style={styles.gridContainer}>
          {/* Hour rows */}
          {hours.map((hour) => {
            const top = (hour - GRID_START_HOUR) * HOUR_HEIGHT;
            return (
              <View key={hour} style={[styles.hourRow, { top }]}>
                <Text style={styles.hourLabel}>{pad(hour)}:00</Text>
                <View style={styles.hourLine} />
              </View>
            );
          })}

          {/* Single day column with events */}
          <View style={styles.dayColumnContainer}>
            <View style={styles.timeLabelSpacer} />
            <View style={styles.dayColumn}>
              {/* Clickable half-hour slot overlays */}
              {onSlotPress && Array.from({ length: (GRID_END_HOUR - GRID_START_HOUR) * 2 }, (_, si) => {
                const slotStart = (GRID_START_HOUR * 60) + (si * 30);
                const slotEnd = slotStart + 60;
                return (
                  <Pressable
                    key={`slot-${si}`}
                    style={({ hovered }: any) => [
                      styles.timeSlot,
                      { top: si * SLOT_HEIGHT, height: SLOT_HEIGHT },
                      hovered && styles.timeSlotHover,
                    ]}
                    onPress={() => onSlotPress(selectedDate, slotStart, Math.min(slotEnd, GRID_END_HOUR * 60))}
                  />
                );
              })}
              {dayItems.map((ev) => {
                const clampedStart = Math.max(ev.startMinutes, GRID_START_HOUR * 60);
                const clampedEnd = Math.min(ev.endMinutes, GRID_END_HOUR * 60);
                const top = ((clampedStart - GRID_START_HOUR * 60) / 60) * HOUR_HEIGHT;
                const height = Math.max(
                  ((clampedEnd - clampedStart) / 60) * HOUR_HEIGHT,
                  24,
                );
                const widthPercent = 100 / ev.totalColumns;
                const leftPercent = ev.column * widthPercent;

                return (
                  <Pressable
                    key={ev.id}
                    style={({ hovered }: any) => [
                      styles.eventBlock,
                      {
                        top,
                        height,
                        left: `${leftPercent}%` as any,
                        width: `${widthPercent - 1}%` as any,
                        backgroundColor: hovered ? ev.color + "40" : ev.color + "22",
                        borderLeftColor: ev.color,
                      },
                    ]}
                    onPress={() => onEventPress?.(ev.id, ev.source)}
                    {...(Platform.OS === "web"
                      ? ({ onClick: (e: any) => e.stopPropagation() } as any)
                      : {})}
                  >
                    <View style={styles.eventRow}>
                      <Text style={styles.eventIcon}>{ev.icon}</Text>
                      <View style={styles.eventInfo}>
                        <Text
                          style={[styles.eventTitle, { color: ev.color }]}
                          numberOfLines={1}
                        >
                          {ev.title}
                        </Text>
                        <Text style={styles.eventTime}>
                          {minutesToHHMM(ev.startMinutes)} – {minutesToHHMM(ev.endMinutes)}
                          {ev.location ? `  ·  ${ev.location}` : ""}
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  root: { paddingBottom: 4 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  dateLabel: {
    fontWeight: "700",
    color: C.textPrimary,
    textAlign: "center",
    flex: 1,
  },

  gridScroll: {
    height: 400,
  },
  gridContainer: {
    height: GRID_HEIGHT,
    position: "relative",
  },

  hourRow: {
    position: "absolute",
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "flex-start",
    height: HOUR_HEIGHT,
  },
  hourLabel: {
    width: TIME_LABEL_WIDTH,
    fontSize: 10,
    color: C.textMuted,
    textAlign: "center",
    marginTop: -6,
  },
  hourLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: C.border,
  },

  dayColumnContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: GRID_HEIGHT,
    flexDirection: "row",
  },
  timeLabelSpacer: {
    width: TIME_LABEL_WIDTH,
  },
  dayColumn: {
    flex: 1,
    position: "relative",
  },

  timeSlot: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 0,
    ...(Platform.OS === "web" ? ({ cursor: "pointer" } as any) : {}),
  },
  timeSlotHover: {
    backgroundColor: "rgba(108, 99, 255, 0.06)",
  },

  eventBlock: {
    position: "absolute",
    borderLeftWidth: 4,
    borderRadius: R.sm,
    paddingHorizontal: S.sm,
    paddingVertical: S.xs,
    overflow: "hidden",
    marginRight: 2,
    zIndex: 1,
    ...(Platform.OS === "web" ? ({ cursor: "pointer" } as any) : {}),
  },
  eventRow: {
    flexDirection: "row-reverse",
    alignItems: "flex-start",
    gap: S.sm,
  },
  eventIcon: {
    fontSize: 14,
    marginTop: 1,
  },
  eventInfo: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 13,
    fontWeight: "700",
    textAlign: TEXT_RIGHT,
  },
  eventTime: {
    fontSize: 11,
    color: C.textSecondary,
    textAlign: TEXT_RIGHT,
    marginTop: 1,
  },
});
