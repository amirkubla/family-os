import React, { useState, useEffect } from "react";
import { Text } from "react-native-paper";
import ModalTextInput from "./ModalTextInput";
import { addKidRemote, updateKidRemote } from "@src/lib/sync/remoteCrud";
import type { Kid } from "@src/models/kid";
import { t } from "@src/i18n";
import { MS } from "@src/ui/modalStyles";
import PaginatedPicker from "./PaginatedPicker";
import { AVATAR_EMOJI_OPTIONS, COLOR_SWATCHES_LARGE } from "@src/ui/semanticColors";
import ModalWrapper from "./ModalWrapper";

const COLOR_SWATCHES = COLOR_SWATCHES_LARGE;
const EMOJI_OPTIONS = AVATAR_EMOJI_OPTIONS;

interface Props {
  visible: boolean;
  onDismiss: () => void;
  editKid: Kid | null;
}

export default function KidModal({ visible, onDismiss, editKid }: Props) {
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("🌸");
  const [color, setColor] = useState<string>(COLOR_SWATCHES[0]);
  const [nameError, setNameError] = useState("");

  const isEditing = !!editKid;

  useEffect(() => {
    if (visible && editKid) {
      setName(editKid.name);
      setEmoji(editKid.emoji || "🌸");
      setColor(editKid.color || COLOR_SWATCHES[0]);
      setNameError("");
    } else if (visible) {
      setName(""); setEmoji("🌸"); setColor(COLOR_SWATCHES[0]); setNameError("");
    }
  }, [visible, editKid]);

  const validate = (): boolean => {
    const trimmed = name.trim();
    if (!trimmed) { setNameError(t("settings.nameRequired")); return false; }
    if (trimmed.length < 2) { setNameError(t("settings.nameMinLength")); return false; }
    setNameError(""); return true;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    if (isEditing) {
      updateKidRemote(editKid.id, { name: name.trim(), emoji, color });
    } else {
      addKidRemote({ name: name.trim(), emoji, color });
    }
    onDismiss();
  };

  return (
    <ModalWrapper
      visible={visible}
      onDismiss={onDismiss}
      icon="happy-outline"
      title={isEditing ? t("settings.editKid") : t("settings.addKid")}
      onSave={handleSubmit}
    >
      <ModalTextInput
        placeholder={t("settings.kidName")}
        value={name}
        onChangeText={(v) => { setName(v); if (nameError) setNameError(""); }}
        mode="outlined"
        style={MS.input}
        contentStyle={MS.inputContent}
        autoFocus
        error={!!nameError}
      />
      {nameError ? <Text style={MS.error}>{nameError}</Text> : null}

      <Text style={MS.label}>{t("settings.kidEmoji")}</Text>
      <PaginatedPicker
        kind="emoji"
        options={EMOJI_OPTIONS}
        value={emoji}
        onChange={setEmoji}
        testIDPrefix="kid-emoji"
      />

      <Text style={MS.label}>{t("settings.kidColor")}</Text>
      <PaginatedPicker
        kind="color"
        options={COLOR_SWATCHES}
        value={color}
        onChange={setColor}
        testIDPrefix="kid-color"
      />

    </ModalWrapper>
  );
}
