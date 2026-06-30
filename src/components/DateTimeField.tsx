/**
 * DateTimeField — a compact pill showing a time or date; tapping opens a
 * PickerSheet with the matching wheel. Keeps a draft while the sheet is open
 * so Cancel discards and Done commits.
 *
 * Drop-in for a form field: pass the current value + onChange (same "HH:MM" /
 * "YYYY-MM-DD" contract as WheelTimePicker / WheelDatePicker).
 */

import React, { useState } from "react";
import { Pressable, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import PickerSheet from "./PickerSheet";
import WheelTimePicker from "./WheelTimePicker";
import WheelDatePicker, { formatDateShortHe } from "./DatePicker";
import { C, R, S } from "@src/ui/tokens";
import { RTL_ROW } from "@src/ui/rtl";
import { useThemeColor } from "@src/ui/useThemeColor";

interface Props {
  mode: "time" | "date";
  value: string; // "HH:MM" (time) or "YYYY-MM-DD" (date)
  onChange: (value: string) => void;
  /** Sheet header title, e.g. "שעת התחלה". */
  title: string;
  disabled?: boolean;
  error?: boolean;
  testID?: string;
}

export default function DateTimeField({ mode, value, onChange, title, disabled, error, testID }: Props) {
  const theme = useThemeColor();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);

  const display = mode === "time" ? value : formatDateShortHe(value);
  const icon = mode === "time" ? "time-outline" : "calendar-outline";

  return (
    <>
      <Pressable
        testID={testID}
        style={[styles.field, error && styles.fieldError, disabled && styles.fieldDisabled]}
        onPress={() => { if (disabled) return; setDraft(value); setOpen(true); }}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={`${title}: ${display}`}
      >
        <Ionicons name={icon} size={16} color={disabled ? C.textMuted : theme} />
        <Text style={[styles.value, disabled && { color: C.textMuted }]} numberOfLines={1}>{display}</Text>
      </Pressable>

      <PickerSheet
        visible={open}
        title={title}
        onCancel={() => setOpen(false)}
        onDone={() => { onChange(draft); setOpen(false); }}
      >
        {mode === "time" ? (
          <WheelTimePicker value={draft} onChange={setDraft} />
        ) : (
          <WheelDatePicker value={draft} onChange={setDraft} />
        )}
      </PickerSheet>
    </>
  );
}

const styles = StyleSheet.create({
  field: {
    flexDirection: RTL_ROW,
    alignItems: "center",
    justifyContent: "center",
    gap: S.xs + 2,
    paddingVertical: S.sm + 2,
    paddingHorizontal: S.md,
    borderRadius: R.md,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
  },
  fieldError: { borderColor: C.red },
  fieldDisabled: { opacity: 0.5 },
  value: {
    fontSize: 15,
    fontWeight: "700",
    color: C.textPrimary,
    writingDirection: "rtl",
  },
});
