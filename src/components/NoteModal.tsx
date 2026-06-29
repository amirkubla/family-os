import React, { useState, useEffect, useRef } from "react";
import { View } from "react-native";
import { Text, TextInput, Button } from "react-native-paper";
import type { Note } from "@src/models/note";
import { addNoteRemote, updateNoteRemote } from "@src/lib/sync/remoteCrud";
import { t } from "@src/i18n";
import { MS } from "@src/ui/modalStyles";
import ModalWrapper, { ModalCarousel } from "./ModalWrapper";
import OwnerPicker from "./OwnerPicker";

interface Props {
  visible: boolean;
  onDismiss: () => void;
  editNote?: Note | null;
  /**
   * Pre-select a kid when opening fresh. Used by the kid view's "+" button
   * so the new note is owned by the kid in context. Ignored when editing
   * (the existing note's own kidId wins).
   */
  defaultKidId?: string;
  /**
   * When set (kid-page context), the note is locked to this kid: the owner
   * picker is hidden and the kid's name is shown in the modal title.
   */
  lockedKidName?: string;
  /** When set, shows carousel arrows to swap between the kid "add" modals. */
  carousel?: ModalCarousel;
  /**
   * When set (and not editing), pre-fills title + body for review — used by the
   * voice-note flow to open the editor on a transcribed draft before saving.
   */
  initialDraft?: { title?: string; body: string };
}

export default function NoteModal({ visible, onDismiss, editNote, defaultKidId, lockedKidName, carousel, initialDraft }: Props) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [kidId, setKidId] = useState<string | undefined>(undefined);
  const [ownerMemberId, setOwnerMemberId] = useState<string | undefined>(undefined);
  // In-flight guard against rapid double-clicks (QA Pass 1 BUG #2).
  // Ref for synchronous re-entrancy check; state for visual disabled/loading.
  const submittingRef = useRef(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    submittingRef.current = false;
    setSubmitting(false);
    if (editNote) {
      setTitle(editNote.title ?? "");
      setBody(editNote.body);
      setKidId(editNote.kidId);
      setOwnerMemberId(editNote.ownerMemberId);
    } else {
      setTitle(initialDraft?.title ?? "");
      setBody(initialDraft?.body ?? "");
      setKidId(defaultKidId);
      setOwnerMemberId(undefined);
    }
  }, [editNote, visible, defaultKidId, initialDraft]);

  const reset = () => { setTitle(""); setBody(""); setKidId(undefined); setOwnerMemberId(undefined); };

  const handleSubmit = () => {
    if (submittingRef.current) return; // double-click guard (synchronous)
    if (!body.trim()) return;
    submittingRef.current = true;
    setSubmitting(true);
    if (editNote) {
      updateNoteRemote(editNote.id, {
        title: title.trim() || undefined,
        body: body.trim(),
        kidId,
        ownerMemberId,
      });
    } else {
      addNoteRemote({ title: title.trim() || undefined, body: body.trim(), kidId, ownerMemberId });
    }
    reset();
    onDismiss();
  };

  const handleDismiss = () => { reset(); onDismiss(); };

  return (
    <ModalWrapper visible={visible} onDismiss={handleDismiss} carousel={carousel}>
      <Text style={MS.heading}>
        {(editNote ? t("noteModal.editTitle") : t("noteModal.addTitle")) +
          (lockedKidName ? ` ל${lockedKidName}` : "")}
      </Text>

      <TextInput
        testID="input-note-title"
        placeholder={t("noteModal.titleLabel")}
        value={title}
        onChangeText={setTitle}
        onSubmitEditing={handleSubmit}
        returnKeyType="done"
        mode="outlined"
        style={MS.input}
        contentStyle={MS.inputContent}
      />

      <TextInput
        testID="input-note-body"
        placeholder={t("noteModal.bodyLabel")}
        value={body}
        onChangeText={setBody}
        mode="outlined"
        multiline
        numberOfLines={8}
        style={[MS.input, { minHeight: 160 }]}
        contentStyle={[MS.inputContent, { minHeight: 150 }]}
      />

      {/* Hidden in kid-page context — the note is locked to that kid. */}
      {!lockedKidName && (
        <OwnerPicker
          kidId={kidId}
          ownerMemberId={ownerMemberId}
          onChange={(next) => {
            setKidId(next.kidId);
            setOwnerMemberId(next.ownerMemberId);
          }}
        />
      )}

      <View style={MS.actions}>
        <Button onPress={handleDismiss}>{t("cancel")}</Button>
        <Button
          testID="btn-save"
          mode="contained"
          onPress={handleSubmit}
          disabled={!body.trim() || submitting}
          loading={submitting}
        >
          {editNote ? t("save") : t("add")}
        </Button>
      </View>
    </ModalWrapper>
  );
}
