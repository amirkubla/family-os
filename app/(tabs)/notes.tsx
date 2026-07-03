/**
 * Notes — modern, compact, theme-aware dashboard (matches the Projects page).
 *
 * A sticky toolbar (search · category filter · pinned-only · sort) sits above a
 * single-column list of dense NoteCards. Family-wide notes plus any
 * kid/member-owned ones (which carry an owner badge). Add via the FAB, the mic,
 * or the ?modal=add deep link. Pinned notes float to the top of the chosen sort.
 */

import React, { useState, useEffect, useMemo } from "react";
import { View, StyleSheet, Pressable, Platform, Alert, TextInput, ScrollView } from "react-native";
import ScreenScrollView from "@src/components/ScreenScrollView";
import { Text, FAB } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";

import { useFamilyStore } from "@src/store/useFamilyStore";
import { useBlurRemountKey } from "@src/hooks/useBlurRemountKey";
import type { Note } from "@src/models/note";
import { effectiveNoteCategories, noteCategoryColor, type NoteCategoryDef } from "@src/models/noteCategory";
import {
  toggleNotePinnedRemote,
  deleteNoteRemote,
  updateNoteRemote,
  updateCustomizationsRemote,
} from "@src/lib/sync/remoteCrud";
import NoteModal from "@src/components/NoteModal";
import NoteCard from "@src/components/NoteCard";
import NoteCategoriesModal from "@src/components/NoteCategoriesModal";
import ConfirmDeleteModal from "@src/components/ConfirmDeleteModal";
import { useConfirmDelete } from "@src/hooks/useConfirmDelete";
import { useNoteVoice } from "@src/hooks/useNoteVoice";
import { useVoiceCapture } from "@src/hooks/useVoiceCapture";
import VoiceFab from "@src/components/VoiceFab";
import { t } from "@src/i18n";
import { C, S } from "@src/ui/tokens";
import { useThemeColor } from "@src/ui/useThemeColor";
import { RTL_ROW, TEXT_RIGHT } from "@src/ui/rtl";
import { FAB_LEFT } from "@src/ui/fabAnchor";

type SortMode = "edited" | "created" | "alpha";
const SORT_ORDER: SortMode[] = ["edited", "created", "alpha"];

/** A rounded filter/sort chip — themed when active. */
function FilterChip({
  active,
  activeColor,
  emoji,
  label,
  onPress,
  testID,
}: {
  active: boolean;
  activeColor: string;
  emoji?: string;
  label: string;
  onPress: () => void;
  testID?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      style={({ hovered }: any) => [
        styles.chip,
        { backgroundColor: active ? activeColor + "1F" : C.surface, borderColor: active ? activeColor : C.border },
        hovered && Platform.OS === "web" && ({ borderColor: activeColor } as any),
      ]}
    >
      {emoji ? <Text style={styles.chipEmoji}>{emoji}</Text> : null}
      <Text style={[styles.chipLabel, { color: active ? activeColor : C.textSecondary }]}>{label}</Text>
    </Pressable>
  );
}

export default function NotesScreenRoute() {
  return <NotesScreen key={useBlurRemountKey()} />;
}

function NotesScreen() {
  const insets = useSafeAreaInsets();
  const theme = useThemeColor();
  const { modal } = useLocalSearchParams<{ modal?: string }>();
  const { confirmVisible, requestDelete, confirmDelete, dismissConfirm } = useConfirmDelete();

  const allNotes = useFamilyStore((s) => s.notes);
  const customizations = useFamilyStore((s) => s.customizations);
  const categories = useFamilyStore((s) => effectiveNoteCategories(s.customizations));

  // ── Toolbar state ──
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [pinnedOnly, setPinnedOnly] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>("edited");
  const [searchFocused, setSearchFocused] = useState(false);
  const [catManagerOpen, setCatManagerOpen] = useState(false);

  // ── Category management (per-family, mirrors grocery main categories) ──
  const setNoteCategoriesList = (next: NoteCategoryDef[]) =>
    updateCustomizationsRemote({ ...customizations, noteCategories: next });
  const noteCountForCategory = (key: string) => allNotes.filter((n) => n.category === key).length;
  const deleteNoteCategory = (key: string) => {
    if (categories.length <= 1) return; // keep at least one
    // Un-tag notes that used it (they aren't deleted).
    allNotes.filter((n) => n.category === key).forEach((n) => updateNoteRemote(n.id, { category: undefined }));
    updateCustomizationsRemote({ ...customizations, noteCategories: categories.filter((c) => c.key !== key) });
    if (categoryFilter === key) setCategoryFilter(null);
  };

  const sortLabel =
    sortMode === "created" ? t("notes.sortCreated") : sortMode === "alpha" ? t("notes.sortAlpha") : t("notes.sortEdited");
  const cycleSort = () => setSortMode((m) => SORT_ORDER[(SORT_ORDER.indexOf(m) + 1) % SORT_ORDER.length]);

  // Filter + sort. Pinned notes float to the top of whatever sort is active.
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const arr = allNotes.filter((n) => {
      if (pinnedOnly && !n.pinned) return false;
      if (categoryFilter && n.category !== categoryFilter) return false;
      if (q && !((n.title ?? "") + " " + n.body).toLowerCase().includes(q)) return false;
      return true;
    });
    const cmp =
      sortMode === "created"
        ? (a: Note, b: Note) => b.createdAt - a.createdAt
        : sortMode === "alpha"
          ? (a: Note, b: Note) => (a.title || a.body).localeCompare(b.title || b.body, "he")
          : (a: Note, b: Note) => b.updatedAt - a.updatedAt;
    arr.sort(cmp);
    arr.sort((a, b) => (a.pinned === b.pinned ? 0 : a.pinned ? -1 : 1));
    return arr;
  }, [allNotes, query, categoryFilter, pinnedOnly, sortMode]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  // Voice-note draft pre-filled into the editor (cleared on every other open).
  const [voiceDraft, setVoiceDraft] = useState<{ title?: string; body: string } | undefined>(undefined);
  const { status: voiceStatus, onMic } = useVoiceCapture(useNoteVoice, {
    onResult: (r) => {
      if (r.body.trim()) {
        setVoiceDraft({ title: r.title || undefined, body: r.body });
        setEditingNote(null);
        setModalOpen(true);
      } else {
        Alert.alert(t("voice.noNote"));
      }
    },
  });

  // Deep-link: ?modal=add opens the add sheet on mount.
  useEffect(() => {
    if (modal === "add") {
      setVoiceDraft(undefined);
      setEditingNote(null);
      setModalOpen(true);
    }
  }, [modal]);

  const openAdd = () => {
    setVoiceDraft(undefined);
    setEditingNote(null);
    setModalOpen(true);
  };

  // Remount the list on discrete filter/sort changes so results animate in
  // (staggered NoteCard entrance). NOT keyed on the search text — that would
  // re-stagger on every keystroke.
  const listKey = `${sortMode}|${categoryFilter ?? ""}|${pinnedOnly}`;
  const hasNotes = allNotes.length > 0;

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      {/* ── Sticky toolbar ── */}
      {hasNotes && (
        <View style={styles.toolbar}>
          <View style={styles.toolbarTop}>
            <View
              style={[
                styles.search,
                { borderColor: searchFocused ? theme : C.border },
              ]}
            >
              <Ionicons name="search" size={16} color={C.textMuted} />
              <TextInput
                testID="notes-search"
                value={query}
                onChangeText={setQuery}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                placeholder={t("notes.searchPlaceholder")}
                placeholderTextColor={C.textMuted}
                style={styles.searchInput}
              />
              {query.length > 0 && (
                <Pressable onPress={() => setQuery("")} hitSlop={8} testID="notes-search-clear">
                  <Ionicons name="close-circle" size={16} color={C.textMuted} />
                </Pressable>
              )}
            </View>

            <Pressable
              testID="notes-sort"
              onPress={cycleSort}
              style={({ hovered }: any) => [
                styles.pill,
                { backgroundColor: theme + "14", borderColor: hovered && Platform.OS === "web" ? theme : "transparent" },
              ]}
            >
              <Ionicons name="swap-vertical" size={15} color={theme} />
              <Text style={[styles.pillText, { color: theme }]}>{sortLabel}</Text>
            </Pressable>

            <Pressable
              testID="notes-pinned-only"
              onPress={() => setPinnedOnly((v) => !v)}
              accessibilityLabel={t("notes.pinnedOnly")}
              style={[
                styles.pinToggle,
                { backgroundColor: pinnedOnly ? theme + "1A" : C.surface, borderColor: pinnedOnly ? theme : C.border },
              ]}
            >
              <Ionicons name={pinnedOnly ? "pin" : "pin-outline"} size={18} color={pinnedOnly ? theme : C.textMuted} />
            </Pressable>
          </View>

          {/* Category filter — horizontal scroll of colored pills. */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRow}
            style={styles.chipScroll}
          >
            <FilterChip
              active={categoryFilter === null}
              activeColor={theme}
              label={t("notes.allCategories")}
              onPress={() => setCategoryFilter(null)}
              testID="notes-cat-all"
            />
            {categories.map((cat) => (
              <FilterChip
                key={cat.key}
                active={categoryFilter === cat.key}
                activeColor={noteCategoryColor(cat)}
                emoji={cat.emoji}
                label={cat.name}
                onPress={() => setCategoryFilter((c) => (c === cat.key ? null : cat.key))}
                testID={`notes-cat-${cat.key}`}
              />
            ))}
            {/* Manage categories — like the grocery main-category manager. */}
            <Pressable
              testID="notes-manage-cats"
              onPress={() => setCatManagerOpen(true)}
              style={[styles.chip, styles.manageChip]}
            >
              <Ionicons name="options-outline" size={15} color={C.textSecondary} />
              <Text style={[styles.chipLabel, { color: C.textSecondary }]}>{t("notes.manageCategories")}</Text>
            </Pressable>
          </ScrollView>
        </View>
      )}

      <ScreenScrollView style={styles.list} contentContainerStyle={styles.container}>
        <View style={styles.inner}>
          {!hasNotes ? (
            <View style={styles.emptyState}>
              <Text style={{ fontSize: 32 }}>📝</Text>
              <Text style={styles.emptyText}>{t("home.noNotes")}</Text>
            </View>
          ) : visible.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={{ fontSize: 32 }}>🔍</Text>
              <Text style={styles.emptyText}>{t("notes.noResults")}</Text>
            </View>
          ) : (
            <View key={listKey} style={styles.listInner}>
              {visible.map((item, index) => (
                <NoteCard
                  key={item.id}
                  note={item}
                  index={index}
                  onPress={() => {
                    setVoiceDraft(undefined);
                    setEditingNote(item);
                    setModalOpen(true);
                  }}
                  onDelete={() => requestDelete(() => deleteNoteRemote(item.id))}
                  onTogglePin={() => toggleNotePinnedRemote(item.id)}
                />
              ))}
            </View>
          )}
        </View>
      </ScreenScrollView>

      {/* Voice → note: record, transcribe via the Assistant, then open the
          editor pre-filled for review. Stacked above the "+" add FAB. */}
      <VoiceFab status={voiceStatus} onPress={onMic} bottom={insets.bottom + S.lg + 68} testID="note-voice-fab" />

      <FAB
        customSize={50}
        icon="plus"
        testID="btn-add-note"
        style={[styles.fab, { bottom: insets.bottom + S.lg, backgroundColor: theme, borderRadius: 26 }]}
        color="#FFF"
        onPress={openAdd}
      />

      <NoteModal
        visible={modalOpen}
        onDismiss={() => {
          setModalOpen(false);
          setEditingNote(null);
          setVoiceDraft(undefined);
        }}
        editNote={editingNote}
        initialDraft={voiceDraft}
      />
      <NoteCategoriesModal
        visible={catManagerOpen}
        onDismiss={() => setCatManagerOpen(false)}
        list={categories}
        onChange={setNoteCategoriesList}
        onDeleteCategory={deleteNoteCategory}
        itemCount={noteCountForCategory}
      />
      <ConfirmDeleteModal visible={confirmVisible} onConfirm={confirmDelete} onDismiss={dismissConfirm} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },

  // ── Toolbar ──
  toolbar: {
    paddingHorizontal: S.lg,
    paddingTop: S.sm,
    paddingBottom: S.sm,
    backgroundColor: C.bg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
    gap: S.sm,
    zIndex: 2,
  },
  toolbarTop: { flexDirection: RTL_ROW, alignItems: "center", gap: S.sm },
  search: {
    flex: 1,
    flexDirection: RTL_ROW,
    alignItems: "center",
    gap: S.xs,
    height: 40,
    paddingHorizontal: S.md,
    borderRadius: 999,
    borderWidth: 1,
    backgroundColor: C.surface,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: C.textPrimary,
    textAlign: TEXT_RIGHT,
    writingDirection: "rtl",
    paddingVertical: 0,
    ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as any) : {}),
  },
  pill: {
    flexDirection: RTL_ROW,
    alignItems: "center",
    gap: 4,
    height: 40,
    paddingHorizontal: S.md,
    borderRadius: 999,
    borderWidth: 1,
  },
  pillText: { fontSize: 13, fontWeight: "700", writingDirection: "rtl" },
  pinToggle: {
    width: 40,
    height: 40,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  chipScroll: { marginHorizontal: -S.lg },
  chipRow: { flexDirection: RTL_ROW, gap: S.xs, paddingHorizontal: S.lg },
  chip: {
    flexDirection: RTL_ROW,
    alignItems: "center",
    gap: 4,
    paddingHorizontal: S.md,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    ...(Platform.OS === "web" ? ({ cursor: "pointer", transition: "all 0.15s ease" } as any) : {}),
  },
  chipEmoji: { fontSize: 13 },
  chipLabel: { fontSize: 13, fontWeight: "700", writingDirection: "rtl" },
  manageChip: { backgroundColor: C.surface, borderColor: C.border, borderStyle: "dashed" },

  // ── List ──
  list: { flex: 1 },
  container: { padding: S.lg, paddingBottom: S.xxl + S.xxl },
  inner: { width: "100%", maxWidth: 1200, alignSelf: "center" },
  listInner: { gap: S.sm },

  emptyState: { alignItems: "center", paddingVertical: S.xxl, gap: S.sm },
  emptyText: { color: C.textMuted, fontSize: 14, textAlign: "center" },

  fab: { position: "absolute", ...FAB_LEFT, bottom: S.lg },
});
