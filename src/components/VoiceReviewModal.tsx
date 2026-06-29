/**
 * VoiceReviewModal — review items parsed from a voice clip before adding.
 *
 * Generic over the item shape: shows the transcript + a toggleable list, lets
 * the user drop wrong ones, and hands the kept items back on confirm. Shared by
 * the grocery + chore voice flows — each supplies its own per-item labels.
 */

import React, { useEffect, useState } from "react";
import { View, ScrollView, StyleSheet } from "react-native";
import { Text, Button, IconButton } from "react-native-paper";

import ModalWrapper from "@src/components/ModalWrapper";
import { MS } from "@src/ui/modalStyles";
import { C, S, R } from "@src/ui/tokens";
import { RTL_ROW, TEXT_RIGHT } from "@src/ui/rtl";
import { t } from "@src/i18n";

interface Props<T extends { title: string }> {
  visible: boolean;
  transcript: string;
  items: T[];
  /** Heading. Default: t("voice.reviewTitle"). */
  heading?: string;
  /** Primary line per item. Default: item.title. */
  getTitle?: (item: T) => string;
  /** Optional secondary line per item (e.g. grocery category). */
  getMeta?: (item: T) => string | null;
  /** Confirm-button label given the kept count. Default: addItems. */
  confirmLabel?: (count: number) => string;
  onConfirm: (kept: T[]) => void;
  onDismiss: () => void;
}

export default function VoiceReviewModal<T extends { title: string }>({
  visible,
  transcript,
  items,
  heading,
  getTitle,
  getMeta,
  confirmLabel,
  onConfirm,
  onDismiss,
}: Props<T>) {
  const [list, setList] = useState<T[]>(items);

  useEffect(() => {
    if (visible) setList(items);
  }, [visible, items]);

  const remove = (index: number) => setList((l) => l.filter((_, i) => i !== index));

  return (
    <ModalWrapper visible={visible} onDismiss={onDismiss}>
      <Text style={MS.heading}>{heading ?? t("voice.reviewTitle")}</Text>
      {transcript ? (
        <View style={styles.transcriptBox}>
          <Text style={styles.transcriptText}>🎙️  {transcript}</Text>
        </View>
      ) : null}

      {list.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>🤔</Text>
          <Text style={styles.emptyText}>{t("voice.noItems")}</Text>
        </View>
      ) : (
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          {list.map((it, i) => {
            const meta = getMeta?.(it);
            return (
              <View key={i} style={styles.row}>
                <IconButton
                  icon="close"
                  size={18}
                  iconColor={C.textSecondary}
                  onPress={() => remove(i)}
                  accessibilityLabel={t("delete")}
                />
                <View style={styles.info}>
                  <Text style={styles.title} numberOfLines={1}>
                    {getTitle ? getTitle(it) : it.title}
                  </Text>
                  {meta ? <Text style={styles.meta}>{meta}</Text> : null}
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}

      <View style={MS.actions}>
        <Button onPress={onDismiss}>{t("cancel")}</Button>
        <Button
          mode="contained"
          disabled={list.length === 0}
          onPress={() => onConfirm(list)}
        >
          {(confirmLabel ?? ((n: number) => t("voice.addItems", { count: n })))(list.length)}
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
  empty: { alignItems: "center", paddingVertical: S.xl, gap: S.sm },
  emptyEmoji: { fontSize: 34 },
  emptyText: {
    fontSize: 14,
    color: C.textSecondary,
    textAlign: "center",
    writingDirection: "rtl",
  },
  scroll: { maxHeight: 300 },
  row: {
    flexDirection: RTL_ROW,
    alignItems: "center",
    backgroundColor: C.surfaceSubtle,
    borderRadius: R.md,
    marginBottom: S.xs,
    paddingEnd: S.sm,
  },
  info: { flex: 1 },
  title: {
    fontSize: 15,
    fontWeight: "600",
    color: C.textPrimary,
    textAlign: TEXT_RIGHT,
    writingDirection: "rtl",
  },
  meta: {
    fontSize: 12,
    color: C.textSecondary,
    textAlign: TEXT_RIGHT,
    writingDirection: "rtl",
    marginTop: 1,
  },
});
