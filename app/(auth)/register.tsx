import React, { useState, useEffect, useCallback } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Text, TextInput, Button, HelperText } from "react-native-paper";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useAuthStore } from "@src/auth/useAuthStore";
import { t } from "@src/i18n";
import { C, R, S } from "@src/ui/tokens";
import { RTL_ROW, TEXT_RIGHT } from "@src/ui/rtl";
import AuthShell, { AuthFooterLink } from "@src/components/auth/AuthShell";

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

  // Validate invite code when it reaches 6 chars — UNCHANGED from the
  // pre-redesign version; the form logic, API calls, and validation rules
  // are intentionally untouched by this presentational redesign.
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

  const joiningFamily = !!inviteFamilyName;
  const familyNameError = !joiningFamily && newFamilyName.length > 0 && newFamilyName.length < 2;

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
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg === "USERNAME_TAKEN") setError(t("auth.usernameTaken"));
      else if (msg === "INVALID_INVITE") setError(t("auth.invalidFamilyCode"));
      else setError(t("auth.genericError"));
    } finally {
      setLoading(false);
    }
  };

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
      {/* Invite code — trailing icon switches to a teal check when the
          code resolves, giving instant feedback that the family was found. */}
      <View>
        <TextInput
          mode="outlined"
          label={t("auth.familyCode")}
          value={inviteCode}
          onChangeText={(text) => setInviteCode(text.toUpperCase())}
          autoCapitalize="characters"
          maxLength={6}
          outlineColor={C.border}
          activeOutlineColor={C.purple}
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
          <HelperText type="error" visible padding="none" style={styles.helper}>
            {inviteError}
          </HelperText>
        ) : !joiningFamily ? (
          <HelperText type="info" visible padding="none" style={styles.helperInfo}>
            {t("auth.inviteHint")}
          </HelperText>
        ) : null}
        {joiningFamily ? (
          <View style={styles.familyBadge}>
            <Text style={styles.familyBadgeText}>
              {t("auth.joiningFamily")} {inviteFamilyName} ✨
            </Text>
          </View>
        ) : null}
      </View>

      {/* Member picker — shown when invite is valid and has unlinked members */}
      {joiningFamily && members.length > 0 && (
        <View style={styles.memberPickerContainer}>
          <Text style={styles.memberPickerTitle}>{t("auth.whoAreYou")}</Text>
          <Text style={styles.memberPickerSubtitle}>{t("auth.pickMember")}</Text>
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
                      backgroundColor: selected ? memberColor + "20" : C.surface,
                      borderColor: selected ? memberColor : C.border,
                      borderWidth: selected ? 2 : 1,
                    },
                  ]}
                  onPress={() => setSelectedMemberId(selected ? null : m.id)}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={m.displayName}
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
                  {selected && <Text style={{ fontSize: 14 }}>✓</Text>}
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      {/* Family name — only for new families (not invite join) */}
      {!joiningFamily && (
        <View>
          <TextInput
            mode="outlined"
            label={t("auth.familyNamePlaceholder")}
            value={newFamilyName}
            onChangeText={setNewFamilyName}
            outlineColor={C.border}
            activeOutlineColor={C.purple}
            style={styles.input}
            contentStyle={styles.inputContent}
            right={<TextInput.Icon icon="home-heart" />}
          />
          {familyNameError ? (
            <HelperText type="error" visible padding="none" style={styles.helper}>
              {t("settings.nameMinLength")}
            </HelperText>
          ) : null}
        </View>
      )}

      <View>
        <TextInput
          mode="outlined"
          label={t("auth.username")}
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
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
      </View>

      <View>
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
      </View>

      {error ? (
        <HelperText type="error" visible padding="none" style={styles.helper}>
          {error}
        </HelperText>
      ) : null}

      <Button
        mode="contained"
        onPress={handleRegister}
        loading={loading}
        disabled={
          loading ||
          username.length < 3 ||
          password.length < 4 ||
          (!joiningFamily && newFamilyName.trim().length < 2)
        }
        buttonColor={C.purple}
        style={styles.btn}
        contentStyle={styles.btnContent}
        labelStyle={styles.btnLabel}
      >
        {joiningFamily ? t("auth.joinFamily") : t("auth.register")}
      </Button>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  input: { backgroundColor: C.surface },
  inputContent: { textAlign: TEXT_RIGHT, writingDirection: "rtl" },
  helper: { textAlign: TEXT_RIGHT, marginTop: 2 },
  helperInfo: { textAlign: TEXT_RIGHT, marginTop: 2, color: C.textMuted },
  btn: { borderRadius: R.md, marginTop: S.sm },
  btnContent: { paddingVertical: 8 },
  btnLabel: { fontSize: 16, fontWeight: "600" },

  // Family badge — quiet teal confirmation when an invite resolves.
  familyBadge: {
    backgroundColor: C.teal + "14",
    borderRadius: R.md,
    paddingVertical: S.sm,
    paddingHorizontal: S.md,
    marginTop: S.sm,
    alignSelf: "center",
  },
  familyBadgeText: {
    color: C.teal,
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },

  // Member picker
  memberPickerContainer: { gap: S.xs },
  memberPickerTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: C.textPrimary,
    textAlign: TEXT_RIGHT,
    writingDirection: "rtl",
  },
  memberPickerSubtitle: {
    fontSize: 13,
    color: C.textSecondary,
    textAlign: TEXT_RIGHT,
    writingDirection: "rtl",
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
    alignItems: "center",
    justifyContent: "center",
  },
  memberEmojiText: { fontSize: 20 },
  memberChipName: {
    fontSize: 15,
    fontWeight: "600",
    color: C.textPrimary,
    flex: 1,
  },
});
