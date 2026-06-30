import React, { useState, useEffect } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Text } from "react-native-paper";
import ModalTextInput from "./ModalTextInput";
import ModalWrapper, { ModalCarousel } from "./ModalWrapper";
import DatePicker from "./DatePicker";
import WheelPicker from "./WheelPicker";
import PillToggle from "./PillToggle";
import { MS } from "@src/ui/modalStyles";
import { C, S, R } from "@src/ui/tokens";
import { RTL_ROW, TEXT_RIGHT } from "@src/ui/rtl";
import { useThemeColor } from "@src/ui/useThemeColor";
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

const DAYS_OF_WEEK = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
const DAYS_OF_MONTH = Array.from({ length: 31 }, (_, i) => i + 1);

/**
 * A kid payment is stored as an Expense scoped to the kid, with paid=false until
 * settled. Its `note` holds the payment name (e.g. "חוג ציור") and its `date`
 * is the due date. Category defaults to the kids bucket so that — once paid —
 * it rolls into "ילדים וחוגים" spending on the budget screen.
 *
 * For a recurring payment the user picks a cadence (weekly/monthly) + a day
 * (day-of-week or day-of-month); the concrete due date is the next matching day.
 */
const KID_PAYMENT_CATEGORY = "ילדים וחוגים";

// Next date (today or later) whose weekday is `dow` (0=Sunday).
function nextWeeklyDate(dow: number): string {
  const today = new Date();
  const diff = (dow - today.getDay() + 7) % 7;
  const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + diff);
  return toYMD(d);
}

// `dom`-th of this month, or next month if that day has already passed.
function nextMonthlyDate(dom: number): string {
  const today = new Date();
  let y = today.getFullYear();
  let m = today.getMonth();
  if (dom < today.getDate()) {
    m += 1;
    if (m > 11) { m = 0; y += 1; }
  }
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  return toYMD(new Date(y, m, Math.min(dom, daysInMonth)));
}

interface Props {
  visible: boolean;
  onDismiss: () => void;
  /** The kid this payment belongs to. Required when creating. */
  kidId: string;
  /** When set, edit this existing payment instead of creating a new one. */
  editExpense?: Expense | null;
  /** Kid name shown in the modal title (kid-page context). */
  lockedKidName?: string;
  /** When set, shows carousel arrows to swap between the kid "add" modals. */
  carousel?: ModalCarousel;
}

export default function KidPaymentModal({ visible, onDismiss, kidId, editExpense, lockedKidName, carousel }: Props) {
  const theme = useThemeColor();
  const [name, setName] = useState("");
  const [amountText, setAmountText] = useState("");
  const [dueDate, setDueDate] = useState(toYMD(new Date()));
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>("monthly");
  // 0-6 for weekly, 1-31 for monthly.
  const [recurrenceDay, setRecurrenceDay] = useState(new Date().getDate());
  const [nameError, setNameError] = useState("");
  const [amountError, setAmountError] = useState("");

  useEffect(() => {
    if (!visible) return;
    if (editExpense) {
      setName(editExpense.note ?? "");
      setAmountText(String(editExpense.amount / 100));
      setDueDate(editExpense.date);
      setIsRecurring(editExpense.isRecurring);
      const rt = (editExpense.recurrenceType as RecurrenceType) ?? "monthly";
      setRecurrenceType(rt);
      if (editExpense.recurrenceDay != null) {
        setRecurrenceDay(editExpense.recurrenceDay);
      } else {
        const [yy, mm, dd] = editExpense.date.split("-").map(Number);
        setRecurrenceDay(rt === "weekly" ? new Date(yy, mm - 1, dd).getDay() : dd);
      }
    } else {
      setName("");
      setAmountText("");
      setDueDate(toYMD(new Date()));
      setIsRecurring(false);
      setRecurrenceType("monthly");
      setRecurrenceDay(new Date().getDate());
    }
    setNameError("");
    setAmountError("");
  }, [visible, editExpense]);

  // Switching cadence re-anchors the day to a sensible default for that cadence.
  const changeType = (rt: RecurrenceType) => {
    setRecurrenceType(rt);
    setRecurrenceDay(rt === "weekly" ? new Date().getDay() : new Date().getDate());
  };

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) { setNameError(t("payment.name")); return; }
    const amount = parseILS(amountText);
    if (!amount || amount <= 0) { setAmountError(t("budget.amount")); return; }

    // Recurring → due date is the next matching day; otherwise use the picker.
    const date = isRecurring
      ? recurrenceType === "weekly" ? nextWeeklyDate(recurrenceDay) : nextMonthlyDate(recurrenceDay)
      : dueDate;

    const recurrenceFields = {
      isRecurring,
      recurrenceType: isRecurring ? recurrenceType : undefined,
      recurrenceDay: isRecurring ? recurrenceDay : undefined,
    };

    if (editExpense) {
      // paid status is toggled from the list row, not here — leave it untouched.
      updateExpenseRemote(editExpense.id, { note: trimmed, amount, date, ...recurrenceFields });
    } else {
      addExpenseRemote({
        amount,
        categoryName: KID_PAYMENT_CATEGORY,
        kidId,
        date,
        note: trimmed,
        paid: false,
        ...recurrenceFields,
      });
    }
    onDismiss();
  };

  return (
    <ModalWrapper
      visible={visible}
      onDismiss={onDismiss}
      carousel={carousel}
      icon="cash-outline"
      title={(editExpense ? t("payment.edit") : t("payment.add")) +
        (lockedKidName ? ` ל${lockedKidName}` : "")}
      onSave={handleSave}
    >
      {/* Name */}
      <Text style={MS.label}>{t("payment.name")}</Text>
      <ModalTextInput
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
      <ModalTextInput
        value={amountText}
        onChangeText={(v) => { setAmountText(v); setAmountError(""); }}
        placeholder={t("payment.amountPlaceholder")}
        keyboardType="numeric"
        mode="outlined"
        style={MS.input}
        contentStyle={MS.inputContentNumeric}
        error={!!amountError}
      />
      {amountError ? <Text style={MS.error}>{amountError}</Text> : null}

      {/* Recurring toggle */}
      <Text style={[styles.recurringLabel, styles.recurringLabelBlock]}>
        {t("payment.recurringToggle")}
      </Text>
      <PillToggle
        value={isRecurring}
        onChange={setIsRecurring}
        onLabel={t("budget.typeRecurring")}
        offLabel={t("budget.typeSingle")}
        testID="payment-recurring-toggle"
      />

      {isRecurring ? (
        <>
          {/* Cadence */}
          <View style={styles.typeRow}>
            {RECURRENCE_TYPES.map((rt) => (
              <Pressable
                key={rt.key}
                onPress={() => changeType(rt.key)}
                style={[styles.typeChip, recurrenceType === rt.key && { backgroundColor: theme, borderColor: theme }]}
              >
                <Text style={[styles.typeChipText, recurrenceType === rt.key && styles.typeChipTextActive]}>
                  {rt.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Day selector */}
          {recurrenceType === "weekly" ? (
            <View style={styles.pickerRow}>
              <Text style={styles.pickerLabel}>{t("payment.onDay")}</Text>
              <WheelPicker
                data={DAYS_OF_WEEK}
                selectedIndex={recurrenceDay}
                onChange={setRecurrenceDay}
                width={110}
              />
            </View>
          ) : (
            <View style={styles.pickerRow}>
              <Text style={styles.pickerLabel}>{t("payment.onDay")}</Text>
              <WheelPicker
                data={DAYS_OF_MONTH.map(String)}
                selectedIndex={recurrenceDay - 1}
                onChange={(i) => setRecurrenceDay(i + 1)}
                width={72}
              />
              <Text style={styles.pickerLabel}>{t("payment.inMonth")}</Text>
            </View>
          )}
        </>
      ) : (
        <>
          {/* One-time due date */}
          <Text style={MS.label}>{t("payment.dueDate")}</Text>
          <DatePicker value={dueDate} onChange={setDueDate} />
        </>
      )}

    </ModalWrapper>
  );
}

const styles = StyleSheet.create({
  recurringLabel: {
    fontSize: 14,
    color: C.textPrimary,
    fontWeight: "600",
    textAlign: TEXT_RIGHT,
    writingDirection: "rtl",
  },
  recurringLabelBlock: {
    marginTop: S.sm,
    marginBottom: S.xs,
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
  typeChipText: { fontSize: 13, color: C.textSecondary, fontWeight: "600" },
  typeChipTextActive: { color: "#fff" },
  pickerRow: {
    flexDirection: RTL_ROW,
    alignItems: "center",
    justifyContent: "center",
    gap: S.sm,
    marginBottom: S.sm,
  },
  pickerLabel: {
    fontSize: 13,
    color: C.textSecondary,
    writingDirection: "rtl",
  },
});
