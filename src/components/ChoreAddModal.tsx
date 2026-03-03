import React, { useState } from "react";
import { View, StyleSheet } from "react-native";
import { Text, TextInput, Button } from "react-native-paper";
import { addChoreRemote } from "@src/lib/sync/remoteCrud";
import { t } from "@src/i18n";
import ModalWrapper from "./ModalWrapper";

interface Props {
  visible: boolean;
  onDismiss: () => void;
}

export default function ChoreAddModal({ visible, onDismiss }: Props) {
  const [title, setTitle] = useState("");
  const [assignedTo, setAssignedTo] = useState("");

  const reset = () => {
    setTitle("");
    setAssignedTo("");
  };

  const handleSubmit = () => {
    if (!title.trim()) return;
    addChoreRemote({
      title: title.trim(),
      assignedTo: assignedTo.trim() || undefined,
    });
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
        {t("choreModal.title")}
      </Text>

      <TextInput
        label={t("choreModal.whatNeedsDoing")}
        value={title}
        onChangeText={setTitle}
        mode="outlined"
        style={styles.input}
        autoFocus
      />

      <TextInput
        label={t("choreModal.assignedTo")}
        value={assignedTo}
        onChangeText={setAssignedTo}
        mode="outlined"
        style={styles.input}
      />

      <View style={styles.actions}>
        <Button onPress={handleDismiss}>{t("cancel")}</Button>
        <Button
          mode="contained"
          onPress={handleSubmit}
          disabled={!title.trim()}
        >
          {t("add")}
        </Button>
      </View>
    </ModalWrapper>
  );
}

const styles = StyleSheet.create({
  heading: { fontWeight: "700", marginBottom: 16, textAlign: "right" },
  input: { marginBottom: 12, textAlign: "right" },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 8,
  },
});
