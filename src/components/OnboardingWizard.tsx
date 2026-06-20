import React, { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Platform,
  ScrollView,
  KeyboardAvoidingView,
  Linking,
  Alert,
  Share,
} from "react-native";
import { Text, TextInput, Button } from "react-native-paper";
import SegmentedPills from "./SegmentedPills";
import * as Clipboard from "expo-clipboard";
import { useFamilyStore } from "@src/store/useFamilyStore";
import { useAuthStore } from "@src/auth/useAuthStore";
import {
  addFamilyMemberRemote,
  updateFamilyMemberRemote,
  addKidRemote,
  updateFamilyNameRemote,
  setKidActiveRemote,
  claimFamilyMemberRemote,
} from "@src/lib/sync/remoteCrud";
import { telegramApi, invitesApi } from "@src/lib/api/endpoints";
import { getFamilyId } from "@src/lib/familyContext";
import { MEMBER_ROLES } from "@src/models/familyMember";
import type { MemberRole } from "@src/models/familyMember";
import { t, memberRoleLabel } from "@src/i18n";
import { C, R, S, SHADOW } from "@src/ui/tokens";
import { MS } from "@src/ui/modalStyles";
import { RTL_ROW, TEXT_RIGHT } from "@src/ui/rtl";
import { AVATAR_EMOJI_OPTIONS, COLOR_SWATCHES_LARGE } from "@src/ui/semanticColors";
import PaginatedPicker from "./PaginatedPicker";

const COLOR_SWATCHES = COLOR_SWATCHES_LARGE;
const MEMBER_EMOJIS = AVATAR_EMOJI_OPTIONS;
const KID_EMOJIS = AVATAR_EMOJI_OPTIONS;

const TOTAL_STEPS = 5;

export default function OnboardingWizard() {
  const familyName = useFamilyStore((s) => s.familyName);
  const setOnboardingComplete = useFamilyStore((s) => s.setOnboardingComplete);

  // Skip step 1 if family name was already set during registration.
  // hasRealFamilyName is reactive (subscribes to the store), so when pullAll
  // loads the family name after registration, the wizard auto-advances below.
  const hasRealFamilyName = familyName.length >= 2;
  const firstStep = hasRealFamilyName ? 2 : 1;
  const totalSteps = hasRealFamilyName ? TOTAL_STEPS - 1 : TOTAL_STEPS;

  const [step, setStep] = useState(firstStep);

  // Auto-advance past step 1 if family name loads from the server after mount.
  // This is the common case post-registration: the wizard mounts immediately
  // (before pullAll completes), so familyName starts empty even though the user
  // already supplied it during /register. Without this effect, the user would
  // be stuck on step 1 asking for the family name a second time.
  useEffect(() => {
    if (hasRealFamilyName && step === 1) setStep(2);
  }, [hasRealFamilyName, step]);

  // Map visual dot position (1-based) from actual step
  const dotPosition = hasRealFamilyName ? step - 1 : step;

  return (
    <View
      style={[
        styles.overlay,
        Platform.OS === "web" && ({ position: "fixed" } as any),
      ]}
    >
      <View style={styles.backdrop} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.center}
        pointerEvents="box-none"
      >
        <View style={styles.container}>
          <ProgressDots current={dotPosition} total={totalSteps} />
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator
            contentContainerStyle={{ paddingBottom: S.sm }}
          >
            {step === 1 && <Step1FamilyName onNext={() => setStep(2)} />}
            {step === 2 && (
              <Step2AboutYou
                onNext={() => setStep(3)}
                // Step 1 (family name) is skipped when it was set at registration,
                // making step 2 the first step — so there's nothing to go back to.
                onBack={firstStep === 1 ? () => setStep(1) : undefined}
              />
            )}
            {step === 3 && (
              <Step3Kids onNext={() => setStep(4)} onBack={() => setStep(2)} />
            )}
            {step === 4 && (
              <Step4Invite
                onNext={() => setStep(5)}
                onBack={() => setStep(3)}
                onSkip={() => setStep(5)}
              />
            )}
            {step === 5 && (
              <Step5Telegram
                onBack={() => setStep(4)}
                onFinish={() => setOnboardingComplete(true)}
              />
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

// ── Progress dots ──

function ProgressDots({ current, total }: { current: number; total: number }) {
  return (
    <View style={styles.dotsRow}>
      {Array.from({ length: total }, (_, i) => (
        <View
          key={i}
          style={[styles.dot, i + 1 === current && styles.dotActive]}
        />
      ))}
    </View>
  );
}

// ── Step 1: Family Name (unchanged) ──

function Step1FamilyName({ onNext }: { onNext: () => void }) {
  const familyName = useFamilyStore((s) => s.familyName);
  const [name, setName] = useState(familyName || "");
  const [error, setError] = useState("");

  // Prefill the input if familyName loads from the server after mount and the
  // user hasn't typed yet. (Parent normally auto-skips this step when familyName
  // loads — this is the belt-and-suspenders for the brief window before that.)
  useEffect(() => {
    if (familyName && !name) setName(familyName);
  }, [familyName, name]);

  const handleNext = () => {
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      setError(t("settings.nameMinLength"));
      return;
    }
    updateFamilyNameRemote(trimmed);
    onNext();
  };

  return (
    <View>
      <Text style={styles.stepTitle}>{t("onboarding.step1Title")}</Text>
      <Text style={styles.stepSubtitle}>{t("onboarding.step1Subtitle")}</Text>

      <TextInput
        placeholder={t("onboarding.familyNamePlaceholder")}
        value={name}
        onChangeText={(v) => { setName(v); if (error) setError(""); }}
        mode="outlined"
        style={MS.input}
        contentStyle={MS.inputContent}
        autoFocus
        error={!!error}
      />
      {error ? <Text style={MS.error}>{error}</Text> : null}

      <View style={styles.navRow}>
        <Button
          mode="contained"
          onPress={handleNext}
          style={styles.navBtn}
          buttonColor={C.purple}
        >
          {t("onboarding.next")}
        </Button>
      </View>
    </View>
  );
}

// ── Step 2: About You + optional Partner ──

function Step2AboutYou({
  onNext,
  onBack,
}: {
  onNext: () => void;
  /** Omitted when step 2 is the first step (step 1 was skipped) — no back. */
  onBack?: () => void;
}) {
  const members = useFamilyStore((s) => s.familyMembers).filter((m) => m.isActive);
  const currentUserId = useAuthStore((s) => s.session?.user.id);

  // Check if this user already has a claimed member
  const alreadyClaimed = members.find((m) => m.userId === currentUserId);

  // "About you" form state
  const [name, setName] = useState(alreadyClaimed?.name ?? "");
  const [role, setRole] = useState<MemberRole>(
    (alreadyClaimed?.role as MemberRole) ?? "parent",
  );
  const [avatarEmoji, setAvatarEmoji] = useState(
    alreadyClaimed?.avatarEmoji ?? "👨",
  );
  const [color, setColor] = useState(
    alreadyClaimed?.color ?? COLOR_SWATCHES[0],
  );
  const [nameError, setNameError] = useState("");
  const [selfSaved, setSelfSaved] = useState(!!alreadyClaimed);
  // The claimed member's id — drives edit (update) vs first-time (create+claim).
  const [claimedMemberId, setClaimedMemberId] = useState<string | null>(
    alreadyClaimed?.id ?? null,
  );
  // True while re-opening the saved member for editing.
  const [editing, setEditing] = useState(false);

  // The user's claimed member can arrive after mount (pullAll completes after
  // the wizard opens). Sync it in once, so the saved/editable view shows and we
  // never create a duplicate. Guarded by claimedMemberId so it never fights an
  // in-progress create or edit.
  useEffect(() => {
    if (alreadyClaimed && !claimedMemberId) {
      setClaimedMemberId(alreadyClaimed.id);
      setName(alreadyClaimed.name);
      setRole((alreadyClaimed.role as MemberRole) ?? "parent");
      setAvatarEmoji(alreadyClaimed.avatarEmoji ?? "👨");
      setColor(alreadyClaimed.color ?? COLOR_SWATCHES[0]);
      setSelfSaved(true);
    }
  }, [alreadyClaimed, claimedMemberId]);

  // Partner sub-step state
  const [showPartnerForm, setShowPartnerForm] = useState(false);
  const [partnerName, setPartnerName] = useState("");
  const [partnerRole, setPartnerRole] = useState<MemberRole>("parent");
  const [partnerEmoji, setPartnerEmoji] = useState("👩");
  const [partnerColor, setPartnerColor] = useState(COLOR_SWATCHES[1]);
  const [partnerNameError, setPartnerNameError] = useState("");
  const [partnerSaved, setPartnerSaved] = useState(false);

  const [claiming, setClaiming] = useState(false);

  // Count non-self members (potential partners already added)
  const partnerMembers = members.filter(
    (m) => m.userId !== currentUserId && !m.userId,
  );
  const hasPartnerAlready = partnerMembers.length > 0 || partnerSaved;

  const handleSaveSelf = async () => {
    const trimmed = name.trim();
    if (!trimmed) { setNameError(t("settings.nameRequired")); return; }
    if (trimmed.length < 2) { setNameError(t("settings.nameMinLength")); return; }

    // Editing an existing claimed member → update in place (no duplicate).
    if (claimedMemberId) {
      updateFamilyMemberRemote(claimedMemberId, { name: trimmed, role, avatarEmoji, color });
      setEditing(false);
      setSelfSaved(true);
      return;
    }

    // First time → create the member and claim it.
    setClaiming(true);
    try {
      addFamilyMemberRemote({
        name: trimmed,
        role,
        avatarEmoji,
        color,
      });
      // Small delay for the store to update, then claim
      setTimeout(async () => {
        try {
          const latestMembers = useFamilyStore.getState().familyMembers;
          const created = latestMembers.find(
            (m) => m.name === trimmed && m.isActive && !m.userId,
          );
          if (created) {
            await claimFamilyMemberRemote(created.id);
            setClaimedMemberId(created.id);
          }
        } catch {
          // Non-fatal — user can fix later
        } finally {
          setClaiming(false);
          setSelfSaved(true);
        }
      }, 300);
    } catch {
      setClaiming(false);
    }
  };

  // Re-open the saved member for editing (form pre-filled from current state).
  const handleEditSelf = () => {
    setEditing(true);
    setSelfSaved(false);
  };

  // Discard edits and return to the saved view, restoring stored values.
  const handleCancelEdit = () => {
    const m = useFamilyStore.getState().familyMembers.find((x) => x.id === claimedMemberId);
    if (m) {
      setName(m.name);
      setRole((m.role as MemberRole) ?? "parent");
      setAvatarEmoji(m.avatarEmoji ?? "👨");
      setColor(m.color ?? COLOR_SWATCHES[0]);
    }
    setNameError("");
    setEditing(false);
    setSelfSaved(true);
  };

  const handleSavePartner = () => {
    const trimmed = partnerName.trim();
    if (!trimmed) { setPartnerNameError(t("settings.nameRequired")); return; }
    if (trimmed.length < 2) { setPartnerNameError(t("settings.nameMinLength")); return; }
    addFamilyMemberRemote({
      name: trimmed,
      role: partnerRole,
      avatarEmoji: partnerEmoji,
      color: partnerColor,
    });
    setPartnerSaved(true);
    setShowPartnerForm(false);
  };

  const handleNext = () => {
    if (!selfSaved) {
      // Auto-save if not saved yet
      handleSaveSelf();
      return;
    }
    onNext();
  };

  const roleButtons = MEMBER_ROLES.map((r) => ({
    value: r,
    label: memberRoleLabel(r),
  }));

  return (
    <View>
      <Text style={styles.stepTitle}>{t("onboarding.step2Title")}</Text>
      <Text style={styles.stepSubtitle}>{t("onboarding.step2Subtitle")}</Text>

      {/* ── "About you" section ── */}
      {selfSaved ? (
        <View style={styles.addedRow}>
          <View style={[styles.addedEmoji, { backgroundColor: color + "22" }]}>
            <Text style={{ fontSize: 20 }}>{avatarEmoji}</Text>
          </View>
          <Text style={styles.addedName}>{name}</Text>
          <Text style={styles.addedRole}>{memberRoleLabel(role)}</Text>
          <Text style={{ fontSize: 14, color: C.teal }}>✓</Text>
          <Pressable
            onPress={handleEditSelf}
            style={styles.editBtn}
            accessibilityRole="button"
            accessibilityLabel={t("onboarding.editSelf")}
            testID="onboarding-edit-self"
          >
            <Text style={styles.editBtnText}>✏️</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.inlineForm}>
          <TextInput
            placeholder={t("onboarding.yourName")}
            value={name}
            onChangeText={(v) => { setName(v); if (nameError) setNameError(""); }}
            mode="outlined"
            style={MS.input}
            contentStyle={MS.inputContent}
            autoFocus
            error={!!nameError}
          />
          {nameError ? <Text style={MS.error}>{nameError}</Text> : null}

          <Text style={MS.label}>{t("settings.memberRole")}</Text>
          <View style={MS.segmented}>
            <SegmentedPills
              value={role}
              onChange={(v) => setRole(v as MemberRole)}
              options={roleButtons}
            />
          </View>

          <Text style={MS.label}>{t("settings.memberEmoji")}</Text>
          <PaginatedPicker
            kind="emoji"
            options={MEMBER_EMOJIS}
            value={avatarEmoji}
            onChange={setAvatarEmoji}
            testIDPrefix="self-emoji"
          />

          <Text style={MS.label}>{t("settings.memberColor")}</Text>
          <PaginatedPicker
            kind="color"
            options={COLOR_SWATCHES}
            value={color}
            onChange={setColor}
            testIDPrefix="self-color"
          />

          {editing ? (
            <View style={[styles.navRow, { gap: S.sm, marginTop: S.sm }]}>
              <Button onPress={handleCancelEdit}>{t("cancel")}</Button>
              <Button
                mode="contained"
                onPress={handleSaveSelf}
                loading={claiming}
                buttonColor={C.purple}
              >
                {t("save")}
              </Button>
            </View>
          ) : (
            <Button
              mode="contained"
              onPress={handleSaveSelf}
              loading={claiming}
              buttonColor={C.purple}
              style={{ borderRadius: R.md, marginTop: S.sm }}
            >
              {t("onboarding.next")}
            </Button>
          )}
        </View>
      )}

      {/* ── Partner sub-step (shown after self is saved) ── */}
      {selfSaved && !hasPartnerAlready && !showPartnerForm && (
        <View style={styles.partnerPrompt}>
          <Text style={styles.partnerPromptTitle}>
            {t("onboarding.step2AddPartner")}
          </Text>
          <Text style={styles.partnerPromptSubtitle}>
            {t("onboarding.step2AddPartnerSubtitle")}
          </Text>
          <Button
            mode="outlined"
            onPress={() => setShowPartnerForm(true)}
            icon="plus"
            style={styles.addBtn}
          >
            {t("onboarding.addPartner")}
          </Button>
        </View>
      )}

      {selfSaved && showPartnerForm && (
        <View style={[styles.inlineForm, { marginTop: S.md }]}>
          <TextInput
            placeholder={t("onboarding.partnerName")}
            value={partnerName}
            onChangeText={(v) => { setPartnerName(v); if (partnerNameError) setPartnerNameError(""); }}
            mode="outlined"
            style={MS.input}
            contentStyle={MS.inputContent}
            autoFocus
            error={!!partnerNameError}
          />
          {partnerNameError ? <Text style={MS.error}>{partnerNameError}</Text> : null}

          <Text style={MS.label}>{t("settings.memberRole")}</Text>
          <View style={MS.segmented}>
            <SegmentedPills
              value={partnerRole}
              onChange={(v) => setPartnerRole(v as MemberRole)}
              options={roleButtons}
            />
          </View>

          <Text style={MS.label}>{t("settings.memberEmoji")}</Text>
          <PaginatedPicker
            kind="emoji"
            options={MEMBER_EMOJIS}
            value={partnerEmoji}
            onChange={setPartnerEmoji}
            testIDPrefix="partner-emoji"
          />

          <Text style={MS.label}>{t("settings.memberColor")}</Text>
          <PaginatedPicker
            kind="color"
            options={COLOR_SWATCHES}
            value={partnerColor}
            onChange={setPartnerColor}
            testIDPrefix="partner-color"
          />

          <View style={[styles.navRow, { gap: S.sm }]}>
            <Button onPress={() => setShowPartnerForm(false)}>
              {t("cancel")}
            </Button>
            <Button mode="contained" onPress={handleSavePartner} buttonColor={C.purple}>
              {t("add")}
            </Button>
          </View>
        </View>
      )}

      {/* Partner saved confirmation */}
      {selfSaved && partnerSaved && (
        <View style={styles.partnerDoneBadge}>
          <Text style={styles.partnerDoneText}>
            {t("onboarding.step2PartnerAdded")} ✨
          </Text>
        </View>
      )}

      {/* Show already-added partner from store */}
      {selfSaved && partnerMembers.map((m) => (
        <View key={m.id} style={[styles.addedRow, { marginTop: S.sm }]}>
          <View style={[styles.addedEmoji, { backgroundColor: (m.color ?? C.purple) + "22" }]}>
            <Text style={{ fontSize: 20 }}>{m.avatarEmoji ?? "👤"}</Text>
          </View>
          <Text style={styles.addedName}>{m.name}</Text>
          <Text style={styles.addedRole}>{memberRoleLabel(m.role)}</Text>
        </View>
      ))}

      {/* Navigation. Back is omitted when step 2 is the first step (nothing
          to go back to); a spacer keeps Next aligned to its side. */}
      {selfSaved && (
        <View style={styles.navRow}>
          {onBack ? <Button onPress={onBack}>{t("onboarding.back")}</Button> : <View />}
          <Button mode="contained" onPress={handleNext} buttonColor={C.purple}>
            {t("onboarding.next")}
          </Button>
        </View>
      )}
    </View>
  );
}

// ── Step 3: Kids (unchanged) ──

function Step3Kids({
  onNext,
  onBack,
}: {
  onNext: () => void;
  onBack: () => void;
}) {
  const kids = useFamilyStore((s) => s.kids).filter((k) => k.isActive);
  // Default to collapsed CTA, not the open form. Empty state shows a friendly
  // "+ הוסף ילד/ה" button rather than the bulky form on entry. (Previous QA
  // BUG #4 — the form-first layout looked like the step required a kid.)
  const [showForm, setShowForm] = useState(false);

  // Inline form state
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("🌸");
  const [color, setColor] = useState(COLOR_SWATCHES[0]);
  const [nameError, setNameError] = useState("");

  const resetForm = () => {
    setName("");
    setEmoji("🌸");
    setColor(COLOR_SWATCHES[0]);
    setNameError("");
  };

  const handleAdd = () => {
    const trimmed = name.trim();
    if (!trimmed) { setNameError(t("settings.nameRequired")); return; }
    if (trimmed.length < 2) { setNameError(t("settings.nameMinLength")); return; }
    addKidRemote({ name: trimmed, emoji, color });
    resetForm();
    setShowForm(false);
  };

  // Kids are optional — child-free couples, empty-nesters, single adults
  // sharing a household are all valid "family OS" users. Previously this
  // step blocked progress with "יש להוסיף לפחות ילד/ה אחד/ת"
  // (QA Pass 1 BUG #3 — product-fit blocker).
  const handleNext = () => onNext();

  return (
    <View>
      <Text style={styles.stepTitle}>{t("onboarding.step3Title")}</Text>
      <Text style={styles.stepSubtitle}>{t("onboarding.step3Subtitle")}</Text>

      {kids.map((k) => (
        <View key={k.id} style={styles.addedRow}>
          <View style={[styles.addedEmoji, { backgroundColor: (k.color ?? C.purple) + "22" }]}>
            <Text style={{ fontSize: 20 }}>{k.emoji || "👶"}</Text>
          </View>
          <Text style={styles.addedName}>{k.name}</Text>
          <Pressable
            onPress={() => setKidActiveRemote(k.id, false)}
            style={styles.removeBtn}
          >
            <Text style={styles.removeBtnText}>✕</Text>
          </Pressable>
        </View>
      ))}

      {showForm ? (
        <View style={styles.inlineForm}>
          <TextInput
            placeholder={t("settings.kidName")}
            value={name}
            onChangeText={(v) => { setName(v); if (nameError) setNameError(""); }}
            mode="outlined"
            style={MS.input}
            contentStyle={MS.inputContent}
            autoFocus
            error={!!nameError}
          />
          {nameError ? <Text style={MS.error}>{nameError}</Text> : null}

          <Text style={MS.label}>{t("settings.kidEmoji")}</Text>
          <PaginatedPicker
            kind="emoji"
            options={KID_EMOJIS}
            value={emoji}
            onChange={setEmoji}
            testIDPrefix="kid-emoji"
          />

          <Text style={MS.label}>{t("settings.kidColor")}</Text>
          <PaginatedPicker
            kind="color"
            options={COLOR_SWATCHES}
            value={color}
            onChange={setColor}
            testIDPrefix="kid-color"
          />

          <View style={[styles.navRow, { gap: S.sm }]}>
            <Button onPress={() => { resetForm(); setShowForm(false); }}>
              {t("cancel")}
            </Button>
            <Button mode="contained" onPress={handleAdd} buttonColor={C.purple}>
              {t("add")}
            </Button>
          </View>
        </View>
      ) : (
        <Button
          mode="outlined"
          onPress={() => setShowForm(true)}
          icon="plus"
          style={styles.addBtn}
        >
          {t("onboarding.addKid")}
        </Button>
      )}

      <View style={styles.navRow}>
        <Button onPress={onBack}>{t("onboarding.back")}</Button>
        <Button mode="contained" onPress={handleNext} buttonColor={C.purple}>
          {t("onboarding.next")}
        </Button>
      </View>
    </View>
  );
}

// ── Step 4: Invite Partner (NEW) ──

function Step4Invite({
  onNext,
  onBack,
  onSkip,
}: {
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}) {
  const familyName = useFamilyStore((s) => s.familyName);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const generateInvite = async () => {
    setGenerating(true);
    try {
      const familyId = await getFamilyId();
      const result = await invitesApi.create(familyId);
      setInviteCode(result.code);
    } catch {
      Alert.alert("שגיאה ביצירת קוד הזמנה");
    } finally {
      setGenerating(false);
    }
  };

  const copyCode = async () => {
    if (!inviteCode) return;
    await Clipboard.setStringAsync(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareInvite = async () => {
    if (!inviteCode) return;
    const appUrl =
      process.env.EXPO_PUBLIC_APP_URL ||
      (Platform.OS === "web" && typeof window !== "undefined" ? window.location.origin : "");
    const link = `${appUrl}/register?invite=${inviteCode}`;
    const message = `הצטרפו למשפחת ${familyName} באפליקציית Family OS!\n\n${link}\n\nקוד ההזמנה: ${inviteCode}`;
    try {
      await Share.share({ message });
    } catch {
      // User cancelled share
    }
  };

  return (
    <View>
      <Text style={styles.stepTitle}>{t("onboarding.step4Title")} 💌</Text>
      <Text style={styles.stepSubtitle}>{t("onboarding.step4Subtitle")}</Text>

      {!inviteCode ? (
        <Button
          mode="contained"
          onPress={generateInvite}
          loading={generating}
          disabled={generating}
          icon="account-plus"
          style={{ borderRadius: R.md, marginTop: S.md }}
          buttonColor={C.purple}
        >
          {t("settings.generateInvite")}
        </Button>
      ) : (
        <View style={styles.inviteContainer}>
          <View style={styles.inviteCodeBox}>
            <Text style={styles.inviteCodeText}>{inviteCode}</Text>
          </View>
          <View style={styles.inviteActions}>
            <Button
              mode="outlined"
              onPress={copyCode}
              icon={copied ? "check" : "content-copy"}
              style={styles.inviteActionBtn}
            >
              {copied ? t("settings.codeCopied") : t("settings.copyCode")}
            </Button>
            <Button
              mode="contained"
              onPress={shareInvite}
              icon="share-variant"
              style={styles.inviteActionBtn}
              buttonColor={C.purple}
            >
              {t("settings.shareInvite")}
            </Button>
          </View>
          <Text style={styles.inviteExpiry}>
            {t("settings.inviteExpires", { days: "7" })}
          </Text>
        </View>
      )}

      <View style={styles.navRow}>
        <Button onPress={onBack}>{t("onboarding.back")}</Button>
        <View style={{ flexDirection: "row", gap: S.sm }}>
          <Button onPress={onSkip}>{t("onboarding.step4Skip")}</Button>
          <Button mode="contained" onPress={onNext} buttonColor={C.purple}>
            {t("onboarding.next")}
          </Button>
        </View>
      </View>
    </View>
  );
}

// ── Step 5: Telegram ──

function Step5Telegram({
  onBack,
  onFinish,
}: {
  onBack: () => void;
  onFinish: () => void;
}) {
  const [connecting, setConnecting] = useState(false);

  const connectTelegram = async () => {
    setConnecting(true);
    // See settings.tsx for the full explanation — popup blockers gate
    // window.open() to the original click's call stack on web, so we must
    // pre-open a tab synchronously and redirect it once we have the code.
    let preOpenedWin: Window | null = null;
    if (Platform.OS === "web" && typeof window !== "undefined") {
      preOpenedWin = window.open("about:blank", "_blank");
    }
    try {
      const familyId = await getFamilyId();
      const { code } = await telegramApi.generateCode(familyId);
      const deepLink = `https://t.me/family_os_assistant_bot?start=${code}`;
      if (preOpenedWin) {
        preOpenedWin.location.href = deepLink;
      } else {
        await Linking.openURL(deepLink);
      }
    } catch {
      if (preOpenedWin) preOpenedWin.close();
      Alert.alert(t("settings.telegramError"));
    } finally {
      setConnecting(false);
    }
  };

  return (
    <View>
      <Text style={styles.stepTitle}>
        {t("onboarding.step5Title")} 🤖
      </Text>
      <Text style={styles.stepSubtitle}>{t("onboarding.step5Subtitle")}</Text>

      <Button
        mode="contained"
        onPress={connectTelegram}
        loading={connecting}
        disabled={connecting}
        icon="send"
        style={styles.telegramBtn}
        buttonColor={C.selectText}
      >
        {t("settings.connectTelegram")}
      </Button>

      <View style={styles.navRow}>
        <Button onPress={onBack}>{t("onboarding.back")}</Button>
        <Button mode="contained" onPress={onFinish} buttonColor={C.purple}>
          {t("onboarding.finish")}
        </Button>
      </View>
    </View>
  );
}

// ── Styles ──

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    justifyContent: "center",
    alignItems: "center",
  },
  backdrop: {
    // Opaque app-background so the wizard reads as its own screen, not a
    // floating modal over /today. Bottom tab bar still pokes through the
    // overlay's stacking, but the content area is fully covered.
    ...StyleSheet.absoluteFillObject,
    backgroundColor: C.bg,
  },
  center: {
    width: "100%",
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: 40,
    flex: 1,
    pointerEvents: "box-none",
  },
  container: {
    backgroundColor: "#FFFFFF",
    width: "92%",
    maxWidth: 460,
    maxHeight: "92%",
    padding: S.lg + 4,
    borderRadius: R.xl,
    ...SHADOW.lg,
    shadowOpacity: 0.2,
    shadowRadius: 24,
  },
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: S.sm,
    marginBottom: S.lg,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: C.border,
  },
  dotActive: {
    backgroundColor: C.purple,
    width: 24,
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: C.textPrimary,
    textAlign: TEXT_RIGHT,
    marginBottom: S.xs,
  },
  stepSubtitle: {
    fontSize: 13,
    color: C.textSecondary,
    textAlign: TEXT_RIGHT,
    marginBottom: S.xl,
    lineHeight: 20,
  },
  navRow: {
    flexDirection: RTL_ROW,
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: S.xl,
  },
  navBtn: {
    borderRadius: R.md,
    flex: 1,
  },
  addedRow: {
    flexDirection: RTL_ROW,
    alignItems: "center",
    paddingVertical: S.sm,
    paddingHorizontal: S.xs,
    gap: S.sm,
    borderRadius: R.sm,
    backgroundColor: C.surfaceSubtle,
    marginBottom: S.xs,
  },
  addedEmoji: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  addedName: {
    fontSize: 15,
    fontWeight: "600",
    color: C.textPrimary,
    textAlign: TEXT_RIGHT,
    flex: 1,
  },
  addedRole: {
    fontSize: 12,
    color: C.textSecondary,
  },
  editBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: C.surface,
    justifyContent: "center",
    alignItems: "center",
  },
  editBtnText: { fontSize: 15 },
  removeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: C.border,
    justifyContent: "center",
    alignItems: "center",
  },
  removeBtnText: {
    fontSize: 13,
    color: C.textSecondary,
    fontWeight: "700",
  },
  addBtn: {
    borderRadius: R.md,
    borderColor: C.border,
    marginTop: S.sm,
  },
  inlineForm: {
    backgroundColor: C.surfaceSubtle,
    borderRadius: R.md,
    padding: S.md,
    marginTop: S.sm,
  },
  telegramBtn: {
    borderRadius: R.md,
    marginTop: S.md,
  },
  // Partner prompt
  partnerPrompt: {
    marginTop: S.xl,
    paddingTop: S.lg,
    borderTopWidth: 1,
    borderTopColor: C.border,
    gap: S.xs,
  },
  partnerPromptTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: C.textPrimary,
    textAlign: TEXT_RIGHT,
  },
  partnerPromptSubtitle: {
    fontSize: 12,
    color: C.textSecondary,
    textAlign: TEXT_RIGHT,
    marginBottom: S.sm,
  },
  partnerDoneBadge: {
    backgroundColor: C.teal + "14",
    borderRadius: R.md,
    paddingVertical: S.sm,
    paddingHorizontal: S.md,
    marginTop: S.md,
    alignSelf: "center",
  },
  partnerDoneText: {
    color: C.teal,
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
  // Invite step
  inviteContainer: {
    marginTop: S.md,
    gap: S.md,
  },
  inviteCodeBox: {
    backgroundColor: C.surfaceSubtle,
    borderRadius: R.md,
    padding: S.lg,
    alignItems: "center",
  },
  inviteCodeText: {
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: 6,
    color: C.purple,
  },
  inviteActions: {
    flexDirection: RTL_ROW,
    gap: S.sm,
  },
  inviteActionBtn: {
    flex: 1,
    borderRadius: R.md,
  },
  inviteExpiry: {
    fontSize: 12,
    color: C.textSecondary,
    textAlign: "center",
  },
});
