/**
 * ConfirmDeleteModal — generic "Are you sure?" confirmation dialog.
 *
 * Rendered inside a Portal so it floats above all other UI.
 * Mount once per screen and drive it via the useConfirmDelete hook.
 */

import React from "react";
import { Dialog, Portal, Button, Text } from "react-native-paper";
import { StyleSheet } from "react-native";
import { C, R } from "@src/ui/tokens";
import { TEXT_RIGHT } from "@src/ui/rtl";
import { t } from "@src/i18n";

interface Props {
  visible: boolean;
  onConfirm: () => void;
  onDismiss: () => void;
}

export default function ConfirmDeleteModal({ visible, onConfirm, onDismiss }: Props) {
  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss} style={styles.dialog}>
        <Dialog.Title style={styles.title}>
          {t("confirmDelete.title")}
        </Dialog.Title>
        <Dialog.Content>
          <Text variant="bodyMedium" style={styles.message}>
            {t("confirmDelete.message")}
          </Text>
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
  title: {
    fontWeight: "700",
    color: C.textPrimary,
    textAlign: TEXT_RIGHT,
  },
  message: {
    color: C.textSecondary,
    textAlign: TEXT_RIGHT,
  },
});
