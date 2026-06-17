import React, { useState, useEffect } from "react";
import { View, StyleSheet, Pressable, Switch } from "react-native";
import { Text, TextInput, Button } from "react-native-paper";
import ModalWrapper from "./ModalWrapper";
import DatePicker from "./DatePicker";
import { MS } from "@src/ui/modalStyles";
import { C, S, R } from "@src/ui/tokens";
import { RTL_ROW, TEXT_RIGHT } from "@src/ui/rtl";
import { t } from "@src/i18n";
import { toYMD } from "@src/utils/date";
import { addExpenseRemote, updateExpenseRemote } from "@src/lib/sync/remoteCrud";
import { parseILS } from "@src/models/budget";
import type { Expense } from "@src/models/budget";

type RecurrenceType = "weekly" | "monthly";

const RECURRENCE_TYPES: { key: RecurrenceType; label: string }[] = [
  { key: "weekly", label: t("payment.weekly") },
  { key: "monthly", label: t("payment.monthly") },
];

/**
 * A kid payment is stored as an Expense scoped to the kid, with paid=false until
 * settled. Its `note` holds the payment name (e.g. "חוג ציור") and its `date`
 * is the due date. Category defaults to the kids bucket so that — once paid —
 * it rolls into "ילדים וחוגים" spending on the budget screen.
 */
const KID_PAYMENT_CATEGORY = "ילדים וחוגים";

interface Props {
  visible: boolean;
  onDismiss: () => void;
  /** The kid this payment belongs to. Required when creating. */
  kidId: string;
  /** When set, edit this existing payment instead of creating a new one. */
  editExpense?: Expense | null;
}

export default function KidPaymentModal({ visible, onDismiss, kidId, editExpense }: Props) {
  const [name, setName] = useState("");
  const [amountText, setAmountText] = useState("");
  const [dueDate, setDueDate] = useState(toYMD(new Date()));
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>("monthly");
  const [nameError, setNameError] = useState("");
  const [amountError, setAmountError] = useState("");

  useEffect(() => {
    if (!visible) return;
    if (editExpense) {
      setName(editExpense.note ?? "");
      setAmountText(String(editExpense.amount / 100));
      setDueDate(editExpense.date);
      setIsRecurring(editExpense.isRecurring);
      setRecurrenceType((editExpense.recurrenceType as RecurrenceType) ?? "monthly");
    } else {
      setName("");
      setAmountText("");
      setDueDate(toYMD(new Date()));
      setIsRecurring(false);
      setRecurrenceType("monthly");
    }
    setNameError("");
    setAmountError("");
  }, [visible, editExpense]);

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) { setNameError(t("payment.name")); return; }
    const amount = parseILS(amountText);
    if (!amount || amount <= 0) { setAmountError(t("budget.amount")); return; }

    if (editExpense) {
      // paid status is toggled from the list row, not here — leave it untouched.
      updateExpenseRemote(editExpense.id, {
        note: trimmed,
        amount,
        date: dueDate,
        isRecurring,
        recurrenceType: isRecurring ? recurrenceType : undefined,
      });
    } else {
      addExpenseRemote({
        amount,
        categoryName: KID_PAYMENT_CATEGORY,
        kidId,
        date: dueDate,
        note: trimmed,
        paid: false,
        isRecurring,
        recurrenceType: isRecurring ? recurrenceType : undefined,
      });
    }
    onDismiss();
  };

  return (
    <ModalWrapper visible={visible} onDismiss={onDismiss}>
      <Text style={MS.heading}>
        {editExpense ? t("payment.edit") : t("payment.add")}
      </Text>

      {/* Name */}
      <Text style={MS.label}>{t("payment.name")}</Text>
      <TextInput
        value={name}
        onChangeText={(v) => { setName(v); setNameError(""); }}
        placeholder={t("payment.namePlaceholder")}
        mode="outlined"
        style={MS.input}
        contentStyle={MS.inputContent}
        error={!!nameError}
      />
      {nameError ? <Text style={MS.error}>{nameError}</Text> : null}

      {/* Amount */}
      <Text style={MS.label}>{t("payment.amount")}</Text>
      <TextInput
        value={amountText}
        onChangeText={(v) => { setAmountText(v); setAmountError(""); }}
        placeholder={t("payment.amountPlaceholder")}
        keyboardType="numeric"
        mode="outlined"
        style={MS.input}
        contentStyle={MS.inputContent}
        error={!!amountError}
      />
      {amountError ? <Text style={MS.error}>{amountError}</Text> : null}

      {/* Due date */}
      <Text style={MS.label}>{t("payment.dueDate")}</Text>
      <DatePicker value={dueDate} onChange={setDueDate} />

      {/* Recurring toggle */}
      <View style={styles.recurringRow}>
        <Text style={styles.recurringLabel}>{t("payment.recurringToggle")}</Text>
        <Switch
          value={isRecurring}
          onValueChange={setIsRecurring}
          thumbColor={isRecurring ? C.purple : C.textSecondary}
          trackColor={{ false: C.border, true: C.purple + "55" }}
        />
      </View>
      {isRecurring && (
        <View style={styles.typeRow}>
          {RECURRENCE_TYPES.map((rt) => (
            <Pressable
              key={rt.key}
              onPress={() => setRecurrenceType(rt.key)}
              style={[styles.typeChip, recurrenceType === rt.key && styles.typeChipActive]}
            >
              <Text style={[styles.typeChipText, recurrenceType === rt.key && styles.typeChipTextActive]}>
                {rt.label}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      <View style={MS.actions}>
        <Button onPress={onDismiss}>{t("cancel")}</Button>
        <Button mode="contained" onPress={handleSave}>{t("save")}</Button>
      </View>
    </ModalWrapper>
  );
}

const styles = StyleSheet.create({
  recurringRow: {
    flexDirection: RTL_ROW,
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: S.sm,
    marginTop: S.xs,
  },
  recurringLabel: {
    fontSize: 14,
    color: C.textPrimary,
    fontWeight: "600",
    flex: 1,
    textAlign: TEXT_RIGHT,
    writingDirection: "rtl",
  },
  typeRow: {
    flexDirection: RTL_ROW,
    gap: S.xs,
    marginBottom: S.sm,
  },
  typeChip: {
    flex: 1,
    paddingVertical: S.xs,
    borderRadius: R.xl,
    backgroundColor: C.surfaceSubtle,
    borderWidth: 1.5,
    borderColor: "transparent",
    alignItems: "center",
  },
  typeChipActive: { backgroundColor: C.purple, borderColor: C.purple },
  typeChipText: { fontSize: 13, color: C.textSecondary, fontWeight: "600" },
  typeChipTextActive: { color: "#fff" },
});
