import React, { useState, useEffect } from "react";
import { View, StyleSheet } from "react-native";
import { Text, Button } from "react-native-paper";
import ModalTextInput from "./ModalTextInput";
import ModalWrapper from "./ModalWrapper";
import WheelPicker from "./WheelPicker";
import SegmentedPills from "./SegmentedPills";
import PillToggle from "./PillToggle";
import { MS } from "@src/ui/modalStyles";
import { C, S } from "@src/ui/tokens";
import { RTL_ROW, TEXT_RIGHT } from "@src/ui/rtl";
import { useThemeColor } from "@src/ui/useThemeColor";
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
    paid?: boolean;
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
  const theme = useThemeColor();
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
  // One-time payments only: true = already paid (counts as spending now);
  // false = pending (shows under "ממתינים לתשלום", excluded from spending
  // until settled). Defaults to paid — the common "log what I spent" case.
  const [paidNow, setPaidNow] = useState(true);
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
      setPaidNow(editExpense.paid !== false);
    } else {
      setPaymentType("single");
      setSingle(base);
      setRecurring(base);
      setDate(today);
      setPaidNow(true);
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
      // Pending applies to one-time payments only; recurring templates keep
      // their existing (paid) semantics.
      paid: isRecurring ? undefined : paidNow,
      isRecurring,
      recurrenceType: isRecurring ? form.recurrenceType : undefined,
      recurrenceDay: isRecurring ? form.recurrenceDay : undefined,
    });
    onDismiss();
  };

  return (
    <ModalWrapper
      visible={visible}
      onDismiss={onDismiss}
      icon="card-outline"
      title={editExpense ? t("budget.editExpense") : t("budget.addExpense")}
      onSave={handleSave}
    >
      {/* ── Details section ── */}
      <View style={MS.section}>
        <View style={MS.sectionHeader}>
          <Text style={MS.sectionLabel}>{t("budget.paymentTitle")}</Text>
          <Text style={MS.sectionIcon}>✏️</Text>
        </View>
        <ModalTextInput
          placeholder={t("budget.paymentTitlePlaceholder")}
          value={form.note}
          onChangeText={(v) => { patch({ note: v }); setTitleError(""); }}
          mode="outlined"
          style={MS.input}
          contentStyle={MS.inputContent}
          activeOutlineColor={theme}
          error={!!titleError}
        />
        {titleError ? <Text style={MS.error}>{titleError}</Text> : null}

        <View style={[MS.sectionHeader, { marginTop: S.sm }]}>
          <Text style={MS.sectionLabel}>{t("budget.amount")}</Text>
          <Text style={MS.sectionIcon}>💰</Text>
        </View>
        <ModalTextInput
          placeholder={t("budget.amountPlaceholder")}
          value={form.amountText}
          onChangeText={(v) => { patch({ amountText: v }); setAmountError(""); }}
          keyboardType="numeric"
          mode="outlined"
          style={MS.input}
          contentStyle={MS.inputContentNumeric}
          activeOutlineColor={theme}
          error={!!amountError}
        />
        {amountError ? <Text style={MS.error}>{amountError}</Text> : null}
      </View>

      {/* ── Type / schedule section ── */}
      <View style={MS.section}>
        <View style={MS.sectionHeader}>
          <Text style={MS.sectionLabel}>{t("budget.paymentType")}</Text>
          <Text style={MS.sectionIcon}>{paymentType === "recurring" ? "🔄" : "1️⃣"}</Text>
        </View>
        <View style={MS.segmented}>
          <SegmentedPills
            value={paymentType}
            onChange={(v) => switchType(v as PaymentType)}
            options={[
              { value: "single", label: t("budget.typeSingle"), color: theme },
              { value: "recurring", label: t("budget.typeRecurring"), color: theme },
            ]}
            testIDPrefix="expense-type"
          />
        </View>

        {paymentType === "recurring" && (
          <>
            <View style={[MS.sectionHeader, { marginTop: S.sm }]}>
              <Text style={MS.sectionLabel}>{t("budget.frequency")}</Text>
              <Text style={MS.sectionIcon}>📆</Text>
            </View>
            <View style={MS.chipRow}>
              {RECURRENCE_TYPES.map((rt) => {
                const sel = form.recurrenceType === rt.key;
                return (
                  <Button
                    key={rt.key}
                    mode={sel ? "contained" : "outlined"}
                    compact
                    onPress={() => patch({ recurrenceType: rt.key, recurrenceDay: rt.key === "weekly" ? 0 : 1 })}
                    style={[MS.chip, sel && { borderColor: theme }]}
                    labelStyle={MS.chipLabel}
                    buttonColor={sel ? theme + "20" : undefined}
                    textColor={sel ? theme : C.textSecondary}
                  >
                    {rt.label}
                  </Button>
                );
              })}
            </View>

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
          </>
        )}
      </View>

      {/* ── Category section ── */}
      <View style={MS.section}>
        <View style={MS.sectionHeader}>
          <Text style={MS.sectionLabel}>{t("budget.category")}</Text>
          <Text style={MS.sectionIcon}>🏷️</Text>
        </View>
        <View style={MS.chipRow}>
          {budgetCategories.map((cat) => {
            const sel = form.categoryName === cat.name;
            return (
              <Button
                key={cat.id}
                mode={sel ? "contained" : "outlined"}
                compact
                onPress={() => { patch({ categoryName: cat.name }); setCategoryError(""); }}
                style={[MS.chip, sel && { borderColor: cat.color }]}
                labelStyle={MS.chipLabel}
                buttonColor={sel ? cat.color + "20" : undefined}
                textColor={sel ? C.textPrimary : C.textSecondary}
              >
                {cat.icon} {cat.name}
              </Button>
            );
          })}
        </View>
        {categoryError ? <Text style={MS.error}>{categoryError}</Text> : null}
      </View>

      {/* ── Payer + status — one-time payments only ── */}
      {paymentType === "single" && (
        <View style={MS.section}>
          {familyMembers.length > 0 && (
            <>
              <View style={MS.sectionHeader}>
                <Text style={MS.sectionLabel}>{t("budget.payer")}</Text>
                <Text style={MS.sectionIcon}>👤</Text>
              </View>
              <View style={MS.chipRow}>
                <Button
                  mode={!form.payerMemberId ? "contained" : "outlined"}
                  compact
                  onPress={() => patch({ payerMemberId: undefined })}
                  style={[MS.chip, !form.payerMemberId && { borderColor: theme }]}
                  labelStyle={MS.chipLabel}
                  buttonColor={!form.payerMemberId ? theme + "20" : undefined}
                  textColor={!form.payerMemberId ? theme : C.textSecondary}
                >
                  {t("budget.anyone")}
                </Button>
                {familyMembers.map((m) => {
                  const sel = form.payerMemberId === m.id;
                  const mc = m.color ?? theme;
                  return (
                    <Button
                      key={m.id}
                      mode={sel ? "contained" : "outlined"}
                      compact
                      onPress={() => patch({ payerMemberId: m.id })}
                      style={[MS.chip, sel && { borderColor: mc }]}
                      labelStyle={MS.chipLabel}
                      buttonColor={sel ? mc + "20" : undefined}
                      textColor={sel ? C.textPrimary : C.textSecondary}
                    >
                      {m.avatarEmoji ?? "👤"} {m.name}
                    </Button>
                  );
                })}
              </View>
            </>
          )}

          <View style={[MS.sectionHeader, familyMembers.length > 0 && { marginTop: S.sm }]}>
            <Text style={MS.sectionLabel}>{t("budget.paymentStatus")}</Text>
            <Text style={MS.sectionIcon}>💳</Text>
          </View>
          <PillToggle
            value={paidNow}
            onChange={setPaidNow}
            onLabel={t("payment.paid")}
            offLabel={t("payment.toPay")}
            activeColor={theme}
            testID="expense-paid-toggle"
          />
          {!paidNow ? <Text style={styles.paidHint}>{t("budget.pendingHint")}</Text> : null}
        </View>
      )}

    </ModalWrapper>
  );
}

// ---------------------------------------------------------------------------
// Main styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  paidHint: {
    fontSize: 12,
    color: C.textSecondary,
    writingDirection: "rtl",
    textAlign: TEXT_RIGHT,
    marginTop: -S.xs,
    marginBottom: S.sm,
  },
  pickerRow: {
    flexDirection: RTL_ROW,
    alignItems: "center",
    justifyContent: "center",
    gap: S.sm,
    marginTop: S.sm,
  },
  pickerLabel: {
    fontSize: 13,
    color: C.textSecondary,
    writingDirection: "rtl",
  },
});
