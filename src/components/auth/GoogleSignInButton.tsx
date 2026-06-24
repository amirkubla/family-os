/**
 * GoogleSignInButton — "המשך עם Google" outlined button for the auth screens.
 */

import React from "react";
import { StyleSheet } from "react-native";
import { Button } from "react-native-paper";

import { t } from "@src/i18n";
import { C, R, S } from "@src/ui/tokens";

interface Props {
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
}

export default function GoogleSignInButton({ onPress, disabled, loading }: Props) {
  return (
    <Button
      mode="outlined"
      icon="google"
      onPress={onPress}
      disabled={disabled}
      loading={loading}
      textColor={C.textPrimary}
      style={styles.btn}
      contentStyle={styles.content}
      labelStyle={styles.label}
      testID="btn-google"
    >
      {t("auth.continueWithGoogle")}
    </Button>
  );
}

const styles = StyleSheet.create({
  btn: { borderRadius: R.md, marginTop: S.sm, borderColor: C.border },
  content: { paddingVertical: 8 },
  label: { fontSize: 16, fontWeight: "600" },
});
