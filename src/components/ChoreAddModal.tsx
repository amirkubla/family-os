import React, { useState, useEffect, useRef } from "react";
import { View } from "react-native";
import { Text, TextInput, Button } from "react-native-paper";
import { addChoreRemote, updateChoreRemote } from "@src/lib/sync/remoteCrud";
import { useFamilyStore } from "@src/store/useFamilyStore";
import { t } from "@src/i18n";
import { MS } from "@src/ui/modalStyles";
import type { Chore } from "@src/models/chore";
import ModalWrapper from "./ModalWrapper";

interface Props {
  visible: boolean;
  onDismiss: () => void;
  editChore?: Chore | null;
}

export default function ChoreAddModal({ visible, onDismiss, editChore }: Props) {
  const familyMembers = useFamilyStore((s) => s.familyMembers);
  const activeMembers = familyMembers.filter((m) => m.isActive);
  const [title, setTitle] = useState("");
  const [assignedToMemberId, setAssignedToMemberId] = useState<string | undefined>(undefined);
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
    } else {
      setTitle("");
      setAssignedToMemberId(undefined);
    }
  }, [editChore, visible]);

  const reset = () => { setTitle(""); setAssignedToMemberId(undefined); };

  const handleSubmit = () => {
    if (submittingRef.current) return; // double-click guard (synchronous)
    if (!title.trim()) return;
    submittingRef.current = true;
    setSubmitting(true);
    if (editChore) {
      updateChoreRemote(editChore.id, {
        title: title.trim(),
        assignedToMemberId: assignedToMemberId || undefined,
      });
    } else {
      addChoreRemote({
        title: title.trim(),
        assignedToMemberId: assignedToMemberId || undefined,
      });
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
      title={editChore ? t("choreModal.editTitle") : t("choreModal.title")}
      onSave={handleSubmit}
      saveDisabled={!title.trim() || submitting}
      saveLoading={submitting}
      saveLabel={editChore ? t("save") : t("add")}
    >
      <TextInput
        testID="input-chore-title"
        placeholder={t("choreModal.whatNeedsDoing")}
        value={title}
        onChangeText={setTitle}
        onSubmitEditing={handleSubmit}
        returnKeyType="done"
        mode="outlined"
        style={MS.input}
        contentStyle={MS.inputContent}
        autoFocus
      />

      {activeMembers.length > 0 && (
        <>
          <Text style={MS.label}>{t("choreModal.selectMember")}</Text>
          <View style={MS.chipRow}>
            <Button
              mode={!assignedToMemberId ? "contained" : "outlined"}
              compact
              onPress={() => setAssignedToMemberId(undefined)}
              style={MS.chip}
              labelStyle={MS.chipLabel}
            >
              {t("choreModal.noAssignment")}
            </Button>
            {activeMembers.map((member) => (
              <Button
                key={member.id}
                mode={assignedToMemberId === member.id ? "contained" : "outlined"}
                compact
                onPress={() => setAssignedToMemberId(member.id)}
                style={MS.chip}
                labelStyle={MS.chipLabel}
              >
                {member.avatarEmoji ?? ""} {member.name}
              </Button>
            ))}
          </View>
        </>
      )}

    </ModalWrapper>
  );
}
