/**
 * Chores — dedicated full screen (reached from the home launcher grid).
 *
 * Splits into "selected for today" + backlog. Add via the FAB or the
 * ?modal=add deep link.
 */

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { View, StyleSheet, Pressable, Platform, ScrollView } from "react-native";
import { Text, IconButton, FAB } from "react-native-paper";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";

import { useFamilyStore } from "@src/store/useFamilyStore";
import type { Chore } from "@src/models/chore";
import {
  addChoreRemote,
  toggleChoreDoneRemote,
  toggleChoreSelectedForTodayRemote,
  deleteChoreRemote,
  reorderChoresRemote,
} from "@src/lib/sync/remoteCrud";
import ChoreAddModal from "@src/components/ChoreAddModal";
import VoiceReviewModal from "@src/components/VoiceReviewModal";
import PageHeader from "@src/components/PageHeader";
import ConfirmDeleteModal from "@src/components/ConfirmDeleteModal";
import { useConfirmDelete } from "@src/hooks/useConfirmDelete";
import { useChoreVoice } from "@src/hooks/useChoreVoice";
import { useVoiceCapture } from "@src/hooks/useVoiceCapture";
import VoiceFab from "@src/components/VoiceFab";
import type { VoiceChoreResult } from "@src/lib/api/endpoints";
import { t } from "@src/i18n";
import { C, R, S, SHADOW } from "@src/ui/tokens";
import { useThemeColor } from "@src/ui/useThemeColor";
import { RTL_ROW, TEXT_RIGHT } from "@src/ui/rtl";
import { FAB_LEFT } from "@src/ui/fabAnchor";

const CHORE_COLORS = {
  accent: "#0D9488",
  accentLight: "#14B8A6",
  bg: "#F0FDFA",
  bgDone: "#F7F7F8",
  border: "#CCFBF1",
  borderDone: "#E5E5EA",
  hover: "#E0FAF5",
  checkBg: "#0D948818",
  checkBgDone: "#0D948830",
  todayBadge: "#FEF3C7",
  todayBadgeText: "#B45309",
} as const;

function ChoreRow({
  chore,
  index,
  count,
  onEdit,
  onDelete,
  onMove,
}: {
  chore: Chore;
  index: number;
  count: number;
  onEdit: () => void;
  onDelete: () => void;
  onMove: (dir: -1 | 1) => void;
}) {
  const assignedMember = useFamilyStore((s) =>
    chore.assignedToMemberId
      ? s.familyMembers.find((m) => m.id === chore.assignedToMemberId)
      : undefined,
  );
  const assigneeDisplay = assignedMember
    ? `${assignedMember.avatarEmoji ?? ""} ${assignedMember.name}`
    : chore.assignedTo;

  return (
    <Pressable
      testID={"chore-row-" + chore.title}
      style={({ pressed, hovered }: any) => [
        styles.choreCard,
        chore.done && styles.choreCardDone,
        hovered && !chore.done && styles.choreCardHover,
        pressed && { transform: [{ scale: 0.98 }] },
      ]}
      onPress={onEdit}
    >
      <Pressable
        testID={"chore-check-" + chore.title}
        style={[styles.choreCheckCircle, chore.done && styles.choreCheckCircleDone]}
        onPress={() => toggleChoreDoneRemote(chore.id)}
      >
        {chore.done ? <Text style={{ fontSize: 14, color: "#fff" }}>✓</Text> : null}
      </Pressable>

      <View style={styles.choreContent}>
        <View style={styles.choreTopLine}>
          <Text style={[styles.choreTitle, chore.done && styles.choreTitleDone]} numberOfLines={1}>
            {chore.title}
          </Text>
          {chore.selectedForToday && !chore.done && (
            <View style={styles.choreTodayBadge}>
              <Text style={styles.choreTodayBadgeText}>⭐ היום</Text>
            </View>
          )}
        </View>
        {assigneeDisplay ? <Text style={styles.choreAssignee}>{assigneeDisplay}</Text> : null}
      </View>

      <View style={styles.choreActions}>
        <IconButton
          icon="chevron-up"
          size={16}
          disabled={index === 0}
          iconColor={C.textMuted}
          style={styles.choreActionBtn}
          onPress={() => onMove(-1)}
        />
        <IconButton
          icon="chevron-down"
          size={16}
          disabled={index === count - 1}
          iconColor={C.textMuted}
          style={styles.choreActionBtn}
          onPress={() => onMove(1)}
        />
        <IconButton
          icon="white-balance-sunny"
          size={16}
          iconColor={chore.selectedForToday ? C.amber : C.textMuted}
          style={styles.choreActionBtn}
          onPress={() => toggleChoreSelectedForTodayRemote(chore.id)}
        />
        <IconButton
          testID={"chore-delete-" + chore.title}
          icon="trash-can-outline"
          size={16}
          iconColor={C.textMuted}
          style={styles.choreActionBtn}
          onPress={onDelete}
        />
      </View>
    </Pressable>
  );
}

export default function ChoresScreen() {
  const insets = useSafeAreaInsets();
  const theme = useThemeColor();
  const { modal } = useLocalSearchParams<{ modal?: string }>();
  const { confirmVisible, requestDelete, confirmDelete, dismissConfirm } = useConfirmDelete();

  const allChores = useFamilyStore((s) => s.chores);
  // Single manual-ordered list (drag-to-reorder). The ⭐ badge + sun toggle
  // still mark "selected for today"; the Today screen still groups by it.
  const chores = useMemo(
    () => [...allChores].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
    [allChores],
  );

  const [modalOpen, setModalOpen] = useState(false);
  const [editingChore, setEditingChore] = useState<Chore | null>(null);
  const [voiceResult, setVoiceResult] = useState<VoiceChoreResult | null>(null);
  const { status: voiceStatus, onMic } = useVoiceCapture(useChoreVoice, {
    onResult: setVoiceResult,
  });

  useEffect(() => {
    if (modal === "add") {
      setEditingChore(null);
      setModalOpen(true);
    }
  }, [modal]);

  // Add the reviewed tasks through the normal optimistic chore CRUD.
  const handleVoiceConfirm = (items: VoiceChoreResult["items"]) => {
    for (const it of items) addChoreRemote({ title: it.title });
    setVoiceResult(null);
  };

  const openEdit = (chore: Chore) => {
    setEditingChore(chore);
    setModalOpen(true);
  };

  const moveChore = useCallback(
    (index: number, dir: -1 | 1) => {
      const j = index + dir;
      if (j < 0 || j >= chores.length) return;
      const next = [...chores];
      [next[index], next[j]] = [next[j], next[index]];
      reorderChoresRemote(next.map((c) => c.id));
    },
    [chores],
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <PageHeader title={t("home.chores")} />
      <ScrollView style={styles.list} contentContainerStyle={styles.container}>
        {chores.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={{ fontSize: 32 }}>🎉</Text>
            <Text style={styles.emptyText}>{t("home.allClear")}</Text>
          </View>
        ) : (
          <>
            <View style={styles.statsRow}>
              <View style={styles.statsPill}>
                <Text style={styles.statsText}>
                  {chores.filter((c) => c.done).length}/{chores.length} ✓
                </Text>
              </View>
            </View>
            {chores.map((item, index) => (
              <ChoreRow
                key={item.id}
                chore={item}
                index={index}
                count={chores.length}
                onEdit={() => openEdit(item)}
                onDelete={() => requestDelete(() => deleteChoreRemote(item.id))}
                onMove={(dir) => moveChore(index, dir)}
              />
            ))}
          </>
        )}
      </ScrollView>

      {/* Voice → tasks: record, transcribe via the Assistant, then open the
          review sheet. Stacked above the "+" add FAB. */}
      <VoiceFab
        status={voiceStatus}
        onPress={onMic}
        bottom={insets.bottom + S.lg + 68}
        testID="chore-voice-fab"
      />

      <FAB
        customSize={50}
        icon="plus"
        testID="btn-add-chore"
        accessibilityLabel="btn-add-chore"
        style={[styles.fab, { bottom: insets.bottom + S.lg, backgroundColor: theme }]}
        color="#FFF"
        onPress={() => {
          setEditingChore(null);
          setModalOpen(true);
        }}
      />

      <ChoreAddModal
        visible={modalOpen}
        onDismiss={() => {
          setModalOpen(false);
          setEditingChore(null);
        }}
        editChore={editingChore}
      />

      <VoiceReviewModal
        visible={!!voiceResult}
        transcript={voiceResult?.transcript ?? ""}
        items={voiceResult?.items ?? []}
        heading={t("voice.reviewTitleTasks")}
        confirmLabel={(n) => t("voice.addTasks", { count: n })}
        onConfirm={handleVoiceConfirm}
        onDismiss={() => setVoiceResult(null)}
      />
      <ConfirmDeleteModal visible={confirmVisible} onConfirm={confirmDelete} onDismiss={dismissConfirm} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  list: { flex: 1 },
  container: { padding: S.lg, paddingBottom: S.xxl + S.xxl, gap: S.xs },
  statsRow: { flexDirection: RTL_ROW, alignItems: "center", marginBottom: S.sm },
  statsPill: {
    backgroundColor: CHORE_COLORS.accent + "14",
    paddingHorizontal: S.md,
    paddingVertical: S.xs,
    borderRadius: 20,
  },
  statsText: { fontSize: 13, fontWeight: "700", color: CHORE_COLORS.accent },
  emptyState: { alignItems: "center", paddingVertical: S.xxl, gap: S.sm },
  emptyText: { color: C.textMuted, fontSize: 14 },
  sectionHeader: {
    flexDirection: RTL_ROW,
    alignItems: "center",
    gap: S.sm,
    marginTop: S.sm,
    marginBottom: S.xs,
  },
  sectionDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: CHORE_COLORS.accent },
  sectionTitle: { color: CHORE_COLORS.accent, fontWeight: "700", fontSize: 14 },
  sectionCount: {
    fontSize: 12,
    fontWeight: "600",
    color: C.textMuted,
    backgroundColor: C.hoverBg,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    overflow: "hidden",
  },
  divider: { paddingVertical: S.md, alignItems: "center" },
  dividerLine: { height: 1, width: "90%" as any, backgroundColor: CHORE_COLORS.border },
  choreCard: {
    flexDirection: RTL_ROW,
    alignItems: "center",
    backgroundColor: CHORE_COLORS.bg,
    borderWidth: 1,
    borderColor: CHORE_COLORS.border,
    borderRadius: R.md,
    padding: S.md,
    marginBottom: S.sm,
    gap: S.md,
    ...SHADOW.sm,
    ...(Platform.OS === "web" ? { cursor: "pointer" as any, transition: "all 0.2s ease" } : {}),
  },
  choreCardDone: {
    backgroundColor: CHORE_COLORS.bgDone,
    borderColor: CHORE_COLORS.borderDone,
    opacity: 0.75,
  },
  choreCardHover: {
    backgroundColor: CHORE_COLORS.hover,
    borderColor: CHORE_COLORS.accentLight + "40",
    transform: [{ translateY: -1 }],
    ...SHADOW.md,
  },
  choreCheckCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: CHORE_COLORS.accent,
    backgroundColor: CHORE_COLORS.checkBg,
    alignItems: "center",
    justifyContent: "center",
  },
  choreCheckCircleDone: { backgroundColor: CHORE_COLORS.accent, borderColor: CHORE_COLORS.accent },
  choreContent: { flex: 1, gap: 2 },
  choreTopLine: { flexDirection: RTL_ROW, alignItems: "center", gap: S.sm },
  choreTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: C.textPrimary,
    textAlign: TEXT_RIGHT,
    writingDirection: "rtl",
    flex: 1,
  },
  choreTitleDone: {
    textDecorationLine: "line-through",
    color: C.textMuted,
    fontWeight: "400",
  },
  choreTodayBadge: {
    backgroundColor: CHORE_COLORS.todayBadge,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  choreTodayBadgeText: { fontSize: 11, fontWeight: "700", color: CHORE_COLORS.todayBadgeText },
  choreAssignee: { fontSize: 12, color: C.textSecondary, textAlign: TEXT_RIGHT, marginTop: 1 },
  choreActions: { flexDirection: RTL_ROW, alignItems: "center" },
  choreActionBtn: { margin: 0, width: 28, height: 28 },
  fab: { position: "absolute", ...FAB_LEFT, bottom: S.lg },
});
