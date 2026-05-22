import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Platform,
  ScrollView,
  KeyboardAvoidingView,
  Linking,
  Alert,
} from "react-native";
import { Text, TextInput, Button, SegmentedButtons } from "react-native-paper";
import { useFamilyStore } from "@src/store/useFamilyStore";
import {
  addFamilyMemberRemote,
  addKidRemote,
  updateFamilyNameRemote,
  setFamilyMemberActiveRemote,
  setKidActiveRemote,
} from "@src/lib/sync/remoteCrud";
import { telegramApi } from "@src/lib/api/endpoints";
import { getFamilyId } from "@src/lib/familyContext";
import { MEMBER_ROLES } from "@src/models/familyMember";
import type { MemberRole } from "@src/models/familyMember";
import { t, memberRoleLabel } from "@src/i18n";
import { C, R, S, SHADOW } from "@src/ui/tokens";
import { MS, SEGMENT_THEME, SEGMENT_COLORS } from "@src/ui/modalStyles";
import { RTL_ROW, TEXT_RIGHT } from "@src/ui/rtl";

const COLOR_SWATCHES = [
  "#FF6B6B", "#4ECDC4", "#6C63FF", "#FFA726", "#AB47BC", "#42A5F5",
  "#EC407A", "#66BB6A", "#78909C", "#FFCA28", "#7E57C2", "#26C6DA",
  "#5C6BC0", "#00897B",
];

const MEMBER_EMOJIS = [
  "🤱", "👩", "👨", "🧑", "👩‍🦰", "👨‍🦱",
  "🧔", "👱", "🦸", "🧕", "🤰", "🧑‍🍳",
  "🏋️", "🎸", "🧘", "💻", "🎯", "☕",
];

const KID_EMOJIS = [
  "🧸", "🦄", "🌸", "🐰", "🐣", "🌈", "🦋", "🐱",
  "🐶", "🐻", "🍭", "⭐", "🎀", "🐠", "🦊", "🐝",
  "🌻", "🍓", "👸", "🧚", "💃", "🤴", "🦸‍♂️", "🏎️",
];

const TOTAL_STEPS = 4;

export default function OnboardingWizard() {
  const [step, setStep] = useState(1);
  const setOnboardingComplete = useFamilyStore((s) => s.setOnboardingComplete);

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
          <ProgressDots current={step} total={TOTAL_STEPS} />
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {step === 1 && <Step1FamilyName onNext={() => setStep(2)} />}
            {step === 2 && (
              <Step2Members onNext={() => setStep(3)} onBack={() => setStep(1)} />
            )}
            {step === 3 && (
              <Step3Kids onNext={() => setStep(4)} onBack={() => setStep(2)} />
            )}
            {step === 4 && (
              <Step4Telegram
                onBack={() => setStep(3)}
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

// ── Step 1: Family Name ──

function Step1FamilyName({ onNext }: { onNext: () => void }) {
  const familyName = useFamilyStore((s) => s.familyName);
  const [name, setName] = useState(familyName || "");
  const [error, setError] = useState("");

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
          buttonColor="#6C63FF"
        >
          {t("onboarding.next")}
        </Button>
      </View>
    </View>
  );
}

// ── Step 2: Family Members ──

function Step2Members({
  onNext,
  onBack,
}: {
  onNext: () => void;
  onBack: () => void;
}) {
  const members = useFamilyStore((s) => s.familyMembers).filter((m) => m.isActive);
  const [showForm, setShowForm] = useState(members.length === 0);
  const [error, setError] = useState("");

  // Inline form state
  const [name, setName] = useState("");
  const [role, setRole] = useState<MemberRole>("parent");
  const [avatarEmoji, setAvatarEmoji] = useState("👤");
  const [color, setColor] = useState(COLOR_SWATCHES[0]);
  const [nameError, setNameError] = useState("");

  const resetForm = () => {
    setName("");
    setRole("parent");
    setAvatarEmoji("👤");
    setColor(COLOR_SWATCHES[0]);
    setNameError("");
  };

  const handleAdd = () => {
    const trimmed = name.trim();
    if (!trimmed) { setNameError(t("settings.nameRequired")); return; }
    if (trimmed.length < 2) { setNameError(t("settings.nameMinLength")); return; }
    addFamilyMemberRemote({ name: trimmed, role, avatarEmoji, color });
    resetForm();
    setShowForm(false);
    setError("");
  };

  const handleNext = () => {
    if (members.length === 0) {
      setError(t("onboarding.atLeastOneMember"));
      return;
    }
    onNext();
  };

  const roleButtons = MEMBER_ROLES.map((r) => ({
    value: r,
    label: memberRoleLabel(r),
    ...SEGMENT_COLORS,
  }));

  return (
    <View>
      <Text style={styles.stepTitle}>{t("onboarding.step2Title")}</Text>
      <Text style={styles.stepSubtitle}>{t("onboarding.step2Subtitle")}</Text>

      {/* Already added members */}
      {members.map((m) => (
        <View key={m.id} style={styles.addedRow}>
          <View style={[styles.addedEmoji, { backgroundColor: (m.color ?? C.purple) + "22" }]}>
            <Text style={{ fontSize: 20 }}>{m.avatarEmoji ?? "👤"}</Text>
          </View>
          <Text style={styles.addedName}>{m.name}</Text>
          <Text style={styles.addedRole}>{memberRoleLabel(m.role)}</Text>
          <Pressable
            onPress={() => setFamilyMemberActiveRemote(m.id, false)}
            style={styles.removeBtn}
          >
            <Text style={styles.removeBtnText}>✕</Text>
          </Pressable>
        </View>
      ))}

      {showForm ? (
        <View style={styles.inlineForm}>
          <TextInput
            placeholder={t("settings.memberName")}
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
          <SegmentedButtons
            value={role}
            onValueChange={(v) => setRole(v as MemberRole)}
            buttons={roleButtons}
            style={MS.segmented}
            theme={SEGMENT_THEME}
          />

          <Text style={MS.label}>{t("settings.memberEmoji")}</Text>
          <View style={styles.pickerRow}>
            {MEMBER_EMOJIS.map((e) => (
              <Pressable
                key={e}
                onPress={() => setAvatarEmoji(e)}
                style={[styles.emojiCell, avatarEmoji === e && styles.emojiSelected]}
              >
                <Text style={styles.emojiText}>{e}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={MS.label}>{t("settings.memberColor")}</Text>
          <View style={styles.pickerRow}>
            {COLOR_SWATCHES.map((c) => (
              <Pressable
                key={c}
                onPress={() => setColor(c)}
                style={[styles.colorCell, { backgroundColor: c }, color === c && styles.colorSelected]}
              />
            ))}
          </View>

          <View style={[styles.navRow, { gap: S.sm }]}>
            <Button onPress={() => { resetForm(); setShowForm(false); }}>
              {t("cancel")}
            </Button>
            <Button mode="contained" onPress={handleAdd} buttonColor="#6C63FF">
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
          {t("onboarding.addMember")}
        </Button>
      )}

      {error ? <Text style={[MS.error, { marginTop: S.sm }]}>{error}</Text> : null}

      <View style={styles.navRow}>
        <Button onPress={onBack}>{t("onboarding.back")}</Button>
        <Button mode="contained" onPress={handleNext} buttonColor="#6C63FF">
          {t("onboarding.next")}
        </Button>
      </View>
    </View>
  );
}

// ── Step 3: Kids ──

function Step3Kids({
  onNext,
  onBack,
}: {
  onNext: () => void;
  onBack: () => void;
}) {
  const kids = useFamilyStore((s) => s.kids).filter((k) => k.isActive);
  const [showForm, setShowForm] = useState(kids.length === 0);
  const [error, setError] = useState("");

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
    setError("");
  };

  const handleNext = () => {
    if (kids.length === 0) {
      setError(t("onboarding.atLeastOneKid"));
      return;
    }
    onNext();
  };

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
          <View style={styles.pickerRow}>
            {KID_EMOJIS.map((e) => (
              <Pressable
                key={e}
                onPress={() => setEmoji(e)}
                style={[styles.emojiCell, emoji === e && styles.emojiSelected]}
              >
                <Text style={styles.emojiText}>{e}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={MS.label}>{t("settings.kidColor")}</Text>
          <View style={styles.pickerRow}>
            {COLOR_SWATCHES.map((c) => (
              <Pressable
                key={c}
                onPress={() => setColor(c)}
                style={[styles.colorCell, { backgroundColor: c }, color === c && styles.colorSelected]}
              />
            ))}
          </View>

          <View style={[styles.navRow, { gap: S.sm }]}>
            <Button onPress={() => { resetForm(); setShowForm(false); }}>
              {t("cancel")}
            </Button>
            <Button mode="contained" onPress={handleAdd} buttonColor="#6C63FF">
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

      {error ? <Text style={[MS.error, { marginTop: S.sm }]}>{error}</Text> : null}

      <View style={styles.navRow}>
        <Button onPress={onBack}>{t("onboarding.back")}</Button>
        <Button mode="contained" onPress={handleNext} buttonColor="#6C63FF">
          {t("onboarding.next")}
        </Button>
      </View>
    </View>
  );
}

// ── Step 4: Telegram ──

function Step4Telegram({
  onBack,
  onFinish,
}: {
  onBack: () => void;
  onFinish: () => void;
}) {
  const [connecting, setConnecting] = useState(false);

  const connectTelegram = async () => {
    setConnecting(true);
    try {
      const familyId = await getFamilyId();
      const { code } = await telegramApi.generateCode(familyId);
      const deepLink = `https://t.me/family_os_assistant_bot?start=${code}`;
      await Linking.openURL(deepLink);
    } catch {
      Alert.alert(t("settings.telegramError"));
    } finally {
      setConnecting(false);
    }
  };

  return (
    <View>
      <Text style={styles.stepTitle}>
        {t("onboarding.step4Title")} 🤖
      </Text>
      <Text style={styles.stepSubtitle}>{t("onboarding.step4Subtitle")}</Text>

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
        <Button mode="contained" onPress={onFinish} buttonColor="#6C63FF">
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
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15,15,30,0.55)",
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
    maxHeight: "88%",
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
    backgroundColor: "#6C63FF",
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
  pickerRow: {
    flexDirection: RTL_ROW,
    flexWrap: "wrap",
    gap: S.sm,
    marginBottom: S.xs,
  },
  emojiCell: {
    width: 40,
    height: 40,
    borderRadius: R.xl,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  emojiSelected: {
    borderWidth: 2,
    borderColor: C.purple,
  },
  emojiText: { fontSize: 22 },
  colorCell: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  colorSelected: {
    borderWidth: 3,
    borderColor: C.textPrimary,
  },
  telegramBtn: {
    borderRadius: R.md,
    marginTop: S.md,
  },
});
