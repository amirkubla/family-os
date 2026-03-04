import React, { useState } from "react";
import { View, StyleSheet, ScrollView, Pressable } from "react-native";
import { Card, Text, IconButton, Divider } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFamilyStore } from "@src/store/useFamilyStore";
import {
  setFamilyMemberActiveRemote,
  setKidActiveRemote,
} from "@src/lib/sync/remoteCrud";
import FamilyMemberModal from "@src/components/FamilyMemberModal";
import KidModal from "@src/components/KidModal";
import type { FamilyMember } from "@src/models/familyMember";
import type { Kid } from "@src/models/kid";
import { t, memberRoleLabel } from "@src/i18n";

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
    <View style={[styles.memberRow, archived && styles.archivedRow]}>
      <View style={styles.rowActions}>
        <IconButton icon="pencil-outline" size={18} onPress={onEdit} />
        {archived ? (
          <IconButton icon="restore" size={18} onPress={onRestore} />
        ) : (
          <IconButton icon="archive-arrow-down-outline" size={18} onPress={onArchive} />
        )}
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
      <View
        style={[
          styles.emojiCircle,
          { backgroundColor: (member.color ?? "#6C63FF") + "22" },
        ]}
      >
        <Text style={styles.emoji}>{member.avatarEmoji ?? "👤"}</Text>
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
      <View style={styles.rowActions}>
        <IconButton icon="pencil-outline" size={18} onPress={onEdit} />
        {archived ? (
          <IconButton icon="restore" size={18} onPress={onRestore} />
        ) : (
          <IconButton icon="archive-arrow-down-outline" size={18} onPress={onArchive} />
        )}
      </View>
      <View style={styles.memberInfo}>
        <Text
          variant="bodyLarge"
          style={[styles.memberName, archived && styles.archivedText]}
        >
          {kid.name}
        </Text>
      </View>
      <View
        style={[
          styles.emojiCircle,
          { backgroundColor: (kid.color ?? "#6C63FF") + "22" },
        ]}
      >
        <Text style={styles.emoji}>{kid.emoji || "👶"}</Text>
      </View>
    </View>
  );
}

// ── Settings Screen ──

export default function SettingsScreen() {
  const familyMembers = useFamilyStore((s) => s.familyMembers);
  const kids = useFamilyStore((s) => s.kids);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<FamilyMember | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  // Kids state
  const [kidModalOpen, setKidModalOpen] = useState(false);
  const [editingKid, setEditingKid] = useState<Kid | null>(null);
  const [showArchivedKids, setShowArchivedKids] = useState(false);

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
      <ScrollView contentContainerStyle={styles.container}>
        <Text variant="headlineLarge" style={styles.title}>
          {t("settings.title")}
        </Text>

        {/* ── Family Members card ── */}
        <Card style={styles.card} mode="elevated">
          <Card.Content>
            <View style={styles.sectionHeader}>
              <IconButton icon="plus" size={20} onPress={openAdd} />
              <View style={styles.sectionTitleWrap}>
                <Text variant="titleMedium" style={styles.cardTitle}>
                  {t("settings.familyMembers")}
                </Text>
                <Text variant="bodySmall" style={styles.subtitle}>
                  {t("settings.familyMembersSubtitle")}
                </Text>
              </View>
            </View>

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
        <Card style={styles.card} mode="elevated">
          <Card.Content>
            <View style={styles.sectionHeader}>
              <IconButton icon="plus" size={20} onPress={openAddKid} />
              <View style={styles.sectionTitleWrap}>
                <Text variant="titleMedium" style={styles.cardTitle}>
                  {t("settings.kids")}
                </Text>
                <Text variant="bodySmall" style={styles.subtitle}>
                  {t("settings.kidsSubtitle")}
                </Text>
              </View>
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
  safe: { flex: 1, backgroundColor: "#FAFAFE" },
  container: { padding: 20, paddingBottom: 40 },
  title: {
    fontWeight: "800",
    color: "#1A1A2E",
    marginBottom: 16,
    textAlign: "right",
  },
  card: { borderRadius: 16, backgroundColor: "#FFFFFF", marginBottom: 24 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  sectionTitleWrap: { flex: 1, alignItems: "flex-end" },
  cardTitle: { fontWeight: "700", color: "#1A1A2E", textAlign: "right" },
  subtitle: { color: "#8E8BA8", textAlign: "right", marginTop: 2 },
  emptyText: { color: "#6B6B8D", textAlign: "right", marginVertical: 8 },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },
  archivedRow: { opacity: 0.5 },
  rowActions: { flexDirection: "row" },
  memberInfo: { flex: 1, marginHorizontal: 8, alignItems: "flex-end" },
  memberName: { fontWeight: "600", textAlign: "right", color: "#1A1A2E" },
  memberRole: { color: "#8E8BA8", textAlign: "right" },
  archivedText: { textDecorationLine: "line-through" },
  emojiCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  emoji: { fontSize: 24 },
  divider: { marginVertical: 12 },
  archivedHeaderRow: { paddingVertical: 4 },
  archivedHeader: { color: "#8E8BA8", textAlign: "right" },
});
