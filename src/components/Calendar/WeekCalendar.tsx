/**
 * WeekCalendar — 7-column time-grid view.
 *
 * Shows a scrollable grid with:
 *   - Hour labels on the left axis (07:00–21:00)
 *   - 7 day columns with events as positioned colored blocks
 *   - Overlapping events rendered side-by-side
 *
 * Props mirror MonthCalendar for drop-in usage.
 */

import React, { useMemo, useCallback } from "react";
import { View, StyleSheet, ScrollView, Pressable, Platform } from "react-native";
import { Text, IconButton } from "react-native-paper";
import he from "@src/i18n/he";
import { LOCALE } from "@src/i18n";
import { minutesToHHMM } from "@src/utils/time";
import {
  useFamilyEventRecurringByDay,
  useFamilyEventOneTimeBlocks,
  oneTimeEventOnDate,
} from "@src/store/familyEventSelectors";
import {
  useAllKidRecurringByDay,
  useAllKidOneTimeBlocks,
} from "@src/store/scheduleSelectors";
import { useFamilyStore } from "@src/store/useFamilyStore";
import { C } from "@src/ui/tokens";
import { TEXT_RIGHT, RTL_ROW } from "@src/ui/rtl";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MarkedDate {
  dotColor?: string;
}

interface Props {
  selectedDate: string; // YYYY-MM-DD
  onSelectDate: (date: string) => void;
  markedDates?: Record<string, MarkedDate>; // kept for API compat
  accentColor?: string;
  onEventPress?: (id: string, source: "event" | "block") => void;
  onSlotPress?: (date: string, startMinutes: number, endMinutes: number) => void;
  /**
   * How many day columns to show. 7 (default) = a Sunday-anchored week; a
   * shorter count (e.g. 3) anchors on the selected date and pages by that many
   * days. Lets one component back both the week and the 3-day views.
   */
  dayCount?: number;
  // When set, show ONLY this kid's items: family events assigned to the kid
  // (assigneeType==="kid" && assigneeId===kidId) and the kid's schedule
  // blocks. Unset = the family-wide view (all events + all kids' blocks).
  kidId?: string;
}

interface EventItem {
  id: string;
  title: string;
  color: string;
  startMinutes: number;
  endMinutes: number;
  source: "event" | "block";
  icon: string; // kid emoji or "👨‍👩‍👧‍👦" for family
}

// Overlap layout info
interface LayoutedEvent extends EventItem {
  column: number; // 0-indexed column within overlap group
  totalColumns: number; // total columns in overlap group
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_ACCENT = "#6C63FF";
const FAMILY_COLOR = "#4ECDC4";
const KID_COLOR = "#FF6B6B";
const MEMBER_COLOR = "#6C63FF";

const DAY_LABELS = he.calendarDays; // ["א׳","ב׳","ג׳","ד׳","ה׳","ו׳","ש׳"]

const GRID_START_HOUR = 6;
const GRID_END_HOUR = 29;   // 29 = 24 + 5 → 5 am next day
const HOUR_HEIGHT = 60;
const TIME_LABEL_WIDTH = 36;
const DAY_NUM_SIZE = 24;
// +1 so the last hour label has full HOUR_HEIGHT of space and isn't clipped.
const GRID_HEIGHT = (GRID_END_HOUR - GRID_START_HOUR + 1) * HOUR_HEIGHT;

// Convert event minutes-from-midnight (0-1439) to grid minutes (360-1740).
// Hours before 6 am (0-5 am) wrap to the "next-day" tail of the grid.
function toGridMin(m: number): number {
  return m < GRID_START_HOUR * 60 ? m + 24 * 60 : m;
}

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function ymd(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function startOfWeek(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() - date.getDay());
  return date;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

// ---------------------------------------------------------------------------
// Overlap layout algorithm
// ---------------------------------------------------------------------------

function layoutEvents(events: EventItem[]): LayoutedEvent[] {
  if (events.length === 0) return [];

  const sorted = [...events].sort((a, b) => a.startMinutes - b.startMinutes || a.endMinutes - b.endMinutes);
  const result: LayoutedEvent[] = [];

  // Track end times per column to assign columns
  const columns: number[] = []; // columns[i] = endMinutes of the event in column i

  for (const ev of sorted) {
    // Find the first column where this event fits (no overlap)
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
    result.push({ ...ev, column: col, totalColumns: 0 }); // totalColumns set later
  }

  // Group overlapping events and set totalColumns
  // Events overlap if any pair in the group has overlapping time ranges
  const groups: number[][] = []; // indices into result
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

// Half-hour slot height
const SLOT_HEIGHT = HOUR_HEIGHT / 2;

export default function WeekCalendar({
  selectedDate,
  onSelectDate,
  accentColor = DEFAULT_ACCENT,
  onEventPress,
  onSlotPress,
  dayCount = 7,
  kidId,
}: Props) {
  // ── Week navigation ──
  const [weekOffset, setWeekOffset] = React.useState(0);

  const baseWeekStart = useMemo(() => {
    // Week view (7) starts on Sunday; shorter views anchor on the selected date.
    if (dayCount >= 7) return startOfWeek(selectedDate);
    const [y, m, d] = selectedDate.split("-").map(Number);
    return new Date(y, m - 1, d);
  }, [selectedDate, dayCount]);

  React.useEffect(() => {
    setWeekOffset(0);
  }, [ymd(baseWeekStart)]); // eslint-disable-line react-hooks/exhaustive-deps

  const weekStart = useMemo(() => {
    const d = new Date(baseWeekStart);
    d.setDate(d.getDate() + weekOffset * dayCount);
    return d;
  }, [baseWeekStart, weekOffset, dayCount]);

  const days = useMemo(
    () => Array.from({ length: dayCount }, (_, i) => addDays(weekStart, i)),
    [weekStart, dayCount],
  );

  const today = useMemo(() => ymd(new Date()), []);

  const goBack = useCallback(() => setWeekOffset((o) => o - 1), []);
  const goForward = useCallback(() => setWeekOffset((o) => o + 1), []);

  const weekLabel = useMemo(() => {
    const start = days[0];
    const end = days[days.length - 1];
    if (start.getMonth() === end.getMonth()) {
      const month = end.toLocaleString(LOCALE, { month: "long", year: "numeric" });
      return `${start.getDate()}–${end.getDate()} ${month}`;
    }
    const s = start.toLocaleString(LOCALE, { day: "numeric", month: "short" });
    const e = end.toLocaleString(LOCALE, { day: "numeric", month: "short", year: "numeric" });
    return `${s} – ${e}`;
  }, [days]);

  // ── Event data ──
  const familyRecurringByDow = useFamilyEventRecurringByDay();
  const familyOneTimeEvents = useFamilyEventOneTimeBlocks();
  const kidRecurringByDow = useAllKidRecurringByDay();
  const kidOneTimeBlocks = useAllKidOneTimeBlocks();
  const kids = useFamilyStore((s) => s.kids);
  const familyMembers = useFamilyStore((s) => s.familyMembers);

  const weekEvents = useMemo<Record<string, LayoutedEvent[]>>(() => {
    // Kid scope: keep only this kid's family events / blocks. Unset = all.
    const keepEvent = (e: { assigneeType: string; assigneeId?: string }) =>
      !kidId || (e.assigneeType === "kid" && e.assigneeId === kidId);
    const keepBlock = (b: { kidId: string }) => !kidId || b.kidId === kidId;

    // Colour an event by its assignee — the specific person's colour (so all of
    // a given kid/member's events match their own colour), falling back to the
    // generic role colour only when the person has none / is unknown.
    const eventColor = (e: { color?: string; assigneeType: string; assigneeId?: string }) => {
      // Live assignee colour wins so events follow the person's CURRENT colour;
      // a stored colour is only a stale snapshot, used as a fallback.
      if (e.assigneeType === "member")
        return familyMembers.find((m) => m.id === e.assigneeId)?.color ?? e.color ?? MEMBER_COLOR;
      if (e.assigneeType === "kid")
        return kids.find((k) => k.id === e.assigneeId)?.color ?? e.color ?? KID_COLOR;
      return e.color ?? FAMILY_COLOR;
    };

    const result: Record<string, LayoutedEvent[]> = {};
    for (const day of days) {
      const dow = day.getDay();
      const dateStr = ymd(day);
      const items: EventItem[] = [];

      // Family – recurring
      for (const e of (familyRecurringByDow[dow] ?? []).filter(keepEvent)) {
        const icon = e.assigneeType === "kid" && e.assigneeId
          ? (kids.find((k) => k.id === e.assigneeId)?.emoji ?? "👨‍👩‍👧‍👦")
          : e.assigneeType === "member" && e.assigneeId
            ? (familyMembers.find((m) => m.id === e.assigneeId)?.avatarEmoji ?? "👤")
            : "👨‍👩‍👧‍👦";
        items.push({
          id: e.id,
          title: e.title,
          color: eventColor(e),
          startMinutes: e.startMinutes,
          endMinutes: e.endMinutes,
          source: "event",
          icon,
        });
      }
      // Family – one-time (multi-day events span their whole [date…endDate])
      for (const e of familyOneTimeEvents.filter(keepEvent)) {
        if (oneTimeEventOnDate(e, dateStr)) {
          const icon = e.assigneeType === "kid" && e.assigneeId
            ? (kids.find((k) => k.id === e.assigneeId)?.emoji ?? "👨‍👩‍👧‍👦")
            : e.assigneeType === "member" && e.assigneeId
              ? (familyMembers.find((m) => m.id === e.assigneeId)?.avatarEmoji ?? "👤")
              : "👨‍👩‍👧‍👦";
          items.push({
            id: e.id,
            title: e.title,
            color: eventColor(e),
            startMinutes: e.startMinutes,
            endMinutes: e.endMinutes,
            source: "event",
            icon,
          });
        }
      }
      // Kid blocks – recurring
      for (const b of (kidRecurringByDow[dow] ?? []).filter(keepBlock)) {
        const kid = kids.find((k) => k.id === b.kidId);
        items.push({
          id: b.id,
          title: b.title,
          color: b.color ?? kid?.color ?? KID_COLOR,
          startMinutes: b.startMinutes,
          endMinutes: b.endMinutes,
          source: "block",
          icon: kid?.emoji ?? "👶",
        });
      }
      // Kid blocks – one-time
      for (const b of kidOneTimeBlocks.filter(keepBlock)) {
        if (b.date === dateStr) {
          const kid = kids.find((k) => k.id === b.kidId);
          items.push({
            id: b.id,
            title: b.title,
            color: b.color ?? kid?.color ?? KID_COLOR,
            startMinutes: b.startMinutes,
            endMinutes: b.endMinutes,
            source: "block",
            icon: kid?.emoji ?? "👶",
          });
        }
      }

      result[dateStr] = layoutEvents(items);
    }
    return result;
  }, [days, familyRecurringByDow, familyOneTimeEvents, kidRecurringByDow, kidOneTimeBlocks, kids, familyMembers, kidId]);

  // ── Hour labels ──
  const hours = useMemo(() => {
    const h: number[] = [];
    for (let i = GRID_START_HOUR; i <= GRID_END_HOUR; i++) h.push(i);
    return h;
  }, []);

  // ── Render ──
  return (
    <View style={styles.root}>
      {/* Header (RTL): left arrow = next week, right arrow = previous. */}
      <View style={styles.header}>
        <IconButton icon="chevron-right" size={22} onPress={goBack} />
        <Text variant="titleMedium" style={styles.weekLabel}>
          {weekLabel}
        </Text>
        <IconButton icon="chevron-left" size={22} onPress={goForward} />
      </View>

      {/* Day headers — time-axis spacer FIRST so it sits on the RIGHT (matching
          the hour labels) in RTL_ROW; the 7 day cells fill the remaining width. */}
      <View style={styles.dayHeaderRow}>
        <View style={styles.timeLabelSpacer} />
        {days.map((day, i) => {
          const dateStr = ymd(day);
          const isSelected = dateStr === selectedDate;
          const isToday = dateStr === today;
          return (
            <Pressable
              key={i}
              style={styles.dayHeaderCell}
              onPress={() => onSelectDate(dateStr)}
            >
              <Text style={styles.dowLabel}>{DAY_LABELS[day.getDay()]}</Text>
              <View
                style={[
                  styles.dayNumCircle,
                  isSelected && { backgroundColor: accentColor },
                  isToday && !isSelected && {
                    borderColor: accentColor,
                    borderWidth: 1.5,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.dayNum,
                    isSelected && styles.dayNumSelected,
                    isToday && !isSelected && { color: accentColor },
                  ]}
                >
                  {day.getDate()}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      {/* Time grid (scrollable) */}
      <ScrollView style={styles.gridScroll} nestedScrollEnabled>
        <View style={styles.gridContainer}>
          {/* Hour rows — gridlines + labels */}
          {hours.map((hour) => {
            const top = (hour - GRID_START_HOUR) * HOUR_HEIGHT;
            return (
              <View key={hour} style={[styles.hourRow, { top }]}>
                <Text style={styles.hourLabel}>
                  {pad(hour % 24)}:00
                </Text>
                <View style={styles.hourLine} />
              </View>
            );
          })}

          {/* Day columns with events — time-axis spacer FIRST (RIGHT in RTL_ROW)
              so the 7 columns align with the day headers + the hour-line area. */}
          <View style={styles.dayColumnsContainer}>
            <View style={styles.timeLabelSpacer} />
            {days.map((day, i) => {
              const dateStr = ymd(day);
              const isSelected = dateStr === selectedDate;
              const events = weekEvents[dateStr] ?? [];
              const totalSlots = (GRID_END_HOUR - GRID_START_HOUR) * 2;
              return (
                <View
                  key={i}
                  style={[
                    styles.dayColumn,
                    isSelected && { backgroundColor: accentColor + "0A" },
                    i > 0 && styles.dayColumnBorder,
                  ]}
                >
                  {/* Clickable half-hour slot overlays */}
                  {onSlotPress && Array.from({ length: totalSlots }, (_, si) => {
                    const slotGridStart = (GRID_START_HOUR * 60) + (si * 30);
                    // Convert grid minutes back to 0-1439 for the event modal.
                    const actualStart = slotGridStart >= 24 * 60 ? slotGridStart - 24 * 60 : slotGridStart;
                    const actualEnd = Math.min(actualStart + 60, 24 * 60);
                    return (
                      <Pressable
                        key={si}
                        style={({ hovered }: any) => [
                          styles.timeSlot,
                          { top: si * SLOT_HEIGHT, height: SLOT_HEIGHT },
                          hovered && styles.timeSlotHover,
                        ]}
                        onPress={() => onSlotPress(dateStr, actualStart, actualEnd)}
                      />
                    );
                  })}
                  {events.map((ev) => {
                    const gridStart = toGridMin(ev.startMinutes);
                    const gridEnd = toGridMin(ev.endMinutes);
                    const clampedStart = Math.max(gridStart, GRID_START_HOUR * 60);
                    const clampedEnd = Math.min(gridEnd, GRID_END_HOUR * 60);
                    const top = ((clampedStart - GRID_START_HOUR * 60) / 60) * HOUR_HEIGHT;
                    const height = Math.max(
                      ((clampedEnd - clampedStart) / 60) * HOUR_HEIGHT,
                      18,
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
                            width: `${widthPercent - 2}%` as any,
                            backgroundColor: hovered ? ev.color + "40" : ev.color + "28",
                            // borderStartColor + borderStartWidth (in styles.eventBlock)
                            // put the colored accent stripe on the writing-direction
                            // start side — visual RIGHT in RTL. Using physical
                            // borderLeft* would hardcode it to the left on web
                            // (RN Web doesn't auto-mirror physical sides).
                            borderStartColor: ev.color,
                          },
                        ]}
                        onPress={() => onEventPress?.(ev.id, ev.source)}
                        {...(Platform.OS === "web" ? { onClick: (e: any) => e.stopPropagation() } as any : {})}
                      >
                        <Text style={[styles.eventTitle, { color: ev.color }]} numberOfLines={1}>
                          {ev.icon} {ev.title}
                        </Text>
                        {height > 28 && (
                          <Text style={styles.eventTime} numberOfLines={1}>
                            {minutesToHHMM(ev.startMinutes)} – {minutesToHHMM(ev.endMinutes)}
                          </Text>
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              );
            })}
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

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  weekLabel: {
    fontWeight: "700",
    color: C.textPrimary,
    textAlign: "center",
    flex: 1,
  },

  // Day header row
  dayHeaderRow: {
    flexDirection: RTL_ROW,
    alignItems: "center",
    marginBottom: 4,
  },
  timeLabelSpacer: {
    width: TIME_LABEL_WIDTH,
  },
  dayHeaderCell: {
    flex: 1,
    minWidth: 0, // shrink to the equal column share — never let the circle push neighbors
    alignItems: "center",
    paddingVertical: 2,
  },
  dowLabel: {
    textAlign: "center",
    fontSize: 10,
    color: C.textMuted,
    fontWeight: "600",
    marginBottom: 2,
  },
  dayNumCircle: {
    width: DAY_NUM_SIZE,
    height: DAY_NUM_SIZE,
    borderRadius: DAY_NUM_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  dayNum: {
    fontSize: 12,
    fontWeight: "500",
    color: C.textPrimary,
    textAlign: "center",
  },
  dayNumSelected: { color: "#FFFFFF", fontWeight: "700" },

  // Grid
  gridScroll: {
    height: 400, // visible portion, scrollable
  },
  gridContainer: {
    height: GRID_HEIGHT,
    position: "relative",
  },

  // Hour rows
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
    fontSize: 9,
    color: C.textMuted,
    textAlign: "center",
    marginTop: -6,
  },
  hourLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: C.border,
  },

  // Day columns overlay
  dayColumnsContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: GRID_HEIGHT,
    flexDirection: RTL_ROW,
  },
  dayColumn: {
    flex: 1,
    position: "relative",
  },
  // Column separator on the leading (right in RTL) edge. A logical border is
  // consistent on web + native, so no platform/RTL branch is needed. Applied to
  // every column except the first (i=0, the rightmost) so each adjacent pair —
  // including Saturday|Friday — gets one divider and the outer edge stays clean.
  dayColumnBorder: {
    borderStartWidth: StyleSheet.hairlineWidth,
    borderStartColor: C.border,
  },

  // Time slots (clickable half-hour areas)
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

  // Event blocks. RTL: stripe is on the writing-direction start (visual
  // right in RTL); text right-aligned with explicit writingDirection so
  // mixed emoji + Hebrew renders consistently across web/iOS/Android.
  eventBlock: {
    position: "absolute",
    borderStartWidth: 3,
    borderRadius: 4,
    paddingHorizontal: 3,
    paddingVertical: 2,
    overflow: "hidden",
    marginEnd: 1,
    zIndex: 1,
    ...(Platform.OS === "web" ? ({ cursor: "pointer" } as any) : {}),
  },
  eventTitle: {
    fontSize: 9,
    fontWeight: "700",
    lineHeight: 12,
    textAlign: TEXT_RIGHT,
    writingDirection: "rtl",
  },
  eventTime: {
    fontSize: 8,
    color: C.textSecondary,
    lineHeight: 10,
    textAlign: TEXT_RIGHT,
    writingDirection: "rtl",
  },
});
