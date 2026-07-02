/**
 * RenameModal — a tiny single-field modal for renaming a thing (a document,
 * etc.). Generic: the caller supplies the title + current name and gets the
 * trimmed new name via onSubmit.
 */

import React, { useState, useEffect } from "react";
import { View } from "react-native";
import ModalWrapper from "./ModalWrapper";
import ModalTextInput from "./ModalTextInput";
import { MS } from "@src/ui/modalStyles";

interface Props {
  visible: boolean;
  onDismiss: () => void;
  title: string;
  initialName: string;
  placeholder?: string;
  onSubmit: (name: string) => void;
}

export default function RenameModal({
  visible,
  onDismiss,
  title,
  initialName,
  placeholder,
  onSubmit,
}: Props) {
  const [name, setName] = useState(initialName);

  useEffect(() => {
    if (visible) setName(initialName);
  }, [visible, initialName]);

  const save = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    onDismiss();
  };

  return (
    <ModalWrapper
      visible={visible}
      onDismiss={onDismiss}
      icon="pencil-outline"
      title={title}
      onSave={save}
      saveDisabled={!name.trim()}
    >
      <View style={MS.section}>
        <ModalTextInput
          testID="input-rename"
          placeholder={placeholder ?? title}
          value={name}
          onChangeText={setName}
          onSubmitEditing={save}
          returnKeyType="done"
          mode="outlined"
          style={MS.input}
          contentStyle={MS.inputContent}
          autoFocus
        />
      </View>
    </ModalWrapper>
  );
}
