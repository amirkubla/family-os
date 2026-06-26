import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView, Pressable, Linking, Alert, Share, Platform, ActivityIndicator } from "react-native";
import { Card, Text, IconButton, Divider, TextInput } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Clipboard from "expo-clipboard";
import { useRouter } from "expo-router";
import { useFamilyStore } from "@src/store/useFamilyStore";
import { useAuthStore } from "@src/auth/useAuthStore";
import {
  setFamilyMemberActiveRemote,
  setKidActiveRemote,
  updateFamilyNameRemote,
} from "@src/lib/sync/remoteCrud";
import { telegramApi, invitesApi } from "@src/lib/api/endpoints";
import { getFamilyId } from "@src/lib/familyContext";
import FamilyMemberModal from "@src/components/FamilyMemberModal";
import KidModal from "@src/components/KidModal";
import type { FamilyMember } from "@src/models/familyMember";
import type { Kid } from "@src/models/kid";
import { t, memberRoleLabel } from "@src/i18n";
import SectionHeader from "@src/components/SectionHeader";
import PageHeader from "@src/components/PageHeader";
import { RTL_ROW, TEXT_RIGHT } from "@src/ui/rtl";
import { C, R, S } from "@src/ui/tokens";

// ── Polished action button ──
// solid = filled accent with a soft colored shadow; soft = tinted + bordered
// (used for secondary/destructive actions). Replaces the flat Paper buttons.
function ActionButton({
  label,
  icon,
  onPress,
  color,
  variant = "solid",
  loading,
  disabled,
  style,
  testID,
}: {
  label: string;
  icon: string;
  onPress: () => void;
  color: string;
  variant?: "solid" | "soft";
  loading?: boolean;
  disabled?: boolean;
  style?: any;
  testID?: string;
}) {
  const solid = variant === "solid";
  const fg = solid ? "#FFFFFF" : color;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={label}
      testID={testID}
      style={({ pressed }: any) => [
        actionStyles.btn,
        solid
          ? { backgroundColor: color, shadowColor: color, ...actionStyles.solidShadow }
          : { backgroundColor: color + "14", borderWidth: 1.5, borderColor: color + "33" },
        pressed && { opacity: 0.85, transform: [{ scale: 0.99 }] },
        (disabled || loading) && { opacity: 0.55 },
        Platform.OS === "web" && ({ cursor: "pointer" } as any),
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={fg} />
      ) : (
        <MaterialCommunityIcons name={icon as any} size={20} color={fg} />
      )}
      <Text style={[actionStyles.label, { color: fg }]}>{label}</Text>
    </Pressable>
  );
}

// ── Member row ──

function MemberRow({
  member,
  archived,
  onEdit,
  onArchive,
  onRestore,
}: {
  member: FamilyMember;
  archived?: boolean;
  onEdit: () => void;
  onArchive?: () => void;
  onRestore?: () => void;
}) {
  return (
    <View
      testID={`member-row-${member.name}`}
      style={[styles.memberRow, archived && styles.archivedRow]}
    >
      <View
        style={[
          styles.emojiCircle,
          { backgroundColor: (member.color ?? C.purple) + "22" },
        ]}
      >
        <Text style={styles.emoji}>{member.avatarEmoji ?? "👤"}</Text>
      </View>
      <View style={styles.memberInfo}>
        <Text
          variant="bodyLarge"
          style={[styles.memberName, archived && styles.archivedText]}
        >
          {member.name}
        </Text>
        <Text variant="bodySmall" style={styles.memberRole}>
          {memberRoleLabel(member.role)}
        </Text>
      </View>
      <View style={styles.rowActions}>
        <IconButton icon="pencil-outline" size={18} onPress={onEdit} />
        {archived ? (
          <IconButton icon="restore" size={18} onPress={onRestore} />
        ) : (
          <IconButton icon="archive-arrow-down-outline" size={18} onPress={onArchive} />
        )}
      </View>
    </View>
  );
}

// ── Kid row ──

function KidRow({
  kid,
  archived,
  onEdit,
  onArchive,
  onRestore,
}: {
  kid: Kid;
  archived?: boolean;
  onEdit: () => void;
  onArchive?: () => void;
  onRestore?: () => void;
}) {
  return (
    <View style={[styles.memberRow, archived && styles.archivedRow]}>
      <View
        style={[
          styles.emojiCircle,
          { backgroundColor: (kid.color ?? C.purple) + "22" },
        ]}
      >
        <Text style={styles.emoji}>{kid.emoji || "👶"}</Text>
      </View>
      <View style={styles.memberInfo}>
        <Text
          variant="bodyLarge"
          style={[styles.memberName, archived && styles.archivedText]}
        >
          {kid.name}
        </Text>
      </View>
      <View style={styles.rowActions}>
        <IconButton icon="pencil-outline" size={18} onPress={onEdit} />
        {archived ? (
          <IconButton icon="restore" size={18} onPress={onRestore} />
        ) : (
          <IconButton icon="archive-arrow-down-outline" size={18} onPress={onArchive} />
        )}
      </View>
    </View>
  );
}

// ── Settings Screen ──

export default function SettingsScreen() {
  const router = useRouter();
  const familyMembers = useFamilyStore((s) => s.familyMembers);
  const kids = useFamilyStore((s) => s.kids);
  const familyName = useFamilyStore((s) => s.familyName);
  const session = useAuthStore((s) => s.session);
  const logout = useAuthStore((s) => s.logout);
  const [editingName, setEditingName] = useState(familyName);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<FamilyMember | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  useEffect(() => {
    setEditingName(familyName);
  }, [familyName]);

  const handleSaveName = () => {
    const trimmed = editingName.trim();
    if (trimmed && trimmed !== familyName) {
      updateFamilyNameRemote(trimmed);
    }
  };

  // Kids state
  const [kidModalOpen, setKidModalOpen] = useState(false);
  const [editingKid, setEditingKid] = useState<Kid | null>(null);
  const [showArchivedKids, setShowArchivedKids] = useState(false);

  // Invite state
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [generatingInvite, setGeneratingInvite] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);

  const generateInvite = async () => {
    setGeneratingInvite(true);
    try {
      const familyId = await getFamilyId();
      const result = await invitesApi.create(familyId);
      setInviteCode(result.code);
    } catch {
      Alert.alert(t("auth.genericError"));
    } finally {
      setGeneratingInvite(false);
    }
  };

  const copyInviteCode = async () => {
    if (!inviteCode) return;
    await Clipboard.setStringAsync(inviteCode);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
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

  const [connectingTelegram, setConnectingTelegram] = useState(false);

  const connectTelegram = async () => {
    setConnectingTelegram(true);
    // On web, popup blockers gate window.open() to the call stack of the
    // original user click. We can't await our fetch and THEN call open —
    // the gesture has expired by then and the browser silently blocks the
    // popup with no console error. The fix: pre-open a placeholder tab
    // synchronously here, redirect it once we have the code.
    // Native (iOS/Android) doesn't have this restriction — Linking.openURL
    // works after async work just fine.
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
      // Don't leave an empty about:blank tab if anything went wrong.
      if (preOpenedWin) preOpenedWin.close();
      Alert.alert(t("settings.telegramError"));
    } finally {
      setConnectingTelegram(false);
    }
  };

  const activeMembers = familyMembers.filter((m) => m.isActive);
  const archivedMembers = familyMembers.filter((m) => !m.isActive);

  const activeKids = kids.filter((k) => k.isActive);
  const archivedKids = kids.filter((k) => !k.isActive);

  const openAdd = () => {
    setEditingMember(null);
    setModalOpen(true);
  };

  const openEdit = (member: FamilyMember) => {
    setEditingMember(member);
    setModalOpen(true);
  };

  const openAddKid = () => {
    setEditingKid(null);
    setKidModalOpen(true);
  };

  const openEditKid = (kid: Kid) => {
    setEditingKid(kid);
    setKidModalOpen(true);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <PageHeader title={t("settings.title")} />
      <ScrollView contentContainerStyle={styles.container}>

        {/* ── Family Name card ── */}
        <SectionHeader label={t("settings.familyName")} />
        <Card style={styles.card} mode="elevated">
          <Card.Content>
            <Text style={styles.subtitle}>
              {t("settings.familyNameSubtitle")}
            </Text>
            <TextInput
              mode="outlined"
              value={editingName}
              onChangeText={setEditingName}
              onBlur={handleSaveName}
              onSubmitEditing={handleSaveName}
              placeholder={t("settings.familyNamePlaceholder")}
              style={styles.nameInput}
              contentStyle={styles.nameInputContent}
              right={<TextInput.Icon icon="check" onPress={handleSaveName} />}
            />
          </Card.Content>
        </Card>

        {/* ── Family Members card ── */}
        <SectionHeader label={t("settings.familyMembers")} />
        <Card style={styles.card} mode="elevated">
          <Card.Content>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.subtitle}>
                {t("settings.familyMembersSubtitle")}
              </Text>
              <IconButton icon="plus" size={20} onPress={openAdd} testID="btn-add-member" />
            </View>

            {/* Hidden node for QA hierarchy assertions on roster count */}
            <View testID="roster-count" accessibilityLabel={String(activeMembers.length)} style={{ height: 0, overflow: "hidden" }} />

            {activeMembers.length === 0 && (
              <Text variant="bodyMedium" style={styles.emptyText}>
                {t("settings.noMembers")}
              </Text>
            )}

            {activeMembers.map((member) => (
              <MemberRow
                key={member.id}
                member={member}
                onEdit={() => openEdit(member)}
                onArchive={() => setFamilyMemberActiveRemote(member.id, false)}
              />
            ))}

            {/* ── Archived section ── */}
            {archivedMembers.length > 0 && (
              <>
                <Divider style={styles.divider} />
                <Pressable
                  onPress={() => setShowArchived(!showArchived)}
                  style={styles.archivedHeaderRow}
                >
                  <Text variant="labelLarge" style={styles.archivedHeader}>
                    {t("settings.archived")} ({archivedMembers.length})
                    {showArchived ? " ▲" : " ▼"}
                  </Text>
                </Pressable>
                {showArchived &&
                  archivedMembers.map((member) => (
                    <MemberRow
                      key={member.id}
                      member={member}
                      archived
                      onEdit={() => openEdit(member)}
                      onRestore={() =>
                        setFamilyMemberActiveRemote(member.id, true)
                      }
                    />
                  ))}
              </>
            )}
          </Card.Content>
        </Card>

        {/* ── Kids card ── */}
        <SectionHeader label={t("settings.kids")} />
        <Card style={styles.card} mode="elevated">
          <Card.Content>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.subtitle}>
                {t("settings.kidsSubtitle")}
              </Text>
              <IconButton icon="plus" size={20} onPress={openAddKid} />
            </View>

            {activeKids.length === 0 && (
              <Text variant="bodyMedium" style={styles.emptyText}>
                {t("settings.noKids")}
              </Text>
            )}

            {activeKids.map((kid) => (
              <KidRow
                key={kid.id}
                kid={kid}
                onEdit={() => openEditKid(kid)}
                onArchive={() => setKidActiveRemote(kid.id, false)}
              />
            ))}

            {/* ── Archived kids section ── */}
            {archivedKids.length > 0 && (
              <>
                <Divider style={styles.divider} />
                <Pressable
                  onPress={() => setShowArchivedKids(!showArchivedKids)}
                  style={styles.archivedHeaderRow}
                >
                  <Text variant="labelLarge" style={styles.archivedHeader}>
                    {t("settings.archived")} ({archivedKids.length})
                    {showArchivedKids ? " ▲" : " ▼"}
                  </Text>
                </Pressable>
                {showArchivedKids &&
                  archivedKids.map((kid) => (
                    <KidRow
                      key={kid.id}
                      kid={kid}
                      archived
                      onEdit={() => openEditKid(kid)}
                      onRestore={() => setKidActiveRemote(kid.id, true)}
                    />
                  ))}
              </>
            )}
          </Card.Content>
        </Card>

        {/* ── Invite Partner card ── */}
        <SectionHeader label={t("settings.invite")} />
        <Card style={styles.card} mode="elevated">
          <Card.Content>
            <Text style={styles.subtitle}>
              {t("settings.inviteSubtitle")}
            </Text>

            {inviteCode ? (
              <View style={styles.inviteCodeContainer}>
                <View style={styles.inviteCodeBox}>
                  <Text style={styles.inviteCodeText}>{inviteCode}</Text>
                </View>
                <View style={styles.inviteActions}>
                  <ActionButton
                    variant="soft"
                    color={C.teal}
                    onPress={copyInviteCode}
                    icon={codeCopied ? "check" : "content-copy"}
                    label={codeCopied ? t("settings.codeCopied") : t("settings.copyCode")}
                    style={{ flex: 1, marginTop: 0 }}
                  />
                  <ActionButton
                    color={C.teal}
                    onPress={shareInvite}
                    icon="share-variant"
                    label={t("settings.shareInvite")}
                    style={{ flex: 1, marginTop: 0 }}
                  />
                </View>
                <Text style={styles.inviteExpiry}>
                  {t("settings.inviteExpires", { days: "7" })}
                </Text>
              </View>
            ) : (
              <ActionButton
                color={C.teal}
                onPress={generateInvite}
                loading={generatingInvite}
                disabled={generatingInvite}
                icon="account-plus"
                label={t("settings.generateInvite")}
              />
            )}
          </Card.Content>
        </Card>

        {/* ── Telegram Assistant card ── */}
        <SectionHeader label={t("settings.telegram")} />
        <Card style={styles.card} mode="elevated">
          <Card.Content>
            <Text style={styles.telegramTitle}>
              {t("settings.telegramTitle")} 🤖
            </Text>
            <Text style={styles.subtitle}>
              {t("settings.telegramSubtitle")}
            </Text>
            <ActionButton
              color={C.selectText}
              onPress={connectTelegram}
              loading={connectingTelegram}
              disabled={connectingTelegram}
              icon="send"
              label={t("settings.connectTelegram")}
              style={{ marginTop: S.md }}
            />
          </Card.Content>
        </Card>

        {/* ── Customization card — links to /customization ── */}
        <SectionHeader label={t("settings.customization")} />
        <Card style={styles.card} mode="elevated">
          <Card.Content>
            <Text style={styles.subtitle}>
              {t("settings.customizationSubtitle")}
            </Text>
            <ActionButton
              color={C.purple}
              onPress={() => router.push("/customization" as any)}
              icon="tune"
              label={t("settings.openCustomization")}
            />
          </Card.Content>
        </Card>

        {/* ── Account card ── */}
        <SectionHeader label={t("auth.account")} />
        <Card style={styles.card} mode="elevated">
          <Card.Content>

            {session && (
              <View style={styles.accountInfo}>
                <Text variant="bodyMedium" style={styles.accountText}>
                  {t("auth.loggedInAs")}{" "}
                  {session.user.username ??
                    familyMembers.find((m) => m.userId === session.user.id)?.name ??
                    ""}
                </Text>
              </View>
            )}

            <ActionButton
              variant="soft"
              color={C.red}
              onPress={logout}
              icon="logout"
              label={t("auth.logout")}
              testID="logout-button"
            />
          </Card.Content>
        </Card>
      </ScrollView>

      <FamilyMemberModal
        visible={modalOpen}
        onDismiss={() => {
          setModalOpen(false);
          setEditingMember(null);
        }}
        editMember={editingMember}
      />

      <KidModal
        visible={kidModalOpen}
        onDismiss={() => {
          setKidModalOpen(false);
          setEditingKid(null);
        }}
        editKid={editingKid}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  container: { padding: S.lg, paddingBottom: S.xxl + S.lg },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: C.textPrimary,
    marginBottom: S.lg,
    textAlign: TEXT_RIGHT,
  },
  card: { borderRadius: R.lg, backgroundColor: C.surface, marginBottom: S.lg },
  cardHeaderRow: {
    flexDirection: RTL_ROW,
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: S.xs,
  },
  subtitle: { fontSize: 12, color: C.textSecondary, textAlign: TEXT_RIGHT, marginBottom: S.sm },
  emptyText: {
    color: C.textMuted,
    textAlign: TEXT_RIGHT,
    fontSize: 14,
    paddingVertical: S.xs,
  },
  memberRow: {
    flexDirection: RTL_ROW,
    alignItems: "center",
    paddingVertical: S.sm,
    paddingHorizontal: S.xs,
    borderRadius: R.sm,
  },
  archivedRow: { opacity: 0.5 },
  rowActions: { flexDirection: "row" },
  memberInfo: { flex: 1, marginHorizontal: S.sm },
  memberName: { fontSize: 15, fontWeight: "600", textAlign: TEXT_RIGHT, color: C.textPrimary },
  memberRole: { fontSize: 12, color: C.textSecondary, textAlign: TEXT_RIGHT },
  archivedText: { textDecorationLine: "line-through" },
  emojiCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  emoji: { fontSize: 22 },
  divider: { marginVertical: S.md },
  archivedHeaderRow: { paddingVertical: S.xs },
  archivedHeader: { fontSize: 13, color: C.textMuted, textAlign: TEXT_RIGHT },
  nameInput: { textAlign: TEXT_RIGHT, writingDirection: "rtl", backgroundColor: C.surface },
  nameInputContent: { textAlign: TEXT_RIGHT },
  accountInfo: { marginBottom: S.md },
  accountText: { fontSize: 14, textAlign: TEXT_RIGHT, writingDirection: "rtl", color: C.textPrimary, marginBottom: S.xs },
  inviteCodeContainer: {
    gap: S.md,
    alignItems: "center" as const,
    paddingVertical: S.sm,
  },
  inviteCodeBox: {
    backgroundColor: C.teal + "10",
    borderWidth: 2,
    borderColor: C.teal + "30",
    borderRadius: R.lg,
    paddingVertical: S.lg,
    paddingHorizontal: S.xxl,
    borderStyle: "dashed" as const,
  },
  inviteCodeText: {
    fontSize: 28,
    fontWeight: "800" as const,
    color: C.teal,
    letterSpacing: 4,
    textAlign: "center" as const,
  },
  inviteActions: {
    flexDirection: "row" as const,
    gap: S.sm,
  },
  inviteExpiry: {
    fontSize: 12,
    color: C.textMuted,
    textAlign: "center" as const,
  },
  telegramTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: C.textPrimary,
    textAlign: TEXT_RIGHT,
    marginBottom: S.sm,
  },
});

const actionStyles = StyleSheet.create({
  btn: {
    flexDirection: RTL_ROW,
    alignItems: "center",
    justifyContent: "center",
    gap: S.sm,
    paddingVertical: 14,
    paddingHorizontal: S.lg,
    borderRadius: 16,
    marginTop: S.sm,
  },
  solidShadow: {
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 3,
  },
  label: { fontSize: 15, fontWeight: "700", writingDirection: "rtl" },
});
