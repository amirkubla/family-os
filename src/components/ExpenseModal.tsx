import React, { useState, useEffect } from "react";
import { View, StyleSheet, Pressable, TextInput as RNTextInput, Switch } from "react-native";
import { Text, Button } from "react-native-paper";
import ModalWrapper from "./ModalWrapper";
import WheelPicker from "./WheelPicker";
import { MS } from "@src/ui/modalStyles";
import { C, S, R } from "@src/ui/tokens";
import { RTL_ROW, TEXT_RIGHT } from "@src/ui/rtl";
import { t } from "@src/i18n";
import { toYMD } from "@src/utils/date";
import { useFamilyStore } from "@src/store/useFamilyStore";
import type { Expense } from "@src/models/budget";
import { parseILS } from "@src/models/budget";

// ---------------------------------------------------------------------------
// Wheel data
// ---------------------------------------------------------------------------

const DAYS_OF_MONTH = Array.from({ length: 31 }, (_, i) => i + 1);
const DAYS_OF_WEEK = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];

type RecurrenceType = "weekly" | "monthly";

const RECURRENCE_TYPES: { key: RecurrenceType; label: string }[] = [
  { key: "weekly",  label: "שבועי"  },
  { key: "monthly", label: "חודשי"  },
];

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface Props {
  visible: boolean;
  onDismiss: () => void;
  editExpense?: Expense | null;
  onSave: (data: {
    amount: number;
    categoryName: string;
    payerMemberId?: string;
    kidId?: string;
    date: string;
    note?: string;
    isRecurring: boolean;
    recurrenceType?: RecurrenceType;
    recurrenceDay?: number;
  }) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ExpenseModal({ visible, onDismiss, editExpense, onSave }: Props) {
  const budgetCategories = useFamilyStore((s) => s.budgetCategories);
  const familyMembers = useFamilyStore((s) => s.familyMembers).filter((m) => m.isActive);

  const today = toYMD(new Date());

  const [amountText, setAmountText] = useState("");
  const [categoryName, setCategoryName] = useState("");
  const [payerMemberId, setPayerMemberId] = useState<string | undefined>(undefined);
  const [date, setDate] = useState(today);
  const [note, setNote] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>("monthly");
  const [recurrenceDay, setRecurrenceDay] = useState(1);   // 0-6 weekly, 1-31 monthly
  const [amountError, setAmountError] = useState("");
  const [categoryError, setCategoryError] = useState("");

  useEffect(() => {
    if (!visible) return;
    if (editExpense) {
      setAmountText(String(editExpense.amount / 100));
      setCategoryName(editExpense.categoryName);
      setPayerMemberId(editExpense.payerMemberId);
      setDate(editExpense.date);
      setNote(editExpense.note ?? "");
      setIsRecurring(editExpense.isRecurring);
      setRecurrenceType((editExpense.recurrenceType as RecurrenceType) ?? "monthly");
      setRecurrenceDay(editExpense.recurrenceDay ?? 1);
    } else {
      setAmountText("");
      setCategoryName(budgetCategories[0]?.name ?? "");
      setPayerMemberId(undefined);
      setDate(today);
      setNote("");
      setIsRecurring(false);
      setRecurrenceType("monthly");
      setRecurrenceDay(1);
    }
    setAmountError("");
    setCategoryError("");
  }, [visible, editExpense, budgetCategories, today]);

  const handleSave = () => {
    const amount = parseILS(amountText);
    if (!amount || amount <= 0) { setAmountError("יש להזין סכום תקין"); return; }
    if (!categoryName) { setCategoryError("יש לבחור קטגוריה"); return; }
    setCategoryError("");
    onSave({
      amount, categoryName, payerMemberId, date, note: note.trim() || undefined,
      isRecurring,
      recurrenceType: isRecurring ? recurrenceType : undefined,
      recurrenceDay: isRecurring ? recurrenceDay : undefined,
    });
    onDismiss();
  };

  return (
    <ModalWrapper visible={visible} onDismiss={onDismiss}>
      <Text style={MS.heading}>
        {editExpense ? t("budget.editExpense") : t("budget.addExpense")}
      </Text>

      {/* Amount */}
      <Text style={MS.label}>{t("budget.amount")}</Text>
      <RNTextInput
        value={amountText}
        onChangeText={(v) => { setAmountText(v); setAmountError(""); }}
        placeholder={t("budget.amountPlaceholder")}
        keyboardType="numeric"
        style={[styles.amountInput, amountError ? styles.inputError : null]}
        placeholderTextColor={C.textSecondary}
      />
      {amountError ? <Text style={MS.error}>{amountError}</Text> : null}

      {/* Category */}
      <Text style={MS.label}>{t("budget.category")}</Text>
      <View style={styles.chipRow}>
        {budgetCategories.map((cat) => (
          <Pressable
            key={cat.id}
            onPress={() => { setCategoryName(cat.name); setCategoryError(""); }}
            style={[styles.catChip, categoryName === cat.name && { backgroundColor: cat.color }]}
          >
            <Text style={[styles.catChipText, categoryName === cat.name && styles.catChipTextActive]}>
              {cat.icon} {cat.name}
            </Text>
          </Pressable>
        ))}
      </View>
      {categoryError ? <Text style={MS.error}>{categoryError}</Text> : null}

      {/* Payer */}
      {familyMembers.length > 0 && (
        <>
          <Text style={MS.label}>{t("budget.payer")}</Text>
          <View style={styles.chipRow}>
            <Pressable
              onPress={() => setPayerMemberId(undefined)}
              style={[styles.memberChip, !payerMemberId && styles.memberChipActive]}
            >
              <Text style={[styles.memberChipText, !payerMemberId && styles.memberChipTextActive]}>
                {t("budget.anyone")}
              </Text>
            </Pressable>
            {familyMembers.map((m) => (
              <Pressable
                key={m.id}
                onPress={() => setPayerMemberId(m.id)}
                style={[
                  styles.memberChip,
                  payerMemberId === m.id && { backgroundColor: m.color ?? C.purple, borderColor: m.color ?? C.purple },
                ]}
              >
                <Text style={[styles.memberChipText, payerMemberId === m.id && styles.memberChipTextActive]}>
                  {m.avatarEmoji ?? "👤"} {m.name}
                </Text>
              </Pressable>
            ))}
          </View>
        </>
      )}

      {/* Note */}
      <Text style={MS.label}>{t("budget.note")}</Text>
      <RNTextInput
        value={note}
        onChangeText={setNote}
        placeholder={t("budget.notePlaceholder")}
        style={styles.noteInput}
        placeholderTextColor={C.textSecondary}
        multiline
      />

      {/* Recurring toggle */}
      <View style={styles.recurringRow}>
        <Text style={styles.recurringLabel}>{t("budget.recurringToggle")}</Text>
        <Switch
          value={isRecurring}
          onValueChange={setIsRecurring}
          thumbColor={isRecurring ? C.purple : C.textSecondary}
          trackColor={{ false: C.border, true: C.purple + "55" }}
        />
      </View>

      {isRecurring && (
        <View style={styles.recurringPanel}>
          {/* Type selector */}
          <View style={styles.typeRow}>
            {RECURRENCE_TYPES.map((rt) => (
              <Pressable
                key={rt.key}
                onPress={() => {
                  setRecurrenceType(rt.key);
                  setRecurrenceDay(rt.key === "weekly" ? 0 : 1);
                }}
                style={[styles.typeChip, recurrenceType === rt.key && styles.typeChipActive]}
              >
                <Text style={[styles.typeChipText, recurrenceType === rt.key && styles.typeChipTextActive]}>
                  {rt.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Pickers */}
          {recurrenceType === "weekly" && (
            <View style={styles.pickerRow}>
              <Text style={styles.pickerLabel}>ביום</Text>
              <WheelPicker
                data={DAYS_OF_WEEK}
                selectedIndex={recurrenceDay}
                onChange={(i) => setRecurrenceDay(i)}
                width={110}
              />
            </View>
          )}

          {recurrenceType === "monthly" && (
            <View style={styles.pickerRow}>
              <Text style={styles.pickerLabel}>ביום</Text>
              <WheelPicker
                data={DAYS_OF_MONTH.map(String)}
                selectedIndex={recurrenceDay - 1}
                onChange={(i) => setRecurrenceDay(i + 1)}
                width={72}
              />
              <Text style={styles.pickerLabel}>בחודש</Text>
            </View>
          )}

        </View>
      )}

      <View style={MS.actions}>
        <Button onPress={onDismiss}>{t("cancel")}</Button>
        <Button mode="contained" onPress={handleSave}>{t("save")}</Button>
      </View>
    </ModalWrapper>
  );
}

// ---------------------------------------------------------------------------
// Main styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  amountInput: {
    fontSize: 28,
    fontWeight: "700",
    color: C.textPrimary,
    textAlign: TEXT_RIGHT ?? "right",
    borderBottomWidth: 2,
    borderBottomColor: C.purple,
    paddingVertical: S.xs,
    marginBottom: S.sm,
    writingDirection: "ltr",
  },
  inputError: { borderBottomColor: C.red },
  chipRow: {
    flexDirection: RTL_ROW,
    flexWrap: "wrap",
    gap: S.xs,
    marginBottom: S.sm,
  },
  catChip: {
    paddingHorizontal: S.sm,
    paddingVertical: S.xs,
    borderRadius: R.xl,
    backgroundColor: C.surfaceSubtle,
    borderWidth: 1,
    borderColor: "transparent",
  },
  catChipText: { fontSize: 13, color: C.textSecondary },
  catChipTextActive: { color: "#fff", fontWeight: "700" },
  memberChip: {
    paddingHorizontal: S.sm,
    paddingVertical: S.xs,
    borderRadius: R.xl,
    backgroundColor: C.surfaceSubtle,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  memberChipActive: { backgroundColor: C.purple, borderColor: C.purple },
  memberChipText: { fontSize: 13, color: C.textSecondary },
  memberChipTextActive: { color: "#fff", fontWeight: "600" },
  noteInput: {
    fontSize: 14,
    color: C.textPrimary,
    textAlign: TEXT_RIGHT ?? "right",
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: R.sm,
    padding: S.sm,
    minHeight: 48,
    marginBottom: S.sm,
    writingDirection: "rtl",
  },
  recurringRow: {
    flexDirection: RTL_ROW,
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: S.sm,
    marginBottom: S.xs,
  },
  recurringLabel: {
    fontSize: 14,
    color: C.textPrimary,
    fontWeight: "600",
    flex: 1,
    textAlign: TEXT_RIGHT ?? "right",
    writingDirection: "rtl",
  },
  recurringPanel: {
    backgroundColor: C.surfaceSubtle,
    borderRadius: R.md,
    padding: S.sm,
    marginBottom: S.sm,
    gap: S.sm,
  },
  typeRow: {
    flexDirection: RTL_ROW,
    gap: S.xs,
    justifyContent: "center",
  },
  typeChip: {
    flex: 1,
    paddingVertical: S.xs,
    borderRadius: R.xl,
    backgroundColor: C.surface,
    borderWidth: 1.5,
    borderColor: "transparent",
    alignItems: "center",
  },
  typeChipActive: {
    backgroundColor: C.purple,
    borderColor: C.purple,
  },
  typeChipText: { fontSize: 13, color: C.textSecondary, fontWeight: "600" },
  typeChipTextActive: { color: "#fff" },
  pickerRow: {
    flexDirection: RTL_ROW,
    alignItems: "center",
    justifyContent: "center",
    gap: S.sm,
  },
  pickerLabel: {
    fontSize: 13,
    color: C.textSecondary,
    writingDirection: "rtl",
  },
});
