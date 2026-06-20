/**
 * PaginatedPicker — a paged ("carousel") grid for choosing one option from a
 * large pool, without a long vertical scroll. Shows `perPage` items at a time
 * in a fixed `columns`-wide grid (so every row is full); ‹ › arrows page
 * forward/back and a "page/total" label shows position. The page holding the
 * current value is shown first.
 *
 * Two kinds:
 *   - "emoji"  → renders each option as an emoji glyph in a square cell
 *   - "color"  → renders each option (a hex string) as a colour swatch
 *
 * Cells are sized as a percentage of their column slot (not fixed px), so the
 * grid stays even across phone and web widths. RTL-aware: in the pager the
 * previous arrow sits on the right (→) and the next arrow on the left (←).
 */

import React, { useState } from "react";
import { View, Pressable, StyleSheet, Platform } from "react-native";
import { Text } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";

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

export default function PaginatedPicker({
  kind,
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

  const clampedPage = Math.min(page, pageCount - 1);
  const start = clampedPage * perPage;
  const pageItems = options.slice(start, start + perPage);

  const atStart = clampedPage === 0;
  const atEnd = clampedPage >= pageCount - 1;
  const slotWidth = `${100 / columns}%`;

  return (
    <View>
      <View style={styles.grid}>
        {pageItems.map((opt) => (
          <View key={opt} style={[styles.slot, { width: slotWidth as any }]}>
            {kind === "color" ? (
              <Pressable
                onPress={() => onChange(opt)}
                accessibilityRole="button"
                accessibilityLabel={opt}
                accessibilityState={{ selected: opt === value }}
                testID={testIDPrefix ? `${testIDPrefix}-${opt}` : undefined}
                style={[styles.colorCell, { backgroundColor: opt }, opt === value && styles.colorSelected, webCursor]}
              />
            ) : (
              <Pressable
                onPress={() => onChange(opt)}
                accessibilityRole="button"
                accessibilityLabel={opt}
                accessibilityState={{ selected: opt === value }}
                testID={testIDPrefix ? `${testIDPrefix}-${opt}` : undefined}
                style={[styles.emojiCell, opt === value && styles.emojiSelected, webCursor]}
              >
                <Text style={styles.emojiText}>{opt}</Text>
              </Pressable>
            )}
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
  // One column slot — fixed fraction of the row so every row is full.
  slot: {
    paddingVertical: 5,
    alignItems: "center",
    justifyContent: "center",
  },
  emojiCell: {
    width: "84%",
    aspectRatio: 1,
    borderRadius: R.md,
    backgroundColor: C.surfaceSubtle,
    justifyContent: "center",
    alignItems: "center",
  },
  emojiSelected: {
    borderWidth: 2,
    borderColor: C.purple,
  },
  emojiText: { fontSize: 20 },
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
