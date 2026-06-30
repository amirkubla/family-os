import React, { useState, useEffect, useRef } from "react";
import { View, StyleSheet } from "react-native";
import { Text } from "react-native-paper";
import { addChoreRemote, updateChoreRemote } from "@src/lib/sync/remoteCrud";
import { useFamilyStore } from "@src/store/useFamilyStore";
import { t } from "@src/i18n";
import { MS } from "@src/ui/modalStyles";
import { S } from "@src/ui/tokens";
import { useThemeColor } from "@src/ui/useThemeColor";
import type { Chore } from "@src/models/chore";
import ModalWrapper from "./ModalWrapper";
import ModalTextInput from "./ModalTextInput";
import SelectChip from "./SelectChip";

interface Props {
  visible: boolean;
  onDismiss: () => void;
  editChore?: Chore | null;
}

export default function ChoreAddModal({ visible, onDismiss, editChore }: Props) {
  const theme = useThemeColor();
  const familyMembers = useFamilyStore((s) => s.familyMembers);
  const activeMembers = familyMembers.filter((m) => m.isActive);
  const [title, setTitle] = useState("");
  const [assignedToMemberId, setAssignedToMemberId] = useState<string | undefined>(undefined);
  // In-flight guard against rapid double-clicks (QA Pass 1 BUG #2).
  // Ref for synchronous re-entrancy check; state for visual disabled/loading.
  const submittingRef = useRef(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    submittingRef.current = false;
    setSubmitting(false);
    if (editChore) {
      setTitle(editChore.title);
      setAssignedToMemberId(editChore.assignedToMemberId);
    } else {
      setTitle("");
      setAssignedToMemberId(undefined);
    }
  }, [editChore, visible]);

  const reset = () => { setTitle(""); setAssignedToMemberId(undefined); };

  const handleSubmit = () => {
    if (submittingRef.current) return; // double-click guard (synchronous)
    if (!title.trim()) return;
    submittingRef.current = true;
    setSubmitting(true);
    if (editChore) {
      updateChoreRemote(editChore.id, {
        title: title.trim(),
        assignedToMemberId: assignedToMemberId || undefined,
      });
    } else {
      addChoreRemote({
        title: title.trim(),
        assignedToMemberId: assignedToMemberId || undefined,
      });
    }
    reset();
    onDismiss();
  };

  const handleDismiss = () => { reset(); onDismiss(); };

  return (
    <ModalWrapper
      visible={visible}
      onDismiss={handleDismiss}
      icon="checkbox-outline"
      title={editChore ? t("choreModal.editTitle") : t("choreModal.title")}
      onSave={handleSubmit}
      saveDisabled={!title.trim() || submitting}
      saveLoading={submitting}
    >
      <View style={MS.section}>
        <View style={MS.sectionHeader}>
          <Text style={MS.sectionLabel}>{t("choreModal.whatNeedsDoing")}</Text>
          <Text style={MS.sectionIcon}>✅</Text>
        </View>
        <ModalTextInput
          testID="input-chore-title"
          placeholder={t("choreModal.whatNeedsDoing")}
          value={title}
          onChangeText={setTitle}
          multiline
          numberOfLines={5}
          style={styles.tallInput}
          contentStyle={styles.tallContent}
          autoFocus
        />

        {activeMembers.length > 0 && (
          <>
            <View style={[MS.sectionHeader, { marginTop: S.sm }]}>
              <Text style={MS.sectionLabel}>{t("choreModal.selectMember")}</Text>
              <Text style={MS.sectionIcon}>👥</Text>
            </View>
            <View style={MS.chipRow}>
              <SelectChip
                label={t("choreModal.noAssignment")}
                color={theme}
                selected={!assignedToMemberId}
                onPress={() => setAssignedToMemberId(undefined)}
              />
              {activeMembers.map((member) => (
                <SelectChip
                  key={member.id}
                  label={member.name}
                  emoji={member.avatarEmoji ?? "👤"}
                  color={member.color ?? theme}
                  selected={assignedToMemberId === member.id}
                  onPress={() => setAssignedToMemberId(member.id)}
                />
              ))}
            </View>
          </>
        )}
      </View>

    </ModalWrapper>
  );
}

const styles = StyleSheet.create({
  // ~5× the single-line height — a tall "what needs doing" box.
  tallInput: { minHeight: 220 },
  tallContent: { minHeight: 210, textAlignVertical: "top" },
});
