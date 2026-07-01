/**
 * FolderModal — create or rename a document folder.
 *
 * Create is server-first (the backend generates the id) via addFolderRemote;
 * rename is optimistic via updateFolderRemote. New folders are created inside
 * `parentId` (undefined = root).
 */

import React, { useState, useEffect } from "react";
import { View } from "react-native";
import ModalWrapper from "./ModalWrapper";
import ModalTextInput from "./ModalTextInput";
import { MS } from "@src/ui/modalStyles";
import { t } from "@src/i18n";
import { addFolderRemote, updateFolderRemote } from "@src/lib/sync/remoteCrud";
import type { Folder } from "@src/models/document";

interface Props {
  visible: boolean;
  onDismiss: () => void;
  editFolder?: Folder | null;
  /** Parent for a newly-created folder (undefined = root). */
  parentId?: string;
}

export default function FolderModal({ visible, onDismiss, editFolder, parentId }: Props) {
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      setName(editFolder?.name ?? "");
      setSubmitting(false);
    }
  }, [visible, editFolder]);

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    if (editFolder) {
      updateFolderRemote(editFolder.id, { name: trimmed });
    } else {
      await addFolderRemote({ name: trimmed, parentId });
    }
    onDismiss();
  };

  return (
    <ModalWrapper
      visible={visible}
      onDismiss={onDismiss}
      icon="folder-outline"
      title={editFolder ? t("documents.renameFolder") : t("documents.newFolder")}
      onSave={handleSave}
      saveDisabled={!name.trim() || submitting}
      saveLoading={submitting}
    >
      <View style={MS.section}>
        <ModalTextInput
          testID="input-folder-name"
          placeholder={t("documents.folderName")}
          value={name}
          onChangeText={setName}
          onSubmitEditing={handleSave}
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
