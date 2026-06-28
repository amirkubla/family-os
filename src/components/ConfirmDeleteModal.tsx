/**
 * ConfirmDeleteModal — confirmation dialog for delete actions.
 *
 * Rendered inside a Portal so it floats above all other UI.
 * Mount once per screen and drive it via the useConfirmDelete hook.
 *
 * Pass `danger` for high-stakes, irreversible deletes (e.g. purging a person
 * and all their data): it adds a warning icon and an emphasized "this cannot
 * be undone" line so the consequences are unmistakable.
 */

import React from "react";
import { Dialog, Portal, Button, Text } from "react-native-paper";
import { StyleSheet, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { C, R, S } from "@src/ui/tokens";
import { TEXT_RIGHT } from "@src/ui/rtl";
import { t } from "@src/i18n";

interface Props {
  visible: boolean;
  onConfirm: () => void;
  onDismiss: () => void;
  /** Optional overrides — default to the generic delete copy. */
  title?: string;
  message?: string;
  /** Irreversible, high-stakes delete: show a warning icon + emphasis. */
  danger?: boolean;
}

export default function ConfirmDeleteModal({
  visible,
  onConfirm,
  onDismiss,
  title,
  message,
  danger,
}: Props) {
  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss} style={styles.dialog}>
        {danger && (
          <View style={styles.iconWrap}>
            <MaterialCommunityIcons name="alert" size={44} color={C.red} />
          </View>
        )}
        <Dialog.Title style={[styles.title, danger && styles.centered]}>
          {title ?? t("confirmDelete.title")}
        </Dialog.Title>
        <Dialog.Content>
          <Text
            variant="bodyMedium"
            style={[styles.message, danger && styles.centered]}
          >
            {message ?? t("confirmDelete.message")}
          </Text>
          {danger && (
            <Text variant="bodyMedium" style={styles.irreversible}>
              {t("confirmDelete.irreversible")}
            </Text>
          )}
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onDismiss}>{t("confirmDelete.cancel")}</Button>
          <Button testID="btn-confirm-delete" onPress={onConfirm} textColor={C.red}>
            {t("confirmDelete.confirm")}
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

const styles = StyleSheet.create({
  dialog: {
    borderRadius: R.lg,
    backgroundColor: C.surface,
  },
  iconWrap: {
    alignItems: "center",
    marginTop: S.lg,
    marginBottom: -S.xs,
  },
  title: {
    fontWeight: "700",
    color: C.textPrimary,
    textAlign: TEXT_RIGHT,
  },
  centered: {
    textAlign: "center",
  },
  message: {
    color: C.textSecondary,
    textAlign: TEXT_RIGHT,
    writingDirection: "rtl",
  },
  irreversible: {
    color: C.red,
    fontWeight: "700",
    textAlign: "center",
    writingDirection: "rtl",
    marginTop: S.md,
  },
});
