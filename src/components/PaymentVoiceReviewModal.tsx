/**
 * PaymentVoiceReviewModal — review a payment parsed from a voice clip.
 *
 * Read-only review: shows the transcript + the parsed expense (title, amount,
 * category, one-time/recurring + day, payer). If the Assistant flagged missing
 * details (amount / recurrence day), it lists them and disables "Add". On
 * confirm the budget screen adds it through the normal expense CRUD.
 */

import React from "react";
import { View, StyleSheet } from "react-native";
import { Text, Button } from "react-native-paper";

import ModalWrapper from "@src/components/ModalWrapper";
import { MS } from "@src/ui/modalStyles";
import { C, S, R } from "@src/ui/tokens";
import { RTL_ROW, TEXT_RIGHT } from "@src/ui/rtl";
import { t } from "@src/i18n";
import { formatILS } from "@src/models/budget";
import type { VoicePaymentResult } from "@src/lib/api/endpoints";

const DAYS_OF_WEEK_HE = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];

function recurrenceText(p: VoicePaymentResult["payment"]): string {
  if (!p.is_recurring) return t("voice.paymentOneTime");
  if (p.recurrence_type === "weekly")
    return t("voice.paymentEveryWeek", { day: DAYS_OF_WEEK_HE[p.recurrence_day ?? 0] ?? "" });
  return t("voice.paymentEveryMonth", { day: String(p.recurrence_day ?? "") });
}

function missingLabel(key: string): string {
  if (key === "amount") return t("voice.missingAmount");
  if (key === "recurrence") return t("voice.missingRecurrence");
  return key;
}

interface Props {
  visible: boolean;
  transcript: string;
  payment: VoicePaymentResult["payment"] | null;
  /** Resolved payer display name (matched member, or the current user). */
  payerName: string;
  missing: string[];
  onConfirm: () => void;
  onDismiss: () => void;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value} numberOfLines={1}>{value}</Text>
    </View>
  );
}

export default function PaymentVoiceReviewModal({
  visible,
  transcript,
  payment,
  payerName,
  missing,
  onConfirm,
  onDismiss,
}: Props) {
  const canAdd = !!payment && missing.length === 0;

  return (
    <ModalWrapper visible={visible} onDismiss={onDismiss}>
      <Text style={MS.heading}>{t("voice.reviewTitlePayment")}</Text>
      {transcript ? (
        <View style={styles.transcriptBox}>
          <Text style={styles.transcriptText}>🎙️  {transcript}</Text>
        </View>
      ) : null}

      {payment ? (
        <View style={styles.card}>
          {payment.title ? <Row label={t("budget.paymentTitle")} value={payment.title} /> : null}
          <Row
            label={t("budget.amount")}
            value={payment.amount != null ? formatILS(Math.round(payment.amount * 100)) : "—"}
          />
          <Row label={t("budget.category")} value={payment.category ?? "אחר"} />
          <Row label={t("budget.payer")} value={payerName} />
          <Row label={t("eventModal.schedule")} value={recurrenceText(payment)} />
        </View>
      ) : null}

      {missing.length > 0 ? (
        <Text style={styles.missing}>
          ⚠️ {t("voice.missingDetails")}: {missing.map(missingLabel).join(", ")}
        </Text>
      ) : null}

      <View style={MS.actions}>
        <Button onPress={onDismiss}>{t("cancel")}</Button>
        <Button mode="contained" disabled={!canAdd} onPress={onConfirm}>
          {t("voice.addPayment")}
        </Button>
      </View>
    </ModalWrapper>
  );
}

const styles = StyleSheet.create({
  transcriptBox: {
    backgroundColor: C.surfaceSubtle,
    borderRadius: R.md,
    paddingVertical: S.sm,
    paddingHorizontal: S.md,
    marginBottom: S.md,
  },
  transcriptText: {
    fontSize: 14,
    color: C.textSecondary,
    textAlign: TEXT_RIGHT,
    writingDirection: "rtl",
    fontStyle: "italic",
  },
  card: {
    backgroundColor: C.surfaceSubtle,
    borderRadius: R.md,
    paddingHorizontal: S.md,
    paddingVertical: S.xs,
    gap: 2,
  },
  row: {
    flexDirection: RTL_ROW,
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: S.sm,
  },
  label: { fontSize: 13, color: C.textSecondary, writingDirection: "rtl" },
  value: {
    fontSize: 15,
    fontWeight: "600",
    color: C.textPrimary,
    textAlign: TEXT_RIGHT,
    writingDirection: "rtl",
    flexShrink: 1,
    marginStart: S.md,
  },
  missing: {
    fontSize: 14,
    color: C.red,
    fontWeight: "600",
    textAlign: TEXT_RIGHT,
    writingDirection: "rtl",
    marginTop: S.md,
  },
});
