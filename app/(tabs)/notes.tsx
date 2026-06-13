/**
 * Notes — dedicated full screen (reached from the home launcher grid).
 *
 * Family-wide notes only (kidId == null); kid-owned notes live in
 * /kid/[kidId]. Add via the FAB or the ?modal=add deep link.
 */

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { View, StyleSheet, Pressable, Platform } from "react-native";
import { Text, IconButton, FAB } from "react-native-paper";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import ReorderableList, {
  useReorderableDrag,
  reorderItems,
  type ReorderableListReorderEvent,
} from "react-native-reorderable-list";

import { useFamilyStore } from "@src/store/useFamilyStore";
import type { Note } from "@src/models/note";
import { toggleNotePinnedRemote, deleteNoteRemote, reorderNotesRemote } from "@src/lib/sync/remoteCrud";
import NoteModal from "@src/components/NoteModal";
import PageHeader from "@src/components/PageHeader";
import ConfirmDeleteModal from "@src/components/ConfirmDeleteModal";
import { useConfirmDelete } from "@src/hooks/useConfirmDelete";
import { t } from "@src/i18n";
import { C, R, S, SHADOW } from "@src/ui/tokens";
import { RTL_ROW, TEXT_RIGHT } from "@src/ui/rtl";

const NOTE_COLORS = {
  accent: "#D97706",
  bg: "#FFFBF0",
  bgPinned: "#FFF8E1",
  border: "#F5E6C8",
  borderPinned: "#EAD49B",
  hover: "#FFF3D6",
  barDefault: "#E8D5B0",
} as const;

// Single note card. Long-press anywhere starts a drag-to-reorder.
function NoteCard({
  note,
  onEdit,
  onDelete,
}: {
  note: Note;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const drag = useReorderableDrag();
  return (
    <Pressable
      testID={"note-card-" + (note.title || "")}
      onPress={onEdit}
      onLongPress={drag}
      delayLongPress={250}
      style={({ pressed, hovered }: any) => [
        styles.noteCard,
        note.pinned && styles.noteCardPinned,
        hovered && styles.noteCardHover,
        pressed && styles.noteCardPressed,
      ]}
    >
      <View style={styles.noteTopRow}>
        <View style={styles.noteIcon}>
          <Text style={{ fontSize: 18 }}>{note.pinned ? "📌" : "📝"}</Text>
        </View>
        <View style={{ flex: 1 }} />
        <IconButton
          icon={note.pinned ? "pin-off" : "pin"}
          size={16}
          testID={"note-pin-" + (note.title || "")}
          accessibilityLabel={"note-pin-" + (note.title || "")}
          iconColor={NOTE_COLORS.accent}
          style={styles.noteActionBtn}
          onPress={() => toggleNotePinnedRemote(note.id)}
        />
        <IconButton
          icon="trash-can-outline"
          size={16}
          testID={"note-delete-" + (note.title || "")}
          iconColor={C.textMuted}
          style={styles.noteActionBtn}
          onPress={onDelete}
        />
      </View>

      <Text style={styles.noteTitle} numberOfLines={1}>
        {note.title || t("home.note")}
      </Text>
      {note.body ? (
        <Text style={styles.noteBody} numberOfLines={4}>
          {note.body}
        </Text>
      ) : null}

      <View style={[styles.noteAccentBar, note.pinned && { backgroundColor: NOTE_COLORS.accent }]} />
    </Pressable>
  );
}

export default function NotesScreen() {
  const insets = useSafeAreaInsets();
  const { modal } = useLocalSearchParams<{ modal?: string }>();
  const { confirmVisible, requestDelete, confirmDelete, dismissConfirm } = useConfirmDelete();

  const allNotes = useFamilyStore((s) => s.notes);
  // Family-wide notes, ordered purely by manual drag order (sortOrder).
  const notes = useMemo(
    () =>
      allNotes
        .filter((n) => !n.kidId)
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
    [allNotes],
  );

  const [modalOpen, setModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);

  // Deep-link: ?modal=add opens the add sheet on mount.
  useEffect(() => {
    if (modal === "add") {
      setEditingNote(null);
      setModalOpen(true);
    }
  }, [modal]);

  const handleReorder = useCallback(
    ({ from, to }: ReorderableListReorderEvent) => {
      reorderNotesRemote(reorderItems(notes, from, to).map((n) => n.id));
    },
    [notes],
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <PageHeader title={t("home.notes")} />
      <ReorderableList
        data={notes}
        keyExtractor={(item) => item.id}
        onReorder={handleReorder}
        style={styles.list}
        contentContainerStyle={styles.container}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={{ fontSize: 32 }}>📝</Text>
            <Text style={styles.emptyText}>{t("home.noNotes")}</Text>
          </View>
        }
        renderItem={({ item }) => (
          <NoteCard
            note={item}
            onEdit={() => {
              setEditingNote(item);
              setModalOpen(true);
            }}
            onDelete={() => requestDelete(() => deleteNoteRemote(item.id))}
          />
        )}
      />

      <FAB
        icon="plus"
        testID="btn-add-note"
        style={[styles.fab, { bottom: insets.bottom + S.lg, backgroundColor: NOTE_COLORS.accent }]}
        color="#FFF"
        onPress={() => {
          setEditingNote(null);
          setModalOpen(true);
        }}
      />

      <NoteModal
        visible={modalOpen}
        onDismiss={() => {
          setModalOpen(false);
          setEditingNote(null);
        }}
        editNote={editingNote}
      />
      <ConfirmDeleteModal visible={confirmVisible} onConfirm={confirmDelete} onDismiss={dismissConfirm} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  list: { flex: 1 },
  container: { padding: S.lg, paddingBottom: S.xxl + S.xxl, gap: S.md },
  emptyState: { alignItems: "center", paddingVertical: S.xxl, gap: S.sm },
  emptyText: { color: C.textMuted, fontSize: 14, textAlign: "center" },
  noteCard: {
    backgroundColor: NOTE_COLORS.bg,
    borderWidth: 1,
    borderColor: NOTE_COLORS.border,
    borderRadius: R.lg,
    padding: S.lg,
    ...SHADOW.sm,
    ...(Platform.OS === "web" ? { cursor: "pointer" as any, transition: "all 0.2s ease" } : {}),
    overflow: "hidden" as const,
  },
  noteCardPinned: {
    backgroundColor: NOTE_COLORS.bgPinned,
    borderColor: NOTE_COLORS.borderPinned,
  },
  noteCardHover: {
    backgroundColor: NOTE_COLORS.hover,
    borderColor: NOTE_COLORS.borderPinned,
    transform: [{ translateY: -2 }],
    ...SHADOW.md,
  },
  noteCardPressed: { transform: [{ scale: 0.97 }] },
  noteTopRow: { flexDirection: RTL_ROW, alignItems: "center", marginBottom: S.sm },
  noteIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: NOTE_COLORS.accent + "14",
    alignItems: "center",
    justifyContent: "center",
  },
  noteActionBtn: { margin: 0, width: 28, height: 28 },
  noteTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: C.textPrimary,
    textAlign: TEXT_RIGHT,
    writingDirection: "rtl",
    marginBottom: 4,
  },
  noteBody: {
    fontSize: 13,
    color: C.textSecondary,
    textAlign: TEXT_RIGHT,
    writingDirection: "rtl",
    lineHeight: 19,
  },
  noteAccentBar: {
    height: 3,
    borderRadius: 2,
    backgroundColor: NOTE_COLORS.barDefault,
    marginTop: S.md,
  },
  fab: { position: "absolute", left: S.lg, bottom: S.lg },
});
