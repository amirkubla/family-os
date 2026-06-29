/**
 * GroceryVoiceReviewModal — review parsed items from a voice clip before adding.
 *
 * Shows the transcript + the items the Assistant parsed, lets the user drop any
 * wrong ones, and on confirm hands the kept items back to the grocery screen,
 * which adds them through the normal optimistic CRUD.
 */

import React, { useEffect, useState } from "react";
import { View, ScrollView, StyleSheet } from "react-native";
import { Text, Button, IconButton } from "react-native-paper";

import ModalWrapper from "@src/components/ModalWrapper";
import { MS } from "@src/ui/modalStyles";
import { C, S, R } from "@src/ui/tokens";
import { RTL_ROW, TEXT_RIGHT } from "@src/ui/rtl";
import { t, shoppingCategoryLabel } from "@src/i18n";
import type { VoiceGroceryResult } from "@src/lib/api/endpoints";

type Item = VoiceGroceryResult["items"][number];

interface Props {
  visible: boolean;
  transcript: string;
  items: Item[];
  onConfirm: (items: Item[]) => void;
  onDismiss: () => void;
}

const CAT_EMOJI: Record<string, string> = { grocery: "🛒", home: "🏠", health: "💊" };

export default function GroceryVoiceReviewModal({
  visible,
  transcript,
  items,
  onConfirm,
  onDismiss,
}: Props) {
  const [list, setList] = useState<Item[]>(items);

  useEffect(() => {
    if (visible) setList(items);
  }, [visible, items]);

  const remove = (index: number) => setList((l) => l.filter((_, i) => i !== index));

  return (
    <ModalWrapper visible={visible} onDismiss={onDismiss}>
      <Text style={MS.heading}>{t("voice.reviewTitle")}</Text>
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
          {list.map((it, i) => (
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
                  {it.title}
                  {it.qty ? `  ·  ${it.qty}` : ""}
                </Text>
                <Text style={styles.meta}>
                  {CAT_EMOJI[it.shopping_category] ?? "🛒"} {shoppingCategoryLabel(it.shopping_category)}
                </Text>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      <View style={MS.actions}>
        <Button onPress={onDismiss}>{t("cancel")}</Button>
        <Button mode="contained" disabled={list.length === 0} onPress={() => onConfirm(list)}>
          {t("voice.addItems", { count: list.length })}
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
  empty: {
    alignItems: "center",
    paddingVertical: S.xl,
    gap: S.sm,
  },
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
