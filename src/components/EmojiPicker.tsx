/**
 * EmojiPicker — full-set emoji chooser with Hebrew + English search.
 *
 * Renders the platform-native emoji (Apple/Google/OS art) as text, so it works
 * on iOS, Android, and web from one codebase. Backed by the generated
 * src/data/emoji.ts dataset (English labels/tags + CLDR Hebrew keywords).
 *
 * Browse by category tab, or type to search across both languages. A
 * virtualized FlatList keeps the ~1,900-emoji grid smooth.
 */

import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  TextInput,
  FlatList,
  Platform,
} from "react-native";
import { Portal } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";

import { EMOJI_DATA, EMOJI_GROUPS, type EmojiEntry } from "@src/data/emoji";
import { t } from "@src/i18n";
import { C, R, S } from "@src/ui/tokens";
import { RTL_ROW, TEXT_RIGHT } from "@src/ui/rtl";

const COLUMNS = 8;
const isWeb = Platform.OS === "web";

interface Props {
  visible: boolean;
  onSelect: (emoji: string) => void;
  onDismiss: () => void;
}

export default function EmojiPicker({ visible, onSelect, onDismiss }: Props) {
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState(EMOJI_GROUPS[0]?.id ?? 0);

  const data = useMemo<EmojiEntry[]>(() => {
    const q = query.trim().toLowerCase();
    if (q) return EMOJI_DATA.filter((e) => e.k.includes(q));
    return EMOJI_DATA.filter((e) => e.g === group);
  }, [query, group]);

  if (!visible) return null;

  return (
    <Portal>
      <View style={[styles.overlay, isWeb && ({ position: "fixed" } as any)]}>
        <Pressable style={styles.backdrop} onPress={onDismiss} />
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>{t("emoji.title")}</Text>
            <Pressable
              onPress={onDismiss}
              accessibilityRole="button"
              accessibilityLabel={t("cancel")}
              testID="emoji-close"
            >
              <Ionicons name="close" size={24} color={C.textSecondary} />
            </Pressable>
          </View>

          {/* Search */}
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t("emoji.search")}
            placeholderTextColor={C.textMuted}
            style={styles.search}
            autoCorrect={false}
            testID="emoji-search"
          />

          {/* Category tabs — hidden while searching */}
          {!query.trim() && (
            <View style={styles.tabsRow}>
              {EMOJI_GROUPS.map((g) => {
                const active = g.id === group;
                return (
                  <Pressable
                    key={g.id}
                    onPress={() => setGroup(g.id)}
                    style={[styles.tab, active && styles.tabActive]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                  >
                    <Text style={[styles.tabText, active && styles.tabTextActive]}>
                      {g.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}

          {/* Grid */}
          <FlatList
            data={data}
            keyExtractor={(item, i) => item.c + i}
            numColumns={COLUMNS}
            style={styles.grid}
            keyboardShouldPersistTaps="handled"
            removeClippedSubviews
            initialNumToRender={64}
            windowSize={5}
            ListEmptyComponent={
              <Text style={styles.empty}>{t("emoji.noResults")}</Text>
            }
            renderItem={({ item }) => (
              <Pressable
                style={({ hovered }: any) => [styles.cell, hovered && styles.cellHover]}
                onPress={() => {
                  onSelect(item.c);
                  onDismiss();
                }}
                accessibilityRole="button"
                accessibilityLabel={item.c}
              >
                <Text style={styles.emoji}>{item.c}</Text>
              </Pressable>
            )}
          />
        </View>
      </View>
    </Portal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10000,
    justifyContent: "center",
    alignItems: "center",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15,15,30,0.45)",
  },
  card: {
    backgroundColor: "#FFFFFF",
    width: "92%",
    maxWidth: 460,
    height: "70%",
    maxHeight: 560,
    borderRadius: R.xl,
    padding: S.md,
  },
  header: {
    flexDirection: RTL_ROW,
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: S.sm,
  },
  title: {
    fontSize: 16,
    fontWeight: "800",
    color: C.textPrimary,
    writingDirection: "rtl",
  },
  search: {
    backgroundColor: C.surfaceSubtle,
    borderRadius: R.md,
    paddingHorizontal: S.md,
    paddingVertical: Platform.OS === "ios" ? 12 : 8,
    fontSize: 15,
    color: C.textPrimary,
    textAlign: TEXT_RIGHT,
    writingDirection: "rtl",
    marginBottom: S.sm,
  },
  tabsRow: {
    flexDirection: RTL_ROW,
    flexWrap: "wrap",
    gap: 4,
    marginBottom: S.sm,
  },
  tab: {
    paddingHorizontal: S.sm,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: C.surfaceSubtle,
  },
  tabActive: { backgroundColor: C.purple },
  tabText: { fontSize: 12, color: C.textSecondary, writingDirection: "rtl" },
  tabTextActive: { color: "#FFFFFF", fontWeight: "700" },
  grid: { flex: 1 },
  cell: {
    flex: 1 / COLUMNS,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: R.sm,
  },
  cellHover: { backgroundColor: C.surfaceSubtle },
  emoji: { fontSize: 28 },
  empty: {
    textAlign: "center",
    color: C.textMuted,
    marginTop: S.xl,
    writingDirection: "rtl",
  },
});
