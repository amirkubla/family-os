import React, { useState, useMemo } from "react";
import { View, StyleSheet, ScrollView, Pressable, Platform } from "react-native";
import {
  Card,
  Text,
  IconButton,
  Checkbox,
  Divider,
  ProgressBar,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
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
import { RTL_ROW } from "@src/ui/rtl";
import { C, R, S } from "@src/ui/tokens";
import { STATUS_COLORS } from "@src/ui/semanticColors";

// ---------------------------------------------------------------------------
// ChoreRow — reusable row for both sections
// ---------------------------------------------------------------------------

function ChoreRow({ chore, onEdit, onDelete }: { chore: Chore; onEdit: () => void; onDelete: () => void }) {
  const [hovered, setHovered] = useState(false);
  const assignedMember = useFamilyStore((s) =>
    chore.assignedToMemberId
      ? s.familyMembers.find((m) => m.id === chore.assignedToMemberId)
      : undefined,
  );
  const assigneeDisplay = assignedMember
    ? `${assignedMember.avatarEmoji ?? ""} ${assignedMember.name}`
    : chore.assignedTo;

  return (
    <View
      style={[styles.choreRow, hovered && styles.choreRowHover]}
      {...(Platform.OS === "web" ? {
        onPointerEnter: () => setHovered(true),
        onPointerLeave: () => setHovered(false),
      } : {} as any)}
    >
      <Checkbox
        status={chore.done ? "checked" : "unchecked"}
        onPress={() => toggleChoreDoneRemote(chore.id)}
      />
      <View style={styles.choreText}>
        <Text
          variant="bodyLarge"
          style={chore.done ? styles.choreDone : styles.choreTitle}
        >
          {chore.title}
        </Text>
        {assigneeDisplay ? (
          <Text variant="bodySmall" style={styles.assignee}>
            {assigneeDisplay}
          </Text>
        ) : null}
      </View>
      <IconButton
        icon="pencil-outline"
        size={18}
        onPress={onEdit}
      />
      <IconButton
        icon={chore.selectedForToday ? "white-balance-sunny" : "white-balance-sunny"}
        size={18}
        iconColor={chore.selectedForToday ? C.amber : C.border}
        onPress={() => toggleChoreSelectedForTodayRemote(chore.id)}
      />
      <IconButton
        icon="trash-can-outline"
        size={18}
        onPress={onDelete}
      />
    </View>
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

  // Modals
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [choreModalOpen, setChoreModalOpen] = useState(false);
  const [editingChore, setEditingChore] = useState<Chore | null>(null);
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [hoveredProjectId, setHoveredProjectId] = useState<string | null>(null);
  const [kidModalOpen, setKidModalOpen] = useState(false);
  const [editingKid, setEditingKid] = useState<Kid | null>(null);
  const [hoveredNoteId, setHoveredNoteId] = useState<string | null>(null);

  // Notes sorted: pinned first
  const sortedNotes = [...notes].sort(
    (a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0)
  );

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
        <Card style={styles.card} mode="elevated">
          <Card.Content>
            <View style={styles.cardHeaderRow}>
              <View style={{ flex: 1 }} />
              <IconButton
                icon="plus"
                size={20}
                onPress={() => {
                  setEditingKid(null);
                  setKidModalOpen(true);
                }}
              />
            </View>

            {activeKids.length === 0 && (
              <Text variant="bodyMedium" style={styles.emptyText}>
                {t("home.noKids")}
              </Text>
            )}

            <View style={styles.kidsRow}>
              {activeKids.map((kid) => (
                <Pressable
                  key={kid.id}
                  style={[styles.kidCard, { backgroundColor: kid.color + "18", borderColor: kid.color + "44" }]}
                  onPress={() => router.push(`/kid/${kid.id}`)}
                >
                  <Text style={styles.kidEmoji}>{kid.emoji}</Text>
                  <View style={styles.kidEmojiSpacer} />
                  <Text style={[styles.kidName, { color: kid.color }]}>{kid.name}</Text>
                  <Text style={[styles.kidArrow, { color: kid.color }]}>‹</Text>
                </Pressable>
              ))}
            </View>
          </Card.Content>
        </Card>

        {/* -- Notes -- */}
        <SectionHeader label={t("home.notes")} />
        <Card style={styles.card} mode="elevated">
          <Card.Content>
            <View style={styles.cardHeaderRow}>
              <View style={{ flex: 1 }} />
              <IconButton
                icon="plus"
                size={20}
                onPress={() => {
                  setEditingNote(null);
                  setNoteModalOpen(true);
                }}
              />
            </View>

            {notes.length === 0 && (
              <Text variant="bodyMedium" style={styles.emptyText}>
                {t("home.noNotes")}
              </Text>
            )}

            {sortedNotes.map((note) => (
              <View
                key={note.id}
                style={[styles.noteRow, hoveredNoteId === note.id && styles.noteRowHover]}
                {...(Platform.OS === "web" ? {
                  onPointerEnter: () => setHoveredNoteId(note.id),
                  onPointerLeave: () => setHoveredNoteId(null),
                } : {} as any)}
              >
                <View style={styles.noteContent}>
                  <Text variant="bodyLarge" style={styles.noteTitle}>
                    {note.pinned ? "\uD83D\uDCCC " : ""}
                    {note.title || t("home.note")}
                  </Text>
                  <Text
                    variant="bodySmall"
                    style={styles.noteBody}
                    numberOfLines={2}
                  >
                    {note.body}
                  </Text>
                </View>
                <IconButton
                  icon="pencil-outline"
                  size={18}
                  onPress={() => {
                    setEditingNote(note);
                    setNoteModalOpen(true);
                  }}
                />
                <IconButton
                  icon={note.pinned ? "pin-off" : "pin"}
                  size={18}
                  onPress={() => toggleNotePinnedRemote(note.id)}
                />
                <IconButton
                  icon="trash-can-outline"
                  size={18}
                  onPress={() => requestDelete(() => deleteNoteRemote(note.id))}
                />
              </View>
            ))}
          </Card.Content>
        </Card>

        {/* -- Chores -- */}
        <SectionHeader label={t("home.chores")} />
        <Card style={styles.card} mode="elevated">
          <Card.Content>
            <View style={styles.cardHeaderRow}>
              <View style={{ flex: 1 }} />
              <IconButton
                icon="plus"
                size={20}
                onPress={() => {
                  setEditingChore(null);
                  setChoreModalOpen(true);
                }}
              />
            </View>

            {chores.length === 0 && (
              <Text variant="bodyMedium" style={styles.emptyText}>
                {t("home.allClear")}
              </Text>
            )}

            {/* Selected for today */}
            {selectedChores.length > 0 && (
              <>
                <Text variant="labelLarge" style={styles.subSectionLabel}>
                  ⭐ {t("home.selectedForToday")}
                </Text>
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
              <Divider style={styles.choreDivider} />
            )}

            {/* Backlog */}
            {backlogChores.length > 0 && (
              <>
                {selectedChores.length > 0 && (
                  <Text variant="labelLarge" style={styles.subSectionLabel}>
                    {t("home.backlog")}
                  </Text>
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
          </Card.Content>
        </Card>

        {/* -- Projects -- */}
        <SectionHeader label={t("home.projects")} />
        <Card style={styles.card} mode="elevated">
          <Card.Content>
            <View style={styles.cardHeaderRow}>
              <View style={{ flex: 1 }} />
              <IconButton
                icon="plus"
                size={20}
                onPress={() => {
                  setEditingProject(null);
                  setProjectModalOpen(true);
                }}
              />
            </View>

            {projects.length === 0 && (
              <Text variant="bodyMedium" style={styles.emptyText}>
                {t("home.noProjects")}
              </Text>
            )}

            {projects.map((proj) => (
              <View
                key={proj.id}
                style={[styles.projectRow, hoveredProjectId === proj.id && styles.projectRowHover]}
                {...(Platform.OS === "web" ? {
                  onPointerEnter: () => setHoveredProjectId(proj.id),
                  onPointerLeave: () => setHoveredProjectId(null),
                } : {} as any)}
              >
                <View style={styles.projectContent}>
                  <View style={styles.projectTop}>
                    <Text variant="bodyLarge" style={styles.projectTitle}>
                      {proj.title}
                    </Text>
                    <Text
                      style={[
                        styles.statusBadge,
                        {
                          color: STATUS_COLORS[proj.status],
                          backgroundColor: STATUS_COLORS[proj.status] + "22",
                        },
                      ]}
                    >
                      {statusLabel(proj.status)}
                    </Text>
                  </View>
                  {proj.description ? (
                    <Text
                      variant="bodySmall"
                      style={styles.projDesc}
                      numberOfLines={1}
                    >
                      {proj.description}
                    </Text>
                  ) : null}
                  <ProgressBar
                    progress={proj.progress / 100}
                    color={STATUS_COLORS[proj.status]}
                    style={styles.progressBar}
                  />
                  <Text variant="labelSmall" style={styles.progressLabel}>
                    {proj.progress}%
                  </Text>
                </View>
                <IconButton
                  icon="pencil-outline"
                  size={18}
                  onPress={() => {
                    setEditingProject(proj);
                    setProjectModalOpen(true);
                  }}
                />
                <IconButton
                  icon="trash-can-outline"
                  size={18}
                  onPress={() => requestDelete(() => deleteProjectRemote(proj.id))}
                />
              </View>
            ))}
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
    textAlign: "right",
  },
  card: { borderRadius: R.lg, backgroundColor: C.surface, marginBottom: S.lg },
  cardHeaderRow: {
    flexDirection: RTL_ROW,
    alignItems: "center",
    justifyContent: "flex-end",
    marginBottom: S.xs,
    marginTop: -S.sm,
  },
  emptyText: {
    color: C.textMuted,
    textAlign: "right",
    fontSize: 14,
    paddingVertical: S.xs,
  },

  // Kids
  kidsRow: {
    flexDirection: RTL_ROW,
    flexWrap: "wrap",
    gap: S.sm,
  },
  kidCard: {
    flexDirection: RTL_ROW,
    alignItems: "center",
    paddingVertical: S.md,
    paddingHorizontal: S.lg,
    borderRadius: R.md,
    borderWidth: 1,
    gap: S.sm,
  },
  kidEmoji: { fontSize: 22 },
  kidEmojiSpacer: { width: S.xs },
  kidName: { fontWeight: "700", fontSize: 15 },
  kidArrow: { fontSize: 18, fontWeight: "700", marginStart: "auto" },

  // Notes
  noteRow: {
    flexDirection: RTL_ROW,
    alignItems: "center",
    paddingVertical: S.sm,
    paddingHorizontal: S.xs,
    borderRadius: R.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
  },
  noteRowHover: { backgroundColor: C.hoverBg },
  noteContent: { flex: 1 },
  noteTitle: { fontSize: 15, fontWeight: "600", color: C.textPrimary, textAlign: "right" },
  noteBody: { fontSize: 12, color: C.textSecondary, marginTop: 2, textAlign: "right" },

  // Chores
  subSectionLabel: {
    color: C.textSecondary,
    fontWeight: "600",
    marginTop: S.sm,
    marginBottom: S.xs,
    textAlign: "right",
  },
  choreDivider: { marginVertical: S.sm },
  choreRow: {
    flexDirection: RTL_ROW,
    alignItems: "center",
    paddingVertical: S.xs,
    paddingHorizontal: S.xs,
    borderRadius: R.sm,
  },
  choreRowHover: { backgroundColor: C.hoverBg },
  choreText: { flex: 1, marginStart: S.xs },
  choreTitle: { fontSize: 15, color: C.textPrimary, textAlign: "right" },
  choreDone: { fontSize: 15, textDecorationLine: "line-through", color: C.textMuted, textAlign: "right" },
  assignee: { fontSize: 12, color: C.textSecondary, textAlign: "right", marginTop: 1 },

  // Projects
  projectRow: {
    flexDirection: RTL_ROW,
    alignItems: "flex-start",
    paddingVertical: S.md,
    paddingHorizontal: S.xs,
    borderRadius: R.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
  },
  projectRowHover: { backgroundColor: C.hoverBg },
  projectContent: { flex: 1 },
  projectTop: {
    flexDirection: RTL_ROW,
    alignItems: "center",
    gap: S.sm,
  },
  projectTitle: { flex: 1, fontSize: 15, fontWeight: "600", color: C.textPrimary, textAlign: "right" },
  statusBadge: {
    fontSize: 10,
    fontWeight: "600",
    paddingHorizontal: S.sm,
    paddingVertical: 3,
    borderRadius: R.sm,
    overflow: "hidden",
  },
  projDesc: { fontSize: 12, color: C.textSecondary, marginTop: S.xs, textAlign: "right" },
  progressBar: { height: 4, borderRadius: 2, marginTop: S.sm },
  progressLabel: { fontSize: 11, color: C.textMuted, marginTop: 2, textAlign: "right" },
});
