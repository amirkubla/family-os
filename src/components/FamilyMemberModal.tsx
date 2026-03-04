import React, { useState, useEffect } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Text, TextInput, Button, SegmentedButtons } from "react-native-paper";
import {
  addFamilyMemberRemote,
  updateFamilyMemberRemote,
} from "@src/lib/sync/remoteCrud";
import { MEMBER_ROLES } from "@src/models/familyMember";
import type { FamilyMember, MemberRole } from "@src/models/familyMember";
import { t, memberRoleLabel } from "@src/i18n";
import ModalWrapper from "./ModalWrapper";

// ── Preset choices ──

const COLOR_SWATCHES = [
  "#FF6B6B",
  "#4ECDC4",
  "#6C63FF",
  "#FFA726",
  "#AB47BC",
  "#26A69A",
  "#42A5F5",
  "#EF5350",
];

const EMOJI_OPTIONS = ["👩", "👨", "👵", "👴", "🧑", "👩‍🦰", "👨‍🦱", "👤"];

// ── Component ──

interface Props {
  visible: boolean;
  onDismiss: () => void;
  editMember: FamilyMember | null;
}

export default function FamilyMemberModal({
  visible,
  onDismiss,
  editMember,
}: Props) {
  const [name, setName] = useState("");
  const [role, setRole] = useState<MemberRole>("parent");
  const [avatarEmoji, setAvatarEmoji] = useState("👤");
  const [color, setColor] = useState<string>(COLOR_SWATCHES[0]);
  const [nameError, setNameError] = useState("");

  const isEditing = !!editMember;

  useEffect(() => {
    if (visible && editMember) {
      setName(editMember.name);
      setRole(editMember.role);
      setAvatarEmoji(editMember.avatarEmoji ?? "👤");
      setColor(editMember.color ?? COLOR_SWATCHES[0]);
      setNameError("");
    } else if (visible) {
      setName("");
      setRole("parent");
      setAvatarEmoji("👤");
      setColor(COLOR_SWATCHES[0]);
      setNameError("");
    }
  }, [visible, editMember]);

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
      updateFamilyMemberRemote(editMember.id, {
        name: name.trim(),
        role,
        avatarEmoji,
        color,
      });
    } else {
      addFamilyMemberRemote({
        name: name.trim(),
        role,
        avatarEmoji,
        color,
      });
    }

    onDismiss();
  };

  const roleButtons = MEMBER_ROLES.map((r) => ({
    value: r,
    label: memberRoleLabel(r),
  }));

  return (
    <ModalWrapper visible={visible} onDismiss={onDismiss}>
      <Text variant="titleLarge" style={styles.modalTitle}>
        {isEditing ? t("settings.editMember") : t("settings.addMember")}
      </Text>

      {/* Name */}
      <TextInput
        label={t("settings.memberName")}
        value={name}
        onChangeText={(v) => {
          setName(v);
          if (nameError) setNameError("");
        }}
        mode="outlined"
        style={styles.input}
        autoFocus
        error={!!nameError}
      />
      {nameError ? (
        <Text variant="bodySmall" style={styles.error}>
          {nameError}
        </Text>
      ) : null}

      {/* Role */}
      <Text variant="labelLarge" style={styles.label}>
        {t("settings.memberRole")}
      </Text>
      <SegmentedButtons
        value={role}
        onValueChange={(v) => setRole(v as MemberRole)}
        buttons={roleButtons}
        style={styles.segments}
      />

      {/* Emoji picker */}
      <Text variant="labelLarge" style={styles.label}>
        {t("settings.memberEmoji")}
      </Text>
      <View style={styles.pickerRow}>
        {EMOJI_OPTIONS.map((emoji) => (
          <Pressable
            key={emoji}
            onPress={() => setAvatarEmoji(emoji)}
            style={[
              styles.emojiCell,
              avatarEmoji === emoji && styles.emojiSelected,
            ]}
          >
            <Text style={styles.emojiText}>{emoji}</Text>
          </Pressable>
        ))}
      </View>

      {/* Color swatches */}
      <Text variant="labelLarge" style={styles.label}>
        {t("settings.memberColor")}
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
    backgroundColor: "#fff",
  },
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
  segments: { marginBottom: 4 },
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
