import React, { useState, useEffect } from "react";
import { View, StyleSheet, Pressable, TextInput as RNTextInput } from "react-native";
import { Text, Button } from "react-native-paper";
import ModalWrapper from "./ModalWrapper";
import WheelPicker from "./WheelPicker";
import SegmentedPills from "./SegmentedPills";
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

type PaymentType = "single" | "recurring";

interface FormState {
  amountText: string;
  categoryName: string;
  payerMemberId?: string;
  note: string;
  recurrenceType: RecurrenceType; // only used in recurring mode
  recurrenceDay: number;          // 0-6 weekly, 1-31 monthly (recurring only)
}

const EMPTY_FORM: FormState = {
  amountText: "",
  categoryName: "",
  payerMemberId: undefined,
  note: "",
  recurrenceType: "monthly",
  recurrenceDay: 1,
};

export default function ExpenseModal({ visible, onDismiss, editExpense, onSave }: Props) {
  const budgetCategories = useFamilyStore((s) => s.budgetCategories);
  const familyMembers = useFamilyStore((s) => s.familyMembers).filter((m) => m.isActive);

  const today = toYMD(new Date());

  // Two independent operations behind one modal — a one-time payment and a
  // recurring payment. Each keeps its own field state, so flipping the type
  // selector never bleeds one form into the other.
  const [paymentType, setPaymentType] = useState<PaymentType>("single");
  const [single, setSingle] = useState<FormState>(EMPTY_FORM);
  const [recurring, setRecurring] = useState<FormState>(EMPTY_FORM);
  const [date, setDate] = useState(today);
  const [titleError, setTitleError] = useState("");
  const [amountError, setAmountError] = useState("");
  const [categoryError, setCategoryError] = useState("");

  const form = paymentType === "single" ? single : recurring;
  const setForm = paymentType === "single" ? setSingle : setRecurring;
  const patch = (p: Partial<FormState>) => setForm((f) => ({ ...f, ...p }));

  useEffect(() => {
    if (!visible) return;
    const base: FormState = { ...EMPTY_FORM, categoryName: budgetCategories[0]?.name ?? "" };
    if (editExpense) {
      const filled: FormState = {
        amountText: String(editExpense.amount / 100),
        categoryName: editExpense.categoryName,
        payerMemberId: editExpense.payerMemberId,
        note: editExpense.note ?? "",
        recurrenceType: (editExpense.recurrenceType as RecurrenceType) ?? "monthly",
        recurrenceDay: editExpense.recurrenceDay ?? 1,
      };
      if (editExpense.isRecurring) {
        setPaymentType("recurring");
        setRecurring(filled);
        setSingle(base);
      } else {
        setPaymentType("single");
        setSingle(filled);
        setRecurring(base);
      }
      setDate(editExpense.date);
    } else {
      setPaymentType("single");
      setSingle(base);
      setRecurring(base);
      setDate(today);
    }
    setTitleError("");
    setAmountError("");
    setCategoryError("");
  }, [visible, editExpense, budgetCategories, today]);

  const switchType = (type: PaymentType) => {
    setPaymentType(type);
    setTitleError("");
    setAmountError("");
    setCategoryError("");
  };

  const handleSave = () => {
    const title = form.note.trim();
    if (!title) { setTitleError("יש להזין כותרת"); return; }
    const amount = parseILS(form.amountText);
    if (!amount || amount <= 0) { setAmountError("יש להזין סכום תקין"); return; }
    if (!form.categoryName) { setCategoryError("יש לבחור קטגוריה"); return; }
    setCategoryError("");
    const isRecurring = paymentType === "recurring";
    onSave({
      amount,
      categoryName: form.categoryName,
      // Recurring templates have no per-occurrence payer.
      payerMemberId: isRecurring ? undefined : form.payerMemberId,
      date,
      note: title,
      isRecurring,
      recurrenceType: isRecurring ? form.recurrenceType : undefined,
      recurrenceDay: isRecurring ? form.recurrenceDay : undefined,
    });
    onDismiss();
  };

  return (
    <ModalWrapper visible={visible} onDismiss={onDismiss}>
      <Text style={MS.heading}>
        {editExpense ? t("budget.editExpense") : t("budget.addExpense")}
      </Text>

      {/* Payment-type selector — underline tabs (same as grocery/calendar) */}
      <View style={styles.typeSelector}>
        <SegmentedPills
          value={paymentType}
          onChange={(v) => switchType(v as PaymentType)}
          options={[
            { value: "single", label: t("budget.typeSingle"), color: C.purple },
            { value: "recurring", label: t("budget.typeRecurring"), color: C.purple },
          ]}
          testIDPrefix="expense-type"
        />
      </View>

      {/* Title (required) */}
      <Text style={MS.label}>{t("budget.paymentTitle")}</Text>
      <RNTextInput
        value={form.note}
        onChangeText={(v) => { patch({ note: v }); setTitleError(""); }}
        placeholder={t("budget.paymentTitlePlaceholder")}
        style={[styles.titleInput, titleError ? { borderColor: C.red } : null]}
        placeholderTextColor={C.textSecondary}
      />
      {titleError ? <Text style={MS.error}>{titleError}</Text> : null}

      {/* Amount */}
      <Text style={MS.label}>{t("budget.amount")}</Text>
      <RNTextInput
        value={form.amountText}
        onChangeText={(v) => { patch({ amountText: v }); setAmountError(""); }}
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
            onPress={() => { patch({ categoryName: cat.name }); setCategoryError(""); }}
            style={[styles.catChip, form.categoryName === cat.name && { backgroundColor: cat.color }]}
          >
            <Text style={[styles.catChipText, form.categoryName === cat.name && styles.catChipTextActive]}>
              {cat.icon} {cat.name}
            </Text>
          </Pressable>
        ))}
      </View>
      {categoryError ? <Text style={MS.error}>{categoryError}</Text> : null}

      {/* Payer — one-time payments only; recurring templates have no payer */}
      {paymentType === "single" && familyMembers.length > 0 && (
        <>
          <Text style={MS.label}>{t("budget.payer")}</Text>
          <View style={styles.chipRow}>
            <Pressable
              onPress={() => patch({ payerMemberId: undefined })}
              style={[styles.memberChip, !form.payerMemberId && styles.memberChipActive]}
            >
              <Text style={[styles.memberChipText, !form.payerMemberId && styles.memberChipTextActive]}>
                {t("budget.anyone")}
              </Text>
            </Pressable>
            {familyMembers.map((m) => (
              <Pressable
                key={m.id}
                onPress={() => patch({ payerMemberId: m.id })}
                style={[
                  styles.memberChip,
                  form.payerMemberId === m.id && { backgroundColor: m.color ?? C.purple, borderColor: m.color ?? C.purple },
                ]}
              >
                <Text style={[styles.memberChipText, form.payerMemberId === m.id && styles.memberChipTextActive]}>
                  {m.avatarEmoji ?? "👤"} {m.name}
                </Text>
              </Pressable>
            ))}
          </View>
        </>
      )}

      {/* Recurrence config — only in recurring mode */}
      {paymentType === "recurring" && (
        <View style={styles.recurringPanel}>
          {/* Weekly / monthly selector */}
          <View style={styles.typeRow}>
            {RECURRENCE_TYPES.map((rt) => (
              <Pressable
                key={rt.key}
                onPress={() => patch({ recurrenceType: rt.key, recurrenceDay: rt.key === "weekly" ? 0 : 1 })}
                style={[styles.typeChip, form.recurrenceType === rt.key && styles.typeChipActive]}
              >
                <Text style={[styles.typeChipText, form.recurrenceType === rt.key && styles.typeChipTextActive]}>
                  {rt.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Pickers */}
          {form.recurrenceType === "weekly" && (
            <View style={styles.pickerRow}>
              <Text style={styles.pickerLabel}>ביום</Text>
              <WheelPicker
                data={DAYS_OF_WEEK}
                selectedIndex={form.recurrenceDay}
                onChange={(i) => patch({ recurrenceDay: i })}
                width={110}
              />
            </View>
          )}

          {form.recurrenceType === "monthly" && (
            <View style={styles.pickerRow}>
              <Text style={styles.pickerLabel}>ביום</Text>
              <WheelPicker
                data={DAYS_OF_MONTH.map(String)}
                selectedIndex={form.recurrenceDay - 1}
                onChange={(i) => patch({ recurrenceDay: i + 1 })}
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
  titleInput: {
    fontSize: 16,
    fontWeight: "600",
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
  typeSelector: {
    marginBottom: S.md,
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
