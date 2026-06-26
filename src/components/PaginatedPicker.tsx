/**
 * PaginatedPicker — option chooser used across the onboarding + customization
 * pickers. Dispatches by `kind`:
 *   - "emoji" → the full searchable <EmojiField> (Hebrew + English search over
 *               the entire Unicode emoji set). `options` is ignored.
 *   - "color" → a paged ("carousel") swatch grid: `perPage` swatches at a time
 *               in a fixed `columns`-wide grid; ‹ › arrows page; the page
 *               holding the current value is shown first.
 *
 * RTL-aware: in the color pager the previous arrow sits on the right (→) and
 * the next on the left (←).
 */

import React, { useEffect, useState } from "react";
import { View, Pressable, StyleSheet, Platform } from "react-native";
import { Text } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";

import EmojiField from "./EmojiField";
import { C, R, S } from "@src/ui/tokens";
import { RTL_ROW } from "@src/ui/rtl";

interface Props {
  kind: "emoji" | "color";
  options: readonly string[];
  value: string;
  onChange: (value: string) => void;
  /** Cells per row (default 8). Pool length should be a multiple of this. */
  columns?: number;
  /** Items shown per page (default 40 = 8 × 5). Keep a multiple of columns. */
  perPage?: number;
  /** Test id prefix → `${testIDPrefix}-${option}` per cell, `-prev`/`-next`. */
  testIDPrefix?: string;
}

const isWeb = Platform.OS === "web";
const webCursor = isWeb ? ({ cursor: "pointer" } as any) : {};

export default function PaginatedPicker(props: Props) {
  if (props.kind === "emoji") {
    return (
      <EmojiField
        value={props.value}
        onChange={props.onChange}
        testID={props.testIDPrefix ? `${props.testIDPrefix}-field` : undefined}
      />
    );
  }
  return <ColorPager {...props} />;
}

// Paged colour-swatch grid (the original PaginatedPicker behaviour).
function ColorPager({
  options,
  value,
  onChange,
  columns = 8,
  perPage = 40,
  testIDPrefix,
}: Props) {
  const pageCount = Math.max(1, Math.ceil(options.length / perPage));

  // Start on the page holding the current value (e.g. when editing).
  const valueIndex = options.indexOf(value);
  const [page, setPage] = useState(valueIndex >= 0 ? Math.floor(valueIndex / perPage) : 0);

  // Re-sync to the value's page when the value changes (e.g. reopening this
  // shared, still-mounted picker for a different item).
  useEffect(() => {
    if (valueIndex >= 0) setPage(Math.floor(valueIndex / perPage));
  }, [valueIndex, perPage]);

  const clampedPage = Math.min(page, pageCount - 1);
  const start = clampedPage * perPage;
  const pageItems = options.slice(start, start + perPage);

  const atStart = clampedPage === 0;
  const atEnd = clampedPage >= pageCount - 1;

  // Integer cell widths so exactly `columns` fit per row on every platform.
  const [gridW, setGridW] = useState(0);
  const cellW = gridW > 0 ? Math.floor(gridW / columns) : 0;

  return (
    <View>
      <View style={styles.grid} onLayout={(e) => setGridW(e.nativeEvent.layout.width)}>
        {cellW > 0 &&
          pageItems.map((opt) => (
            <View key={opt} style={[styles.slot, { width: cellW }]}>
              <Pressable
                onPress={() => onChange(opt)}
                accessibilityRole="button"
                accessibilityLabel={opt}
                accessibilityState={{ selected: opt === value }}
                testID={testIDPrefix ? `${testIDPrefix}-${opt}` : undefined}
                style={[styles.colorCell, { backgroundColor: opt }, opt === value && styles.colorSelected, webCursor]}
              />
            </View>
          ))}
      </View>

      {pageCount > 1 && (
        <View style={styles.pager}>
          {/* RTL: previous on the right (→), next on the left (←). */}
          <Pressable
            onPress={() => setPage((p) => Math.max(0, p - 1))}
            disabled={atStart}
            accessibilityRole="button"
            accessibilityLabel="הקודם"
            testID={testIDPrefix ? `${testIDPrefix}-prev` : undefined}
            style={[styles.arrow, webCursor, atStart && styles.arrowDisabled]}
          >
            <Ionicons name="chevron-forward" size={20} color={atStart ? C.border : C.textSecondary} />
          </Pressable>

          <Text style={styles.pageLabel}>{clampedPage + 1}/{pageCount}</Text>

          <Pressable
            onPress={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            disabled={atEnd}
            accessibilityRole="button"
            accessibilityLabel="הבא"
            testID={testIDPrefix ? `${testIDPrefix}-next` : undefined}
            style={[styles.arrow, webCursor, atEnd && styles.arrowDisabled]}
          >
            <Ionicons name="chevron-back" size={20} color={atEnd ? C.border : C.textSecondary} />
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: RTL_ROW,
    flexWrap: "wrap",
    marginBottom: S.xs,
  },
  slot: {
    paddingVertical: 5,
    alignItems: "center",
    justifyContent: "center",
  },
  colorCell: {
    width: "70%",
    aspectRatio: 1,
    borderRadius: 999,
  },
  colorSelected: {
    borderWidth: 3,
    borderColor: C.textPrimary,
  },
  pager: {
    flexDirection: RTL_ROW,
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: S.sm,
    marginTop: S.xs,
  },
  arrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.surfaceSubtle,
  },
  arrowDisabled: { opacity: 0.4 },
  pageLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: C.textSecondary,
  },
});
