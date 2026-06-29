/**
 * VoiceDetailReviewModal — review a single parsed object (event, payment, …)
 * from a voice clip before adding.
 *
 * Read-only + generic: shows the transcript + a label/value list the caller
 * builds. If `missing` is non-empty (already-Hebrew labels) it's shown as a
 * warning and "Add" is disabled. The caller owns the row-building, the heading,
 * and the confirm-button text — so payment, event, and future single-object
 * voice flows share one shell.
 */

import React from "react";
import { View, StyleSheet } from "react-native";
import { Text } from "react-native-paper";

import ModalWrapper from "@src/components/ModalWrapper";
import { C, S, R } from "@src/ui/tokens";
import { RTL_ROW, TEXT_RIGHT } from "@src/ui/rtl";
import { t } from "@src/i18n";

export interface DetailRow {
  label: string;
  value: string;
}

interface Props {
  visible: boolean;
  heading: string;
  transcript: string;
  rows: DetailRow[] | null; // null/empty = nothing parsed
  missing: string[]; // already-Hebrew labels; non-empty disables Add
  confirmLabel: string;
  onConfirm: () => void;
  onDismiss: () => void;
}

export default function VoiceDetailReviewModal({
  visible,
  heading,
  transcript,
  rows,
  missing,
  confirmLabel,
  onConfirm,
  onDismiss,
}: Props) {
  const canAdd = !!rows && rows.length > 0 && missing.length === 0;

  return (
    <ModalWrapper
      visible={visible}
      onDismiss={onDismiss}
      icon="mic-outline"
      title={heading}
      onSave={onConfirm}
      saveDisabled={!canAdd}
      saveLabel={confirmLabel}
    >
      {transcript ? (
        <View style={styles.transcriptBox}>
          <Text style={styles.transcriptText}>🎙️  {transcript}</Text>
        </View>
      ) : null}

      {rows && rows.length > 0 ? (
        <View style={styles.card}>
          {rows.map((r, i) => (
            <View key={i} style={styles.row}>
              <Text style={styles.label}>{r.label}</Text>
              <Text style={styles.value} numberOfLines={2}>{r.value}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {missing.length > 0 ? (
        <Text style={styles.missing}>
          ⚠️ {t("voice.missingDetails")}: {missing.join(", ")}
        </Text>
      ) : null}

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
    gap: S.md,
  },
  label: { fontSize: 13, color: C.textSecondary, writingDirection: "rtl" },
  value: {
    fontSize: 15,
    fontWeight: "600",
    color: C.textPrimary,
    textAlign: TEXT_RIGHT,
    writingDirection: "rtl",
    flexShrink: 1,
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
