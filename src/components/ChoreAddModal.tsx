import React, { useState, useEffect, useRef } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Text, IconButton } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";

import { addChoreRemote, updateChoreRemote } from "@src/lib/sync/remoteCrud";
import { t, dayNameShort } from "@src/i18n";
import { MS } from "@src/ui/modalStyles";
import { C, R, S } from "@src/ui/tokens";
import { useThemeColor } from "@src/ui/useThemeColor";
import { RTL_ROW } from "@src/ui/rtl";
import type { Chore, ChorePriority, RepeatUnit } from "@src/models/chore";
import ModalWrapper from "./ModalWrapper";
import ModalTextInput from "./ModalTextInput";
import OwnerPicker from "./OwnerPicker";
import SegmentedPills from "./SegmentedPills";
import DateTimeField from "./DateTimeField";

interface Props {
  visible: boolean;
  onDismiss: () => void;
  editChore?: Chore | null;
  /** Pre-assign to a member when opening fresh (parent-page context). */
  defaultMemberId?: string;
  /** When set, lock the chore to this member: assignee picker hidden. */
  lockedMemberName?: string;
}

const pad2 = (n: number) => String(n).padStart(2, "0");
const msToYMD = (ms: number) => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
};
const ymdToMs = (ymd: string) => {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 12).getTime();
};
const todayYMD = () => msToYMD(Date.now());

type PriorityChoice = "none" | ChorePriority;

export default function ChoreAddModal({ visible, onDismiss, editChore, defaultMemberId, lockedMemberName }: Props) {
  const theme = useThemeColor();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignedToMemberId, setAssignedToMemberId] = useState<string | undefined>(undefined);
  const [kidId, setKidId] = useState<string | undefined>(undefined);
  const [priority, setPriority] = useState<PriorityChoice>("none");
  const [dueDate, setDueDate] = useState<string>(""); // "" = none
  const [isRecurring, setIsRecurring] = useState(false);
  const [repeatUnit, setRepeatUnit] = useState<RepeatUnit>("week");
  const [repeatInterval, setRepeatInterval] = useState(1);
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([]);

  const submittingRef = useRef(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!visible) return;
    submittingRef.current = false;
    setSubmitting(false);
    if (editChore) {
      setTitle(editChore.title);
      setDescription(editChore.description ?? "");
      setAssignedToMemberId(editChore.assignedToMemberId);
      setKidId(editChore.kidId);
      setPriority(editChore.priority ?? "none");
      setDueDate(editChore.dueDate ? msToYMD(editChore.dueDate) : "");
      setIsRecurring(!!editChore.isRecurring);
      setRepeatUnit(editChore.repeatUnit ?? "week");
      setRepeatInterval(editChore.repeatInterval ?? 1);
      setDaysOfWeek(editChore.daysOfWeek ?? []);
    } else {
      setTitle("");
      setDescription("");
      setAssignedToMemberId(defaultMemberId);
      setKidId(undefined);
      setPriority("none");
      setDueDate("");
      setIsRecurring(false);
      setRepeatUnit("week");
      setRepeatInterval(1);
      setDaysOfWeek([]);
    }
  }, [editChore, visible, defaultMemberId]);

  const handleSubmit = () => {
    if (submittingRef.current) return;
    if (!title.trim()) return;
    submittingRef.current = true;
    setSubmitting(true);

    const recurring = isRecurring && !!dueDate; // recurrence needs an anchor date
    const payload = {
      title: title.trim(),
      description: description.trim() || undefined,
      assignedToMemberId: assignedToMemberId || undefined,
      kidId: kidId || undefined,
      priority: priority === "none" ? undefined : priority,
      dueDate: dueDate ? ymdToMs(dueDate) : undefined,
      isRecurring: recurring,
      repeatUnit: recurring ? repeatUnit : undefined,
      repeatInterval: recurring ? Math.max(1, repeatInterval) : undefined,
      daysOfWeek: recurring && repeatUnit === "week" ? daysOfWeek : undefined,
    };

    if (editChore) updateChoreRemote(editChore.id, payload);
    else addChoreRemote(payload);
    onDismiss();
  };

  const toggleDay = (d: number) =>
    setDaysOfWeek((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));

  return (
    <ModalWrapper
      visible={visible}
      onDismiss={onDismiss}
      icon="checkbox-outline"
      title={(editChore ? t("choreModal.editTitle") : t("choreModal.title")) +
        (lockedMemberName ? ` ל${lockedMemberName}` : "")}
      onSave={handleSubmit}
      saveDisabled={!title.trim() || submitting}
      saveLoading={submitting}
    >
      <View style={MS.section}>
        <ModalTextInput
          testID="input-chore-title"
          placeholder={t("choreModal.whatNeedsDoing")}
          value={title}
          onChangeText={setTitle}
          autoFocus
        />
        <Text style={MS.label}>{t("chore.descriptionLabel")}</Text>
        <ModalTextInput
          testID="input-chore-description"
          placeholder={t("chore.descriptionPlaceholder")}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={3}
          style={styles.descInput}
          contentStyle={styles.descContent}
        />
      </View>

      {!lockedMemberName && (
        <OwnerPicker
          kidId={kidId}
          ownerMemberId={assignedToMemberId}
          onChange={(next) => { setAssignedToMemberId(next.ownerMemberId); setKidId(next.kidId); }}
        />
      )}

      {/* Priority */}
      <Text style={MS.label}>{t("chore.priorityLabel")}</Text>
      <View style={MS.segmented}>
        <SegmentedPills
          value={priority}
          onChange={(v) => setPriority(v as PriorityChoice)}
          options={[
            { value: "none", label: t("chore.priority_none") },
            { value: "low", label: t("chore.priority_low") },
            { value: "medium", label: t("chore.priority_medium") },
            { value: "high", label: t("chore.priority_high") },
          ]}
          testIDPrefix="chore-priority"
        />
      </View>

      {/* Due date */}
      <Text style={MS.label}>{t("chore.dueLabel")}</Text>
      {dueDate ? (
        <View style={styles.dueRow}>
          <View style={{ flex: 1 }}>
            <DateTimeField mode="date" value={dueDate} onChange={setDueDate} title={t("chore.dueLabel")} testID="chore-due-date" />
          </View>
          <IconButton icon="close" size={18} iconColor={C.textMuted} onPress={() => { setDueDate(""); setIsRecurring(false); }} />
        </View>
      ) : (
        <Pressable style={[styles.ghostBtn, { borderColor: theme }]} onPress={() => setDueDate(todayYMD())} testID="chore-add-due-date">
          <Ionicons name="calendar-outline" size={16} color={theme} />
          <Text style={[styles.ghostText, { color: theme }]}>{t("chore.setDue")}</Text>
        </Pressable>
      )}

      {/* Repeat — only meaningful with an anchor due date */}
      {dueDate ? (
        <>
          <Text style={MS.label}>{t("chore.repeatLabel")}</Text>
          <View style={MS.segmented}>
            <SegmentedPills
              value={isRecurring ? "recurring" : "once"}
              onChange={(v) => setIsRecurring(v === "recurring")}
              options={[
                { value: "once", label: t("chore.repeatOnce") },
                { value: "recurring", label: t("chore.repeatOn") },
              ]}
              testIDPrefix="chore-repeat"
            />
          </View>

          {isRecurring && (
            <>
              <View style={MS.segmented}>
                <SegmentedPills
                  value={repeatUnit}
                  onChange={(v) => setRepeatUnit(v as RepeatUnit)}
                  options={[
                    { value: "day", label: t("chore.unitDay") },
                    { value: "week", label: t("chore.unitWeek") },
                    { value: "month", label: t("chore.unitMonth") },
                  ]}
                  testIDPrefix="chore-unit"
                />
              </View>

              <View style={styles.stepperRow}>
                <Text style={styles.stepperLabel}>{t("chore.everyN")}</Text>
                <IconButton icon="minus" size={16} mode="outlined" disabled={repeatInterval <= 1} onPress={() => setRepeatInterval((n) => Math.max(1, n - 1))} />
                <Text style={styles.stepperValue}>{repeatInterval}</Text>
                <IconButton icon="plus" size={16} mode="outlined" onPress={() => setRepeatInterval((n) => n + 1)} />
              </View>

              {repeatUnit === "week" && (
                <View style={MS.chipRow}>
                  {Array.from({ length: 7 }, (_, idx) => {
                    const on = daysOfWeek.includes(idx);
                    return (
                      <Pressable
                        key={idx}
                        onPress={() => toggleDay(idx)}
                        style={[styles.dayChip, on && { backgroundColor: theme + "1F", borderColor: theme }]}
                      >
                        <Text style={[styles.dayChipText, on && { color: theme, fontWeight: "700" }]}>{dayNameShort(idx)}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </>
          )}
        </>
      ) : null}
    </ModalWrapper>
  );
}

const styles = StyleSheet.create({
  descInput: { minHeight: 90 },
  descContent: { minHeight: 80, textAlignVertical: "top" },
  dueRow: { flexDirection: RTL_ROW, alignItems: "center", gap: S.sm, marginBottom: S.md },
  ghostBtn: {
    flexDirection: RTL_ROW,
    alignItems: "center",
    justifyContent: "center",
    gap: S.sm,
    borderWidth: 1.5,
    borderRadius: R.md,
    paddingVertical: 12,
    marginBottom: S.md,
  },
  ghostText: { fontSize: 14, fontWeight: "700" },
  stepperRow: { flexDirection: RTL_ROW, alignItems: "center", gap: S.xs, marginBottom: S.sm },
  stepperLabel: { fontSize: 13, color: C.textSecondary, marginEnd: S.sm, writingDirection: "rtl" },
  stepperValue: { fontSize: 15, fontWeight: "800", color: C.textPrimary, minWidth: 24, textAlign: "center" },
  dayChip: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 999,
    paddingHorizontal: S.md,
    paddingVertical: 6,
  },
  dayChipText: { fontSize: 12, color: C.textSecondary, writingDirection: "rtl" },
});
