import React, { useState, useEffect } from "react";
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

  useEffect(() => {
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
    if (!title.trim()) return;
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
    <ModalWrapper visible={visible} onDismiss={handleDismiss}>
      <Text style={MS.heading}>
        {editChore ? t("choreModal.editTitle") : t("choreModal.title")}
      </Text>

      <TextInput
        placeholder={t("choreModal.whatNeedsDoing")}
        value={title}
        onChangeText={setTitle}
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

      <View style={MS.actions}>
        <Button onPress={handleDismiss}>{t("cancel")}</Button>
        <Button mode="contained" onPress={handleSubmit} disabled={!title.trim()}>
          {editChore ? t("save") : t("add")}
        </Button>
      </View>
    </ModalWrapper>
  );
}
