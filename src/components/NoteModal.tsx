import React, { useState, useEffect } from "react";
import { View, StyleSheet } from "react-native";
import { Text, TextInput, Button } from "react-native-paper";
import type { Note } from "@src/models/note";
import { addNoteRemote, updateNoteRemote } from "@src/lib/sync/remoteCrud";
import { t } from "@src/i18n";
import ModalWrapper from "./ModalWrapper";

interface Props {
  visible: boolean;
  onDismiss: () => void;
  editNote?: Note | null;
}

export default function NoteModal({ visible, onDismiss, editNote }: Props) {
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
      updateNoteRemote(editNote.id, {
        title: title.trim() || undefined,
        body: body.trim(),
      });
    } else {
      addNoteRemote({ title: title.trim() || undefined, body: body.trim() });
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
        {editNote ? t("noteModal.editTitle") : t("noteModal.addTitle")}
      </Text>

      <TextInput
        label={t("noteModal.titleLabel")}
        value={title}
        onChangeText={setTitle}
        mode="outlined"
        style={styles.input}
      />

      <TextInput
        label={t("noteModal.bodyLabel")}
        value={body}
        onChangeText={setBody}
        mode="outlined"
        multiline
        numberOfLines={4}
        style={styles.input}
      />

      <View style={styles.actions}>
        <Button onPress={handleDismiss}>{t("cancel")}</Button>
        <Button
          mode="contained"
          onPress={handleSubmit}
          disabled={!body.trim()}
        >
          {editNote ? t("save") : t("add")}
        </Button>
      </View>
    </ModalWrapper>
  );
}

const styles = StyleSheet.create({
  heading: { fontWeight: "700", marginBottom: 16, textAlign: "right" },
  input: { marginBottom: 12, textAlign: "right", writingDirection: "rtl" },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 8,
  },
});
