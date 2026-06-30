/**
 * WheelTimePicker — Scroll-wheel style time picker with hours & minutes columns.
 *
 * Uses ScrollView + snapToInterval for a native-feeling wheel effect.
 * No external dependencies — pure React Native.
 */

import React, { useRef, useCallback, useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import WheelColumn, { ITEM_HEIGHT, VISIBLE_ITEMS } from "./WheelColumn";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

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

  // Track selected indices; keep them synced when the value prop changes.
  const selectedHour = useRef(hourIndex);
  const selectedMinute = useRef(minuteIndex);
  useEffect(() => {
    selectedHour.current = hourIndex;
    selectedMinute.current = minuteIndex;
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  const emitChange = useCallback(() => {
    const hh = String(selectedHour.current).padStart(2, "0");
    const mm = String(
      selectedMinute.current < minutes.length ? minutes[selectedMinute.current] : 0,
    ).padStart(2, "0");
    onChange(`${hh}:${mm}`);
  }, [onChange, minutes]);

  return (
    <View style={styles.container}>
      {/* Highlight band — sits behind the center row */}
      <View style={styles.highlightBand} pointerEvents="none" />

      <WheelColumn
        data={HOURS}
        selectedIndex={hourIndex}
        onSettle={(i) => { selectedHour.current = i; emitChange(); }}
        format={(v) => String(v).padStart(2, "0")}
        style={styles.col}
      />

      <Text style={styles.separator}>:</Text>

      <WheelColumn
        data={minutes}
        selectedIndex={minuteIndex}
        onSettle={(i) => { selectedMinute.current = i; emitChange(); }}
        format={(v) => String(v).padStart(2, "0")}
        style={styles.col}
      />
    </View>
  );
}

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
    backgroundColor: "transparent",
  },
  highlightBand: {
    position: "absolute",
    top: PAD_ITEMS * ITEM_HEIGHT,
    left: 8,
    right: 8,
    height: ITEM_HEIGHT,
    backgroundColor: "#F0F0F5",
    borderRadius: 10,
    zIndex: 0,
  },
  separator: {
    fontSize: 22,
    fontWeight: "700",
    color: "#9AA0B5",
    marginHorizontal: 4,
    zIndex: 2,
  },
  col: { flex: 1, zIndex: 1 },
});
