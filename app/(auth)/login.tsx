import React, { useState } from "react";
import { StyleSheet } from "react-native";
import { TextInput, Button, HelperText } from "react-native-paper";
import { useRouter } from "expo-router";
import { useAuthStore } from "@src/auth/useAuthStore";
import { t } from "@src/i18n";
import { C, R, S } from "@src/ui/tokens";
import { TEXT_RIGHT } from "@src/ui/rtl";
import AuthShell, { AuthFooterLink, AuthField } from "@src/components/auth/AuthShell";
import GoogleSignInButton from "@src/components/auth/GoogleSignInButton";
import AuthDivider from "@src/components/auth/AuthDivider";
import { useGoogleAuth } from "@src/auth/useGoogleAuth";

export default function LoginScreen() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const loginWithGoogle = useAuthStore((s) => s.loginWithGoogle);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");

  const usernameError = username.length > 0 && username.length < 3;
  const passwordError = password.length > 0 && password.length < 4;

  // Login screen handles *existing* Google users. A brand-new Google account
  // has no family yet → backend returns NEEDS_FAMILY; we send them to register
  // (which has the family-name / invite fields) to finish signing up.
  const handleGoogleToken = async (idToken: string) => {
    setError("");
    setGoogleLoading(true);
    try {
      await loginWithGoogle({ idToken });
      router.replace("/(tabs)/today");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg === "NEEDS_FAMILY") {
        setError(t("auth.googleNoAccount"));
        router.replace("/(auth)/register");
      } else {
        setError(t("auth.googleFailed"));
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const { promptAsync, ready: googleReady } = useGoogleAuth(handleGoogleToken);

  // Auth-call path is unchanged — this redesign is presentational only.
  // Validation rules and the error → message mapping both stay as they were.
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
      <AuthField
        label={t("auth.username")}
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
        testID="input-email"
        right={<TextInput.Icon icon="account" />}
      />
      {usernameError ? (
        <HelperText type="error" visible padding="none" style={styles.helper}>
          {t("auth.usernameMin")}
        </HelperText>
      ) : null}

      <AuthField
        label={t("auth.password")}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        testID="input-password"
        onSubmitEditing={handleLogin}
        returnKeyType="go"
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
        testID="btn-login"
      >
        {t("auth.login")}
      </Button>

      <AuthDivider label={t("auth.or")} />

      <GoogleSignInButton
        onPress={() => promptAsync()}
        loading={googleLoading}
        disabled={!googleReady || googleLoading || loading}
      />
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  // padding="none" + this style strips Paper's default vertical inset so the
  // error sits tightly under the input instead of pushing the next field down.
  helper: { textAlign: TEXT_RIGHT, marginTop: -S.sm },
  btn: { borderRadius: R.md, marginTop: S.sm },
  btnContent: { paddingVertical: 8 },
  btnLabel: { fontSize: 16, fontWeight: "600" },
});
