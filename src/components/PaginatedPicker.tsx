/**
 * PaginatedPicker — a paged ("carousel") grid for choosing one option from a
 * large pool, without a long vertical scroll. Shows `perPage` items at a time;
 * ‹ › arrows page forward/back and a "page/total" label shows position. The
 * page containing the current value is shown first.
 *
 * Two kinds:
 *   - "emoji"  → renders each option as an emoji glyph in a square cell
 *   - "color"  → renders each option (a hex string) as a colour swatch
 *
 * RTL-aware: in the pager row the previous arrow sits on the right (→) and the
 * next arrow on the left (←), matching the calendar/budget month navigators.
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
  /** Items shown per page (default 24). */
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
  perPage = 24,
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

  return (
    <View>
      <View style={styles.grid}>
        {pageItems.map((opt) =>
          kind === "color" ? (
            <Pressable
              key={opt}
              onPress={() => onChange(opt)}
              accessibilityRole="button"
              accessibilityLabel={opt}
              accessibilityState={{ selected: opt === value }}
              testID={testIDPrefix ? `${testIDPrefix}-${opt}` : undefined}
              style={[
                styles.colorCell,
                { backgroundColor: opt },
                opt === value && styles.colorSelected,
                webCursor,
              ]}
            />
          ) : (
            <Pressable
              key={opt}
              onPress={() => onChange(opt)}
              accessibilityRole="button"
              accessibilityLabel={opt}
              accessibilityState={{ selected: opt === value }}
              testID={testIDPrefix ? `${testIDPrefix}-${opt}` : undefined}
              style={[styles.emojiCell, opt === value && styles.emojiSelected, webCursor]}
            >
              <Text style={styles.emojiText}>{opt}</Text>
            </Pressable>
          ),
        )}
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
    gap: S.sm,
    marginBottom: S.xs,
    minHeight: 96, // keep page height steady so the modal doesn't jump
  },
  emojiCell: {
    width: 40,
    height: 40,
    borderRadius: R.xl,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  emojiSelected: {
    borderWidth: 2,
    borderColor: C.purple,
  },
  emojiText: { fontSize: 22 },
  colorCell: {
    width: 32,
    height: 32,
    borderRadius: 16,
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
