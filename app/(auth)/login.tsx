import React, { useState, useCallback } from "react";
import { Text, StyleSheet } from "react-native";
import { TextInput, Button, HelperText } from "react-native-paper";
import { useRouter } from "expo-router";
import { useAuthStore } from "@src/auth/useAuthStore";
import { t } from "@src/i18n";
import { C, R, S } from "@src/ui/tokens";
import { TEXT_RIGHT } from "@src/ui/rtl";
import AuthShell, { AuthFooterLink, AuthField } from "@src/components/auth/AuthShell";
import FamilyChooser, { FamilyChoice } from "@src/components/auth/FamilyChooser";
import GoogleSignInButton from "@src/components/auth/GoogleSignInButton";
import AppleSignInButton from "@src/components/auth/AppleSignInButton";
import AuthDivider from "@src/components/auth/AuthDivider";
import { useGoogleAuth } from "@src/auth/useGoogleAuth";
import { useAppleAuth } from "@src/auth/useAppleAuth";

const EMPTY_CHOICE: FamilyChoice = { ready: false, joining: false };

/** A verified social token awaiting a family choice (brand-new user). */
type PendingSocial = {
  provider: "google" | "apple";
  token: string;
  fullName?: string;
};

export default function LoginScreen() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const loginWithGoogle = useAuthStore((s) => s.loginWithGoogle);
  const loginWithApple = useAuthStore((s) => s.loginWithApple);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState(false);
  const [error, setError] = useState("");

  // When a brand-new social user signs in, the backend returns NEEDS_FAMILY.
  // We stash the verified token and reveal an inline family picker right here —
  // no bounce to register, no username/password, no second social prompt.
  const [pendingSocial, setPendingSocial] = useState<PendingSocial | null>(null);
  const [choice, setChoice] = useState<FamilyChoice>(EMPTY_CHOICE);
  const handleChoice = useCallback((c: FamilyChoice) => setChoice(c), []);

  const usernameError = username.length > 0 && username.length < 3;
  const passwordError = password.length > 0 && password.length < 4;

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
      else if (msg === "USE_SOCIAL_LOGIN") setError(t("auth.useSocialLogin"));
      else setError(t("auth.genericError"));
    } finally {
      setLoading(false);
    }
  };

  // First social tap: try a straight sign-in. New user → reveal family panel.
  const handleGoogleToken = async (idToken: string) => {
    setError("");
    setSocialLoading(true);
    try {
      await loginWithGoogle({ idToken });
      router.replace("/(tabs)/today");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg === "NEEDS_FAMILY") setPendingSocial({ provider: "google", token: idToken });
      else setError(t("auth.googleFailed"));
    } finally {
      setSocialLoading(false);
    }
  };

  const handleAppleCredential = async (identityToken: string, fullName?: string) => {
    setError("");
    setSocialLoading(true);
    try {
      await loginWithApple({ identityToken, fullName });
      router.replace("/(tabs)/today");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg === "NEEDS_FAMILY")
        setPendingSocial({ provider: "apple", token: identityToken, fullName });
      else setError(t("auth.appleFailed"));
    } finally {
      setSocialLoading(false);
    }
  };

  const { promptAsync, ready: googleReady } = useGoogleAuth(handleGoogleToken);
  const { available: appleAvailable, signIn: appleSignIn } = useAppleAuth(handleAppleCredential);

  // Panel "continue": reuse the stashed token + the chosen family. No re-auth.
  const handleSocialContinue = async () => {
    if (!pendingSocial || !choice.ready) return;
    setError("");
    setSocialLoading(true);
    try {
      if (pendingSocial.provider === "google") {
        await loginWithGoogle({
          idToken: pendingSocial.token,
          familyName: choice.familyName,
          familyCode: choice.inviteCode,
          memberId: choice.memberId,
        });
      } else {
        await loginWithApple({
          identityToken: pendingSocial.token,
          fullName: pendingSocial.fullName,
          familyName: choice.familyName,
          familyCode: choice.inviteCode,
          memberId: choice.memberId,
        });
      }
      router.replace("/(tabs)/today");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg === "INVALID_INVITE") setError(t("auth.invalidFamilyCode"));
      else setError(t("auth.genericError"));
    } finally {
      setSocialLoading(false);
    }
  };

  const cancelSocialPanel = () => {
    setPendingSocial(null);
    setChoice(EMPTY_CHOICE);
    setError("");
  };

  // ── Inline family panel (brand-new social user) ──
  if (pendingSocial) {
    return (
      <AuthShell title={t("auth.googleWelcomeTitle")}>
        <Text style={styles.panelSubtitle}>{t("auth.googleWelcomeSubtitle")}</Text>

        <FamilyChooser onChange={handleChoice} />

        {error ? (
          <HelperText type="error" visible padding="none" style={styles.helper}>
            {error}
          </HelperText>
        ) : null}

        <Button
          mode="contained"
          onPress={handleSocialContinue}
          loading={socialLoading}
          disabled={socialLoading || !choice.ready}
          buttonColor={C.purple}
          style={styles.btn}
          contentStyle={styles.btnContent}
          labelStyle={styles.btnLabel}
        >
          {choice.joining ? t("auth.joinFamily") : t("auth.continue")}
        </Button>

        <Button
          mode="text"
          onPress={cancelSocialPanel}
          disabled={socialLoading}
          textColor={C.textSecondary}
          style={styles.cancelBtn}
        >
          {t("cancel")}
        </Button>
      </AuthShell>
    );
  }

  // ── Normal login ──
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
        loading={socialLoading}
        disabled={!googleReady || socialLoading || loading}
      />

      <AppleSignInButton onPress={appleSignIn} available={appleAvailable} />
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
  cancelBtn: { marginTop: S.xs },
  panelSubtitle: {
    fontSize: 14,
    color: C.textSecondary,
    textAlign: TEXT_RIGHT,
    writingDirection: "rtl",
    marginBottom: S.sm,
  },
});
