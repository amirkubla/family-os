import React, { useState, useMemo, useCallback } from "react";
import { View, StyleSheet, ScrollView, Pressable, Platform } from "react-native";
import {
  Text,
  IconButton,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { useFamilyStore } from "@src/store/useFamilyStore";
import type { Note } from "@src/models/note";
import type { Chore } from "@src/models/chore";
import type { Project } from "@src/models/project";
import type { Kid } from "@src/models/kid";
import {
  toggleNotePinnedRemote,
  deleteNoteRemote,
  toggleChoreDoneRemote,
  toggleChoreSelectedForTodayRemote,
  deleteChoreRemote,
  deleteProjectRemote,
} from "@src/lib/sync/remoteCrud";
import NoteModal from "@src/components/NoteModal";
import ChoreAddModal from "@src/components/ChoreAddModal";
import ProjectModal from "@src/components/ProjectModal";
import KidModal from "@src/components/KidModal";
import ConfirmDeleteModal from "@src/components/ConfirmDeleteModal";
import { useConfirmDelete } from "@src/hooks/useConfirmDelete";
import { t, statusLabel } from "@src/i18n";
import FamilyBadge from "@src/components/FamilyBadge";
import SectionHeader from "@src/components/SectionHeader";
import { RTL_ROW, TEXT_RIGHT } from "@src/ui/rtl";
import { C, R, S, SHADOW } from "@src/ui/tokens";
import { STATUS_COLORS } from "@src/ui/semanticColors";

// Note section colors (warm amber/yellow palette)
const NOTE_COLORS = {
  accent: "#D97706",       // warm amber
  bg: "#FFFBF0",           // soft cream
  bgPinned: "#FFF8E1",     // warmer cream for pinned
  border: "#F5E6C8",       // subtle amber border
  borderPinned: "#EAD49B", // stronger amber for pinned
  hover: "#FFF3D6",        // warm hover
  barDefault: "#E8D5B0",   // muted bar
} as const;

// Chore section colors (teal/green productivity palette)
const CHORE_COLORS = {
  accent: "#0D9488",        // teal-600
  accentLight: "#14B8A6",   // teal-500
  bg: "#F0FDFA",            // teal-50
  bgDone: "#F7F7F8",        // neutral muted
  border: "#CCFBF1",        // teal-100
  borderDone: "#E5E5EA",
  hover: "#E0FAF5",
  checkBg: "#0D948818",
  checkBgDone: "#0D948830",
  todayBadge: "#FEF3C7",    // amber-100
  todayBadgeText: "#B45309", // amber-700
} as const;

// Project section colors (purple/indigo board palette)
const PROJECT_COLORS = {
  accent: "#6C63FF",        // indigo
  bg: "#F8F7FF",            // faint lavender
  border: "#E8E5FF",        // light indigo border
  hover: "#EEEAFF",         // warm hover
} as const;

// ---------------------------------------------------------------------------
// ChoreRow — reusable row for both sections
// ---------------------------------------------------------------------------

function ChoreRow({ chore, onEdit, onDelete }: { chore: Chore; onEdit: () => void; onDelete: () => void }) {
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
      style={({ pressed, hovered }: any) => [
        styles.choreCard,
        chore.done && styles.choreCardDone,
        hovered && !chore.done && styles.choreCardHover,
        pressed && { transform: [{ scale: 0.98 }] },
      ]}
      onPress={onEdit}
    >
      {/* Checkbox circle */}
      <Pressable
        style={[styles.choreCheckCircle, chore.done && styles.choreCheckCircleDone]}
        onPress={() => toggleChoreDoneRemote(chore.id)}
      >
        {chore.done ? (
          <Text style={{ fontSize: 14, color: "#fff" }}>✓</Text>
        ) : null}
      </Pressable>

      {/* Content */}
      <View style={styles.choreContent}>
        <View style={styles.choreTopLine}>
          <Text
            style={[styles.choreTitle, chore.done && styles.choreTitleDone]}
            numberOfLines={1}
          >
            {chore.title}
          </Text>
          {chore.selectedForToday && !chore.done && (
            <View style={styles.choreTodayBadge}>
              <Text style={styles.choreTodayBadgeText}>⭐ היום</Text>
            </View>
          )}
        </View>
        {assigneeDisplay ? (
          <Text style={styles.choreAssignee}>
            {assigneeDisplay}
          </Text>
        ) : null}
      </View>

      {/* Actions */}
      <View style={styles.choreActions}>
        <IconButton
          icon={chore.selectedForToday ? "white-balance-sunny" : "white-balance-sunny"}
          size={16}
          iconColor={chore.selectedForToday ? C.amber : C.textMuted}
          style={styles.choreActionBtn}
          onPress={() => toggleChoreSelectedForTodayRemote(chore.id)}
        />
        <IconButton
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

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function HomeScreen() {
  const router = useRouter();
  const { confirmVisible, requestDelete, confirmDelete, dismissConfirm } = useConfirmDelete();

  // Store
  const notes = useFamilyStore((s) => s.notes);
  const chores = useFamilyStore((s) => s.chores);
  const projects = useFamilyStore((s) => s.projects);
  const kids = useFamilyStore((s) => s.kids);
  const activeKids = useMemo(() => kids.filter((k) => k.isActive), [kids]);

  // Collapse/expand state for home sections (persisted in the store).
  const homeSections = useFamilyStore((s) => s.homeSections);
  const toggleHomeSection = useFamilyStore((s) => s.toggleHomeSection);

  // Modals
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [choreModalOpen, setChoreModalOpen] = useState(false);
  const [editingChore, setEditingChore] = useState<Chore | null>(null);
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [kidModalOpen, setKidModalOpen] = useState(false);
  const [editingKid, setEditingKid] = useState<Kid | null>(null);
  const [showAllNotes, setShowAllNotes] = useState(false);

  // Reset expanded notes when navigating back to home
  useFocusEffect(useCallback(() => { setShowAllNotes(false); }, []));

  // Notes sorted: pinned first
  const sortedNotes = [...notes].sort(
    (a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0)
  );
  const NOTES_LIMIT = 5;
  const visibleNotes = showAllNotes ? sortedNotes : sortedNotes.slice(0, NOTES_LIMIT);
  const hasMoreNotes = sortedNotes.length > NOTES_LIMIT;

  // Chores split
  const selectedChores = chores.filter((c) => c.selectedForToday);
  const backlogChores = chores.filter((c) => !c.selectedForToday);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>{t("home.title")}</Text>
        <FamilyBadge />

        {/* -- Kids -- */}
        <SectionHeader label={t("home.kids")} />
        <View style={styles.kidsContainer}>
          <View style={styles.kidsHeaderRow}>
            <View style={{ flex: 1 }} />
            <IconButton
              icon="plus"
              size={20}
              style={styles.kidsAddBtn}
              onPress={() => {
                setEditingKid(null);
                setKidModalOpen(true);
              }}
            />
          </View>

          {activeKids.length === 0 && (
            <Text variant="bodyMedium" style={{ color: C.textMuted, textAlign: TEXT_RIGHT, fontSize: 14, paddingVertical: S.xs }}>
              {t("home.noKids")}
            </Text>
          )}

          <View style={styles.kidsRow}>
            {activeKids.map((kid) => (
              <Pressable
                key={kid.id}
                style={({ pressed, hovered }: any) => [
                  styles.kidCard,
                  {
                    backgroundColor: kid.color + "10",
                    borderColor: kid.color + "30",
                  },
                  hovered && {
                    backgroundColor: kid.color + "20",
                    borderColor: kid.color + "50",
                    transform: [{ translateY: -2 }],
                    ...SHADOW.md,
                  },
                  pressed && {
                    backgroundColor: kid.color + "28",
                    transform: [{ scale: 0.97 }],
                  },
                ]}
                onPress={() => router.push(`/kid/${kid.id}`)}
              >
                <View style={[styles.kidAvatarCircle, { backgroundColor: kid.color + "18" }]}>
                  <Text style={styles.kidEmoji}>{kid.emoji}</Text>
                </View>
                <View style={styles.kidInfo}>
                  <Text style={[styles.kidName, { color: C.textPrimary }]}>{kid.name}</Text>
                  <Text style={[styles.kidScheduleHint, { color: kid.color }]}>
                    {t("home.viewSchedule")}
                  </Text>
                </View>
                <Text style={[styles.kidArrow, { color: kid.color + "90" }]}>‹</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* -- Notes -- */}
        <SectionHeader
          label={t("home.notes")}
          collapsible
          expanded={homeSections.notes}
          onToggle={() => toggleHomeSection("notes")}
          testID="home-section-notes"
        />
        {homeSections.notes && (
        <View style={styles.notesContainer}>
          <View style={styles.notesHeaderRow}>
            <View style={{ flex: 1 }} />
            <IconButton
              icon="plus"
              size={20}
              style={styles.notesAddBtn}
              iconColor={NOTE_COLORS.accent}
              onPress={() => {
                setEditingNote(null);
                setNoteModalOpen(true);
              }}
            />
          </View>

          {notes.length === 0 && (
            <Text variant="bodyMedium" style={styles.notesEmpty}>
              {t("home.noNotes")}
            </Text>
          )}

          <View style={styles.notesGrid}>
            {visibleNotes.map((note) => (
              <Pressable
                key={note.id}
                style={({ pressed, hovered }: any) => [
                  styles.noteCard,
                  note.pinned && styles.noteCardPinned,
                  hovered && styles.noteCardHover,
                  pressed && styles.noteCardPressed,
                ]}
                onPress={() => {
                  setEditingNote(note);
                  setNoteModalOpen(true);
                }}
              >
                {/* Top row: pin icon + actions */}
                <View style={styles.noteTopRow}>
                  <View style={styles.noteIcon}>
                    <Text style={{ fontSize: 18 }}>{note.pinned ? "📌" : "📝"}</Text>
                  </View>
                  <View style={{ flex: 1 }} />
                  <IconButton
                    icon={note.pinned ? "pin-off" : "pin"}
                    size={16}
                    iconColor={NOTE_COLORS.accent}
                    style={styles.noteActionBtn}
                    onPress={() => toggleNotePinnedRemote(note.id)}
                  />
                  <IconButton
                    icon="trash-can-outline"
                    size={16}
                    iconColor={C.textMuted}
                    style={styles.noteActionBtn}
                    onPress={() => requestDelete(() => deleteNoteRemote(note.id))}
                  />
                </View>

                {/* Note content */}
                <Text style={styles.noteTitle} numberOfLines={1}>
                  {note.title || t("home.note")}
                </Text>
                {note.body ? (
                  <Text style={styles.noteBody} numberOfLines={3}>
                    {note.body}
                  </Text>
                ) : null}

                {/* Bottom accent bar */}
                <View style={[
                  styles.noteAccentBar,
                  note.pinned && { backgroundColor: NOTE_COLORS.accent },
                ]} />
              </Pressable>
            ))}
          </View>

          {hasMoreNotes && !showAllNotes && (
            <Pressable
              style={styles.showAllNotesBtn}
              onPress={() => setShowAllNotes(true)}
            >
              <Text style={styles.showAllNotesLabel}>
                {t("home.showAllNotes", { count: sortedNotes.length })}
              </Text>
            </Pressable>
          )}
        </View>
        )}

        {/* -- Chores -- */}
        <SectionHeader
          label={t("home.chores")}
          collapsible
          expanded={homeSections.chores}
          onToggle={() => toggleHomeSection("chores")}
          testID="home-section-chores"
        />
        {homeSections.chores && (
        <View style={styles.choresContainer}>
          <View style={styles.choresHeaderRow}>
            {/* Stats pill */}
            {chores.length > 0 && (
              <View style={styles.choresStatsPill}>
                <Text style={styles.choresStatsText}>
                  {chores.filter((c) => c.done).length}/{chores.length} ✓
                </Text>
              </View>
            )}
            <View style={{ flex: 1 }} />
            <IconButton
              icon="plus"
              size={20}
              style={styles.choresAddBtn}
              iconColor={CHORE_COLORS.accent}
              onPress={() => {
                setEditingChore(null);
                setChoreModalOpen(true);
              }}
            />
          </View>

          {chores.length === 0 && (
            <View style={styles.choresEmptyState}>
              <Text style={{ fontSize: 32 }}>🎉</Text>
              <Text style={styles.choresEmptyText}>{t("home.allClear")}</Text>
            </View>
          )}

          {/* Selected for today */}
          {selectedChores.length > 0 && (
            <>
              <View style={styles.choresSectionHeader}>
                <View style={styles.choresSectionDot} />
                <Text style={styles.choresSectionTitle}>
                  {t("home.selectedForToday")}
                </Text>
                <Text style={styles.choresSectionCount}>{selectedChores.length}</Text>
              </View>
              {selectedChores.map((chore) => (
                <ChoreRow
                  key={chore.id}
                  chore={chore}
                  onEdit={() => {
                    setEditingChore(chore);
                    setChoreModalOpen(true);
                  }}
                  onDelete={() => requestDelete(() => deleteChoreRemote(chore.id))}
                />
              ))}
            </>
          )}

          {/* Divider between sections */}
          {selectedChores.length > 0 && backlogChores.length > 0 && (
            <View style={styles.choresDivider}>
              <View style={styles.choresDividerLine} />
            </View>
          )}

          {/* Backlog */}
          {backlogChores.length > 0 && (
            <>
              {selectedChores.length > 0 && (
                <View style={styles.choresSectionHeader}>
                  <View style={[styles.choresSectionDot, { backgroundColor: C.textMuted }]} />
                  <Text style={[styles.choresSectionTitle, { color: C.textSecondary }]}>
                    {t("home.backlog")}
                  </Text>
                  <Text style={styles.choresSectionCount}>{backlogChores.length}</Text>
                </View>
              )}
              {backlogChores.map((chore) => (
                <ChoreRow
                  key={chore.id}
                  chore={chore}
                  onEdit={() => {
                    setEditingChore(chore);
                    setChoreModalOpen(true);
                  }}
                  onDelete={() => requestDelete(() => deleteChoreRemote(chore.id))}
                />
              ))}
            </>
          )}
        </View>
        )}

        {/* -- Projects -- */}
        <SectionHeader
          label={t("home.projects")}
          collapsible
          expanded={homeSections.projects}
          onToggle={() => toggleHomeSection("projects")}
          testID="home-section-projects"
        />
        {homeSections.projects && (
        <View style={styles.projectsContainer}>
          <View style={styles.projectsHeaderRow}>
            {projects.length > 0 && (
              <View style={styles.projectsStatsPill}>
                <Text style={styles.projectsStatsText}>
                  {projects.filter((p) => p.status === "in_progress").length} {t("today.activeProjects").toLowerCase()}
                </Text>
              </View>
            )}
            <View style={{ flex: 1 }} />
            <IconButton
              icon="plus"
              size={20}
              style={styles.projectsAddBtn}
              iconColor={PROJECT_COLORS.accent}
              onPress={() => {
                setEditingProject(null);
                setProjectModalOpen(true);
              }}
            />
          </View>

          {projects.length === 0 && (
            <View style={styles.projectsEmptyState}>
              <Text style={{ fontSize: 32 }}>🚀</Text>
              <Text style={styles.projectsEmptyText}>{t("home.noProjects")}</Text>
            </View>
          )}

          {projects.map((proj) => {
            const statusColor = STATUS_COLORS[proj.status];
            const statusEmoji = proj.status === "done" ? "✅" : proj.status === "in_progress" ? "🔨" : "💡";
            return (
              <Pressable
                key={proj.id}
                style={({ pressed, hovered }: any) => [
                  styles.projectCard,
                  hovered && styles.projectCardHover,
                  pressed && { transform: [{ scale: 0.98 }] },
                ]}
                onPress={() => {
                  setEditingProject(proj);
                  setProjectModalOpen(true);
                }}
              >
                {/* Left accent stripe */}
                <View style={[styles.projectStripe, { backgroundColor: statusColor }]} />

                {/* Main content */}
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
                      style={styles.projectActionBtn}
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

                  {/* Progress bar */}
                  <View style={styles.projectProgressRow}>
                    <View style={styles.projectProgressTrack}>
                      <View
                        style={[
                          styles.projectProgressFill,
                          {
                            backgroundColor: statusColor,
                            width: `${proj.progress}%` as any,
                          },
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
      </ScrollView>

      <NoteModal
        visible={noteModalOpen}
        onDismiss={() => {
          setNoteModalOpen(false);
          setEditingNote(null);
        }}
        editNote={editingNote}
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
      <KidModal
        visible={kidModalOpen}
        onDismiss={() => {
          setKidModalOpen(false);
          setEditingKid(null);
        }}
        editKid={editingKid}
      />
      <ConfirmDeleteModal
        visible={confirmVisible}
        onConfirm={confirmDelete}
        onDismiss={dismissConfirm}
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
  // Kids
  kidsContainer: {
    gap: S.xs,
  },
  kidsHeaderRow: {
    flexDirection: RTL_ROW,
    alignItems: "center",
    marginBottom: S.xs,
  },
  kidsAddBtn: {
    margin: 0,
  },
  kidsRow: {
    flexDirection: RTL_ROW,
    flexWrap: "wrap",
    gap: S.md,
  },
  kidCard: {
    flexDirection: RTL_ROW,
    alignItems: "center",
    paddingVertical: S.lg,
    paddingHorizontal: S.lg + 4,
    borderRadius: R.lg,
    borderWidth: 1,
    gap: S.md,
    ...(Platform.OS === "web"
      ? { minWidth: 160, flex: 1, cursor: "pointer" as any, transition: "all 0.2s ease", ...SHADOW.sm }
      : { width: "100%" as any }),
  },
  kidAvatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  kidEmoji: { fontSize: 26 },
  kidInfo: {
    flex: 1,
    gap: 2,
  },
  kidName: { fontWeight: "700", fontSize: 16 },
  kidScheduleHint: { fontSize: 12, fontWeight: "500" },
  kidArrow: { fontSize: 20, fontWeight: "700" },

  // Notes
  notesContainer: {
    gap: S.xs,
  },
  notesHeaderRow: {
    flexDirection: RTL_ROW,
    alignItems: "center",
    marginBottom: S.xs,
  },
  notesAddBtn: {
    margin: 0,
    backgroundColor: NOTE_COLORS.accent + "12",
    borderRadius: R.sm,
  },
  notesEmpty: {
    color: C.textMuted,
    textAlign: TEXT_RIGHT,
    fontSize: 14,
    paddingVertical: S.lg,
  },
  notesGrid: {
    flexDirection: RTL_ROW,
    flexWrap: "wrap",
    gap: S.md,
  },
  noteCard: {
    backgroundColor: NOTE_COLORS.bg,
    borderWidth: 1,
    borderColor: NOTE_COLORS.border,
    borderRadius: R.lg,
    padding: S.lg,
    minWidth: 160,
    flex: 1,
    maxWidth: "100%" as any,
    ...SHADOW.sm,
    ...(Platform.OS === "web"
      ? { cursor: "pointer" as any, transition: "all 0.2s ease" }
      : {}),
    overflow: "hidden" as const,
  },
  noteCardPinned: {
    backgroundColor: NOTE_COLORS.bgPinned,
    borderColor: NOTE_COLORS.borderPinned,
  },
  noteCardHover: {
    backgroundColor: NOTE_COLORS.hover,
    borderColor: NOTE_COLORS.borderPinned,
    transform: [{ translateY: -2 }],
    ...SHADOW.md,
  },
  noteCardPressed: {
    transform: [{ scale: 0.97 }],
  },
  noteTopRow: {
    flexDirection: RTL_ROW,
    alignItems: "center",
    marginBottom: S.sm,
  },
  noteIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: NOTE_COLORS.accent + "14",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  noteActionBtn: {
    margin: 0,
    width: 28,
    height: 28,
  },
  noteTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: C.textPrimary,
    textAlign: TEXT_RIGHT,
    marginBottom: 4,
  },
  noteBody: {
    fontSize: 13,
    color: C.textSecondary,
    textAlign: TEXT_RIGHT,
    lineHeight: 19,
  },
  noteAccentBar: {
    height: 3,
    borderRadius: 2,
    backgroundColor: NOTE_COLORS.barDefault,
    marginTop: S.md,
  },
  showAllNotesBtn: {
    alignSelf: "center",
    paddingVertical: S.sm + 2,
    paddingHorizontal: S.xl,
    borderRadius: R.md,
    backgroundColor: NOTE_COLORS.bg,
    borderWidth: 1,
    borderColor: NOTE_COLORS.border,
    marginTop: S.sm,
  },
  showAllNotesLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: NOTE_COLORS.accent,
    textAlign: "center",
  },

  // Chores
  choresContainer: {
    gap: S.xs,
  },
  choresHeaderRow: {
    flexDirection: RTL_ROW,
    alignItems: "center",
    marginBottom: S.sm,
  },
  choresAddBtn: {
    margin: 0,
    backgroundColor: CHORE_COLORS.accent + "12",
    borderRadius: R.sm,
  },
  choresStatsPill: {
    backgroundColor: CHORE_COLORS.accent + "14",
    paddingHorizontal: S.md,
    paddingVertical: S.xs,
    borderRadius: 20,
  },
  choresStatsText: {
    fontSize: 13,
    fontWeight: "700",
    color: CHORE_COLORS.accent,
  },
  choresEmptyState: {
    alignItems: "center" as const,
    paddingVertical: S.xl,
    gap: S.sm,
  },
  choresEmptyText: {
    color: C.textMuted,
    fontSize: 14,
  },
  choresSectionHeader: {
    flexDirection: RTL_ROW,
    alignItems: "center",
    gap: S.sm,
    marginTop: S.sm,
    marginBottom: S.xs,
  },
  choresSectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: CHORE_COLORS.accent,
  },
  choresSectionTitle: {
    color: CHORE_COLORS.accent,
    fontWeight: "700",
    fontSize: 14,
  },
  choresSectionCount: {
    fontSize: 12,
    fontWeight: "600",
    color: C.textMuted,
    backgroundColor: C.hoverBg,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    overflow: "hidden" as const,
  },
  choresDivider: {
    paddingVertical: S.md,
    alignItems: "center" as const,
  },
  choresDividerLine: {
    height: 1,
    width: "90%" as any,
    backgroundColor: CHORE_COLORS.border,
  },
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
    ...(Platform.OS === "web"
      ? { cursor: "pointer" as any, transition: "all 0.2s ease" }
      : {}),
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
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  choreCheckCircleDone: {
    backgroundColor: CHORE_COLORS.accent,
    borderColor: CHORE_COLORS.accent,
  },
  choreContent: {
    flex: 1,
    gap: 2,
  },
  choreTopLine: {
    flexDirection: RTL_ROW,
    alignItems: "center",
    gap: S.sm,
  },
  choreTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: C.textPrimary,
    textAlign: TEXT_RIGHT,
    flex: 1,
  },
  choreTitleDone: {
    textDecorationLine: "line-through" as const,
    color: C.textMuted,
    fontWeight: "400" as const,
  },
  choreTodayBadge: {
    backgroundColor: CHORE_COLORS.todayBadge,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  choreTodayBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: CHORE_COLORS.todayBadgeText,
  },
  choreAssignee: {
    fontSize: 12,
    color: C.textSecondary,
    textAlign: TEXT_RIGHT,
    marginTop: 1,
  },
  choreActions: {
    flexDirection: RTL_ROW,
    alignItems: "center",
  },
  choreActionBtn: {
    margin: 0,
    width: 28,
    height: 28,
  },

  // Projects
  projectsContainer: {
    gap: S.xs,
  },
  projectsHeaderRow: {
    flexDirection: RTL_ROW,
    alignItems: "center",
    marginBottom: S.sm,
  },
  projectsAddBtn: {
    margin: 0,
    backgroundColor: PROJECT_COLORS.accent + "12",
    borderRadius: R.sm,
  },
  projectsStatsPill: {
    backgroundColor: PROJECT_COLORS.accent + "14",
    paddingHorizontal: S.md,
    paddingVertical: S.xs,
    borderRadius: 20,
  },
  projectsStatsText: {
    fontSize: 13,
    fontWeight: "700",
    color: PROJECT_COLORS.accent,
  },
  projectsEmptyState: {
    alignItems: "center" as const,
    paddingVertical: S.xl,
    gap: S.sm,
  },
  projectsEmptyText: {
    color: C.textMuted,
    fontSize: 14,
  },
  projectCard: {
    flexDirection: RTL_ROW,
    backgroundColor: PROJECT_COLORS.bg,
    borderWidth: 1,
    borderColor: PROJECT_COLORS.border,
    borderRadius: R.lg,
    marginBottom: S.md,
    overflow: "hidden" as const,
    ...SHADOW.sm,
    ...(Platform.OS === "web"
      ? { cursor: "pointer" as any, transition: "all 0.2s ease" }
      : {}),
  },
  projectCardHover: {
    backgroundColor: PROJECT_COLORS.hover,
    borderColor: PROJECT_COLORS.accent + "40",
    transform: [{ translateY: -2 }],
    ...SHADOW.md,
  },
  projectStripe: {
    width: 5,
    alignSelf: "stretch" as const,
  },
  projectBody: {
    flex: 1,
    padding: S.lg,
    gap: S.xs,
  },
  projectTopRow: {
    flexDirection: RTL_ROW,
    alignItems: "center",
    marginBottom: S.xs,
  },
  projectStatusChip: {
    flexDirection: RTL_ROW,
    alignItems: "center",
    gap: 4,
    paddingHorizontal: S.sm + 2,
    paddingVertical: 3,
    borderRadius: 12,
  },
  projectStatusText: {
    fontSize: 11,
    fontWeight: "700",
  },
  projectActionBtn: {
    margin: 0,
    width: 28,
    height: 28,
  },
  projectTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: C.textPrimary,
    textAlign: TEXT_RIGHT,
  },
  projDesc: {
    fontSize: 13,
    color: C.textSecondary,
    textAlign: TEXT_RIGHT,
    lineHeight: 19,
  },
  projectProgressRow: {
    flexDirection: RTL_ROW,
    alignItems: "center",
    gap: S.sm,
    marginTop: S.sm,
  },
  projectProgressTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: PROJECT_COLORS.accent + "15",
    overflow: "hidden" as const,
  },
  projectProgressFill: {
    height: 6,
    borderRadius: 3,
  },
  projectProgressLabel: {
    fontSize: 12,
    fontWeight: "700",
    minWidth: 36,
    textAlign: "left" as const,
  },
});
