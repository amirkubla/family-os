/**
 * DatePicker — Drum-roll (wheel) date picker with Day / Month / Year columns.
 *
 * Same visual language as WheelTimePicker: snapToInterval ScrollViews, a
 * highlight band behind the centre row, purple accent, no external deps.
 *
 * Column order (RTL, right → left):  Day  |  Month  |  Year
 * Columns always show 31 days; the emitted value is clamped to the real
 * month length so 31 Feb → 28 Feb (or 29 in a leap year) silently.
 *
 * Exports:
 *   default   WheelDatePicker  — the picker component
 *   formatDateHe               — "יום שלישי, 4 ביוני 2026" string
 */

import React, { useRef, useCallback, useEffect } from "react";
import { View, ScrollView, Text, StyleSheet, Platform } from "react-native";
import { dayName, dayNameShort } from "@src/i18n";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ITEM_HEIGHT = 40;
const VISIBLE_ITEMS = 5;
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;
const PAD = Math.floor(VISIBLE_ITEMS / 2); // padding rows above/below centre

// ---------------------------------------------------------------------------
// Static data
// ---------------------------------------------------------------------------

const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);          // 1–31
const MONTHS = Array.from({ length: 12 }, (_, i) => i);             // 0–11

const MONTHS_HE_SENTENCE = [
  "בינואר", "בפברואר", "במרץ", "באפריל", "במאי", "ביוני",
  "ביולי", "באוגוסט", "בספטמבר", "באוקטובר", "בנובמבר", "בדצמבר",
];

const MONTHS_HE_SHORT = [
  "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
  "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר",
];

const YEAR_START = 2020;
const YEAR_END   = 2035;
const YEARS = Array.from({ length: YEAR_END - YEAR_START + 1 }, (_, i) => YEAR_START + i);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function daysInMonth(year: number, month1: number): number {
  // month1 is 1-indexed
  return new Date(year, month1, 0).getDate();
}

function parseYMD(ymd: string): { day: number; month: number; year: number } {
  const parts = (ymd ?? "").split("-").map(Number);
  const year  = parts[0] || new Date().getFullYear();
  const month = (parts[1] || 1) - 1; // 0-indexed
  const day   = parts[2] || 1;
  return { day, month, year };
}

function toYMD(year: number, month0: number, day: number): string {
  const m = String(month0 + 1).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${year}-${m}-${d}`;
}

/** "יום שלישי, 4 ביוני 2026" */
export function formatDateHe(ymd: string): string {
  const { day, month, year } = parseYMD(ymd);
  const date = new Date(year, month, day);
  const dow   = dayName(date.getDay());
  return `${dow}, ${day} ${MONTHS_HE_SENTENCE[month]} ${year}`;
}

/** Compact form for a field pill — "ג׳ · 30 ביוני". */
export function formatDateShortHe(ymd: string): string {
  const { day, month, year } = parseYMD(ymd);
  const date = new Date(year, month, day);
  return `${dayNameShort(date.getDay())} · ${day} ${MONTHS_HE_SENTENCE[month]}`;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface Props {
  /** "YYYY-MM-DD" */
  value: string;
  onChange: (ymd: string) => void;
}

// ---------------------------------------------------------------------------
// WheelDatePicker
// ---------------------------------------------------------------------------

export default function WheelDatePicker({ value, onChange }: Props) {
  const { day, month, year } = parseYMD(value);

  // 0-indexed indices into each data array
  const dayIdx  = day - 1;
  const monIdx  = month;
  const yearIdx = Math.max(0, Math.min(year - YEAR_START, YEARS.length - 1));

  const dayRef  = useRef<ScrollView>(null);
  const monRef  = useRef<ScrollView>(null);
  const yearRef = useRef<ScrollView>(null);

  const selDay  = useRef(dayIdx);
  const selMon  = useRef(monIdx);
  const selYear = useRef(yearIdx);

  // Scroll all columns to match the current value prop
  useEffect(() => {
    selDay.current  = dayIdx;
    selMon.current  = monIdx;
    selYear.current = yearIdx;

    const t = setTimeout(() => {
      dayRef.current?.scrollTo({ y: dayIdx  * ITEM_HEIGHT, animated: false });
      monRef.current?.scrollTo({ y: monIdx  * ITEM_HEIGHT, animated: false });
      yearRef.current?.scrollTo({ y: yearIdx * ITEM_HEIGHT, animated: false });
    }, 50);
    return () => clearTimeout(t);
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  const emit = useCallback(() => {
    const y  = YEARS[selYear.current] ?? YEAR_START;
    const m0 = selMon.current; // 0-indexed
    const maxD = daysInMonth(y, m0 + 1);
    const d  = Math.min(selDay.current + 1, maxD);
    onChange(toYMD(y, m0, d));
  }, [onChange]);

  // Web: debounce onScroll; Native: use onMomentumScrollEnd / onScrollEndDrag
  const dayDebounce  = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const monDebounce  = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const yearDebounce = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const onDayScroll = useCallback(
    (e: { nativeEvent: { contentOffset: { y: number } } }) => {
      const idx = Math.round(e.nativeEvent.contentOffset.y / ITEM_HEIGHT);
      selDay.current = Math.max(0, Math.min(idx, DAYS.length - 1));
      emit();
    }, [emit]);

  const onMonScroll = useCallback(
    (e: { nativeEvent: { contentOffset: { y: number } } }) => {
      const idx = Math.round(e.nativeEvent.contentOffset.y / ITEM_HEIGHT);
      selMon.current = Math.max(0, Math.min(idx, MONTHS.length - 1));
      emit();
    }, [emit]);

  const onYearScroll = useCallback(
    (e: { nativeEvent: { contentOffset: { y: number } } }) => {
      const idx = Math.round(e.nativeEvent.contentOffset.y / ITEM_HEIGHT);
      selYear.current = Math.max(0, Math.min(idx, YEARS.length - 1));
      emit();
    }, [emit]);

  const debounced = (
    fn: (e: { nativeEvent: { contentOffset: { y: number } } }) => void,
    timerRef: React.MutableRefObject<ReturnType<typeof setTimeout> | undefined>,
  ) => (e: { nativeEvent: { contentOffset: { y: number } } }) => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => fn(e), 100);
  };

  return (
    <View style={styles.container}>
      {/* Highlight band behind centre row */}
      <View style={styles.highlight} pointerEvents="none" />

      {/* Day column — rightmost in RTL */}
      <WheelCol
        ref={dayRef}
        data={DAYS}
        initialOffset={dayIdx * ITEM_HEIGHT}
        onScrollEnd={onDayScroll}
        onScroll={Platform.OS === "web" ? debounced(onDayScroll, dayDebounce) : undefined}
        formatItem={(v) => String(v).padStart(2, "0")}
        style={styles.colDay}
      />

      <Text style={styles.sep}>·</Text>

      {/* Month column — middle */}
      <WheelCol
        ref={monRef}
        data={MONTHS}
        initialOffset={monIdx * ITEM_HEIGHT}
        onScrollEnd={onMonScroll}
        onScroll={Platform.OS === "web" ? debounced(onMonScroll, monDebounce) : undefined}
        formatItem={(v) => MONTHS_HE_SHORT[v]}
        style={styles.colMonth}
      />

      <Text style={styles.sep}>·</Text>

      {/* Year column — leftmost in RTL */}
      <WheelCol
        ref={yearRef}
        data={YEARS}
        initialOffset={yearIdx * ITEM_HEIGHT}
        onScrollEnd={onYearScroll}
        onScroll={Platform.OS === "web" ? debounced(onYearScroll, yearDebounce) : undefined}
        formatItem={(v) => String(v)}
        style={styles.colYear}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// WheelCol — generic drum-roll ScrollView column
// ---------------------------------------------------------------------------

interface ColProps {
  data: number[];
  initialOffset: number;
  onScrollEnd: (e: { nativeEvent: { contentOffset: { y: number } } }) => void;
  onScroll?: (e: { nativeEvent: { contentOffset: { y: number } } }) => void;
  formatItem: (v: number) => string;
  style?: object;
}

const WheelCol = React.forwardRef<ScrollView, ColProps>(
  ({ data, initialOffset, onScrollEnd, onScroll, formatItem, style }, ref) => (
    <ScrollView
      ref={ref}
      showsVerticalScrollIndicator={false}
      snapToInterval={ITEM_HEIGHT}
      decelerationRate="fast"
      bounces={false}
      nestedScrollEnabled
      onMomentumScrollEnd={onScrollEnd}
      onScrollEndDrag={onScrollEnd}
      {...(onScroll ? { onScroll, scrollEventThrottle: 16 } : {})}
      style={[styles.col, style]}
      contentContainerStyle={{ paddingTop: PAD * ITEM_HEIGHT, paddingBottom: PAD * ITEM_HEIGHT }}
      contentOffset={{ x: 0, y: initialOffset }}
    >
      {data.map((item) => (
        <View key={item} style={styles.item}>
          <Text style={styles.itemText}>{formatItem(item)}</Text>
        </View>
      ))}
    </ScrollView>
  ),
);
WheelCol.displayName = "WheelCol";

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    // row-reverse so RTL reading order: Day (right) | Month (centre) | Year (left)
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    height: PICKER_HEIGHT,
    overflow: "hidden",
    borderRadius: 12,
    backgroundColor: "transparent",
    marginBottom: 8,
  },
  highlight: {
    position: "absolute",
    top: PAD * ITEM_HEIGHT,
    left: 8,
    right: 8,
    height: ITEM_HEIGHT,
    backgroundColor: "#F0F0F5",
    borderRadius: 10,
    zIndex: 0,
  },
  sep: {
    fontSize: 18,
    fontWeight: "700",
    color: "#9AA0B5",
    marginHorizontal: 6,
    zIndex: 2,
  },
  col: {
    height: PICKER_HEIGHT,
    zIndex: 1,
  },
  colDay:   { flex: 1 },
  colMonth: { flex: 2.2 },
  colYear:  { flex: 1.5 },
  item: {
    height: ITEM_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  itemText: {
    fontSize: 18,
    color: "#1A1A2E",
  },
});
