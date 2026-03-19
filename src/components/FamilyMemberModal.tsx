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
  "🤱", "👩", "👨", "🧑", "👩‍🦰", "👨‍🦱",
  "🧔", "👱", "🦸", "🧕", "🤰", "🧑‍🍳",
  "🏋️", "🎸", "🧘", "💻", "🎯", "☕",
];

interface Props {
  visible: boolean;
  onDismiss: () => void;
  editMember: FamilyMember | null;
}

export default function FamilyMemberModal({ visible, onDismiss, editMember }: Props) {
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
      setName(""); setRole("parent"); setAvatarEmoji("👤");
      setColor(COLOR_SWATCHES[0]); setNameError("");
    }
  }, [visible, editMember]);

  const validate = (): boolean => {
    const trimmed = name.trim();
    if (!trimmed) { setNameError(t("settings.nameRequired")); return false; }
    if (trimmed.length < 2) { setNameError(t("settings.nameMinLength")); return false; }
    setNameError(""); return true;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    if (isEditing) {
      updateFamilyMemberRemote(editMember.id, { name: name.trim(), role, avatarEmoji, color });
    } else {
      addFamilyMemberRemote({ name: name.trim(), role, avatarEmoji, color });
    }
    onDismiss();
  };

  const roleButtons = MEMBER_ROLES.map((r) => ({ value: r, label: memberRoleLabel(r) }));

  return (
    <ModalWrapper visible={visible} onDismiss={onDismiss}>
      <Text style={MS.heading}>
        {isEditing ? t("settings.editMember") : t("settings.addMember")}
      </Text>

      <TextInput
        placeholder={t("settings.memberName")}
        value={name}
        onChangeText={(v) => { setName(v); if (nameError) setNameError(""); }}
        mode="outlined"
        style={MS.input}
        contentStyle={MS.inputContent}
        autoFocus
        error={!!nameError}
      />
      {nameError ? <Text style={MS.error}>{nameError}</Text> : null}

      <Text style={MS.label}>{t("settings.memberRole")}</Text>
      <SegmentedButtons
        value={role}
        onValueChange={(v) => setRole(v as MemberRole)}
        buttons={roleButtons}
        style={MS.segmented}
      />

      <Text style={MS.label}>{t("settings.memberEmoji")}</Text>
      <View style={styles.pickerRow}>
        {EMOJI_OPTIONS.map((emoji) => (
          <Pressable
            key={emoji}
            onPress={() => setAvatarEmoji(emoji)}
            style={[styles.emojiCell, avatarEmoji === emoji && styles.emojiSelected]}
          >
            <Text style={styles.emojiText}>{emoji}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={MS.label}>{t("settings.memberColor")}</Text>
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
