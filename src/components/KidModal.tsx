import React, { useState, useEffect } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Text, TextInput, Button } from "react-native-paper";
import { addKidRemote, updateKidRemote } from "@src/lib/sync/remoteCrud";
import type { Kid } from "@src/models/kid";
import { t } from "@src/i18n";
import { C, R, S } from "@src/ui/tokens";
import { MS } from "@src/ui/modalStyles";
import { RTL_ROW } from "@src/ui/rtl";
import ModalWrapper from "./ModalWrapper";

const COLOR_SWATCHES = [
  "#FF6B6B", "#4ECDC4", "#6C63FF", "#FFA726", "#AB47BC", "#42A5F5",
  "#EC407A", "#66BB6A", "#78909C", "#FFCA28", "#7E57C2", "#26C6DA",
  "#5C6BC0", "#00897B",
];

const EMOJI_OPTIONS = [
  "🧸", "🦄", "🌸", "🐰", "🐣", "🌈", "🦋", "🐱",
  "🐶", "🐻", "🍭", "⭐", "🎀", "🐠", "🦊", "🐝",
  "🌻", "🍓", "👸", "🧚", "💃", "🤴", "🦸‍♂️", "🏎️",
];

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
    <ModalWrapper visible={visible} onDismiss={onDismiss}>
      <Text style={MS.heading}>
        {isEditing ? t("settings.editKid") : t("settings.addKid")}
      </Text>

      <TextInput
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
      <View style={styles.pickerRow}>
        {EMOJI_OPTIONS.map((e) => (
          <Pressable
            key={e}
            onPress={() => setEmoji(e)}
            style={[styles.emojiCell, emoji === e && styles.emojiSelected]}
          >
            <Text style={styles.emojiText}>{e}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={MS.label}>{t("settings.kidColor")}</Text>
      <View style={styles.pickerRow}>
        {COLOR_SWATCHES.map((c) => (
          <Pressable
            key={c}
            onPress={() => setColor(c)}
            style={[styles.colorCell, { backgroundColor: c }, color === c && styles.colorSelected]}
          />
        ))}
      </View>

      <View style={MS.actions}>
        <Button onPress={onDismiss}>{t("cancel")}</Button>
        <Button mode="contained" onPress={handleSubmit}>{t("save")}</Button>
      </View>
    </ModalWrapper>
  );
}

const styles = StyleSheet.create({
  pickerRow: {
    flexDirection: RTL_ROW,
    flexWrap: "wrap",
    gap: S.sm,
    marginBottom: S.xs,
  },
  emojiCell: {
    width: 40,
    height: 40,
    borderRadius: R.xl,
    backgroundColor: C.surfaceSubtle,
    justifyContent: "center",
    alignItems: "center",
  },
  emojiSelected: {
    borderWidth: 2,
    borderColor: C.purple,
  },
  emojiText: { fontSize: 22 },
  colorCell: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  colorSelected: {
    borderWidth: 3,
    borderColor: C.textPrimary,
  },
});
