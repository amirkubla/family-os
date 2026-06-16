import React, { useState, useEffect } from "react";
import { View, StyleSheet, Pressable, TextInput as RNTextInput } from "react-native";
import { Text, Button } from "react-native-paper";
import ModalWrapper from "./ModalWrapper";
import { MS } from "@src/ui/modalStyles";
import { C, S, R } from "@src/ui/tokens";
import { RTL_ROW, TEXT_RIGHT } from "@src/ui/rtl";
import { t } from "@src/i18n";
import { toYMD } from "@src/utils/date";
import { useFamilyStore } from "@src/store/useFamilyStore";
import type { Expense } from "@src/models/budget";
import { parseILS } from "@src/models/budget";

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
  }) => void;
}

export default function ExpenseModal({ visible, onDismiss, editExpense, onSave }: Props) {
  const budgetCategories = useFamilyStore((s) => s.budgetCategories);
  const familyMembers = useFamilyStore((s) => s.familyMembers).filter((m) => m.isActive);

  const today = toYMD(new Date());

  const [amountText, setAmountText] = useState("");
  const [categoryName, setCategoryName] = useState("");
  const [payerMemberId, setPayerMemberId] = useState<string | undefined>(undefined);
  const [date, setDate] = useState(today);
  const [note, setNote] = useState("");
  const [amountError, setAmountError] = useState("");

  useEffect(() => {
    if (!visible) return;
    if (editExpense) {
      setAmountText(String(editExpense.amount / 100));
      setCategoryName(editExpense.categoryName);
      setPayerMemberId(editExpense.payerMemberId);
      setDate(editExpense.date);
      setNote(editExpense.note ?? "");
    } else {
      setAmountText("");
      setCategoryName(budgetCategories[0]?.name ?? "");
      setPayerMemberId(undefined);
      setDate(today);
      setNote("");
    }
    setAmountError("");
  }, [visible, editExpense, budgetCategories, today]);

  const handleSave = () => {
    const amount = parseILS(amountText);
    if (!amount || amount <= 0) {
      setAmountError("יש להזין סכום תקין");
      return;
    }
    if (!categoryName) {
      return;
    }
    onSave({ amount, categoryName, payerMemberId, date, note: note.trim() || undefined });
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
            onPress={() => setCategoryName(cat.name)}
            style={[
              styles.catChip,
              categoryName === cat.name && { backgroundColor: cat.color },
            ]}
          >
            <Text style={[styles.catChipText, categoryName === cat.name && styles.catChipTextActive]}>
              {cat.icon} {cat.name}
            </Text>
          </Pressable>
        ))}
      </View>

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

      <View style={MS.actions}>
        <Button onPress={onDismiss}>{t("cancel")}</Button>
        <Button mode="contained" onPress={handleSave}>{t("save")}</Button>
      </View>
    </ModalWrapper>
  );
}

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
});
