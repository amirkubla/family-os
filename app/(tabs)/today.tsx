import React, { useState, useMemo } from "react";
import { View, StyleSheet, ScrollView, Pressable, Platform } from "react-native";
import {
  Card,
  Text,
  IconButton,
  Button,
  ActivityIndicator,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import type { Kid } from "@src/models/kid";
import type { Note } from "@src/models/note";
import type { Chore } from "@src/models/chore";
import type { Project } from "@src/models/project";
import type { ScheduleBlock, BlockType } from "@src/models/schedule";
import type { FamilyEvent, AssigneeType } from "@src/models/familyEvent";
import { useFamilyStore } from "@src/store/useFamilyStore";
import { useKidBlocksForDate } from "@src/store/scheduleSelectors";
import { useTodayFamilyEvents } from "@src/store/familyEventSelectors";
import { toYMD } from "@src/utils/date";
import { syncAll } from "@src/lib/sync/syncEngine";
import {
  toggleChoreDoneRemote,
  updateFamilyEventRemote,
  updateScheduleBlockRemote,
} from "@src/lib/sync/remoteCrud";
import { t, LOCALE, blockTypeLabel, assigneeTypeLabel } from "@src/i18n";
import { minutesToHHMM } from "@src/utils/time";
import { RTL_ROW } from "@src/ui/rtl";
import { C, S, R } from "@src/ui/tokens";
import FamilyBadge from "@src/components/FamilyBadge";
import PinnedNotesCarousel from "@src/components/PinnedNotesCarousel";
import ActiveProjectsCarousel from "@src/components/ActiveProjectsCarousel";
import SummaryCard from "@src/components/SummaryCard";
import SectionHeader from "@src/components/SectionHeader";
import NoteModal from "@src/components/NoteModal";
import FamilyEventModal from "@src/components/FamilyEventModal";
import ScheduleBlockModal from "@src/components/ScheduleBlockModal";
import ChoreAddModal from "@src/components/ChoreAddModal";
import ProjectModal from "@src/components/ProjectModal";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TYPE_COLORS: Record<BlockType, string> = {
  school: C.purple,
  hobby: C.red,
  other: C.teal,
};

const ASSIGNEE_COLORS: Record<AssigneeType, string> = {
  family: C.teal,
  member: C.purple,
  kid: C.red,
};

const todayDow = new Date().getDay();
const todayDate = toYMD(new Date());

// ---------------------------------------------------------------------------
// KidTodayCard
// ---------------------------------------------------------------------------

function KidTodayCard({
  kid,
  onBlockPress,
}: {
  kid: Kid;
  onBlockPress: (block: ScheduleBlock) => void;
}) {
  const router = useRouter();
  const blocks = useKidBlocksForDate(kid.id, todayDate, todayDow);

  return (
    <Card
      style={[styles.kidCard, { borderTopColor: kid.color }]}
      mode="elevated"
    >
      <Pressable onPress={() => router.push(`/kid/${kid.id}`)}>
        <View style={styles.kidHeader}>
          <Text style={styles.kidEmoji}>{kid.emoji}</Text>
          <View style={styles.kidEmojiSpacer} />
          <Text style={[styles.kidName, { color: kid.color }]}>
            {kid.name}
          </Text>
          <Text style={[styles.kidArrow, { color: kid.color }]}>‹</Text>
        </View>
      </Pressable>

      <View style={styles.kidBody}>
        {blocks.length === 0 ? (
          <Text style={styles.noSchedule}>{t("today.noSchedule")}</Text>
        ) : (
          blocks.map((block) => {
            const color = block.color ?? kid.color;
            const typeColor = TYPE_COLORS[block.type];
            return (
              <Pressable
                key={block.id}
                style={({ hovered }: any) => [
                  styles.blockRow,
                  hovered && styles.blockRowHover,
                ]}
                onPress={() => onBlockPress(block)}
              >
                <View style={[styles.blockStripe, { backgroundColor: color }]} />
                <View style={styles.blockInfo}>
                  <Text style={styles.blockTitle}>{block.title}</Text>
                  <Text style={styles.blockTime}>
                    {minutesToHHMM(block.startMinutes)} –{" "}
                    {minutesToHHMM(block.endMinutes)}
                    {block.location ? `  ·  ${block.location}` : ""}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.typeBadge,
                    { color: typeColor, backgroundColor: typeColor + "18" },
                  ]}
                >
                  {blockTypeLabel(block.type)}
                </Text>
              </Pressable>
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
  const [carouselOpen, setCarouselOpen] = useState(false);
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<FamilyEvent | null>(null);
  const [blockModalOpen, setBlockModalOpen] = useState(false);
  const [editingBlock, setEditingBlock] = useState<ScheduleBlock | null>(null);
  const [choreModalOpen, setChoreModalOpen] = useState(false);
  const [editingChore, setEditingChore] = useState<Chore | null>(null);
  const [hoveredChoreId, setHoveredChoreId] = useState<string | null>(null);
  const [projectsCarouselOpen, setProjectsCarouselOpen] = useState(false);
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const router = useRouter();

  const activeKids = kids.filter((k) => k.isActive);

  const unboughtCount = grocery.filter((g) => !g.isBought).length;
  const undoneChores = chores.filter((c) => c.selectedForToday && !c.done).length;
  const activeProjectsList = useMemo(
    () => projects.filter((p) => p.status === "in_progress"),
    [projects],
  );
  const inProgressProjects = activeProjectsList.length;
  const pinnedNotesList = useMemo(
    () => notes.filter((n) => n.pinned),
    [notes],
  );
  const pinnedNotes = pinnedNotesList.length;

  const todayChores = chores.filter((c) => c.selectedForToday);
  const todayEvents = useTodayFamilyEvents(todayDate, todayDow);

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
        <Text style={styles.title}>{t("today.title")}</Text>
        <FamilyBadge />

        {/* ── Overview stats ── */}
        <Card style={styles.overviewCard} mode="elevated">
          <View style={styles.statsRow}>
            <SummaryCard
              value={unboughtCount}
              label={t("today.groceryItems")}
              accentColor={C.red}
              onPress={() => router.push("/(tabs)/grocery")}
            />
            <View style={styles.dividerV} />
            <SummaryCard
              value={undoneChores}
              label={t("today.choresToDo")}
              accentColor={C.teal}
            />
          </View>
          <View style={styles.dividerH} />
          <View style={styles.statsRow}>
            <SummaryCard
              value={inProgressProjects}
              label={t("today.activeProjects")}
              accentColor={C.purple}
              onPress={() => setProjectsCarouselOpen((v) => !v)}
              expanded={projectsCarouselOpen}
            />
            <View style={styles.dividerV} />
            <SummaryCard
              value={pinnedNotes}
              label={t("today.pinnedNotes")}
              accentColor={C.amber}
              onPress={() => setCarouselOpen((v) => !v)}
              expanded={carouselOpen}
            />
          </View>
        </Card>

        {/* ── Pinned notes carousel ── */}
        {carouselOpen && pinnedNotesList.length > 0 && (
          <PinnedNotesCarousel
            notes={pinnedNotesList}
            onNotePress={(note) => {
              setEditingNote(note);
              setNoteModalOpen(true);
            }}
            onAddPress={() => {
              setEditingNote(null);
              setNoteModalOpen(true);
            }}
          />
        )}
        {carouselOpen && pinnedNotesList.length === 0 && (
          <Card style={styles.emptyCard} mode="elevated">
            <Card.Content style={styles.emptyContent}>
              <Text style={styles.emptyText}>{t("home.noNotes")}</Text>
              <Button
                mode="contained"
                compact
                onPress={() => {
                  setEditingNote(null);
                  setNoteModalOpen(true);
                }}
                style={[styles.emptyBtn, { backgroundColor: C.amber }]}
              >
                {t("today.addNote")}
              </Button>
            </Card.Content>
          </Card>
        )}

        {/* ── Active projects carousel ── */}
        {projectsCarouselOpen && activeProjectsList.length > 0 && (
          <ActiveProjectsCarousel
            projects={activeProjectsList}
            onProjectPress={(project) => {
              setEditingProject(project);
              setProjectModalOpen(true);
            }}
            onAddPress={() => {
              setEditingProject(null);
              setProjectModalOpen(true);
            }}
          />
        )}
        {projectsCarouselOpen && activeProjectsList.length === 0 && (
          <Card style={styles.emptyCard} mode="elevated">
            <Card.Content style={styles.emptyContent}>
              <Text style={styles.emptyText}>{t("today.noActiveProjects")}</Text>
              <Button
                mode="contained"
                compact
                onPress={() => {
                  setEditingProject(null);
                  setProjectModalOpen(true);
                }}
                style={[styles.emptyBtn, { backgroundColor: C.purple }]}
              >
                {t("today.addProject")}
              </Button>
            </Card.Content>
          </Card>
        )}

        {/* ── Today's chores ── */}
        <SectionHeader label={t("today.todayChores")} />
        <Card style={styles.card} mode="elevated">
          <Card.Content>
            {todayChores.length === 0 ? (
              <Text style={styles.emptyRowText}>
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
                  <View
                    key={chore.id}
                    style={[
                      styles.choreRow,
                      hoveredChoreId === chore.id && styles.rowHover,
                    ]}
                    {...(Platform.OS === "web"
                      ? {
                          onPointerEnter: () => setHoveredChoreId(chore.id),
                          onPointerLeave: () => setHoveredChoreId(null),
                        }
                      : ({} as any))}
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
                  </View>
                );
              })
            )}
          </Card.Content>
        </Card>

        {/* ── Family events ── */}
        <SectionHeader label={t("today.familyEvents")} />
        <Card style={styles.card} mode="elevated">
          <Card.Content>
            {todayEvents.length === 0 ? (
              <Text style={styles.emptyRowText}>
                {t("today.noEventsForToday")}
              </Text>
            ) : (
              todayEvents.map((event) => {
                const color =
                  event.color ?? ASSIGNEE_COLORS[event.assigneeType];
                let assigneeDisplay = t("today.wholeFamily");
                if (event.assigneeType === "member" && event.assigneeId) {
                  const member = familyMembers.find(
                    (m) => m.id === event.assigneeId,
                  );
                  assigneeDisplay = member
                    ? `${member.avatarEmoji ?? ""} ${member.name}`
                    : assigneeTypeLabel("member");
                } else if (
                  event.assigneeType === "kid" &&
                  event.assigneeId
                ) {
                  const kid = kids.find((k) => k.id === event.assigneeId);
                  assigneeDisplay = kid
                    ? `${kid.emoji}  ${kid.name}`
                    : assigneeTypeLabel("kid");
                }
                return (
                  <Pressable
                    key={event.id}
                    style={({ hovered }: any) => [
                      styles.blockRow,
                      hovered && styles.blockRowHover,
                    ]}
                    onPress={() => {
                      setEditingEvent(event);
                      setEventModalOpen(true);
                    }}
                  >
                    <View
                      style={[styles.blockStripe, { backgroundColor: color }]}
                    />
                    <View style={styles.blockInfo}>
                      <Text style={styles.blockTitle}>{event.title}</Text>
                      <Text style={styles.blockTime}>
                        {minutesToHHMM(event.startMinutes)} –{" "}
                        {minutesToHHMM(event.endMinutes)}
                        {event.location ? `  ·  ${event.location}` : ""}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.typeBadge,
                        {
                          color: ASSIGNEE_COLORS[event.assigneeType],
                          backgroundColor:
                            ASSIGNEE_COLORS[event.assigneeType] + "18",
                        },
                      ]}
                    >
                      {assigneeDisplay}
                    </Text>
                  </Pressable>
                );
              })
            )}
          </Card.Content>
        </Card>

        {/* ── Kids ── */}
        <SectionHeader label={t("today.kids")} />
        {activeKids.map((kid) => (
          <KidTodayCard
            key={kid.id}
            kid={kid}
            onBlockPress={(block) => {
              setEditingBlock(block);
              setBlockModalOpen(true);
            }}
          />
        ))}

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
        defaultDayOfWeek={todayDow}
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
        defaultDayOfWeek={todayDow}
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
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  container: { padding: S.lg, paddingBottom: S.xxl + S.lg },

  title: {
    fontSize: 28,
    fontWeight: "800",
    color: C.textPrimary,
    marginBottom: S.lg,
    textAlign: "right",
  },

  // ── Overview card ──────────────────────────────────────────────────────────
  overviewCard: {
    borderRadius: R.lg,
    backgroundColor: C.surface,
    marginBottom: S.xl,
    overflow: "hidden",
  },
  statsRow: {
    flexDirection: RTL_ROW,
  },
  dividerV: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: C.border,
  },
  dividerH: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: C.border,
  },

  // ── Shared card ───────────────────────────────────────────────────────────
  card: {
    borderRadius: R.lg,
    backgroundColor: C.surface,
    marginBottom: S.lg,
  },

  // ── Empty states ──────────────────────────────────────────────────────────
  emptyCard: {
    borderRadius: R.lg,
    backgroundColor: C.surface,
    marginBottom: S.lg,
  },
  emptyContent: { alignItems: "center", paddingVertical: S.lg },
  emptyText: {
    color: C.textMuted,
    textAlign: "center",
    marginBottom: S.md,
    fontSize: 14,
  },
  emptyBtn: { borderRadius: R.md },
  emptyRowText: {
    color: C.textMuted,
    textAlign: "right",
    fontSize: 14,
    paddingVertical: S.xs,
  },

  // ── Chore rows ─────────────────────────────────────────────────────────────
  choreRow: {
    flexDirection: RTL_ROW,
    alignItems: "center",
    paddingVertical: S.xs,
    borderRadius: R.sm,
    paddingHorizontal: S.xs,
  },
  rowHover: { backgroundColor: C.hoverBg },
  choreCheck: { margin: 0 },
  choreTextWrap: { flex: 1, marginStart: S.xs },
  choreTitle: {
    fontSize: 15,
    color: C.textPrimary,
    textAlign: "right",
  },
  choreDone: {
    fontSize: 15,
    textDecorationLine: "line-through",
    color: C.textMuted,
    textAlign: "right",
  },
  choreAssignee: {
    fontSize: 12,
    color: C.textSecondary,
    textAlign: "right",
    marginTop: 1,
  },

  // ── Block / event rows ────────────────────────────────────────────────────
  blockRow: {
    flexDirection: RTL_ROW,
    alignItems: "center",
    paddingVertical: S.md,
    borderRadius: R.sm,
    paddingHorizontal: S.xs,
    ...(Platform.OS === "web" ? ({ cursor: "pointer" } as any) : {}),
  },
  blockRowHover: { backgroundColor: C.hoverBg },
  blockStripe: {
    width: 3,
    borderRadius: 2,
    alignSelf: "stretch",
    marginEnd: S.md,
    marginStart: S.xs,
  },
  blockInfo: { flex: 1 },
  blockTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: C.textPrimary,
    textAlign: "right",
  },
  blockTime: {
    fontSize: 12,
    color: C.textSecondary,
    marginTop: 2,
    textAlign: "right",
  },
  typeBadge: {
    fontSize: 10,
    fontWeight: "600",
    paddingHorizontal: S.sm,
    paddingVertical: 3,
    borderRadius: R.sm,
    overflow: "hidden",
    marginStart: S.sm,
  },

  // ── Kid cards ─────────────────────────────────────────────────────────────
  kidCard: {
    borderRadius: R.lg,
    backgroundColor: C.surface,
    marginBottom: S.md,
    borderTopWidth: 2,
    overflow: "hidden",
  },
  kidHeader: {
    flexDirection: RTL_ROW,
    alignItems: "center",
    paddingHorizontal: S.lg,
    paddingVertical: S.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
  },
  kidEmoji: { fontSize: 20 },
  kidEmojiSpacer: { width: S.sm },
  kidName: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    textAlign: "right",
  },
  kidArrow: {
    fontSize: 20,
    fontWeight: "700",
    color: C.textMuted,
  },
  kidBody: { paddingHorizontal: S.lg, paddingBottom: S.md },
  noSchedule: {
    color: C.textMuted,
    textAlign: "right",
    paddingVertical: S.sm,
    fontSize: 13,
  },

  // ── Sync footer ───────────────────────────────────────────────────────────
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
    textAlign: "right",
  },
});
