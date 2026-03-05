import React, { useState, useEffect } from "react";
import { View, StyleSheet } from "react-native";
import { Text, TextInput, Button } from "react-native-paper";
import { addChoreRemote, updateChoreRemote } from "@src/lib/sync/remoteCrud";
import { useFamilyStore } from "@src/store/useFamilyStore";
import { t } from "@src/i18n";
import { RTL_ROW } from "@src/ui/rtl";
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
  const [assignedToMemberId, setAssignedToMemberId] = useState<
    string | undefined
  >(undefined);

  useEffect(() => {
    if (editChore) {
      setTitle(editChore.title);
      setAssignedToMemberId(editChore.assignedToMemberId);
    } else {
      setTitle("");
      setAssignedToMemberId(undefined);
    }
  }, [editChore, visible]);

  const reset = () => {
    setTitle("");
    setAssignedToMemberId(undefined);
  };

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

  const handleDismiss = () => {
    reset();
    onDismiss();
  };

  return (
    <ModalWrapper visible={visible} onDismiss={handleDismiss}>
      <Text variant="titleLarge" style={styles.heading}>
        {editChore ? t("choreModal.editTitle") : t("choreModal.title")}
      </Text>

      <TextInput
        placeholder={t("choreModal.whatNeedsDoing")}
        value={title}
        onChangeText={setTitle}
        mode="outlined"
        style={styles.input}
        contentStyle={styles.inputContent}
        autoFocus
      />

      {/* Member selection */}
      {activeMembers.length > 0 && (
        <>
          <Text variant="labelLarge" style={styles.label}>
            {t("choreModal.selectMember")}
          </Text>
          <View style={styles.memberWrap}>
            <Button
              mode={!assignedToMemberId ? "contained" : "outlined"}
              compact
              onPress={() => setAssignedToMemberId(undefined)}
              style={styles.memberChip}
              labelStyle={styles.memberLabel}
            >
              {t("choreModal.noAssignment")}
            </Button>
            {activeMembers.map((member) => (
              <Button
                key={member.id}
                mode={
                  assignedToMemberId === member.id ? "contained" : "outlined"
                }
                compact
                onPress={() => setAssignedToMemberId(member.id)}
                style={styles.memberChip}
                labelStyle={styles.memberLabel}
              >
                {member.avatarEmoji ?? ""} {member.name}
              </Button>
            ))}
          </View>
        </>
      )}

      <View style={styles.actions}>
        <Button onPress={handleDismiss}>{t("cancel")}</Button>
        <Button
          mode="contained"
          onPress={handleSubmit}
          disabled={!title.trim()}
        >
          {editChore ? t("save") : t("add")}
        </Button>
      </View>
    </ModalWrapper>
  );
}

const styles = StyleSheet.create({
  heading: { fontWeight: "700", marginBottom: 16, textAlign: "right" },
  input: { marginBottom: 12, textAlign: "right", writingDirection: "rtl" },
  inputContent: { textAlign: "right" },
  label: {
    textAlign: "right",
    marginBottom: 6,
    color: "#6B6B8D",
  },
  memberWrap: {
    flexDirection: RTL_ROW,
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 12,
  },
  memberChip: { borderRadius: 20 },
  memberLabel: { fontSize: 13 },
  actions: {
    flexDirection: RTL_ROW,
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 8,
  },
});
