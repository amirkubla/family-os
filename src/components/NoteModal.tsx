/**
 * NoteModal — a document-style note editor (not a boxed form).
 *
 * A wide "page" card holds a large borderless title and a tall borderless
 * content area, with a category picker between them and (when editing)
 * created/edited metadata + a pin toggle below. Owner assignment is preserved
 * (hidden when locked to a kid/member). Voice drafts pre-fill title + content.
 */

import React, { useState, useEffect, useRef } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  Platform,
  useWindowDimensions,
} from "react-native";
import { Text } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";

import type { Note } from "@src/models/note";
import { effectiveNoteCategories, noteCategoryColor } from "@src/models/noteCategory";
import { useFamilyStore } from "@src/store/useFamilyStore";
import { addNoteRemote, updateNoteRemote, toggleNotePinnedRemote } from "@src/lib/sync/remoteCrud";
import { noteEditedLabel, noteCreatedLabel } from "@src/lib/noteFormat";
import { t } from "@src/i18n";
import { C, S, R } from "@src/ui/tokens";
import { useThemeColor } from "@src/ui/useThemeColor";
import { RTL_ROW, TEXT_RIGHT } from "@src/ui/rtl";
import ModalWrapper, { ModalCarousel } from "./ModalWrapper";
import OwnerPicker from "./OwnerPicker";

interface Props {
  visible: boolean;
  onDismiss: () => void;
  editNote?: Note | null;
  /** Pre-select a kid when opening fresh (kid-page context). */
  defaultKidId?: string;
  /** Lock to a kid: hide the owner picker, show the kid's name in the title. */
  lockedKidName?: string;
  /** Pre-select a member owner when opening fresh (parent-page context). */
  defaultOwnerMemberId?: string;
  /** Lock to a member: hide the owner picker, show the member's name in the title. */
  lockedMemberName?: string;
  /** When set, shows carousel arrows to swap between the kid "add" modals. */
  carousel?: ModalCarousel;
  /** Pre-fill title + content for review (voice-note flow). */
  initialDraft?: { title?: string; body: string };
}

export default function NoteModal({
  visible,
  onDismiss,
  editNote,
  defaultKidId,
  lockedKidName,
  defaultOwnerMemberId,
  lockedMemberName,
  carousel,
  initialDraft,
}: Props) {
  const theme = useThemeColor();
  const { height } = useWindowDimensions();
  const categories = useFamilyStore((s) => effectiveNoteCategories(s.customizations));

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState<string | undefined>(undefined);
  const [pinned, setPinned] = useState(false);
  const [kidId, setKidId] = useState<string | undefined>(undefined);
  const [ownerMemberId, setOwnerMemberId] = useState<string | undefined>(undefined);
  // Double-click guard: ref for the synchronous check, state for disabled/loading.
  const submittingRef = useRef(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    submittingRef.current = false;
    setSubmitting(false);
    if (editNote) {
      setTitle(editNote.title ?? "");
      setBody(editNote.body);
      setCategory(editNote.category);
      setPinned(editNote.pinned);
      setKidId(editNote.kidId);
      setOwnerMemberId(editNote.ownerMemberId);
    } else {
      setTitle(initialDraft?.title ?? "");
      setBody(initialDraft?.body ?? "");
      setCategory(undefined);
      setPinned(false);
      setKidId(defaultKidId);
      setOwnerMemberId(defaultOwnerMemberId);
    }
  }, [editNote, visible, defaultKidId, defaultOwnerMemberId, initialDraft]);

  const reset = () => {
    setTitle("");
    setBody("");
    setCategory(undefined);
    setPinned(false);
    setKidId(undefined);
    setOwnerMemberId(undefined);
  };

  const handleSubmit = () => {
    if (submittingRef.current) return;
    if (!body.trim()) return;
    submittingRef.current = true;
    setSubmitting(true);
    if (editNote) {
      updateNoteRemote(editNote.id, {
        title: title.trim() || undefined,
        body: body.trim(),
        category,
        kidId,
        ownerMemberId,
      });
      // Pin lives on its own optimistic action — sync it if the toggle moved.
      if (pinned !== editNote.pinned) toggleNotePinnedRemote(editNote.id);
    } else {
      addNoteRemote({ title: title.trim() || undefined, body: body.trim(), category, kidId, ownerMemberId });
    }
    reset();
    onDismiss();
  };

  const handleDismiss = () => {
    reset();
    onDismiss();
  };

  const bodyMinHeight = Math.max(220, Math.round(height * 0.38));

  return (
    <ModalWrapper
      visible={visible}
      onDismiss={handleDismiss}
      carousel={carousel}
      icon="document-text-outline"
      title={
        (editNote ? t("noteModal.editTitle") : t("noteModal.addTitle")) +
        ((lockedKidName ?? lockedMemberName) ? ` ל${lockedKidName ?? lockedMemberName}` : "")
      }
      onSave={handleSubmit}
      saveDisabled={!body.trim() || submitting}
      saveLoading={submitting}
      contentMaxWidth={760}
    >
      {/* ── The "page": title · category · content ── */}
      <View style={styles.page}>
        <TextInput
          testID="input-note-title"
          value={title}
          onChangeText={setTitle}
          placeholder={t("noteModal.titlePlaceholder")}
          placeholderTextColor={C.textMuted}
          style={styles.docTitle}
        />

        {/* Category picker */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.catRow}
          keyboardShouldPersistTaps="handled"
        >
          {categories.map((cat) => {
            const selected = category === cat.key;
            const color = noteCategoryColor(cat);
            return (
              <Pressable
                key={cat.key}
                testID={`note-cat-${cat.key}`}
                onPress={() => setCategory((c) => (c === cat.key ? undefined : cat.key))}
                style={[
                  styles.catPill,
                  {
                    backgroundColor: selected ? color + "1F" : C.surfaceSubtle,
                    borderColor: selected ? color : "transparent",
                  },
                ]}
              >
                <Text style={styles.catPillEmoji}>{cat.emoji}</Text>
                <Text style={[styles.catPillLabel, { color: selected ? color : C.textSecondary }]}>
                  {cat.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.divider} />

        <TextInput
          testID="input-note-body"
          value={body}
          onChangeText={setBody}
          placeholder={t("noteModal.contentPlaceholder")}
          placeholderTextColor={C.textMuted}
          multiline
          textAlignVertical="top"
          style={[styles.docBody, { minHeight: bodyMinHeight }]}
        />
      </View>

      {/* ── Metadata (existing notes only) ── */}
      {editNote && (
        <View style={styles.metaBlock}>
          <View style={styles.metaChip}>
            <Ionicons name="calendar-outline" size={14} color={C.textMuted} />
            <Text style={styles.metaText}>{noteCreatedLabel(editNote.createdAt)}</Text>
          </View>
          <View style={styles.metaChip}>
            <Ionicons name="create-outline" size={14} color={C.textMuted} />
            <Text style={styles.metaText}>{noteEditedLabel(editNote.updatedAt)}</Text>
          </View>
          <View style={styles.spacer} />
          <Pressable
            testID="note-pin-toggle"
            onPress={() => setPinned((p) => !p)}
            style={[
              styles.pinToggle,
              { backgroundColor: pinned ? theme + "1A" : C.surface, borderColor: pinned ? theme : C.border },
            ]}
          >
            <Ionicons name={pinned ? "pin" : "pin-outline"} size={16} color={pinned ? theme : C.textMuted} />
            <Text style={[styles.pinLabel, { color: pinned ? theme : C.textSecondary }]}>
              {t("noteModal.pinnedLabel")}
            </Text>
          </Pressable>
        </View>
      )}

      {/* Owner assignment — hidden in kid/parent-page context. */}
      {!(lockedKidName || lockedMemberName) && (
        <OwnerPicker
          kidId={kidId}
          ownerMemberId={ownerMemberId}
          onChange={(next) => {
            setKidId(next.kidId);
            setOwnerMemberId(next.ownerMemberId);
          }}
        />
      )}
    </ModalWrapper>
  );
}

const styles = StyleSheet.create({
  page: {
    backgroundColor: C.surface,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.border,
    padding: S.lg,
  },
  docTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: C.textPrimary,
    textAlign: TEXT_RIGHT,
    writingDirection: "rtl",
    paddingVertical: S.xs,
    ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as any) : {}),
  },
  catRow: { flexDirection: RTL_ROW, gap: S.xs, paddingVertical: S.sm },
  catPill: {
    flexDirection: RTL_ROW,
    alignItems: "center",
    gap: 4,
    paddingHorizontal: S.md,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    ...(Platform.OS === "web" ? ({ cursor: "pointer" } as any) : {}),
  },
  catPillEmoji: { fontSize: 14 },
  catPillLabel: { fontSize: 13, fontWeight: "700", writingDirection: "rtl" },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: C.border, marginBottom: S.sm },
  docBody: {
    fontSize: 16,
    lineHeight: 24,
    color: C.textPrimary,
    textAlign: TEXT_RIGHT,
    writingDirection: "rtl",
    ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as any) : {}),
  },

  metaBlock: { flexDirection: RTL_ROW, alignItems: "center", gap: S.sm, marginTop: S.lg },
  metaChip: { flexDirection: RTL_ROW, alignItems: "center", gap: 4 },
  metaText: { fontSize: 12, color: C.textMuted, writingDirection: "rtl" },
  spacer: { flex: 1 },
  pinToggle: {
    flexDirection: RTL_ROW,
    alignItems: "center",
    gap: 4,
    paddingHorizontal: S.md,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  pinLabel: { fontSize: 13, fontWeight: "700", writingDirection: "rtl" },
});
