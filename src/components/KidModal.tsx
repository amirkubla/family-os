import React, { useState, useEffect } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Text, TextInput, Button } from "react-native-paper";
import {
  addKidRemote,
  updateKidRemote,
} from "@src/lib/sync/remoteCrud";
import type { Kid } from "@src/models/kid";
import { t } from "@src/i18n";
import ModalWrapper from "./ModalWrapper";

// ── Preset choices ──

const COLOR_SWATCHES = [
  "#FF6B6B", // coral
  "#4ECDC4", // teal
  "#6C63FF", // purple
  "#FFA726", // orange
  "#AB47BC", // violet
  "#42A5F5", // blue
  "#EC407A", // pink
  "#66BB6A", // emerald
  "#78909C", // slate
  "#FFCA28", // gold
  "#7E57C2", // deep purple
  "#26C6DA", // cyan
  "#5C6BC0", // indigo
  "#00897B", // dark teal
];

const EMOJI_OPTIONS = [
  "🧸", "🦄", "🌸", "🐰", "🐣", "🌈", "🦋", "🐱",
  "🐶", "🐻", "🍭", "⭐", "🎀", "🐠", "🦊", "🐝",
  "🌻", "🍓", "👸", "🧚", "💃", "🤴", "🦸‍♂️", "🏎️",
];

// ── Component ──

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
      setName("");
      setEmoji("🌸");
      setColor(COLOR_SWATCHES[0]);
      setNameError("");
    }
  }, [visible, editKid]);

  const validate = (): boolean => {
    const trimmed = name.trim();
    if (!trimmed) {
      setNameError(t("settings.nameRequired"));
      return false;
    }
    if (trimmed.length < 2) {
      setNameError(t("settings.nameMinLength"));
      return false;
    }
    setNameError("");
    return true;
  };

  const handleSubmit = () => {
    if (!validate()) return;

    if (isEditing) {
      updateKidRemote(editKid.id, {
        name: name.trim(),
        emoji,
        color,
      });
    } else {
      addKidRemote({
        name: name.trim(),
        emoji,
        color,
      });
    }

    onDismiss();
  };

  return (
    <ModalWrapper visible={visible} onDismiss={onDismiss}>
      <Text variant="titleLarge" style={styles.modalTitle}>
        {isEditing ? t("settings.editKid") : t("settings.addKid")}
      </Text>

      {/* Name */}
      <TextInput
        placeholder={t("settings.kidName")}
        value={name}
        onChangeText={(v) => {
          setName(v);
          if (nameError) setNameError("");
        }}
        mode="outlined"
        style={styles.input}
        contentStyle={styles.inputContent}
        autoFocus
        error={!!nameError}
      />
      {nameError ? (
        <Text variant="bodySmall" style={styles.error}>
          {nameError}
        </Text>
      ) : null}

      {/* Emoji picker */}
      <Text variant="labelLarge" style={styles.label}>
        {t("settings.kidEmoji")}
      </Text>
      <View style={styles.pickerRow}>
        {EMOJI_OPTIONS.map((e) => (
          <Pressable
            key={e}
            onPress={() => setEmoji(e)}
            style={[
              styles.emojiCell,
              emoji === e && styles.emojiSelected,
            ]}
          >
            <Text style={styles.emojiText}>{e}</Text>
          </Pressable>
        ))}
      </View>

      {/* Color swatches */}
      <Text variant="labelLarge" style={styles.label}>
        {t("settings.kidColor")}
      </Text>
      <View style={styles.pickerRow}>
        {COLOR_SWATCHES.map((c) => (
          <Pressable
            key={c}
            onPress={() => setColor(c)}
            style={[
              styles.colorCell,
              { backgroundColor: c },
              color === c && styles.colorSelected,
            ]}
          />
        ))}
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <Button onPress={onDismiss}>{t("cancel")}</Button>
        <Button mode="contained" onPress={handleSubmit} style={styles.saveBtn}>
          {t("save")}
        </Button>
      </View>
    </ModalWrapper>
  );
}

const styles = StyleSheet.create({
  modalTitle: {
    fontWeight: "700",
    textAlign: "right",
    marginBottom: 16,
    color: "#1A1A2E",
  },
  input: {
    marginBottom: 4,
    textAlign: "right",
    writingDirection: "rtl",
    backgroundColor: "#fff",
  },
  inputContent: { textAlign: "right" },
  error: {
    color: "#EF5350",
    textAlign: "right",
    marginBottom: 8,
  },
  label: {
    textAlign: "right",
    marginTop: 12,
    marginBottom: 6,
    color: "#6B6B8D",
  },
  pickerRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 4,
  },
  emojiCell: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F0EEFF",
    justifyContent: "center",
    alignItems: "center",
  },
  emojiSelected: {
    borderWidth: 2,
    borderColor: "#6C63FF",
  },
  emojiText: { fontSize: 22 },
  colorCell: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  colorSelected: {
    borderWidth: 3,
    borderColor: "#1A1A2E",
  },
  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  saveBtn: {
    backgroundColor: "#6C63FF",
  },
});
