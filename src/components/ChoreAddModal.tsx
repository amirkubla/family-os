import React, { useState, useEffect, useRef } from "react";
import { View, StyleSheet } from "react-native";
import { addChoreRemote, updateChoreRemote } from "@src/lib/sync/remoteCrud";
import { t } from "@src/i18n";
import { MS } from "@src/ui/modalStyles";
import type { Chore } from "@src/models/chore";
import ModalWrapper from "./ModalWrapper";
import ModalTextInput from "./ModalTextInput";
import OwnerPicker from "./OwnerPicker";

interface Props {
  visible: boolean;
  onDismiss: () => void;
  editChore?: Chore | null;
  /** Pre-assign to a member when opening fresh (parent-page context). */
  defaultMemberId?: string;
  /** When set (parent-page context), lock the chore to this member: the
   *  assignee picker is hidden and the member's name shows in the title. */
  lockedMemberName?: string;
}

export default function ChoreAddModal({ visible, onDismiss, editChore, defaultMemberId, lockedMemberName }: Props) {
  const [title, setTitle] = useState("");
  // Assignee is a member XOR a kid (mirrors notes' OwnerPicker).
  const [assignedToMemberId, setAssignedToMemberId] = useState<string | undefined>(undefined);
  const [kidId, setKidId] = useState<string | undefined>(undefined);
  // In-flight guard against rapid double-clicks (QA Pass 1 BUG #2).
  // Ref for synchronous re-entrancy check; state for visual disabled/loading.
  const submittingRef = useRef(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    submittingRef.current = false;
    setSubmitting(false);
    if (editChore) {
      setTitle(editChore.title);
      setAssignedToMemberId(editChore.assignedToMemberId);
      setKidId(editChore.kidId);
    } else {
      setTitle("");
      setAssignedToMemberId(defaultMemberId);
      setKidId(undefined);
    }
  }, [editChore, visible, defaultMemberId]);

  const reset = () => { setTitle(""); setAssignedToMemberId(undefined); setKidId(undefined); };

  const handleSubmit = () => {
    if (submittingRef.current) return; // double-click guard (synchronous)
    if (!title.trim()) return;
    submittingRef.current = true;
    setSubmitting(true);
    const assignee = { assignedToMemberId: assignedToMemberId || undefined, kidId: kidId || undefined };
    if (editChore) {
      updateChoreRemote(editChore.id, { title: title.trim(), ...assignee });
    } else {
      addChoreRemote({ title: title.trim(), ...assignee });
    }
    reset();
    onDismiss();
  };

  const handleDismiss = () => { reset(); onDismiss(); };

  return (
    <ModalWrapper
      visible={visible}
      onDismiss={handleDismiss}
      icon="checkbox-outline"
      title={(editChore ? t("choreModal.editTitle") : t("choreModal.title")) +
        (lockedMemberName ? ` ל${lockedMemberName}` : "")}
      onSave={handleSubmit}
      saveDisabled={!title.trim() || submitting}
      saveLoading={submitting}
    >
      <View style={MS.section}>
        {/* No section header — the input's placeholder ("מה צריך לעשות?") is
            self-explanatory, matching the event modal's label cleanup. */}
        <ModalTextInput
          testID="input-chore-title"
          placeholder={t("choreModal.whatNeedsDoing")}
          value={title}
          onChangeText={setTitle}
          multiline
          numberOfLines={5}
          style={styles.tallInput}
          contentStyle={styles.tallContent}
          autoFocus
        />
      </View>

      {/* Assignee — its own section; a family member OR a kid (or nobody).
          Hidden when locked to a member (parent-page context). */}
      {!lockedMemberName && (
        <OwnerPicker
          kidId={kidId}
          ownerMemberId={assignedToMemberId}
          onChange={(next) => { setAssignedToMemberId(next.ownerMemberId); setKidId(next.kidId); }}
        />
      )}
    </ModalWrapper>
  );
}

const styles = StyleSheet.create({
  // ~5× the single-line height — a tall "what needs doing" box.
  tallInput: { minHeight: 220 },
  tallContent: { minHeight: 210, textAlignVertical: "top" },
});
