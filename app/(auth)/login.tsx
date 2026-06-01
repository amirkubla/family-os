import React, { useState } from "react";
import { StyleSheet } from "react-native";
import { TextInput, Button, HelperText } from "react-native-paper";
import { useRouter } from "expo-router";
import { useAuthStore } from "@src/auth/useAuthStore";
import { t } from "@src/i18n";
import { C, R, S } from "@src/ui/tokens";
import { TEXT_RIGHT } from "@src/ui/rtl";
import AuthShell, { AuthFooterLink } from "@src/components/auth/AuthShell";

export default function LoginScreen() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const usernameError = username.length > 0 && username.length < 3;
  const passwordError = password.length > 0 && password.length < 4;

  // Auth-call path is unchanged from the previous version — this redesign is
  // presentational only. Validation rules and the error → message mapping
  // both stay exactly as they were.
  const handleLogin = async () => {
    setError("");
    if (username.length < 3 || password.length < 4) return;

    setLoading(true);
    try {
      await login({ username, password });
      router.replace("/(tabs)/today");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg === "USER_NOT_FOUND") setError(t("auth.userNotFound"));
      else if (msg === "WRONG_PASSWORD") setError(t("auth.wrongPassword"));
      else setError(t("auth.genericError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title={t("auth.loginTitle")}
      footer={
        <AuthFooterLink
          prompt={t("auth.noAccountPrompt")}
          action={t("auth.noAccountAction")}
          onPress={() => router.replace("/(auth)/register")}
        />
      }
    >
      <TextInput
        mode="outlined"
        label={t("auth.username")}
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
        // Accent the focused outline so the active field is unambiguous —
        // C.border is the resting outline (matches the rest of the app's
        // outlined inputs).
        outlineColor={C.border}
        activeOutlineColor={C.purple}
        style={styles.input}
        contentStyle={styles.inputContent}
        right={<TextInput.Icon icon="account" />}
      />
      {usernameError ? (
        <HelperText type="error" visible padding="none" style={styles.helper}>
          {t("auth.usernameMin")}
        </HelperText>
      ) : null}

      <TextInput
        mode="outlined"
        label={t("auth.password")}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        outlineColor={C.border}
        activeOutlineColor={C.purple}
        style={styles.input}
        contentStyle={styles.inputContent}
        right={<TextInput.Icon icon="lock" />}
      />
      {passwordError ? (
        <HelperText type="error" visible padding="none" style={styles.helper}>
          {t("auth.passwordMin")}
        </HelperText>
      ) : null}

      {error ? (
        <HelperText type="error" visible padding="none" style={styles.helper}>
          {error}
        </HelperText>
      ) : null}

      <Button
        mode="contained"
        onPress={handleLogin}
        loading={loading}
        disabled={loading || username.length < 3 || password.length < 4}
        buttonColor={C.purple}
        style={styles.btn}
        contentStyle={styles.btnContent}
        labelStyle={styles.btnLabel}
      >
        {t("auth.login")}
      </Button>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  // C.surface keeps the field obviously a control vs. the C.bg page colour.
  input: { backgroundColor: C.surface },
  inputContent: { textAlign: TEXT_RIGHT, writingDirection: "rtl" },
  // padding="none" + this style strips Paper's default vertical inset so the
  // error sits tightly under the input instead of pushing the next field down.
  helper: { textAlign: TEXT_RIGHT, marginTop: -S.sm },
  btn: { borderRadius: R.md, marginTop: S.sm },
  btnContent: { paddingVertical: 8 },
  btnLabel: { fontSize: 16, fontWeight: "600" },
});
