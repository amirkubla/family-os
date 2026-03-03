import React, { useState, useEffect } from "react";
import { View, StyleSheet } from "react-native";
import { Text, TextInput, Button } from "react-native-paper";
import { useFamilyStore } from "@src/store/useFamilyStore";
import type { Note } from "@src/models/note";
import ModalWrapper from "./ModalWrapper";

interface Props {
  visible: boolean;
  onDismiss: () => void;
  editNote?: Note | null;
}

export default function NoteModal({ visible, onDismiss, editNote }: Props) {
  const addNote = useFamilyStore((s) => s.addNote);
  const updateNote = useFamilyStore((s) => s.updateNote);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  useEffect(() => {
    if (editNote) {
      setTitle(editNote.title ?? "");
      setBody(editNote.body);
    } else {
      setTitle("");
      setBody("");
    }
  }, [editNote, visible]);

  const reset = () => {
    setTitle("");
    setBody("");
  };

  const handleSubmit = () => {
    if (!body.trim()) return;
    if (editNote) {
      updateNote(editNote.id, {
        title: title.trim() || undefined,
        body: body.trim(),
      });
    } else {
      addNote({ title: title.trim() || undefined, body: body.trim() });
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
        {editNote ? "Edit Note" : "Add Note"}
      </Text>

      <TextInput
        label="Title (optional)"
        value={title}
        onChangeText={setTitle}
        mode="outlined"
        style={styles.input}
      />

      <TextInput
        label="Note body"
        value={body}
        onChangeText={setBody}
        mode="outlined"
        multiline
        numberOfLines={4}
        style={styles.input}
      />

      <View style={styles.actions}>
        <Button onPress={handleDismiss}>Cancel</Button>
        <Button
          mode="contained"
          onPress={handleSubmit}
          disabled={!body.trim()}
        >
          {editNote ? "Save" : "Add"}
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
