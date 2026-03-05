import React, { useState, useMemo } from "react";
import { View, StyleSheet, ScrollView, Pressable } from "react-native";
import {
  Card,
  Text,
  IconButton,
  Checkbox,
  Chip,
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
import { t, statusLabel } from "@src/i18n";
import FamilyBadge from "@src/components/FamilyBadge";

const STATUS_COLORS: Record<string, string> = {
  idea: "#8E8BA8",
  in_progress: "#6C63FF",
  done: "#4ECDC4",
};

// ---------------------------------------------------------------------------
// ChoreRow — reusable row for both sections
// ---------------------------------------------------------------------------

function ChoreRow({ chore, onEdit }: { chore: Chore; onEdit: () => void }) {
  const assignedMember = useFamilyStore((s) =>
    chore.assignedToMemberId
      ? s.familyMembers.find((m) => m.id === chore.assignedToMemberId)
      : undefined,
  );
  const assigneeDisplay = assignedMember
    ? `${assignedMember.avatarEmoji ?? ""} ${assignedMember.name}`
    : chore.assignedTo;

  return (
    <View style={styles.choreRow}>
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
        iconColor={chore.selectedForToday ? "#FFA726" : "#D0D0D0"}
        onPress={() => toggleChoreSelectedForTodayRemote(chore.id)}
      />
      <IconButton
        icon="trash-can-outline"
        size={18}
        onPress={() => deleteChoreRemote(chore.id)}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function HomeScreen() {
  const router = useRouter();

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
  const [kidModalOpen, setKidModalOpen] = useState(false);
  const [editingKid, setEditingKid] = useState<Kid | null>(null);

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
        <Text variant="headlineLarge" style={styles.title}>
          {t("home.title")}
        </Text>
        <FamilyBadge />

        {/* -- Kids -- */}
        <Card style={styles.card} mode="elevated">
          <Card.Content>
            <View style={styles.sectionHeader}>
              <Text variant="titleMedium" style={styles.cardTitle}>
                {t("home.kids")}
              </Text>
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
                  <Text style={[styles.kidName, { color: kid.color }]}>{kid.name}</Text>
                  <Text style={[styles.kidArrow, { color: kid.color }]}>‹</Text>
                </Pressable>
              ))}
            </View>
          </Card.Content>
        </Card>

        {/* -- Notes -- */}
        <Card style={styles.card} mode="elevated">
          <Card.Content>
            <View style={styles.sectionHeader}>
              <Text variant="titleMedium" style={styles.cardTitle}>
                {t("home.notes")}
              </Text>
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
              <View key={note.id} style={styles.noteRow}>
                <Pressable
                  style={styles.noteContent}
                  onPress={() => {
                    setEditingNote(note);
                    setNoteModalOpen(true);
                  }}
                >
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
                </Pressable>
                <IconButton
                  icon={note.pinned ? "pin-off" : "pin"}
                  size={18}
                  onPress={() => toggleNotePinnedRemote(note.id)}
                />
                <IconButton
                  icon="trash-can-outline"
                  size={18}
                  onPress={() => deleteNoteRemote(note.id)}
                />
              </View>
            ))}
          </Card.Content>
        </Card>

        {/* -- Chores -- */}
        <Card style={styles.card} mode="elevated">
          <Card.Content>
            <View style={styles.sectionHeader}>
              <Text variant="titleMedium" style={styles.cardTitle}>
                {t("home.chores")}
              </Text>
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
                  />
                ))}
              </>
            )}
          </Card.Content>
        </Card>

        {/* -- Projects -- */}
        <Card style={styles.card} mode="elevated">
          <Card.Content>
            <View style={styles.sectionHeader}>
              <Text variant="titleMedium" style={styles.cardTitle}>
                {t("home.projects")}
              </Text>
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
              <View key={proj.id} style={styles.projectRow}>
                <Pressable
                  style={styles.projectContent}
                  onPress={() => {
                    setEditingProject(proj);
                    setProjectModalOpen(true);
                  }}
                >
                  <View style={styles.projectTop}>
                    <Text variant="bodyLarge" style={styles.projectTitle}>
                      {proj.title}
                    </Text>
                    <Chip
                      compact
                      textStyle={{
                        fontSize: 11,
                        color: STATUS_COLORS[proj.status],
                      }}
                      style={[
                        styles.statusChip,
                        {
                          backgroundColor:
                            STATUS_COLORS[proj.status] + "22",
                        },
                      ]}
                    >
                      {statusLabel(proj.status)}
                    </Chip>
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
                </Pressable>
                <IconButton
                  icon="trash-can-outline"
                  size={18}
                  onPress={() => deleteProjectRemote(proj.id)}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FAFAFE" },
  container: { padding: 20, paddingBottom: 40 },
  title: { fontWeight: "800", color: "#1A1A2E", marginBottom: 20, textAlign: "right" },
  card: { borderRadius: 16, backgroundColor: "#FFFFFF", marginBottom: 20 },
  cardTitle: { fontWeight: "700", color: "#1A1A2E", flex: 1, textAlign: "right" },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  emptyText: { color: "#6B6B8D", marginBottom: 4, textAlign: "right" },

  // Kids
  kidsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  kidCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  kidEmoji: { fontSize: 22 },
  kidName: { fontWeight: "700", fontSize: 15 },
  kidArrow: { fontSize: 18, fontWeight: "700", marginStart: "auto" },

  // Notes
  noteRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#F0EEFF",
  },
  noteContent: { flex: 1, cursor: "pointer" } as any,
  noteTitle: { fontWeight: "600", textAlign: "right" },
  noteBody: { color: "#6B6B8D", marginTop: 2, textAlign: "right" },

  // Chores
  subSectionLabel: {
    color: "#6B6B8D",
    fontWeight: "600",
    marginTop: 8,
    marginBottom: 4,
    textAlign: "right",
  },
  choreDivider: { marginVertical: 8 },
  choreRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 2,
  },
  choreText: { flex: 1, marginStart: 4 },
  choreTitle: { textAlign: "right" },
  choreDone: { textDecorationLine: "line-through", color: "#8E8BA8", textAlign: "right" },
  assignee: { color: "#6B6B8D", textAlign: "right" },

  // Projects
  projectRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#F0EEFF",
  },
  projectContent: { flex: 1, cursor: "pointer" } as any,
  projectTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  projectTitle: { flex: 1, textAlign: "right" },
  statusChip: { borderRadius: 12, height: 26 },
  projDesc: { color: "#6B6B8D", marginTop: 4, textAlign: "right" },
  progressBar: { height: 5, borderRadius: 3, marginTop: 8 },
  progressLabel: { color: "#8E8BA8", marginTop: 2, textAlign: "right" },
});
