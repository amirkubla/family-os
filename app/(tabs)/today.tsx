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
import FamilyBadge from "@src/components/FamilyBadge";
import PinnedNotesCarousel from "@src/components/PinnedNotesCarousel";
import ActiveProjectsCarousel from "@src/components/ActiveProjectsCarousel";
import NoteModal from "@src/components/NoteModal";
import FamilyEventModal from "@src/components/FamilyEventModal";
import ScheduleBlockModal from "@src/components/ScheduleBlockModal";
import ChoreAddModal from "@src/components/ChoreAddModal";
import ProjectModal from "@src/components/ProjectModal";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TYPE_COLORS: Record<BlockType, string> = {
  school: "#6C63FF",
  hobby: "#FF6B6B",
  other: "#4ECDC4",
};

const ASSIGNEE_COLORS: Record<AssigneeType, string> = {
  family: "#4ECDC4",
  member: "#6C63FF",
  kid: "#FF6B6B",
};

const todayDow = new Date().getDay();
const todayDate = toYMD(new Date());

// ---------------------------------------------------------------------------
// KidTodayCard — shows a single kid's today schedule
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
    <Card style={[styles.kidCard, { borderColor: kid.color + "44" }]} mode="elevated">
      <Pressable onPress={() => router.push(`/kid/${kid.id}`)}>
        <View style={[styles.kidHeader, { backgroundColor: kid.color + "18" }]}>
          <Text style={styles.kidEmoji}>{kid.emoji}</Text>
          <View style={styles.kidEmojiSpacer} />
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
              <Pressable key={block.id} style={({ hovered }: any) => [styles.blockRow, hovered && styles.blockRowHover]} onPress={() => onBlockPress(block)}>
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
  const undoneChores = chores.filter((c) => !c.done).length;
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
        <Text variant="headlineLarge" style={styles.title}>
          {t("today.title")}
        </Text>
        <FamilyBadge />

        {/* Overview */}
        <Card style={styles.card} mode="elevated">
          <Card.Content>
            <Text variant="titleMedium" style={styles.cardTitle}>
              {t("today.overview")}
            </Text>
            <View style={styles.statsGrid}>
              <Pressable
                style={[styles.stat, { backgroundColor: "#FFE0E0" }]}
                onPress={() => router.push("/(tabs)/grocery")}
              >
                <Text style={[styles.statNum, { color: "#FF6B6B" }]}>
                  {unboughtCount}
                </Text>
                <Text style={styles.statLabel}>{t("today.groceryItems")}</Text>
              </Pressable>
              <View style={[styles.stat, { backgroundColor: "#D4F5F2" }]}>
                <Text style={[styles.statNum, { color: "#4ECDC4" }]}>
                  {undoneChores}
                </Text>
                <Text style={styles.statLabel}>{t("today.choresToDo")}</Text>
              </View>
              <Pressable
                style={[styles.stat, { backgroundColor: "#E8E6FF" }]}
                onPress={() => setProjectsCarouselOpen((v) => !v)}
              >
                <Text style={[styles.statNum, { color: "#6C63FF" }]}>
                  {inProgressProjects}
                </Text>
                <Text style={styles.statLabel}>
                  {t("today.activeProjects")} {projectsCarouselOpen ? "\u25B2" : "\u25BC"}
                </Text>
              </Pressable>
              <Pressable
                style={[styles.stat, { backgroundColor: "#FFF3E0" }]}
                onPress={() => setCarouselOpen((v) => !v)}
              >
                <Text style={[styles.statNum, { color: "#FFA726" }]}>
                  {pinnedNotes}
                </Text>
                <Text style={styles.statLabel}>
                  {t("today.pinnedNotes")} {carouselOpen ? "▲" : "▼"}
                </Text>
              </Pressable>
            </View>
          </Card.Content>
        </Card>

        {/* Pinned notes carousel */}
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
          <Card style={styles.card} mode="elevated">
            <Card.Content style={styles.emptyCarousel}>
              <Text variant="bodyMedium" style={styles.emptyCarouselText}>
                {t("home.noNotes")}
              </Text>
              <Button
                mode="contained"
                compact
                onPress={() => {
                  setEditingNote(null);
                  setNoteModalOpen(true);
                }}
                style={styles.emptyCarouselBtn}
              >
                {t("today.addNote")}
              </Button>
            </Card.Content>
          </Card>
        )}

        {/* Active projects carousel */}
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
          <Card style={styles.card} mode="elevated">
            <Card.Content style={styles.emptyCarousel}>
              <Text variant="bodyMedium" style={styles.emptyCarouselText}>
                {t("today.noActiveProjects")}
              </Text>
              <Button
                mode="contained"
                compact
                onPress={() => {
                  setEditingProject(null);
                  setProjectModalOpen(true);
                }}
                style={styles.emptyCarouselBtnPurple}
              >
                {t("today.addProject")}
              </Button>
            </Card.Content>
          </Card>
        )}

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
                  <View
                    key={chore.id}
                    style={[styles.choreRow, hoveredChoreId === chore.id && styles.choreRowHover]}
                    {...(Platform.OS === "web" ? {
                      onPointerEnter: () => setHoveredChoreId(chore.id),
                      onPointerLeave: () => setHoveredChoreId(null),
                    } : {} as any)}
                  >
                    <IconButton
                      icon={chore.done ? "check-circle" : "circle-outline"}
                      size={24}
                      iconColor={chore.done ? "#4ECDC4" : "#C0BDD8"}
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
                    </Pressable>
                  </View>
                );
              })
            )}
          </Card.Content>
        </Card>

        {/* Family Events for today */}
        <Text variant="titleMedium" style={styles.sectionTitle}>
          {t("today.familyEvents")}
        </Text>
        <Card style={styles.card} mode="elevated">
          <Card.Content>
            {todayEvents.length === 0 ? (
              <Text variant="bodyMedium" style={styles.choreEmpty}>
                {t("today.noEventsForToday")}
              </Text>
            ) : (
              todayEvents.map((event) => {
                const color = event.color ?? ASSIGNEE_COLORS[event.assigneeType];
                let assigneeDisplay = t("today.wholeFamily");
                if (event.assigneeType === "member" && event.assigneeId) {
                  const member = familyMembers.find((m) => m.id === event.assigneeId);
                  assigneeDisplay = member
                    ? `${member.avatarEmoji ?? ""} ${member.name}`
                    : assigneeTypeLabel("member");
                } else if (event.assigneeType === "kid" && event.assigneeId) {
                  const kid = kids.find((k) => k.id === event.assigneeId);
                  assigneeDisplay = kid
                    ? `${kid.emoji}  ${kid.name}`
                    : assigneeTypeLabel("kid");
                }
                return (
                  <Pressable
                    key={event.id}
                    style={({ hovered }: any) => [styles.blockRow, hovered && styles.blockRowHover]}
                    onPress={() => {
                      setEditingEvent(event);
                      setEventModalOpen(true);
                    }}
                  >
                    <View style={[styles.blockStripe, { backgroundColor: color }]} />
                    <View style={styles.blockInfo}>
                      <Text variant="bodyMedium" style={styles.blockTitle}>
                        {event.title}
                      </Text>
                      <Text variant="bodySmall" style={styles.blockTime}>
                        {minutesToHHMM(event.startMinutes)} – {minutesToHHMM(event.endMinutes)}
                        {event.location ? `  ·  ${event.location}` : ""}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.blockType,
                        {
                          color: ASSIGNEE_COLORS[event.assigneeType],
                          backgroundColor: ASSIGNEE_COLORS[event.assigneeType] + "22",
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

        {/* Kids — per-kid today schedule */}
        <Text variant="titleMedium" style={styles.sectionTitle}>
          {t("today.kids")}
        </Text>
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

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FAFAFE" },
  container: { padding: 20, paddingBottom: 40 },
  title: { fontWeight: "800", color: "#1A1A2E", marginBottom: 20, textAlign: "right" },

  // Sync card
  syncCard: { borderRadius: 16, backgroundColor: "#FFFFFF", marginTop: 16, marginBottom: 16 },
  syncContent: {
    flexDirection: RTL_ROW,
    alignItems: "center",
    justifyContent: "space-between",
  },
  syncLeft: { flex: 1 },
  syncTitle: { fontWeight: "700", color: "#1A1A2E", textAlign: "right" },
  syncMeta: { color: "#6B6B8D", marginTop: 2, textAlign: "right" },
  syncBtn: { borderRadius: 12, marginStart: 12 },

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
    flexDirection: RTL_ROW,
    alignItems: "center",
    paddingVertical: 4,
    borderRadius: 8,
    paddingHorizontal: 4,
  },
  choreRowHover: {
    backgroundColor: "#DBEAFE",
  },
  choreCheck: { margin: 0 },
  choreTextWrap: { flex: 1, marginStart: 4 },
  choreText: { textAlign: "right" },
  choreDoneText: { textDecorationLine: "line-through", color: "#8E8BA8", textAlign: "right" },
  choreAssignee: { color: "#6B6B8D", textAlign: "right" },
  choreEmpty: { color: "#8E8BA8", textAlign: "right" },

  // Pinned notes carousel empty
  emptyCarousel: { alignItems: "center", paddingVertical: 16 },
  emptyCarouselText: { color: "#8E8BA8", textAlign: "center", marginBottom: 12 },
  emptyCarouselBtn: { borderRadius: 12, backgroundColor: "#FFA726" },
  emptyCarouselBtnPurple: { borderRadius: 12, backgroundColor: "#6C63FF" },

  // Kid today cards
  kidCard: {
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    marginBottom: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  kidHeader: {
    flexDirection: RTL_ROW,
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  kidEmoji: { fontSize: 22 },
  kidEmojiSpacer: { width: 5 },
  kidName: { flex: 1, fontWeight: "700", textAlign: "right" },
  kidArrow: { fontSize: 20, fontWeight: "700" },
  kidBody: { paddingHorizontal: 16, paddingBottom: 14 },
  noSchedule: { color: "#8E8BA8", textAlign: "right", paddingVertical: 4 },

  // Block rows inside kid cards
  blockRow: {
    flexDirection: RTL_ROW,
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: 8,
    paddingHorizontal: 4,
    ...(Platform.OS === "web" ? { cursor: "pointer" } : {}),
  },
  blockRowHover: {
    backgroundColor: "#DBEAFE",
  },
  blockStripe: {
    width: 4,
    borderRadius: 2,
    alignSelf: "stretch",
    marginEnd: 12,
    marginStart: 4,
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
    marginStart: 8,
  },
});
