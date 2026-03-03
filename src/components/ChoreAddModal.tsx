import React, { useState } from "react";
import { View, StyleSheet } from "react-native";
import { Text, TextInput, Button } from "react-native-paper";
import { useFamilyStore } from "@src/store/useFamilyStore";
import ModalWrapper from "./ModalWrapper";

interface Props {
  visible: boolean;
  onDismiss: () => void;
}

export default function ChoreAddModal({ visible, onDismiss }: Props) {
  const addChore = useFamilyStore((s) => s.addChore);
  const [title, setTitle] = useState("");
  const [assignedTo, setAssignedTo] = useState("");

  const reset = () => {
    setTitle("");
    setAssignedTo("");
  };

  const handleSubmit = () => {
    if (!title.trim()) return;
    addChore({
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
        Add Chore
      </Text>

      <TextInput
        label="What needs doing?"
        value={title}
        onChangeText={setTitle}
        mode="outlined"
        style={styles.input}
        autoFocus
      />

      <TextInput
        label="Assigned to (optional)"
        value={assignedTo}
        onChangeText={setAssignedTo}
        mode="outlined"
        style={styles.input}
      />

      <View style={styles.actions}>
        <Button onPress={handleDismiss}>Cancel</Button>
        <Button
          mode="contained"
          onPress={handleSubmit}
          disabled={!title.trim()}
        >
          Add
        </Button>
      </View>
    </ModalWrapper>
  );
}

const styles = StyleSheet.create({
  heading: { fontWeight: "700", marginBottom: 16 },
  input: { marginBottom: 12 },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 8,
  },
});
