/**
 * NumberField — a compact pill showing a number; tapping opens a PickerSheet
 * with a single number wheel. Same look & feel as DateTimeField (date/time
 * pickers): a draft is kept while the sheet is open so Cancel discards and
 * Done commits.
 */

import React, { useMemo, useState } from "react";
import { Pressable, Text, StyleSheet } from "react-native";

import PickerSheet from "./PickerSheet";
import WheelColumn from "./WheelColumn";
import { C, R, S } from "@src/ui/tokens";
import { useThemeColor } from "@src/ui/useThemeColor";

interface Props {
  value: number;
  onChange: (value: number) => void;
  /** Inclusive range for the wheel. */
  min?: number;
  max: number;
  /** Sheet header title. */
  title: string;
  testID?: string;
}

export default function NumberField({ value, onChange, min = 1, max, title, testID }: Props) {
  const theme = useThemeColor();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);

  const data = useMemo(
    () => Array.from({ length: Math.max(1, max - min + 1) }, (_, i) => min + i),
    [min, max],
  );
  const clampedIndex = Math.max(0, Math.min(draft - min, data.length - 1));

  return (
    <>
      <Pressable
        testID={testID}
        style={styles.field}
        onPress={() => { setDraft(value); setOpen(true); }}
        accessibilityRole="button"
        accessibilityLabel={`${title}: ${value}`}
      >
        <Text style={[styles.value, { color: theme }]}>{value}</Text>
      </Pressable>

      <PickerSheet
        visible={open}
        title={title}
        onCancel={() => setOpen(false)}
        onDone={() => { onChange(data[clampedIndex]); setOpen(false); }}
      >
        <WheelColumn
          data={data}
          selectedIndex={clampedIndex}
          onSettle={(i) => setDraft(data[i])}
          format={(n) => String(n)}
          style={styles.wheel}
        />
      </PickerSheet>
    </>
  );
}

const styles = StyleSheet.create({
  field: {
    minWidth: 56,
    paddingVertical: S.sm + 2,
    paddingHorizontal: S.md,
    borderRadius: R.md,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  value: { fontSize: 16, fontWeight: "700" },
  wheel: { width: 120, alignSelf: "center" },
});
