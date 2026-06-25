import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet } from "react-native";
import { TextInput, Button, HelperText } from "react-native-paper";
import { useRouter, useLocalSearchParams } from "expo-router";
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

/**
 * Two-step registration:
 *   1. "identity" — pick how to sign up (Google OR username/password).
 *   2. "family"   — only after the identity is accepted, choose a family
 *                   (create new OR join via invite + member).
 *
 * Google: tapping the button runs OAuth immediately; a brand-new account
 * (NEEDS_FAMILY) advances to the family step carrying the verified id_token.
 * Password: filling valid credentials + "המשך" advances to the family step;
 * the account is actually created on family-step submit.
 */
export default function RegisterScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ invite?: string }>();
  const register = useAuthStore((s) => s.register);
  const loginWithGoogle = useAuthStore((s) => s.loginWithGoogle);
  const loginWithApple = useAuthStore((s) => s.loginWithApple);

  const [step, setStep] = useState<"identity" | "family">("identity");
  const [method, setMethod] = useState<"google" | "apple" | "password">("password");

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  // Verified social token + name awaiting a family choice (social methods).
  const [pendingToken, setPendingToken] = useState<string | null>(null);
  const [pendingFullName, setPendingFullName] = useState<string | undefined>(undefined);
  const [choice, setChoice] = useState<FamilyChoice>(EMPTY_CHOICE);
  const handleChoice = useCallback((c: FamilyChoice) => setChoice(c), []);

  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState(false);
  const [error, setError] = useState("");

  const usernameError = username.length > 0 && username.length < 3;
  const passwordError = password.length > 0 && password.length < 4;

  // ── Step 1: Google ──
  const handleGoogleToken = async (idToken: string) => {
    setError("");
    setSocialLoading(true);
    try {
      await loginWithGoogle({ idToken }); // returning user → straight in
      router.replace("/(tabs)/today");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg === "NEEDS_FAMILY") {
        setPendingToken(idToken);
        setPendingFullName(undefined);
        setMethod("google");
        setStep("family");
      } else {
        setError(t("auth.googleFailed"));
      }
    } finally {
      setSocialLoading(false);
    }
  };

  // ── Step 1: Apple ──
  const handleAppleCredential = async (identityToken: string, fullName?: string) => {
    setError("");
    setSocialLoading(true);
    try {
      await loginWithApple({ identityToken, fullName });
      router.replace("/(tabs)/today");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg === "NEEDS_FAMILY") {
        setPendingToken(identityToken);
        setPendingFullName(fullName);
        setMethod("apple");
        setStep("family");
      } else {
        setError(t("auth.appleFailed"));
      }
    } finally {
      setSocialLoading(false);
    }
  };

  const { promptAsync, ready: googleReady } = useGoogleAuth(handleGoogleToken);
  const { available: appleAvailable, signIn: appleSignIn } = useAppleAuth(handleAppleCredential);

  // ── Step 1: username/password → advance (account created on family submit) ──
  const handlePasswordContinue = () => {
    setError("");
    if (username.length < 3 || password.length < 4) return;
    setMethod("password");
    setStep("family");
  };

  // ── Step 2: family chosen → finish ──
  const handleFamilySubmit = async () => {
    if (!choice.ready) return;
    setError("");

    if (method === "google" || method === "apple") {
      if (!pendingToken) return;
      setSocialLoading(true);
      try {
        if (method === "google") {
          await loginWithGoogle({
            idToken: pendingToken,
            familyName: choice.familyName,
            familyCode: choice.inviteCode,
            memberId: choice.memberId,
          });
        } else {
          await loginWithApple({
            identityToken: pendingToken,
            fullName: pendingFullName,
            familyName: choice.familyName,
            familyCode: choice.inviteCode,
            memberId: choice.memberId,
          });
        }
        router.replace("/(tabs)/today");
      } catch (err) {
        const msg = err instanceof Error ? err.message : "";
        if (msg === "INVALID_INVITE") setError(t("auth.invalidFamilyCode"));
        else setError(method === "google" ? t("auth.googleFailed") : t("auth.appleFailed"));
      } finally {
        setSocialLoading(false);
      }
      return;
    }

    setLoading(true);
    try {
      await register({
        username,
        password,
        familyName: choice.familyName,
        familyCode: choice.inviteCode,
        memberId: choice.memberId,
      });
      router.replace("/(tabs)/today");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg === "USERNAME_TAKEN") {
        setError(t("auth.usernameTaken"));
        setStep("identity"); // bounce back so they can fix the username
      } else if (msg === "INVALID_INVITE") {
        setError(t("auth.invalidFamilyCode"));
      } else {
        setError(t("auth.genericError"));
      }
    } finally {
      setLoading(false);
    }
  };

  const goBackToIdentity = () => {
    setStep("identity");
    setError("");
  };

  // ── Step 2: family ──
  if (step === "family") {
    const busy = loading || socialLoading;
    return (
      <AuthShell title={t("auth.chooseFamilyTitle")}>
        <Text style={styles.subtitle}>{t("auth.chooseFamilySubtitle")}</Text>

        <FamilyChooser onChange={handleChoice} initialInvite={params.invite} />

        {error ? (
          <HelperText type="error" visible padding="none" style={styles.helper}>
            {error}
          </HelperText>
        ) : null}

        <Button
          mode="contained"
          onPress={handleFamilySubmit}
          loading={busy}
          disabled={busy || !choice.ready}
          buttonColor={C.purple}
          style={styles.btn}
          contentStyle={styles.btnContent}
          labelStyle={styles.btnLabel}
        >
          {choice.joining ? t("auth.joinFamily") : t("auth.register")}
        </Button>

        <Button
          mode="text"
          onPress={goBackToIdentity}
          disabled={busy}
          textColor={C.textSecondary}
          style={styles.backBtn}
        >
          {t("auth.back")}
        </Button>
      </AuthShell>
    );
  }

  // ── Step 1: identity ──
  return (
    <AuthShell
      title={t("auth.registerTitle")}
      footer={
        <AuthFooterLink
          prompt={t("auth.hasAccountPrompt")}
          action={t("auth.hasAccountAction")}
          onPress={() => router.replace("/(auth)/login")}
        />
      }
    >
      <GoogleSignInButton
        onPress={() => promptAsync()}
        loading={socialLoading}
        disabled={!googleReady || socialLoading || loading}
      />

      <AppleSignInButton onPress={appleSignIn} available={appleAvailable} />

      <AuthDivider label={t("auth.orWithPassword")} />

      <View>
        <AuthField
          label={t("auth.username")}
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          right={<TextInput.Icon icon="account" />}
        />
        {usernameError ? (
          <HelperText type="error" visible padding="none" style={styles.helper}>
            {t("auth.usernameMin")}
          </HelperText>
        ) : null}
      </View>

      <View>
        <AuthField
          label={t("auth.password")}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          onSubmitEditing={handlePasswordContinue}
          returnKeyType="next"
          right={<TextInput.Icon icon="lock" />}
        />
        {passwordError ? (
          <HelperText type="error" visible padding="none" style={styles.helper}>
            {t("auth.passwordMin")}
          </HelperText>
        ) : null}
      </View>

      {error ? (
        <HelperText type="error" visible padding="none" style={styles.helper}>
          {error}
        </HelperText>
      ) : null}

      <Button
        mode="contained"
        onPress={handlePasswordContinue}
        disabled={loading || username.length < 3 || password.length < 4}
        buttonColor={C.purple}
        style={styles.btn}
        contentStyle={styles.btnContent}
        labelStyle={styles.btnLabel}
      >
        {t("auth.continue")}
      </Button>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  helper: { textAlign: TEXT_RIGHT, marginTop: 2 },
  btn: { borderRadius: R.md, marginTop: S.sm },
  btnContent: { paddingVertical: 8 },
  btnLabel: { fontSize: 16, fontWeight: "600" },
  backBtn: { marginTop: S.xs },
  subtitle: {
    fontSize: 14,
    color: C.textSecondary,
    textAlign: TEXT_RIGHT,
    writingDirection: "rtl",
    marginBottom: S.sm,
  },
});
