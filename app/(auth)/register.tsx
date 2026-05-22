import React, { useState, useEffect, useCallback } from "react";
import { View, StyleSheet, KeyboardAvoidingView, Platform, Pressable } from "react-native";
import { Text, TextInput, Button, HelperText } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useAuthStore } from "@src/auth/useAuthStore";
import { t } from "@src/i18n";
import { C, R, S } from "@src/ui/tokens";
import { RTL_ROW, TEXT_RIGHT } from "@src/ui/rtl";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "";

type InviteMember = {
  id: string;
  displayName: string;
  role: string | null;
  avatarEmoji: string | null;
  color: string | null;
};

export default function RegisterScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ invite?: string }>();
  const register = useAuthStore((s) => s.register);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [newFamilyName, setNewFamilyName] = useState(""); // surname for new families
  const [inviteCode, setInviteCode] = useState(params.invite ?? "");
  const [inviteFamilyName, setInviteFamilyName] = useState(""); // from invite validation
  const [members, setMembers] = useState<InviteMember[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [validatingInvite, setValidatingInvite] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const usernameError = username.length > 0 && username.length < 3;
  const passwordError = password.length > 0 && password.length < 4;

  // Validate invite code when it reaches 6 chars
  const validateInvite = useCallback(async (code: string) => {
    if (code.length < 6) {
      setInviteFamilyName("");
      setMembers([]);
      setSelectedMemberId(null);
      setInviteError("");
      return;
    }
    setValidatingInvite(true);
    setInviteError("");
    try {
      const res = await fetch(
        `${BASE_URL}/v1/auth/invite/${encodeURIComponent(code.toUpperCase())}`,
      );
      if (res.ok) {
        const data = await res.json();
        setInviteFamilyName(data.familyName);
        setMembers(data.members ?? []);
        setSelectedMemberId(null);
      } else {
        setInviteFamilyName("");
        setMembers([]);
        setSelectedMemberId(null);
        setInviteError(t("auth.invalidFamilyCode"));
      }
    } catch {
      setInviteFamilyName("");
      setMembers([]);
      setSelectedMemberId(null);
      setInviteError(t("auth.genericError"));
    } finally {
      setValidatingInvite(false);
    }
  }, []);

  useEffect(() => {
    if (inviteCode.length >= 6) {
      validateInvite(inviteCode);
    } else {
      setInviteFamilyName("");
      setMembers([]);
      setSelectedMemberId(null);
      setInviteError("");
    }
  }, [inviteCode, validateInvite]);

  const handleRegister = async () => {
    setError("");
    if (username.length < 3 || password.length < 4) return;
    if (inviteCode && inviteCode.length < 6) return;
    if (!joiningFamily && newFamilyName.trim().length < 2) return;

    setLoading(true);
    try {
      await register({
        username,
        password,
        familyName: joiningFamily ? undefined : newFamilyName.trim(),
        familyCode: inviteCode || undefined,
        memberId: selectedMemberId ?? undefined,
      });
      // AuthGate handles redirect to /(tabs)/today once status is loggedIn
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg === "USERNAME_TAKEN") setError(t("auth.usernameTaken"));
      else if (msg === "INVALID_INVITE") setError(t("auth.invalidFamilyCode"));
      else setError(t("auth.genericError"));
    } finally {
      setLoading(false);
    }
  };

  const joiningFamily = !!inviteFamilyName;
  const familyNameError = !joiningFamily && newFamilyName.length > 0 && newFamilyName.length < 2;

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.container}>
          <Text variant="headlineLarge" style={styles.title}>
            {t("auth.registerTitle")}
          </Text>

          {/* Invite code field */}
          <TextInput
            mode="outlined"
            placeholder={t("auth.familyCode")}
            value={inviteCode}
            onChangeText={(text) => setInviteCode(text.toUpperCase())}
            autoCapitalize="characters"
            maxLength={6}
            style={styles.input}
            contentStyle={styles.inputContent}
            right={
              validatingInvite ? (
                <TextInput.Icon icon="loading" />
              ) : inviteCode.length >= 6 && inviteFamilyName ? (
                <TextInput.Icon icon="check-circle" color={C.teal} />
              ) : (
                <TextInput.Icon icon="account-group" />
              )
            }
          />
          {inviteError ? (
            <HelperText type="error" visible style={styles.helper}>
              {inviteError}
            </HelperText>
          ) : null}
          {joiningFamily ? (
            <View style={styles.familyBadge}>
              <Text style={styles.familyBadgeText}>
                {t("auth.joiningFamily")} {inviteFamilyName} ✨
              </Text>
            </View>
          ) : (
            <HelperText type="info" visible style={styles.helper}>
              {t("auth.inviteHint")}
            </HelperText>
          )}

          {/* Member picker — shown when invite is valid and has unlinked members */}
          {joiningFamily && members.length > 0 && (
            <View style={styles.memberPickerContainer}>
              <Text style={styles.memberPickerTitle}>
                {t("auth.whoAreYou")}
              </Text>
              <Text style={styles.memberPickerSubtitle}>
                {t("auth.pickMember")}
              </Text>
              <View style={styles.memberPickerRow}>
                {members.map((m) => {
                  const selected = selectedMemberId === m.id;
                  const memberColor = m.color ?? C.purple;
                  return (
                    <Pressable
                      key={m.id}
                      style={[
                        styles.memberChip,
                        {
                          backgroundColor: selected
                            ? memberColor + "20"
                            : C.surface,
                          borderColor: selected
                            ? memberColor
                            : C.border,
                          borderWidth: selected ? 2 : 1,
                        },
                      ]}
                      onPress={() =>
                        setSelectedMemberId(selected ? null : m.id)
                      }
                    >
                      <View
                        style={[
                          styles.memberChipEmoji,
                          { backgroundColor: memberColor + "18" },
                        ]}
                      >
                        <Text style={styles.memberEmojiText}>
                          {m.avatarEmoji ?? "👤"}
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.memberChipName,
                          selected && { color: memberColor, fontWeight: "800" },
                        ]}
                      >
                        {m.displayName}
                      </Text>
                      {selected && (
                        <Text style={{ fontSize: 14 }}>✓</Text>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          {/* Family name — only for new families (not invite join) */}
          {!joiningFamily && (
            <>
              <TextInput
                mode="outlined"
                placeholder={t("auth.familyNamePlaceholder")}
                value={newFamilyName}
                onChangeText={setNewFamilyName}
                style={styles.input}
                contentStyle={styles.inputContent}
                right={<TextInput.Icon icon="home-heart" />}
              />
              <HelperText type="error" visible={familyNameError} style={styles.helper}>
                {t("settings.nameMinLength")}
              </HelperText>
            </>
          )}

          <TextInput
            mode="outlined"
            placeholder={t("auth.username")}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            style={styles.input}
            contentStyle={styles.inputContent}
            right={<TextInput.Icon icon="account" />}
          />
          <HelperText type="error" visible={usernameError} style={styles.helper}>
            {t("auth.usernameMin")}
          </HelperText>

          <TextInput
            mode="outlined"
            placeholder={t("auth.password")}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            style={styles.input}
            contentStyle={styles.inputContent}
            right={<TextInput.Icon icon="lock" />}
          />
          <HelperText type="error" visible={passwordError} style={styles.helper}>
            {t("auth.passwordMin")}
          </HelperText>

          {error ? (
            <HelperText type="error" visible style={styles.helper}>
              {error}
            </HelperText>
          ) : null}

          <Button
            mode="contained"
            onPress={handleRegister}
            loading={loading}
            disabled={loading || username.length < 3 || password.length < 4 || (!joiningFamily && newFamilyName.trim().length < 2)}
            style={styles.btn}
            contentStyle={styles.btnContent}
            labelStyle={styles.btnLabel}
          >
            {joiningFamily ? t("auth.joinFamily") : t("auth.register")}
          </Button>

          <Button
            mode="text"
            onPress={() => router.replace("/(auth)/login")}
            style={styles.link}
          >
            {t("auth.hasAccount")}
          </Button>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  flex: { flex: 1 },
  container: { flex: 1, justifyContent: "center", paddingHorizontal: S.xl + S.sm },
  title: {
    fontWeight: "800",
    color: C.textPrimary,
    textAlign: "center",
    marginBottom: S.xxl,
  },
  input: { backgroundColor: C.surface, textAlign: TEXT_RIGHT, writingDirection: "rtl", marginBottom: 2 },
  inputContent: { textAlign: TEXT_RIGHT },
  helper: { textAlign: TEXT_RIGHT },
  btn: { borderRadius: R.md, marginTop: S.sm },
  btnContent: { paddingVertical: 6 },
  btnLabel: { fontSize: 16, fontWeight: "700" },
  link: { marginTop: S.lg },
  familyBadge: {
    backgroundColor: C.teal + "14",
    borderRadius: R.md,
    paddingVertical: S.sm,
    paddingHorizontal: S.md,
    marginBottom: S.sm,
    alignSelf: "center",
  },
  familyBadgeText: {
    color: C.teal,
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  // Member picker
  memberPickerContainer: {
    marginBottom: S.md,
    gap: S.xs,
  },
  memberPickerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: C.textPrimary,
    textAlign: TEXT_RIGHT,
  },
  memberPickerSubtitle: {
    fontSize: 12,
    color: C.textSecondary,
    textAlign: TEXT_RIGHT,
    marginBottom: S.sm,
  },
  memberPickerRow: {
    flexDirection: RTL_ROW,
    flexWrap: "wrap",
    gap: S.sm,
  },
  memberChip: {
    flexDirection: RTL_ROW,
    alignItems: "center",
    gap: S.sm,
    paddingVertical: S.sm + 2,
    paddingHorizontal: S.md,
    borderRadius: R.lg,
    minWidth: 100,
  },
  memberChipEmoji: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  memberEmojiText: { fontSize: 20 },
  memberChipName: {
    fontSize: 15,
    fontWeight: "600",
    color: C.textPrimary,
    flex: 1,
  },
});
