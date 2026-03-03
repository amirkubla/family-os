/**
 * MonthCalendar — Reusable pure-RN month grid.
 *
 * Props:
 *   selectedDate  – "YYYY-MM-DD"
 *   onSelectDate  – callback with "YYYY-MM-DD"
 *   markedDates   – optional record { "YYYY-MM-DD": { dotColor?: string } }
 *   accentColor   – optional tint for selected day (defaults to purple)
 *
 * No schedule-specific logic; ready for later per-date events.
 */

import React, { useMemo, useCallback } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Text, IconButton } from "react-native-paper";
import he from "@src/i18n/he";
import { LOCALE } from "@src/i18n";

interface MarkedDate {
  dotColor?: string;
}

interface Props {
  selectedDate: string; // YYYY-MM-DD
  onSelectDate: (date: string) => void;
  markedDates?: Record<string, MarkedDate>;
  accentColor?: string;
}

const DAY_LABELS = he.calendarDays;

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function toYMD(y: number, m: number, d: number): string {
  return `${y}-${pad(m + 1)}-${pad(d)}`;
}

export default function MonthCalendar({
  selectedDate,
  onSelectDate,
  markedDates,
  accentColor = "#6C63FF",
}: Props) {
  const [viewYear, viewMonth] = useMemo(() => {
    const parts = selectedDate.split("-").map(Number);
    return [parts[0], parts[1] - 1]; // JS month 0-indexed
  }, [selectedDate]);

  const [year, setYear] = React.useState(viewYear);
  const [month, setMonth] = React.useState(viewMonth);

  // Sync view when selectedDate changes externally
  React.useEffect(() => {
    const parts = selectedDate.split("-").map(Number);
    setYear(parts[0]);
    setMonth(parts[1] - 1);
  }, [selectedDate]);

  const goBack = useCallback(() => {
    setMonth((m) => {
      if (m === 0) {
        setYear((y) => y - 1);
        return 11;
      }
      return m - 1;
    });
  }, []);

  const goForward = useCallback(() => {
    setMonth((m) => {
      if (m === 11) {
        setYear((y) => y + 1);
        return 0;
      }
      return m + 1;
    });
  }, []);

  const today = useMemo(() => {
    const d = new Date();
    return toYMD(d.getFullYear(), d.getMonth(), d.getDate());
  }, []);

  // Build grid: 6 rows × 7 cols of { day, ymd } | null
  const grid = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells: (null | { day: number; ymd: string })[] = [];

    // leading blanks
    for (let i = 0; i < firstDay; i++) cells.push(null);

    // days
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ day: d, ymd: toYMD(year, month, d) });
    }

    // trailing blanks to fill last row
    while (cells.length % 7 !== 0) cells.push(null);

    // split into rows
    const rows: (typeof cells)[] = [];
    for (let i = 0; i < cells.length; i += 7) {
      rows.push(cells.slice(i, i + 7));
    }
    return rows;
  }, [year, month]);

  const monthLabel = new Date(year, month).toLocaleString(LOCALE, {
    month: "long",
    year: "numeric",
  });

  return (
    <View style={styles.root}>
      {/* Header: > Month Year < (RTL: forward on left, back on right) */}
      <View style={styles.header}>
        <IconButton icon="chevron-right" size={22} onPress={goForward} />
        <Text variant="titleMedium" style={styles.monthLabel}>
          {monthLabel}
        </Text>
        <IconButton icon="chevron-left" size={22} onPress={goBack} />
      </View>

      {/* Day-of-week labels */}
      <View style={styles.weekRow}>
        {DAY_LABELS.map((d, i) => (
          <View key={i} style={styles.cell}>
            <Text variant="labelSmall" style={styles.dayLabel}>
              {d}
            </Text>
          </View>
        ))}
      </View>

      {/* Date grid */}
      {grid.map((row, ri) => (
        <View key={ri} style={styles.weekRow}>
          {row.map((cell, ci) => {
            if (!cell) {
              return <View key={ci} style={styles.cell} />;
            }

            const isSelected = cell.ymd === selectedDate;
            const isToday = cell.ymd === today;
            const mark = markedDates?.[cell.ymd];

            return (
              <Pressable
                key={ci}
                style={[
                  styles.cell,
                  styles.dayCell,
                  isSelected && { backgroundColor: accentColor },
                  isToday && !isSelected && styles.todayCell,
                ]}
                onPress={() => onSelectDate(cell.ymd)}
              >
                <Text
                  style={[
                    styles.dayNum,
                    isSelected && styles.selectedText,
                    isToday && !isSelected && { color: accentColor },
                  ]}
                >
                  {cell.day}
                </Text>
                {mark && (
                  <View
                    style={[
                      styles.dot,
                      { backgroundColor: mark.dotColor ?? accentColor },
                    ]}
                  />
                )}
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const CELL_SIZE = 40;

const styles = StyleSheet.create({
  root: { paddingHorizontal: 4 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  monthLabel: { fontWeight: "700", color: "#1A1A2E", textAlign: "center" },
  weekRow: { flexDirection: "row" },
  cell: {
    flex: 1,
    height: CELL_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  dayLabel: { color: "#8E8BA8", fontWeight: "600", textAlign: "center" },
  dayCell: { borderRadius: CELL_SIZE / 2, marginVertical: 1 },
  todayCell: {
    borderWidth: 1.5,
    borderColor: "#6C63FF",
  },
  dayNum: { fontSize: 14, fontWeight: "500", color: "#1A1A2E", textAlign: "center" },
  selectedText: { color: "#FFFFFF", fontWeight: "700" },
  dot: {
    position: "absolute",
    bottom: 4,
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
});
