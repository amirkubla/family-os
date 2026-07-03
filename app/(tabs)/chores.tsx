/**
 * Chores — the household "action center".
 *
 * A sticky progress header + filter/sort toolbar sit above a scrollable list of
 * compact, theme-tinted ChoreCards (active, then a collapsible Completed group).
 * Add via the FAB, voice, or the ?modal=add deep link.
 */

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { View, StyleSheet, Pressable, Platform, ScrollView, TextInput } from "react-native";
import ScreenScrollView from "@src/components/ScreenScrollView";
import { Text, IconButton, FAB, Button, Menu } from "react-native-paper";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";

import { useFamilyStore } from "@src/store/useFamilyStore";
import { useBlurRemountKey } from "@src/hooks/useBlurRemountKey";
import type { Chore } from "@src/models/chore";
import { isChoreOverdue, dueDiffDays, priorityRank } from "@src/models/chore";
import {
  addChoreRemote,
  toggleChoreDoneRemote,
  toggleChoreSelectedForTodayRemote,
  deleteChoreRemote,
  reorderChoresRemote,
  markAllChoresDoneRemote,
} from "@src/lib/sync/remoteCrud";
import ChoreCard from "@src/components/ChoreCard";
import ChoreAddModal from "@src/components/ChoreAddModal";
import VoiceReviewModal from "@src/components/VoiceReviewModal";
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

type StatusFilter = "all" | "open" | "done" | "overdue";
type PriorityFilter = "all" | "low" | "medium" | "high";
type DueFilter = "all" | "today" | "overdue" | "upcoming";
type SortMode = "manual" | "due" | "priority" | "newest" | "oldest" | "alpha";

interface Opt<V> { value: V; label: string }

// A chip that opens a dropdown Menu of options. Highlights when a non-default
// value is selected.
function FilterMenu<V extends string>({
  options,
  value,
  defaultValue,
  placeholder,
  onSelect,
  theme,
}: {
  options: Opt<V>[];
  value: V;
  defaultValue: V;
  placeholder: string;
  onSelect: (v: V) => void;
  theme: string;
}) {
  const [open, setOpen] = useState(false);
  const active = value !== defaultValue;
  const current = options.find((o) => o.value === value);
  return (
    <Menu
      visible={open}
      onDismiss={() => setOpen(false)}
      anchor={
        <Pressable
          onPress={() => setOpen(true)}
          style={[styles.chip, active && { borderColor: theme, backgroundColor: theme + "14" }]}
        >
          <Text style={[styles.chipText, active && { color: theme, fontWeight: "700" }]}>
            {active && current ? current.label : placeholder}
          </Text>
          <Ionicons name="chevron-down" size={13} color={active ? theme : C.textMuted} />
        </Pressable>
      }
    >
      {options.map((o) => (
        <Menu.Item key={o.value} onPress={() => { onSelect(o.value); setOpen(false); }} title={o.label} />
      ))}
    </Menu>
  );
}

export default function ChoresScreenRoute() {
  return <ChoresScreen key={useBlurRemountKey()} />;
}

function ChoresScreen() {
  const insets = useSafeAreaInsets();
  const theme = useThemeColor();
  const { modal } = useLocalSearchParams<{ modal?: string }>();
  const { confirmVisible, requestDelete, confirmDelete, dismissConfirm } = useConfirmDelete();

  const allChores = useFamilyStore((s) => s.chores);
  const members = useFamilyStore((s) => s.familyMembers);
  const kids = useFamilyStore((s) => s.kids);

  // Filters + sort.
  const [search, setSearch] = useState("");
  const [assignee, setAssignee] = useState<string>("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [priority, setPriority] = useState<PriorityFilter>("all");
  const [dueF, setDueF] = useState<DueFilter>("all");
  const [repeatingOnly, setRepeatingOnly] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>("manual");
  const [completedOpen, setCompletedOpen] = useState(false);

  // Overall progress (whole list, not the filtered view).
  const total = allChores.length;
  const doneCount = useMemo(() => allChores.filter((c) => c.done).length, [allChores]);
  const remaining = total - doneCount;
  const pct = total ? doneCount / total : 0;
  const allDone = total > 0 && remaining === 0;

  const filtered = useMemo(() => {
    let list = allChores;
    const q = search.trim().toLowerCase();
    if (q) list = list.filter((c) => c.title.toLowerCase().includes(q) || (c.description ?? "").toLowerCase().includes(q));
    if (assignee !== "all") list = list.filter((c) => c.assignedToMemberId === assignee || c.kidId === assignee);
    if (status === "open") list = list.filter((c) => !c.done);
    else if (status === "done") list = list.filter((c) => c.done);
    else if (status === "overdue") list = list.filter((c) => isChoreOverdue(c));
    if (priority !== "all") list = list.filter((c) => c.priority === priority);
    if (dueF !== "all") {
      list = list.filter((c) => {
        if (c.dueDate == null) return false;
        const d = dueDiffDays(c.dueDate);
        if (dueF === "today") return d === 0;
        if (dueF === "overdue") return d < 0 && !c.done;
        return d > 0; // upcoming
      });
    }
    if (repeatingOnly) list = list.filter((c) => c.isRecurring);
    return list;
  }, [allChores, search, assignee, status, priority, dueF, repeatingOnly]);

  const sorted = useMemo(() => {
    const cmp: Record<SortMode, (a: Chore, b: Chore) => number> = {
      manual: (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
      due: (a, b) => (a.dueDate ?? Infinity) - (b.dueDate ?? Infinity),
      priority: (a, b) => priorityRank(a.priority) - priorityRank(b.priority),
      newest: (a, b) => b.createdAt - a.createdAt,
      oldest: (a, b) => a.createdAt - b.createdAt,
      alpha: (a, b) => a.title.localeCompare(b.title, "he"),
    };
    return [...filtered].sort(cmp[sortMode]);
  }, [filtered, sortMode]);

  const active = useMemo(() => sorted.filter((c) => !c.done), [sorted]);
  const completed = useMemo(() => sorted.filter((c) => c.done), [sorted]);
  const canReorder = sortMode === "manual" && !search && assignee === "all" && status === "all" && priority === "all" && dueF === "all" && !repeatingOnly;

  const [modalOpen, setModalOpen] = useState(false);
  const [editingChore, setEditingChore] = useState<Chore | null>(null);
  const [voiceResult, setVoiceResult] = useState<VoiceChoreResult | null>(null);
  const { status: voiceStatus, onMic } = useVoiceCapture(useChoreVoice, { onResult: setVoiceResult });

  useEffect(() => {
    if (modal === "add") { setEditingChore(null); setModalOpen(true); }
  }, [modal]);

  const handleVoiceConfirm = (items: VoiceChoreResult["items"]) => {
    for (const it of items) addChoreRemote({ title: it.title });
    setVoiceResult(null);
  };

  const openEdit = (chore: Chore) => { setEditingChore(chore); setModalOpen(true); };

  const moveChore = useCallback(
    (index: number, dir: -1 | 1) => {
      const j = index + dir;
      if (j < 0 || j >= active.length) return;
      const next = [...active];
      [next[index], next[j]] = [next[j], next[index]];
      reorderChoresRemote([...next.map((c) => c.id), ...completed.map((c) => c.id)]);
    },
    [active, completed],
  );

  const assigneeOpts: Opt<string>[] = [
    { value: "all", label: t("chore.filterAssignee") },
    ...members.filter((m) => m.isActive).map((m) => ({ value: m.id, label: `${m.avatarEmoji ?? "👤"} ${m.name}` })),
    ...kids.filter((k) => k.isActive).map((k) => ({ value: k.id, label: `${k.emoji ?? "🧒"} ${k.name}` })),
  ];
  const statusOpts: Opt<StatusFilter>[] = [
    { value: "all", label: t("chore.filterStatus") },
    { value: "open", label: t("chore.statusOpen") },
    { value: "done", label: t("chore.statusDone") },
    { value: "overdue", label: t("chore.statusOverdue") },
  ];
  const priorityOpts: Opt<PriorityFilter>[] = [
    { value: "all", label: t("chore.filterPriority") },
    { value: "high", label: t("chore.priority_high") },
    { value: "medium", label: t("chore.priority_medium") },
    { value: "low", label: t("chore.priority_low") },
  ];
  const dueOpts: Opt<DueFilter>[] = [
    { value: "all", label: t("chore.filterDue") },
    { value: "today", label: t("chore.dueToday") },
    { value: "overdue", label: t("chore.filterDueOverdue") },
    { value: "upcoming", label: t("chore.filterDueUpcoming") },
  ];
  const sortOpts: Opt<SortMode>[] = [
    { value: "manual", label: t("chore.sortManual") },
    { value: "due", label: t("chore.sortDue") },
    { value: "priority", label: t("chore.sortPriority") },
    { value: "newest", label: t("chore.sortNewest") },
    { value: "oldest", label: t("chore.sortOldest") },
    { value: "alpha", label: t("chore.sortAlpha") },
  ];

  const renderCard = (item: Chore, index: number, arr: Chore[], reorder: boolean) => (
    <ChoreCard
      key={item.id}
      chore={item}
      index={index}
      onPress={() => openEdit(item)}
      onToggleDone={() => toggleChoreDoneRemote(item.id)}
      onToggleToday={() => toggleChoreSelectedForTodayRemote(item.id)}
      onDelete={() => requestDelete(() => deleteChoreRemote(item.id))}
      onMoveUp={reorder ? () => moveChore(index, -1) : undefined}
      onMoveDown={reorder ? () => moveChore(index, 1) : undefined}
      isFirst={index === 0}
      isLast={index === arr.length - 1}
    />
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      {total > 0 && (
        <View style={styles.stickyHead}>
          {/* Progress header */}
          <View style={styles.progressCard}>
            <View style={styles.progressTop}>
              <Text style={styles.progressTitle}>{t("chore.overviewTitle")}</Text>
              <Button
                compact
                icon={allDone ? "checkbox-multiple-blank-outline" : "check-all"}
                onPress={() => markAllChoresDoneRemote(!allDone)}
                textColor={theme}
                testID="btn-mark-all-chores"
              >
                {allDone ? t("home.unmarkAll") : t("home.markAll")}
              </Button>
            </View>
            <View style={[styles.progressTrack, { backgroundColor: theme + "1A" }]}>
              <View style={[styles.progressFill, { width: `${Math.round(pct * 100)}%` as any, backgroundColor: theme }]} />
            </View>
            <Text style={styles.progressMeta}>
              {t("chore.progressDone", { done: doneCount, total })}
              {remaining > 0 ? `  ·  ${t("chore.progressRemaining", { count: remaining })}` : ""}
            </Text>
          </View>

          {/* Filter / sort toolbar */}
          <View style={styles.searchRow}>
            <Ionicons name="search" size={16} color={C.textMuted} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder={t("chore.searchPlaceholder")}
              placeholderTextColor={C.textMuted}
              style={styles.searchInput}
            />
            {search ? <IconButton icon="close" size={14} onPress={() => setSearch("")} style={{ margin: 0 }} /> : null}
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.toolbar}
          >
            <FilterMenu options={assigneeOpts} value={assignee} defaultValue="all" placeholder={t("chore.filterAssignee")} onSelect={setAssignee} theme={theme} />
            <FilterMenu options={statusOpts} value={status} defaultValue="all" placeholder={t("chore.filterStatus")} onSelect={setStatus} theme={theme} />
            <FilterMenu options={priorityOpts} value={priority} defaultValue="all" placeholder={t("chore.filterPriority")} onSelect={setPriority} theme={theme} />
            <FilterMenu options={dueOpts} value={dueF} defaultValue="all" placeholder={t("chore.filterDue")} onSelect={setDueF} theme={theme} />
            <Pressable
              onPress={() => setRepeatingOnly((v) => !v)}
              style={[styles.chip, repeatingOnly && { borderColor: theme, backgroundColor: theme + "14" }]}
            >
              <Text style={[styles.chipText, repeatingOnly && { color: theme, fontWeight: "700" }]}>↻ {t("chore.filterRepeating")}</Text>
            </Pressable>
            <FilterMenu options={sortOpts} value={sortMode} defaultValue="manual" placeholder={t("chore.sort")} onSelect={setSortMode} theme={theme} />
          </ScrollView>
        </View>
      )}

      <ScreenScrollView style={styles.list} contentContainerStyle={styles.container}>
        {total === 0 ? (
          <View style={styles.emptyState}>
            <Text style={{ fontSize: 32 }}>🎉</Text>
            <Text style={styles.emptyText}>{t("home.allClear")}</Text>
          </View>
        ) : active.length === 0 && completed.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>{t("chore.noResults")}</Text>
          </View>
        ) : (
          <>
            {active.map((item, i) => renderCard(item, i, active, canReorder))}

            {completed.length > 0 && (
              <>
                <Pressable style={styles.completedHeader} onPress={() => setCompletedOpen((v) => !v)}>
                  <Ionicons name={completedOpen ? "chevron-down" : "chevron-back"} size={16} color={C.textMuted} />
                  <Text style={styles.completedHeaderText}>
                    {t("chore.completedSection", { count: completed.length })}
                  </Text>
                </Pressable>
                {completedOpen && completed.map((item, i) => renderCard(item, i, completed, false))}
              </>
            )}
          </>
        )}
      </ScreenScrollView>

      <VoiceFab status={voiceStatus} onPress={onMic} bottom={insets.bottom + S.lg + 68} testID="chore-voice-fab" />

      <FAB
        customSize={50}
        icon="plus"
        testID="btn-add-chore"
        accessibilityLabel="btn-add-chore"
        style={[styles.fab, { bottom: insets.bottom + S.lg, backgroundColor: theme, borderRadius: 26 }]}
        color="#FFF"
        onPress={() => { setEditingChore(null); setModalOpen(true); }}
      />

      <ChoreAddModal
        visible={modalOpen}
        onDismiss={() => { setModalOpen(false); setEditingChore(null); }}
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
  container: { padding: S.lg, paddingTop: S.sm, paddingBottom: S.xxl + S.xxl },

  // Sticky header block (progress + toolbar) above the scroll.
  stickyHead: { paddingHorizontal: S.lg, paddingTop: S.sm, gap: S.sm },
  progressCard: {
    backgroundColor: C.surface,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.border,
    padding: S.md,
    ...SHADOW.sm,
  },
  progressTop: { flexDirection: RTL_ROW, alignItems: "center", justifyContent: "space-between" },
  progressTitle: { fontSize: 16, fontWeight: "800", color: C.textPrimary, textAlign: TEXT_RIGHT, writingDirection: "rtl" },
  progressTrack: { height: 8, borderRadius: 4, overflow: "hidden", marginTop: S.sm },
  progressFill: { height: 8, borderRadius: 4 },
  progressMeta: { fontSize: 12, fontWeight: "600", color: C.textSecondary, textAlign: TEXT_RIGHT, writingDirection: "rtl", marginTop: S.xs },

  searchRow: {
    flexDirection: RTL_ROW,
    alignItems: "center",
    gap: S.xs,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 999,
    paddingHorizontal: S.md,
  },
  searchInput: {
    flex: 1,
    paddingVertical: Platform.OS === "web" ? 8 : 6,
    fontSize: 14,
    color: C.textPrimary,
    textAlign: TEXT_RIGHT,
    writingDirection: "rtl",
    ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as any) : {}),
  },
  toolbar: { flexDirection: RTL_ROW, gap: S.sm, paddingVertical: 2, alignItems: "center" },
  chip: {
    flexDirection: RTL_ROW,
    alignItems: "center",
    gap: 3,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 999,
    paddingHorizontal: S.md,
    paddingVertical: 6,
  },
  chipText: { fontSize: 12, fontWeight: "600", color: C.textSecondary, writingDirection: "rtl" },

  emptyState: { alignItems: "center", paddingVertical: S.xxl, gap: S.sm },
  emptyText: { color: C.textMuted, fontSize: 14, textAlign: "center" },

  completedHeader: { flexDirection: RTL_ROW, alignItems: "center", gap: S.xs, marginTop: S.md, marginBottom: S.xs },
  completedHeaderText: { fontSize: 13, fontWeight: "700", color: C.textMuted, writingDirection: "rtl" },

  fab: { position: "absolute", ...FAB_LEFT, bottom: S.lg },
});
