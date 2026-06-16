import React, { useState, useMemo } from "react";
import { View, StyleSheet, ScrollView, Pressable, Platform } from "react-native";
import { useAuthStore } from "@src/auth/useAuthStore";
import {
  Card,
  Text,
  IconButton,
  Button,
  ActivityIndicator,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import type { Note } from "@src/models/note";
import type { Chore } from "@src/models/chore";
import type { Project } from "@src/models/project";
import type { ScheduleBlock } from "@src/models/schedule";
import type { FamilyEvent, AssigneeType } from "@src/models/familyEvent";
import { useFamilyStore } from "@src/store/useFamilyStore";
import { useAllKidBlocksForDate } from "@src/store/scheduleSelectors";
import { useTodayFamilyEvents } from "@src/store/familyEventSelectors";
import { toYMD } from "@src/utils/date";
import { syncAll } from "@src/lib/sync/syncEngine";
import {
  toggleChoreDoneRemote,
  deleteChoreRemote,
  toggleNotePinnedRemote,
  deleteNoteRemote,
  deleteProjectRemote,
  updateFamilyEventRemote,
  updateScheduleBlockRemote,
} from "@src/lib/sync/remoteCrud";
import { t, LOCALE, blockTypeLabel, assigneeTypeLabel, statusLabel } from "@src/i18n";
import { minutesToHHMM } from "@src/utils/time";
import { RTL_ROW, TEXT_RIGHT } from "@src/ui/rtl";
import { C, S, R, SHADOW } from "@src/ui/tokens";
import { STATUS_COLORS } from "@src/ui/semanticColors";
import { formatDateHe } from "@src/components/DatePicker";
import SectionHeader from "@src/components/SectionHeader";
import NoteModal from "@src/components/NoteModal";
import FamilyEventModal from "@src/components/FamilyEventModal";
import ScheduleBlockModal from "@src/components/ScheduleBlockModal";
import ChoreAddModal from "@src/components/ChoreAddModal";
import ProjectModal from "@src/components/ProjectModal";
import ConfirmDeleteModal from "@src/components/ConfirmDeleteModal";
import { useConfirmDelete } from "@src/hooks/useConfirmDelete";
import { formatILS } from "@src/models/budget";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ASSIGNEE_COLORS: Record<AssigneeType, string> = {
  family: C.teal,
  member: C.purple,
  kid: C.red,
};

// NOTE: these were previously at module level (stale across Metro sessions).
// Moved inside the component so they recompute on every render/remount.

// Header background — soft sky blue inspired by the reference app
const HEADER_BG = "#D6ECFA";

// Note + project card palettes (mirror the dedicated pages).
const NOTE_COLORS = {
  accent: "#D97706",
  bg: "#FFFBF0",
  border: "#F5E6C8",
  barDefault: "#E8D5B0",
} as const;
const PROJECT_COLORS = {
  accent: "#6C63FF",
  bg: "#F8F7FF",
  border: "#E8E5FF",
} as const;

// ---------------------------------------------------------------------------
// Unified item type for the merged list
// ---------------------------------------------------------------------------

type TodayItem =
  | { kind: "event"; data: FamilyEvent }
  | { kind: "block"; data: ScheduleBlock }
  | { kind: "chore"; data: Chore };

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function TodayScreen() {
  // Computed inside component so they're fresh on each render/remount
  const todayDow = new Date().getDay();
  const todayDate = toYMD(new Date());

  const session = useAuthStore((s) => s.session);
  const grocery = useFamilyStore((s) => s.grocery);
  const chores = useFamilyStore((s) => s.chores);
  const projects = useFamilyStore((s) => s.projects);
  const notes = useFamilyStore((s) => s.notes);
  const kids = useFamilyStore((s) => s.kids);
  const familyMembers = useFamilyStore((s) => s.familyMembers);
  const syncStatus = useFamilyStore((s) => s.syncStatus);
  const lastSyncedAt = useFamilyStore((s) => s.lastSyncedAt);
  const budgetCategories = useFamilyStore((s) => s.budgetCategories);
  const allExpenses = useFamilyStore((s) => s.expenses);

  // Current month budget summary
  const currentYM = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
  const monthExpenses = useMemo(
    () => allExpenses.filter((e) => e.date.startsWith(currentYM)),
    [allExpenses, currentYM],
  );
  const budgetSpent = useMemo(
    () => monthExpenses.reduce((sum, e) => sum + e.amount, 0),
    [monthExpenses],
  );
  const budgetCap = useMemo(
    () => budgetCategories.reduce((sum, c) => sum + (c.monthlyCap ?? 0), 0),
    [budgetCategories],
  );

  const [syncing, setSyncing] = useState(false);
  const [notesExpanded, setNotesExpanded] = useState(true);
  const [projectsExpanded, setProjectsExpanded] = useState(true);
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<FamilyEvent | null>(null);
  const [blockModalOpen, setBlockModalOpen] = useState(false);
  const [editingBlock, setEditingBlock] = useState<ScheduleBlock | null>(null);
  const [choreModalOpen, setChoreModalOpen] = useState(false);
  const [editingChore, setEditingChore] = useState<Chore | null>(null);
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const { confirmVisible, requestDelete, confirmDelete, dismissConfirm } = useConfirmDelete();
  const router = useRouter();

  const pinnedNotesList = useMemo(
    () => notes.filter((n) => n.pinned),
    [notes],
  );
  const activeProjectsList = useMemo(
    () => projects.filter((p) => p.status === "in_progress"),
    [projects],
  );

  const todayChores = chores.filter((c) => c.selectedForToday);
  const todayEvents = useTodayFamilyEvents(todayDate, todayDow);
  const allKidBlocks = useAllKidBlocksForDate(todayDate, todayDow);

  // Timed items (events + kid blocks) sorted chronologically
  const timedItems = useMemo(() => {
    const items: Array<{ kind: "event"; data: FamilyEvent } | { kind: "block"; data: ScheduleBlock }> = [
      ...todayEvents.map((e) => ({ kind: "event" as const, data: e })),
      ...allKidBlocks.map((b) => ({ kind: "block" as const, data: b })),
    ];
    items.sort((a, b) => a.data.startMinutes - b.data.startMinutes);
    return items;
  }, [todayEvents, allKidBlocks]);

  const hasTimedItems = timedItems.length > 0;
  const hasChores = todayChores.length > 0;
  const isEmpty = !hasTimedItems && !hasChores;

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

  // Helper to resolve assignee display for family events
  const getAssigneeDisplay = (event: FamilyEvent) => {
    if (event.assigneeType === "member" && event.assigneeId) {
      const member = familyMembers.find((m) => m.id === event.assigneeId);
      return member
        ? `${member.avatarEmoji ?? ""} ${member.name}`
        : assigneeTypeLabel("member");
    }
    if (event.assigneeType === "kid" && event.assigneeId) {
      const kid = kids.find((k) => k.id === event.assigneeId);
      return kid ? `${kid.emoji}  ${kid.name}` : assigneeTypeLabel("kid");
    }
    return t("today.wholeFamily");
  };

  // Helper to resolve kid display for schedule blocks
  const getKidDisplay = (block: ScheduleBlock) => {
    const kid = kids.find((k) => k.id === block.kidId);
    return kid ? `${kid.emoji}  ${kid.name}` : "";
  };

  const getKidColor = (block: ScheduleBlock) => {
    const kid = kids.find((k) => k.id === block.kidId);
    return kid?.color ?? C.purple;
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Inner View carries testID — SafeAreaView from react-native-safe-area-context
          does not expose testID to UIAutomator on Android */}
      <View testID="roster-screen" style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Hidden node for QA hierarchy assertions — not rendered visually */}
        {session?.user.username ? (
          <View testID="user-header-name" accessibilityLabel={session.user.username} style={{ height: 0, overflow: "hidden" }} />
        ) : null}

        {/* ── Unified Today Card ── */}
        <Card style={styles.todayCard} mode="elevated">
          {/* Date header */}
          <View style={styles.dateHeader}>
            <Text style={styles.dateText}>{formatDateHe(todayDate)}</Text>
          </View>

          {/* Merged item list */}
          <View style={styles.itemList}>
            {isEmpty ? (
              <Text style={styles.emptyText}>
                {t("today.noEventsForToday")}
              </Text>
            ) : (
              <>
                {/* ── Timed events & blocks ── */}
                {timedItems.map((item) => {
                  if (item.kind === "event") {
                    const event = item.data;
                    const color =
                      event.color ?? ASSIGNEE_COLORS[event.assigneeType];
                    return (
                      <Pressable
                        key={`event-${event.id}`}
                        testID={"today-event-" + event.title}
                        style={({ hovered }: any) => [
                          styles.itemRow,
                          hovered && styles.itemRowHover,
                        ]}
                        onPress={() => {
                          setEditingEvent(event);
                          setEventModalOpen(true);
                        }}
                      >
                        <View
                          style={[styles.stripe, { backgroundColor: color }]}
                        />
                        <View style={styles.itemInfo}>
                          <Text style={styles.itemTitle}>{event.title}</Text>
                          <Text style={styles.itemTime}>
                            {minutesToHHMM(event.startMinutes)} –{" "}
                            {minutesToHHMM(event.endMinutes)}
                            {event.location ? `  ·  ${event.location}` : ""}
                          </Text>
                        </View>
                        <Text
                          style={[
                            styles.badge,
                            {
                              color: ASSIGNEE_COLORS[event.assigneeType],
                              backgroundColor:
                                ASSIGNEE_COLORS[event.assigneeType] + "18",
                            },
                          ]}
                        >
                          {getAssigneeDisplay(event)}
                        </Text>
                      </Pressable>
                    );
                  }

                  const block = item.data;
                  const kidColor = getKidColor(block);
                  const stripeColor = block.color ?? kidColor;
                  return (
                    <Pressable
                      key={`block-${block.id}`}
                      style={({ hovered }: any) => [
                        styles.itemRow,
                        hovered && styles.itemRowHover,
                      ]}
                      onPress={() => {
                        setEditingBlock(block);
                        setBlockModalOpen(true);
                      }}
                    >
                      <View
                        style={[
                          styles.stripe,
                          { backgroundColor: stripeColor },
                        ]}
                      />
                      <View style={styles.itemInfo}>
                        <Text style={styles.itemTitle}>{block.title}</Text>
                        <Text style={styles.itemTime}>
                          {minutesToHHMM(block.startMinutes)} –{" "}
                          {minutesToHHMM(block.endMinutes)}
                          {block.location ? `  ·  ${block.location}` : ""}
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.badge,
                          {
                            color: kidColor,
                            backgroundColor: kidColor + "18",
                          },
                        ]}
                      >
                        {getKidDisplay(block)}
                      </Text>
                    </Pressable>
                  );
                })}

                {/* ── Chores divider ── */}
                {hasChores && (
                  <View style={styles.choresDivider}>
                    <View style={styles.choresDividerLine} />
                    <Text style={styles.choresDividerLabel}>
                      {t("today.todayChores")}
                    </Text>
                    <View style={styles.choresDividerLine} />
                  </View>
                )}

                {/* ── Chores ── */}
                {todayChores.map((chore) => {
                const member = chore.assignedToMemberId
                  ? familyMembers.find(
                      (m) => m.id === chore.assignedToMemberId,
                    )
                  : undefined;
                const assigneeDisplay = member
                  ? `${member.avatarEmoji ?? ""} ${member.name}`
                  : chore.assignedTo;
                return (
                  <View
                    key={`chore-${chore.id}`}
                    style={styles.choreRow}
                  >
                    <IconButton
                      icon={chore.done ? "check-circle" : "circle-outline"}
                      size={22}
                      iconColor={chore.done ? C.teal : C.textMuted}
                      onPress={() => toggleChoreDoneRemote(chore.id)}
                      style={styles.choreCheck}
                    />
                    <Pressable
                      style={styles.choreTextWrap}
                      onPress={() => {
                        setEditingChore(chore);
                        setChoreModalOpen(true);
                      }}
                    >
                      <Text
                        style={
                          chore.done ? styles.choreDone : styles.choreTitle
                        }
                      >
                        {chore.title}
                      </Text>
                      {assigneeDisplay ? (
                        <Text style={styles.choreAssignee}>
                          {assigneeDisplay}
                        </Text>
                      ) : null}
                    </Pressable>
                    <IconButton
                      icon="trash-can-outline"
                      size={18}
                      iconColor={C.textMuted}
                      style={styles.choreCheck}
                      testID={`today-chore-delete-${chore.title}`}
                      onPress={() => requestDelete(() => deleteChoreRemote(chore.id))}
                    />
                  </View>
                );
              })}
              </>
            )}
          </View>
        </Card>

        {/* ── Budget mini-card ── */}
        {(budgetSpent > 0 || budgetCap > 0) && (
          <Pressable
            style={styles.budgetCard}
            onPress={() => router.push("/budget" as any)}
            accessibilityRole="button"
            accessibilityLabel="פתח מסך תקציב"
          >
            <View style={[{ flexDirection: RTL_ROW }, styles.budgetCardRow]}>
              <Text style={styles.budgetLabel}>{t("budget.thisMonth")}</Text>
              <Text style={styles.budgetAmount}>{formatILS(budgetSpent)}</Text>
            </View>
            {budgetCap > 0 && (
              <>
                <View style={styles.budgetBar}>
                  <View
                    style={[
                      styles.budgetBarFill,
                      {
                        width: `${Math.min(budgetSpent / budgetCap, 1) * 100}%` as any,
                        backgroundColor:
                          budgetSpent / budgetCap > 0.9 ? C.red
                          : budgetSpent / budgetCap > 0.7 ? C.amber
                          : "#9B59B6",
                      },
                    ]}
                  />
                </View>
                <Text style={styles.budgetCapText}>
                  {t("budget.ofBudget", { cap: formatILS(budgetCap) })}
                </Text>
              </>
            )}
          </Pressable>
        )}

        {/* ── Pinned notes — collapsible, single column ── */}
        {pinnedNotesList.length > 0 && (
          <>
            <SectionHeader
              label={t("today.pinnedNotes")}
              collapsible
              expanded={notesExpanded}
              onToggle={() => setNotesExpanded((v) => !v)}
            />
            {notesExpanded && (
              <View style={styles.cardCol}>
                {pinnedNotesList.map((note) => (
                  <Pressable
                    key={note.id}
                    style={({ pressed, hovered }: any) => [
                      styles.noteCard,
                      hovered && styles.cardHover,
                      pressed && { transform: [{ scale: 0.98 }] },
                    ]}
                    onPress={() => {
                      setEditingNote(note);
                      setNoteModalOpen(true);
                    }}
                  >
                    <View style={styles.noteTopRow}>
                      <View style={styles.noteIcon}>
                        <Text style={{ fontSize: 18 }}>📌</Text>
                      </View>
                      <View style={{ flex: 1 }} />
                      <IconButton
                        icon="pin-off"
                        size={16}
                        iconColor={NOTE_COLORS.accent}
                        style={styles.cardActionBtn}
                        onPress={() => toggleNotePinnedRemote(note.id)}
                      />
                      <IconButton
                        icon="trash-can-outline"
                        size={16}
                        iconColor={C.textMuted}
                        style={styles.cardActionBtn}
                        onPress={() => requestDelete(() => deleteNoteRemote(note.id))}
                      />
                    </View>
                    <Text style={styles.noteTitle} numberOfLines={1}>
                      {note.title || t("home.note")}
                    </Text>
                    {note.body ? (
                      <Text style={styles.noteBody} numberOfLines={3}>
                        {note.body}
                      </Text>
                    ) : null}
                    <View style={styles.noteAccentBar} />
                  </Pressable>
                ))}
              </View>
            )}
          </>
        )}

        {/* ── Active projects — collapsible, single column ── */}
        {activeProjectsList.length > 0 && (
          <>
            <SectionHeader
              label={t("today.activeProjects")}
              collapsible
              expanded={projectsExpanded}
              onToggle={() => setProjectsExpanded((v) => !v)}
            />
            {projectsExpanded && (
              <View style={styles.cardCol}>
                {activeProjectsList.map((proj) => {
                  const statusColor = STATUS_COLORS[proj.status];
                  const statusEmoji = proj.status === "done" ? "✅" : proj.status === "in_progress" ? "🔨" : "💡";
                  return (
                    <Pressable
                      key={proj.id}
                      style={({ pressed, hovered }: any) => [
                        styles.projectCard,
                        hovered && styles.cardHover,
                        pressed && { transform: [{ scale: 0.98 }] },
                      ]}
                      onPress={() => {
                        setEditingProject(proj);
                        setProjectModalOpen(true);
                      }}
                    >
                      <View style={[styles.projectStripe, { backgroundColor: statusColor }]} />
                      <View style={styles.projectBody}>
                        <View style={styles.projectTopRow}>
                          <View style={[styles.projectStatusChip, { backgroundColor: statusColor + "18" }]}>
                            <Text style={{ fontSize: 12 }}>{statusEmoji}</Text>
                            <Text style={[styles.projectStatusText, { color: statusColor }]}>
                              {statusLabel(proj.status)}
                            </Text>
                          </View>
                          <View style={{ flex: 1 }} />
                          <IconButton
                            icon="trash-can-outline"
                            size={16}
                            iconColor={C.textMuted}
                            style={styles.cardActionBtn}
                            onPress={() => requestDelete(() => deleteProjectRemote(proj.id))}
                          />
                        </View>
                        <Text style={styles.projectTitle} numberOfLines={1}>
                          {proj.title}
                        </Text>
                        {proj.description ? (
                          <Text style={styles.projDesc} numberOfLines={2}>
                            {proj.description}
                          </Text>
                        ) : null}
                        <View style={styles.projectProgressRow}>
                          <View style={styles.projectProgressTrack}>
                            <View
                              style={[
                                styles.projectProgressFill,
                                { backgroundColor: statusColor, width: `${proj.progress}%` as any },
                              ]}
                            />
                          </View>
                          <Text style={[styles.projectProgressLabel, { color: statusColor }]}>
                            {proj.progress}%
                          </Text>
                        </View>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </>
        )}

        {/* ── Sync ── */}
        <View style={styles.syncRow}>
          <Text style={styles.syncMeta}>
            {syncStatus === "syncing"
              ? t("today.syncing")
              : syncStatus === "error"
              ? t("today.syncError")
              : t("today.lastSync", { time: formatLastSync() })}
          </Text>
          {syncing ? (
            <ActivityIndicator size="small" color={C.textMuted} />
          ) : (
            <Button
              mode="text"
              compact
              onPress={handleSync}
              textColor={C.textSecondary}
            >
              {t("today.syncNow")}
            </Button>
          )}
        </View>
      </ScrollView>

      <NoteModal
        visible={noteModalOpen}
        onDismiss={() => {
          setNoteModalOpen(false);
          setEditingNote(null);
        }}
        editNote={editingNote}
      />

      <FamilyEventModal
        visible={eventModalOpen}
        onDismiss={() => {
          setEventModalOpen(false);
          setEditingEvent(null);
        }}
        editEvent={editingEvent}
        defaultDaysOfWeek={[todayDow]}
        defaultDate={todayDate}
        onSubmit={(data) => {
          if (editingEvent) {
            updateFamilyEventRemote(editingEvent.id, data);
          }
        }}
      />

      <ScheduleBlockModal
        visible={blockModalOpen}
        onDismiss={() => {
          setBlockModalOpen(false);
          setEditingBlock(null);
        }}
        editBlock={editingBlock}
        defaultDaysOfWeek={[todayDow]}
        defaultDate={todayDate}
        onSubmit={(data) => {
          if (editingBlock) {
            updateScheduleBlockRemote(editingBlock.id, data);
          }
        }}
      />

      <ChoreAddModal
        visible={choreModalOpen}
        onDismiss={() => {
          setChoreModalOpen(false);
          setEditingChore(null);
        }}
        editChore={editingChore}
      />

      <ProjectModal
        visible={projectModalOpen}
        onDismiss={() => {
          setProjectModalOpen(false);
          setEditingProject(null);
        }}
        editProject={editingProject}
      />

      <ConfirmDeleteModal
        visible={confirmVisible}
        onConfirm={confirmDelete}
        onDismiss={dismissConfirm}
      />
      </View>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  container: { padding: S.lg, paddingBottom: S.xxl + S.lg },


  // ── Budget mini-card ─────────────────────────────────────────────────────
  budgetCard: {
    backgroundColor: C.surface,
    borderRadius: R.lg,
    padding: S.md,
    marginBottom: S.md,
    ...SHADOW.sm,
    borderRightWidth: 3,
    borderRightColor: "#9B59B6",
  },
  budgetCardRow: {
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: S.xs,
  },
  budgetLabel: {
    fontSize: 13,
    color: C.textSecondary,
    textAlign: TEXT_RIGHT,
    writingDirection: "rtl",
  },
  budgetAmount: {
    fontSize: 18,
    fontWeight: "800",
    color: C.textPrimary,
  },
  budgetBar: {
    height: 5,
    backgroundColor: C.surfaceSubtle,
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 4,
  },
  budgetBarFill: { height: "100%", borderRadius: 3 },
  budgetCapText: {
    fontSize: 11,
    color: C.textSecondary,
    textAlign: TEXT_RIGHT,
    writingDirection: "rtl",
  },

  // ── Unified Today card ────────────────────────────────────────────────────
  todayCard: {
    borderRadius: R.lg,
    backgroundColor: C.surface,
    marginBottom: S.xl,
    overflow: "hidden",
  },
  dateHeader: {
    backgroundColor: HEADER_BG,
    paddingHorizontal: S.xl,
    paddingVertical: S.lg,
  },
  dateText: {
    fontSize: 20,
    fontWeight: "700",
    color: C.textPrimary,
    textAlign: TEXT_RIGHT,
  },

  // ── Item list ─────────────────────────────────────────────────────────────
  itemList: {
    paddingHorizontal: S.lg,
    paddingVertical: S.md,
  },
  emptyText: {
    color: C.textMuted,
    textAlign: TEXT_RIGHT,
    fontSize: 14,
    paddingVertical: S.md,
  },

  // ── Event / block rows ────────────────────────────────────────────────────
  itemRow: {
    flexDirection: RTL_ROW,
    alignItems: "center",
    paddingVertical: S.md,
    borderRadius: R.sm,
    paddingHorizontal: S.xs,
    ...(Platform.OS === "web" ? ({ cursor: "pointer" } as any) : {}),
  },
  itemRowHover: { backgroundColor: C.hoverBg },
  stripe: {
    width: 3,
    borderRadius: 2,
    alignSelf: "stretch",
    marginEnd: S.md,
    marginStart: S.xs,
  },
  itemInfo: { flex: 1 },
  itemTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: C.textPrimary,
    textAlign: TEXT_RIGHT,
  },
  itemTime: {
    fontSize: 12,
    color: C.textSecondary,
    marginTop: 2,
    textAlign: TEXT_RIGHT,
  },
  badge: {
    fontSize: 10,
    fontWeight: "600",
    paddingHorizontal: S.sm,
    paddingVertical: 3,
    borderRadius: R.sm,
    overflow: "hidden",
    marginStart: S.sm,
  },

  // ── Premium section headers ─────────────────────────────────────────────────
  premiumHeader: {
    flexDirection: RTL_ROW,
    alignItems: "center",
    marginTop: S.xl,
    marginBottom: S.md,
    paddingHorizontal: S.xs,
  },
  premiumAccent: {
    width: 4,
    height: 20,
    borderRadius: 2,
    marginEnd: S.sm,
  },
  premiumLabel: {
    fontSize: 16,
    fontWeight: "800",
    color: C.textPrimary,
    letterSpacing: 0.3,
    textAlign: TEXT_RIGHT,
    marginHorizontal: S.md,
  },
  premiumLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: C.border,
  },

  // ── Notes / projects cards (single column, mirror dedicated pages) ──
  cardCol: { gap: S.md, marginBottom: S.md },
  cardHover: { transform: [{ translateY: -2 }], ...SHADOW.md },
  cardActionBtn: { margin: 0, width: 28, height: 28 },
  noteCard: {
    backgroundColor: NOTE_COLORS.bg,
    borderWidth: 1,
    borderColor: NOTE_COLORS.border,
    borderRadius: R.lg,
    padding: S.lg,
    overflow: "hidden",
    ...SHADOW.sm,
    ...(Platform.OS === "web" ? ({ cursor: "pointer" } as any) : {}),
  },
  noteTopRow: { flexDirection: RTL_ROW, alignItems: "center", marginBottom: S.sm },
  noteIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: NOTE_COLORS.accent + "14",
    alignItems: "center",
    justifyContent: "center",
  },
  noteTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: C.textPrimary,
    textAlign: TEXT_RIGHT,
    writingDirection: "rtl",
    marginBottom: 4,
  },
  noteBody: {
    fontSize: 13,
    color: C.textSecondary,
    textAlign: TEXT_RIGHT,
    writingDirection: "rtl",
    lineHeight: 19,
  },
  noteAccentBar: {
    height: 3,
    borderRadius: 2,
    backgroundColor: NOTE_COLORS.barDefault,
    marginTop: S.md,
  },
  projectCard: {
    flexDirection: RTL_ROW,
    backgroundColor: PROJECT_COLORS.bg,
    borderWidth: 1,
    borderColor: PROJECT_COLORS.border,
    borderRadius: R.lg,
    overflow: "hidden",
    ...SHADOW.sm,
    ...(Platform.OS === "web" ? ({ cursor: "pointer" } as any) : {}),
  },
  projectStripe: { width: 5, alignSelf: "stretch" },
  projectBody: { flex: 1, padding: S.lg, gap: S.xs },
  projectTopRow: { flexDirection: RTL_ROW, alignItems: "center", marginBottom: S.xs },
  projectStatusChip: {
    flexDirection: RTL_ROW,
    alignItems: "center",
    gap: 4,
    paddingHorizontal: S.sm + 2,
    paddingVertical: 3,
    borderRadius: 12,
  },
  projectStatusText: { fontSize: 11, fontWeight: "700" },
  projectTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: C.textPrimary,
    textAlign: TEXT_RIGHT,
    writingDirection: "rtl",
  },
  projDesc: {
    fontSize: 13,
    color: C.textSecondary,
    textAlign: TEXT_RIGHT,
    writingDirection: "rtl",
    lineHeight: 19,
  },
  projectProgressRow: { flexDirection: RTL_ROW, alignItems: "center", gap: S.sm, marginTop: S.sm },
  projectProgressTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: PROJECT_COLORS.accent + "15",
    overflow: "hidden",
  },
  projectProgressFill: { height: 6, borderRadius: 3 },
  projectProgressLabel: { fontSize: 12, fontWeight: "700", minWidth: 36, textAlign: "left" },

  // ── Chores divider ─────────────────────────────────────────────────────────
  choresDivider: {
    flexDirection: RTL_ROW,
    alignItems: "center",
    marginTop: S.md,
    marginBottom: S.xs,
    paddingHorizontal: S.xs,
  },
  choresDividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: C.border,
  },
  choresDividerLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: C.textMuted,
    paddingHorizontal: S.md,
  },

  // ── Chore rows ────────────────────────────────────────────────────────────
  choreRow: {
    flexDirection: RTL_ROW,
    alignItems: "center",
    paddingVertical: S.xs,
    borderRadius: R.sm,
    paddingHorizontal: S.xs,
  },
  choreCheck: { margin: 0 },
  choreTextWrap: { flex: 1, marginStart: S.xs },
  choreTitle: {
    fontSize: 15,
    color: C.textPrimary,
    textAlign: TEXT_RIGHT,
  },
  choreDone: {
    fontSize: 15,
    textDecorationLine: "line-through",
    color: C.textMuted,
    textAlign: TEXT_RIGHT,
  },
  choreAssignee: {
    fontSize: 12,
    color: C.textSecondary,
    textAlign: TEXT_RIGHT,
    marginTop: 1,
  },

  // ── Sync footer ─────────────────────────────────────────────────────────
  syncRow: {
    flexDirection: RTL_ROW,
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: S.lg,
    paddingHorizontal: S.xs,
    marginBottom: S.sm,
  },
  syncMeta: {
    fontSize: 12,
    color: C.textMuted,
    textAlign: TEXT_RIGHT,
  },
});
