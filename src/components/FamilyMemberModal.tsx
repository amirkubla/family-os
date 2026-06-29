import React, { useState, useEffect } from "react";
import { View } from "react-native";
import { Text, TextInput } from "react-native-paper";
import {
  addFamilyMemberRemote,
  updateFamilyMemberRemote,
} from "@src/lib/sync/remoteCrud";
import { MEMBER_ROLES } from "@src/models/familyMember";
import type { FamilyMember, MemberRole } from "@src/models/familyMember";
import { t, memberRoleLabel } from "@src/i18n";
import { MS } from "@src/ui/modalStyles";
import SegmentedPills from "./SegmentedPills";
import PaginatedPicker from "./PaginatedPicker";
import { AVATAR_EMOJI_OPTIONS, COLOR_SWATCHES_LARGE } from "@src/ui/semanticColors";
import ModalWrapper from "./ModalWrapper";

const COLOR_SWATCHES = COLOR_SWATCHES_LARGE;
const EMOJI_OPTIONS = AVATAR_EMOJI_OPTIONS;

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
    <ModalWrapper
      visible={visible}
      onDismiss={onDismiss}
      icon="person-outline"
      title={isEditing ? t("settings.editMember") : t("settings.addMember")}
      onSave={handleSubmit}
    >
      <TextInput
        placeholder={t("settings.memberName")}
        value={name}
        onChangeText={(v) => { setName(v); if (nameError) setNameError(""); }}
        onSubmitEditing={handleSubmit}
        returnKeyType="done"
        mode="outlined"
        style={MS.input}
        contentStyle={MS.inputContent}
        autoFocus
        error={!!nameError}
        testID="input-member-name"
      />
      {nameError ? <Text style={MS.error}>{nameError}</Text> : null}

      <Text style={MS.label}>{t("settings.memberRole")}</Text>
      <View style={MS.segmented}>
        <SegmentedPills
          value={role}
          onChange={(v) => setRole(v as MemberRole)}
          options={roleButtons}
        />
      </View>

      <Text style={MS.label}>{t("settings.memberEmoji")}</Text>
      <PaginatedPicker
        kind="emoji"
        options={EMOJI_OPTIONS}
        value={avatarEmoji}
        onChange={setAvatarEmoji}
        testIDPrefix="member-emoji"
      />

      <Text style={MS.label}>{t("settings.memberColor")}</Text>
      <PaginatedPicker
        kind="color"
        options={COLOR_SWATCHES}
        value={color}
        onChange={setColor}
        testIDPrefix="member-color"
      />

    </ModalWrapper>
  );
}
