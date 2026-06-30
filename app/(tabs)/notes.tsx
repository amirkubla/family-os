/**
 * Notes — dedicated full screen (reached from the home launcher grid).
 *
 * Family-wide notes only (kidId == null); kid-owned notes live in
 * /kid/[kidId]. Add via the FAB or the ?modal=add deep link.
 */

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { View, StyleSheet, Pressable, Platform, Alert } from "react-native";
import ScreenScrollView from "@src/components/ScreenScrollView";
import { Text, IconButton, FAB } from "react-native-paper";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";

import { useFamilyStore } from "@src/store/useFamilyStore";
import type { Note } from "@src/models/note";
import { toggleNotePinnedRemote, deleteNoteRemote, reorderNotesRemote } from "@src/lib/sync/remoteCrud";
import NoteModal from "@src/components/NoteModal";
import OwnerBadge from "@src/components/OwnerBadge";
import PageHeader from "@src/components/PageHeader";
import ConfirmDeleteModal from "@src/components/ConfirmDeleteModal";
import { useConfirmDelete } from "@src/hooks/useConfirmDelete";
import { useNoteVoice } from "@src/hooks/useNoteVoice";
import { useVoiceCapture } from "@src/hooks/useVoiceCapture";
import VoiceFab from "@src/components/VoiceFab";
import { t } from "@src/i18n";
import { C, R, S, SHADOW } from "@src/ui/tokens";
import { useThemeColor } from "@src/ui/useThemeColor";
import { RTL_ROW, TEXT_RIGHT } from "@src/ui/rtl";
import { FAB_LEFT } from "@src/ui/fabAnchor";

const NOTE_COLORS = {
  accent: "#D97706",
  bg: "#FFFBF0",
  bgPinned: "#FFF8E1",
  border: "#F5E6C8",
  borderPinned: "#EAD49B",
  hover: "#FFF3D6",
  barDefault: "#E8D5B0",
} as const;

// Single note card. Reorder via the up/down arrows in the top row.
function NoteCard({
  note,
  index,
  count,
  onEdit,
  onDelete,
  onMove,
}: {
  note: Note;
  index: number;
  count: number;
  onEdit: () => void;
  onDelete: () => void;
  onMove: (dir: -1 | 1) => void;
}) {
  return (
    <Pressable
      testID={"note-card-" + (note.title || "")}
      onPress={onEdit}
      style={({ pressed, hovered }: any) => [
        styles.noteCard,
        note.pinned && styles.noteCardPinned,
        hovered && styles.noteCardHover,
        pressed && styles.noteCardPressed,
      ]}
    >
      <View style={styles.noteTopRow}>
        <View style={{ flex: 1 }} />
        <IconButton
          icon="chevron-up"
          size={16}
          disabled={index === 0}
          iconColor={C.textMuted}
          style={styles.noteActionBtn}
          onPress={() => onMove(-1)}
        />
        <IconButton
          icon="chevron-down"
          size={16}
          disabled={index === count - 1}
          iconColor={C.textMuted}
          style={styles.noteActionBtn}
          onPress={() => onMove(1)}
        />
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

      <OwnerBadge kidId={note.kidId} ownerMemberId={note.ownerMemberId} style={{ marginTop: S.xs }} />

      <View style={[styles.noteAccentBar, note.pinned && { backgroundColor: NOTE_COLORS.accent }]} />
    </Pressable>
  );
}

export default function NotesScreen() {
  const insets = useSafeAreaInsets();
  const theme = useThemeColor();
  const { modal } = useLocalSearchParams<{ modal?: string }>();
  const { confirmVisible, requestDelete, confirmDelete, dismissConfirm } = useConfirmDelete();

  const allNotes = useFamilyStore((s) => s.notes);
  // All notes (family-wide + kid-owned), ordered by manual drag order.
  // Kid-owned notes also appear on their kid's page; here they carry a kid badge.
  const notes = useMemo(
    () =>
      [...allNotes].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
    [allNotes],
  );

  const [modalOpen, setModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  // Voice-note draft pre-filled into the editor (cleared on every other open).
  const [voiceDraft, setVoiceDraft] = useState<{ title?: string; body: string } | undefined>(undefined);
  // Open the editor pre-filled on the transcribed draft (or warn if empty).
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

  // Reorder via per-card arrows: swap with the adjacent item, then persist the
  // new top-to-bottom id order. (Replaces drag-to-reorder, same as kid view.)
  const moveNote = useCallback(
    (index: number, dir: -1 | 1) => {
      const j = index + dir;
      if (j < 0 || j >= notes.length) return;
      const next = [...notes];
      [next[index], next[j]] = [next[j], next[index]];
      reorderNotesRemote(next.map((n) => n.id));
    },
    [notes],
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <PageHeader title={t("home.notes")} />
      <ScreenScrollView style={styles.list} contentContainerStyle={styles.container}>
        {notes.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={{ fontSize: 32 }}>📝</Text>
            <Text style={styles.emptyText}>{t("home.noNotes")}</Text>
          </View>
        ) : (
          notes.map((item, index) => (
            <NoteCard
              key={item.id}
              note={item}
              index={index}
              count={notes.length}
              onEdit={() => {
                setVoiceDraft(undefined);
                setEditingNote(item);
                setModalOpen(true);
              }}
              onDelete={() => requestDelete(() => deleteNoteRemote(item.id))}
              onMove={(dir) => moveNote(index, dir)}
            />
          ))
        )}
      </ScreenScrollView>

      {/* Voice → note: record, transcribe via the Assistant, then open the
          editor pre-filled for review. Stacked above the "+" add FAB. */}
      <VoiceFab
        status={voiceStatus}
        onPress={onMic}
        bottom={insets.bottom + S.lg + 68}
        testID="note-voice-fab"
      />

      <FAB
        customSize={50}
        icon="plus"
        testID="btn-add-note"
        style={[styles.fab, { bottom: insets.bottom + S.lg, backgroundColor: theme, borderRadius: 26 }]}
        color="#FFF"
        onPress={() => {
          setVoiceDraft(undefined);
          setEditingNote(null);
          setModalOpen(true);
        }}
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
  fab: { position: "absolute", ...FAB_LEFT, bottom: S.lg },
});
