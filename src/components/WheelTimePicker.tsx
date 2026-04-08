/**
 * WheelTimePicker — Scroll-wheel style time picker with hours & minutes columns.
 *
 * Uses FlatList + snapToInterval for a native-feeling wheel effect.
 * No external dependencies — pure React Native.
 */

import React, { useRef, useCallback, useEffect } from "react";
import { View, FlatList, Text, StyleSheet, Platform } from "react-native";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ITEM_HEIGHT = 40;
const VISIBLE_ITEMS = 5;
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;
const PAD_ITEMS = Math.floor(VISIBLE_ITEMS / 2); // items above/below center

// ---------------------------------------------------------------------------
// Generate data arrays
// ---------------------------------------------------------------------------

const HOURS = Array.from({ length: 24 }, (_, i) => i); // 0–23
const MINUTES_5 = Array.from({ length: 12 }, (_, i) => i * 5); // 0,5,...,55

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface WheelTimePickerProps {
  /** Current value in "HH:MM" format */
  value: string;
  /** Called with new "HH:MM" when user scrolls */
  onChange: (hhmm: string) => void;
  /** Minute step (default 5) */
  minuteStep?: number;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function WheelTimePicker({
  value,
  onChange,
  minuteStep = 5,
}: WheelTimePickerProps) {
  const minutes =
    minuteStep === 5
      ? MINUTES_5
      : Array.from({ length: Math.floor(60 / minuteStep) }, (_, i) => i * minuteStep);

  // Parse current value
  const [h, m] = value.split(":").map(Number);
  const hourIndex = isNaN(h) ? 9 : h; // default 09
  const minuteIndex = isNaN(m) ? 0 : Math.round(m / minuteStep);

  const hourRef = useRef<FlatList>(null);
  const minuteRef = useRef<FlatList>(null);

  // Track selected indices
  const selectedHour = useRef(hourIndex);
  const selectedMinute = useRef(minuteIndex);

  // Scroll to correct position whenever value changes (mount + prop updates)
  useEffect(() => {
    selectedHour.current = hourIndex;
    selectedMinute.current = minuteIndex;
    const timeout = setTimeout(() => {
      hourRef.current?.scrollToOffset({
        offset: hourIndex * ITEM_HEIGHT,
        animated: false,
      });
      minuteRef.current?.scrollToOffset({
        offset: minuteIndex * ITEM_HEIGHT,
        animated: false,
      });
    }, 50);
    return () => clearTimeout(timeout);
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  const emitChange = useCallback(() => {
    const hh = String(selectedHour.current).padStart(2, "0");
    const mm = String(
      (selectedMinute.current < minutes.length
        ? minutes[selectedMinute.current]
        : 0),
    ).padStart(2, "0");
    onChange(`${hh}:${mm}`);
  }, [onChange, minutes]);

  // On web, onMomentumScrollEnd never fires and onScrollEndDrag fires before
  // snapToInterval settles, so we debounce onScroll to capture the final position.
  const hourDebounce = useRef<ReturnType<typeof setTimeout>>();
  const minuteDebounce = useRef<ReturnType<typeof setTimeout>>();

  const onHourScroll = useCallback(
    (e: { nativeEvent: { contentOffset: { y: number } } }) => {
      const idx = Math.round(e.nativeEvent.contentOffset.y / ITEM_HEIGHT);
      const clamped = Math.max(0, Math.min(idx, HOURS.length - 1));
      if (selectedHour.current !== clamped) {
        selectedHour.current = clamped;
        emitChange();
      }
    },
    [emitChange],
  );

  const onMinuteScroll = useCallback(
    (e: { nativeEvent: { contentOffset: { y: number } } }) => {
      const idx = Math.round(e.nativeEvent.contentOffset.y / ITEM_HEIGHT);
      const clamped = Math.max(0, Math.min(idx, minutes.length - 1));
      if (selectedMinute.current !== clamped) {
        selectedMinute.current = clamped;
        emitChange();
      }
    },
    [emitChange, minutes.length],
  );

  const onHourScrollDebounced = useCallback(
    (e: { nativeEvent: { contentOffset: { y: number } } }) => {
      clearTimeout(hourDebounce.current);
      hourDebounce.current = setTimeout(() => onHourScroll(e), 100);
    },
    [onHourScroll],
  );

  const onMinuteScrollDebounced = useCallback(
    (e: { nativeEvent: { contentOffset: { y: number } } }) => {
      clearTimeout(minuteDebounce.current);
      minuteDebounce.current = setTimeout(() => onMinuteScroll(e), 100);
    },
    [onMinuteScroll],
  );

  return (
    <View style={styles.container}>
      {/* Highlight band — sits behind the center row */}
      <View style={styles.highlightBand} pointerEvents="none" />

      {/* Hours column */}
      <WheelColumn
        ref={hourRef}
        data={HOURS}
        initialIndex={hourIndex}
        onScrollEnd={onHourScroll}
        onScroll={Platform.OS === "web" ? onHourScrollDebounced : undefined}
        formatItem={(v) => String(v).padStart(2, "0")}
      />

      {/* Separator (colon) */}
      <Text style={styles.separator}>:</Text>

      {/* Minutes column */}
      <WheelColumn
        ref={minuteRef}
        data={minutes}
        initialIndex={minuteIndex}
        onScrollEnd={onMinuteScroll}
        onScroll={Platform.OS === "web" ? onMinuteScrollDebounced : undefined}
        formatItem={(v) => String(v).padStart(2, "0")}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// WheelColumn — generic scrollable column
// ---------------------------------------------------------------------------

interface WheelColumnProps {
  data: number[];
  initialIndex: number;
  onScrollEnd: (e: { nativeEvent: { contentOffset: { y: number } } }) => void;
  onScroll?: (e: { nativeEvent: { contentOffset: { y: number } } }) => void;
  formatItem: (value: number) => string;
}

const WheelColumn = React.forwardRef<FlatList, WheelColumnProps>(
  ({ data, initialIndex, onScrollEnd, onScroll, formatItem }, ref) => {
    const getItemLayout = useCallback(
      (_: unknown, index: number) => ({
        length: ITEM_HEIGHT,
        offset: ITEM_HEIGHT * index,
        index,
      }),
      [],
    );

    const renderItem = useCallback(
      ({ item }: { item: number }) => (
        <View style={styles.itemContainer}>
          <Text style={styles.itemText}>{formatItem(item)}</Text>
        </View>
      ),
      [formatItem],
    );

    return (
      <FlatList
        ref={ref}
        data={data}
        keyExtractor={(item) => String(item)}
        renderItem={renderItem}
        getItemLayout={getItemLayout}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        bounces={false}
        nestedScrollEnabled
        onMomentumScrollEnd={onScrollEnd}
        onScrollEndDrag={onScrollEnd}
        {...(onScroll && { onScroll, scrollEventThrottle: 16 })}
        style={styles.column}
        contentContainerStyle={{
          paddingTop: PAD_ITEMS * ITEM_HEIGHT,
          paddingBottom: PAD_ITEMS * ITEM_HEIGHT,
        }}
        // Web doesn't support initialScrollIndex well, use scrollToOffset in useEffect
        {...(Platform.OS !== "web" && {
          initialScrollIndex: Math.max(0, initialIndex),
        })}
      />
    );
  },
);

WheelColumn.displayName = "WheelColumn";

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flexDirection: "row-reverse",  // RN Web auto-mirrors in RTL → becomes physical "row" (LTR)
    alignItems: "center",
    justifyContent: "center",
    height: PICKER_HEIGHT,
    overflow: "hidden",
    borderRadius: 12,
    backgroundColor: "#F5F3FF",
  },
  highlightBand: {
    position: "absolute",
    top: PAD_ITEMS * ITEM_HEIGHT,
    left: 8,
    right: 8,
    height: ITEM_HEIGHT,
    backgroundColor: "#E8E6FF",
    borderRadius: 10,
    zIndex: 0,
  },
  separator: {
    fontSize: 22,
    fontWeight: "700",
    color: "#6C63FF",
    marginHorizontal: 4,
    zIndex: 2,
  },
  column: {
    flex: 1,
    height: PICKER_HEIGHT,
    zIndex: 1,
  },
  itemContainer: {
    height: ITEM_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  itemText: {
    fontSize: 20,
    fontFamily: "Rubik",
    color: "#1A1A2E",
  },
});
