/**
 * FamilyChooser — shared "create a new family OR join via invite" picker.
 *
 * Used by BOTH the register screen (password sign-up) and the login screen's
 * inline Google NEEDS_FAMILY panel, so the invite-validation + member-picker
 * logic lives in exactly one place.
 *
 * Self-contained: owns its own state and reports the current selection up via
 * `onChange(choice)`. The parent only reads `choice.ready` (to enable its
 * action button) and the payload fields (familyName / inviteCode / memberId).
 */

import React, { useState, useEffect, useCallback } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { TextInput, HelperText } from "react-native-paper";

import { t } from "@src/i18n";
import { C, R, S } from "@src/ui/tokens";
import { RTL_ROW, TEXT_RIGHT } from "@src/ui/rtl";
import { getApiBaseUrl } from "@src/lib/api/baseUrl";
import { AuthField } from "./AuthShell";

const BASE_URL = getApiBaseUrl();

export type InviteMember = {
  id: string;
  displayName: string;
  role: string | null;
  avatarEmoji: string | null;
  color: string | null;
};

export interface FamilyChoice {
  /** True when the selection is complete enough to submit. */
  ready: boolean;
  /** Joining an existing family via a validated invite (affects button label). */
  joining: boolean;
  /** Surname for a brand-new family (create flow). */
  familyName?: string;
  /** Invite code (join flow). */
  inviteCode?: string;
  /** Chosen existing member to claim (join flow, optional). */
  memberId?: string;
}

interface Props {
  onChange: (choice: FamilyChoice) => void;
  /** Pre-fill the invite code (e.g. from a deep link). */
  initialInvite?: string;
}

export default function FamilyChooser({ onChange, initialInvite }: Props) {
  const [newFamilyName, setNewFamilyName] = useState("");
  const [inviteCode, setInviteCode] = useState(initialInvite ?? "");
  const [inviteFamilyName, setInviteFamilyName] = useState("");
  const [members, setMembers] = useState<InviteMember[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [validatingInvite, setValidatingInvite] = useState(false);
  const [inviteError, setInviteError] = useState("");

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

  const joining = !!inviteFamilyName;
  const familyNameError =
    !joining && newFamilyName.length > 0 && newFamilyName.length < 2;

  // Report the current selection up to the parent whenever it changes.
  useEffect(() => {
    const ready = joining
      ? true
      : newFamilyName.trim().length >= 2;
    onChange({
      ready,
      joining,
      familyName: joining ? undefined : newFamilyName.trim() || undefined,
      inviteCode: inviteCode || undefined,
      memberId: selectedMemberId ?? undefined,
    });
    // onChange is provided as a stable callback by the parent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joining, newFamilyName, inviteCode, selectedMemberId]);

  return (
    <>
      {/* Invite code — trailing icon flips to a teal check when it resolves. */}
      <View>
        <AuthField
          label={t("auth.familyCode")}
          value={inviteCode}
          onChangeText={(text) => setInviteCode(text.toUpperCase())}
          autoCapitalize="characters"
          maxLength={6}
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
        ) : !joining ? (
          <HelperText type="info" visible padding="none" style={styles.helperInfo}>
            {t("auth.inviteHint")}
          </HelperText>
        ) : null}
        {joining ? (
          <View style={styles.familyBadge}>
            <Text style={styles.familyBadgeText}>
              {t("auth.joiningFamily")} {inviteFamilyName} ✨
            </Text>
          </View>
        ) : null}
      </View>

      {/* Member picker — when the invite is valid and has unlinked members. */}
      {joining && members.length > 0 && (
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

      {/* Family name — only for new families (not invite join). */}
      {!joining && (
        <View>
          <AuthField
            label={t("auth.familyNamePlaceholder")}
            value={newFamilyName}
            onChangeText={setNewFamilyName}
            right={<TextInput.Icon icon="home-heart" />}
          />
          {familyNameError ? (
            <HelperText type="error" visible padding="none" style={styles.helper}>
              {t("settings.nameMinLength")}
            </HelperText>
          ) : null}
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  helper: { textAlign: TEXT_RIGHT, marginTop: 2 },
  helperInfo: { textAlign: TEXT_RIGHT, marginTop: 2, color: C.textMuted },

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
