import React from "react";
import { View, StyleSheet, ScrollView, Pressable } from "react-native";
import {
  Card,
  Text,
  Checkbox,
  Button,
  ActivityIndicator,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import type { Kid } from "@src/models/kid";
import { useFamilyStore } from "@src/store/useFamilyStore";
import { useKidBlocksForDay } from "@src/store/scheduleSelectors";
import { syncAll } from "@src/lib/sync/syncEngine";
import { toggleChoreDoneRemote } from "@src/lib/sync/remoteCrud";
import { useState } from "react";
import { t, LOCALE, blockTypeLabel } from "@src/i18n";
import { minutesToHHMM } from "@src/utils/time";
import type { BlockType } from "@src/models/schedule";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TYPE_COLORS: Record<BlockType, string> = {
  school: "#6C63FF",
  hobby: "#FF6B6B",
  other: "#4ECDC4",
};

const todayDow = new Date().getDay();

// ---------------------------------------------------------------------------
// KidTodayCard — shows a single kid's today schedule
// ---------------------------------------------------------------------------

function KidTodayCard({ kid }: { kid: Kid }) {
  const router = useRouter();
  const blocks = useKidBlocksForDay(kid.id, todayDow);

  return (
    <Card style={[styles.kidCard, { borderColor: kid.color + "44" }]} mode="elevated">
      <Pressable onPress={() => router.push(`/kid/${kid.id}`)}>
        <View style={[styles.kidHeader, { backgroundColor: kid.color + "18" }]}>
          <Text style={styles.kidEmoji}>{kid.emoji}</Text>
          <Text
            variant="titleMedium"
            style={[styles.kidName, { color: kid.color }]}
          >
            {kid.name}
          </Text>
          <Text style={[styles.kidArrow, { color: kid.color }]}>‹</Text>
        </View>
      </Pressable>

      <View style={styles.kidBody}>
        {blocks.length === 0 ? (
          <Text variant="bodySmall" style={styles.noSchedule}>
            {t("today.noSchedule")}
          </Text>
        ) : (
          blocks.map((block) => {
            const color = block.color ?? kid.color;
            const typeColor = TYPE_COLORS[block.type];
            return (
              <View key={block.id} style={styles.blockRow}>
                <View style={[styles.blockStripe, { backgroundColor: color }]} />
                <View style={styles.blockInfo}>
                  <Text variant="bodyMedium" style={styles.blockTitle}>
                    {block.title}
                  </Text>
                  <Text variant="bodySmall" style={styles.blockTime}>
                    {minutesToHHMM(block.startMinutes)} – {minutesToHHMM(block.endMinutes)}
                    {block.location ? `  ·  ${block.location}` : ""}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.blockType,
                    { color: typeColor, backgroundColor: typeColor + "22" },
                  ]}
                >
                  {blockTypeLabel(block.type)}
                </Text>
              </View>
            );
          })
        )}
      </View>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function TodayScreen() {
  const grocery = useFamilyStore((s) => s.grocery);
  const chores = useFamilyStore((s) => s.chores);
  const projects = useFamilyStore((s) => s.projects);
  const notes = useFamilyStore((s) => s.notes);
  const kids = useFamilyStore((s) => s.kids);
  const familyMembers = useFamilyStore((s) => s.familyMembers);
  const syncStatus = useFamilyStore((s) => s.syncStatus);
  const lastSyncedAt = useFamilyStore((s) => s.lastSyncedAt);

  const [syncing, setSyncing] = useState(false);
  const router = useRouter();

  const activeKids = kids.filter((k) => k.isActive);

  const unboughtCount = grocery.filter((g) => !g.isBought).length;
  const undoneChores = chores.filter((c) => !c.done).length;
  const inProgressProjects = projects.filter(
    (p) => p.status === "in_progress"
  ).length;
  const pinnedNotes = notes.filter((n) => n.pinned).length;

  const todayChores = chores.filter((c) => c.selectedForToday);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await syncAll();
    } catch {
      // error shown via Snackbar
    } finally {
      setSyncing(false);
    }
  };

  const formatLastSync = () => {
    if (!lastSyncedAt) return t("today.never");
    const d = new Date(lastSyncedAt);
    return d.toLocaleTimeString(LOCALE, { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text variant="headlineLarge" style={styles.title}>
          {t("today.title")}
        </Text>

        {/* Sync card */}
        <Card style={styles.syncCard} mode="elevated">
          <Card.Content style={styles.syncContent}>
            <View style={styles.syncLeft}>
              <Text variant="titleSmall" style={styles.syncTitle}>
                {t("today.sync")}
              </Text>
              <Text variant="bodySmall" style={styles.syncMeta}>
                {syncStatus === "syncing"
                  ? t("today.syncing")
                  : syncStatus === "error"
                  ? t("today.syncError")
                  : t("today.lastSync", { time: formatLastSync() })}
              </Text>
            </View>
            {syncing ? (
              <ActivityIndicator size="small" />
            ) : (
              <Button
                mode="outlined"
                compact
                onPress={handleSync}
                style={styles.syncBtn}
              >
                {t("today.syncNow")}
              </Button>
            )}
          </Card.Content>
        </Card>

        {/* Overview */}
        <Card style={styles.card} mode="elevated">
          <Card.Content>
            <Text variant="titleMedium" style={styles.cardTitle}>
              {t("today.overview")}
            </Text>
            <View style={styles.statsGrid}>
              <View style={[styles.stat, { backgroundColor: "#FFE0E0" }]}>
                <Text style={[styles.statNum, { color: "#FF6B6B" }]}>
                  {unboughtCount}
                </Text>
                <Text style={styles.statLabel}>{t("today.groceryItems")}</Text>
              </View>
              <View style={[styles.stat, { backgroundColor: "#D4F5F2" }]}>
                <Text style={[styles.statNum, { color: "#4ECDC4" }]}>
                  {undoneChores}
                </Text>
                <Text style={styles.statLabel}>{t("today.choresToDo")}</Text>
              </View>
              <View style={[styles.stat, { backgroundColor: "#E8E6FF" }]}>
                <Text style={[styles.statNum, { color: "#6C63FF" }]}>
                  {inProgressProjects}
                </Text>
                <Text style={styles.statLabel}>{t("today.activeProjects")}</Text>
              </View>
              <View style={[styles.stat, { backgroundColor: "#FFF3E0" }]}>
                <Text style={[styles.statNum, { color: "#FFA726" }]}>
                  {pinnedNotes}
                </Text>
                <Text style={styles.statLabel}>{t("today.pinnedNotes")}</Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Today's chores */}
        <Text variant="titleMedium" style={styles.sectionTitle}>
          {t("today.todayChores")}
        </Text>
        <Card style={styles.card} mode="elevated">
          <Card.Content>
            {todayChores.length === 0 ? (
              <Text variant="bodyMedium" style={styles.choreEmpty}>
                {t("today.noChoresForToday")}
              </Text>
            ) : (
              todayChores.map((chore) => {
                const member = chore.assignedToMemberId
                  ? familyMembers.find((m) => m.id === chore.assignedToMemberId)
                  : undefined;
                const assigneeDisplay = member
                  ? `${member.avatarEmoji ?? ""} ${member.name}`
                  : chore.assignedTo;
                return (
                  <View key={chore.id} style={styles.choreRow}>
                    <Checkbox
                      status={chore.done ? "checked" : "unchecked"}
                      onPress={() => toggleChoreDoneRemote(chore.id)}
                    />
                    <View style={styles.choreTextWrap}>
                      <Text
                        variant="bodyLarge"
                        style={chore.done ? styles.choreDoneText : styles.choreText}
                      >
                        {chore.title}
                      </Text>
                      {assigneeDisplay ? (
                        <Text variant="bodySmall" style={styles.choreAssignee}>
                          {assigneeDisplay}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                );
              })
            )}
          </Card.Content>
        </Card>

        {/* Kids — per-kid today schedule */}
        <Text variant="titleMedium" style={styles.sectionTitle}>
          {t("today.kids")}
        </Text>
        {activeKids.map((kid) => (
          <KidTodayCard key={kid.id} kid={kid} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FAFAFE" },
  container: { padding: 20, paddingBottom: 40 },
  title: { fontWeight: "800", color: "#1A1A2E", marginBottom: 20, textAlign: "right" },

  // Sync card
  syncCard: { borderRadius: 16, backgroundColor: "#FFFFFF", marginBottom: 16 },
  syncContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  syncLeft: { flex: 1 },
  syncTitle: { fontWeight: "700", color: "#1A1A2E", textAlign: "right" },
  syncMeta: { color: "#6B6B8D", marginTop: 2, textAlign: "right" },
  syncBtn: { borderRadius: 12 },

  card: { borderRadius: 16, backgroundColor: "#FFFFFF", marginBottom: 24 },
  cardTitle: { fontWeight: "700", color: "#1A1A2E", marginBottom: 12, textAlign: "right" },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  stat: {
    flex: 1,
    minWidth: "45%",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
  },
  statNum: { fontSize: 28, fontWeight: "800", textAlign: "center" },
  statLabel: { fontSize: 12, color: "#6B6B8D", marginTop: 2, textAlign: "center" },
  sectionTitle: { fontWeight: "700", color: "#1A1A2E", marginBottom: 12, textAlign: "right" },

  // Today's chores
  choreRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
  },
  choreTextWrap: { flex: 1, marginStart: 4 },
  choreText: { textAlign: "right" },
  choreDoneText: { textDecorationLine: "line-through", color: "#8E8BA8", textAlign: "right" },
  choreAssignee: { color: "#6B6B8D", textAlign: "right" },
  choreEmpty: { color: "#8E8BA8", textAlign: "right" },

  // Kid today cards
  kidCard: {
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    marginBottom: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  kidHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  kidEmoji: { fontSize: 22, marginEnd: 10 },
  kidName: { flex: 1, fontWeight: "700", textAlign: "right" },
  kidArrow: { fontSize: 20, fontWeight: "700" },
  kidBody: { paddingHorizontal: 16, paddingBottom: 14 },
  noSchedule: { color: "#8E8BA8", textAlign: "right", paddingVertical: 4 },

  // Block rows inside kid cards
  blockRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
  },
  blockStripe: {
    width: 4,
    borderRadius: 2,
    alignSelf: "stretch",
    marginEnd: 10,
  },
  blockInfo: { flex: 1 },
  blockTitle: { fontWeight: "600", color: "#1A1A2E", textAlign: "right" },
  blockTime: { color: "#6B6B8D", marginTop: 2, textAlign: "right" },
  blockType: {
    fontSize: 10,
    fontWeight: "600",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    overflow: "hidden",
  },
});
