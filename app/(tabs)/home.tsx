import React, { useState } from "react";
import { View, StyleSheet, ScrollView, Pressable } from "react-native";
import {
  Card,
  Text,
  IconButton,
  Checkbox,
  Chip,
  ProgressBar,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFamilyStore } from "@src/store/useFamilyStore";
import type { Note } from "@src/models/note";
import type { Project } from "@src/models/project";
import {
  toggleNotePinnedRemote,
  deleteNoteRemote,
  toggleChoreDoneRemote,
  deleteChoreRemote,
  deleteProjectRemote,
} from "@src/lib/sync/remoteCrud";
import NoteModal from "@src/components/NoteModal";
import ChoreAddModal from "@src/components/ChoreAddModal";
import ProjectModal from "@src/components/ProjectModal";

const STATUS_COLORS: Record<string, string> = {
  idea: "#8E8BA8",
  in_progress: "#6C63FF",
  done: "#4ECDC4",
};

const STATUS_LABELS: Record<string, string> = {
  idea: "Idea",
  in_progress: "In Progress",
  done: "Done",
};

export default function HomeScreen() {
  // Store
  const notes = useFamilyStore((s) => s.notes);
  const chores = useFamilyStore((s) => s.chores);
  const projects = useFamilyStore((s) => s.projects);

  // Modals
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [choreModalOpen, setChoreModalOpen] = useState(false);
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  // Notes sorted: pinned first
  const sortedNotes = [...notes].sort(
    (a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0)
  );

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text variant="headlineLarge" style={styles.title}>
          Home
        </Text>

        {/* ── Notes ── */}
        <Card style={styles.card} mode="elevated">
          <Card.Content>
            <View style={styles.sectionHeader}>
              <Text variant="titleMedium" style={styles.cardTitle}>
                Notes
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
                No notes yet — tap + to jot something down.
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
                    {note.pinned ? "📌 " : ""}
                    {note.title || "Note"}
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

        {/* ── Chores ── */}
        <Card style={styles.card} mode="elevated">
          <Card.Content>
            <View style={styles.sectionHeader}>
              <Text variant="titleMedium" style={styles.cardTitle}>
                Chores
              </Text>
              <IconButton
                icon="plus"
                size={20}
                onPress={() => setChoreModalOpen(true)}
              />
            </View>

            {chores.length === 0 && (
              <Text variant="bodyMedium" style={styles.emptyText}>
                All clear — nothing to do right now!
              </Text>
            )}

            {chores.map((chore) => (
              <View key={chore.id} style={styles.choreRow}>
                <Checkbox
                  status={chore.done ? "checked" : "unchecked"}
                  onPress={() => toggleChoreDoneRemote(chore.id)}
                />
                <View style={styles.choreText}>
                  <Text
                    variant="bodyLarge"
                    style={chore.done ? styles.choreDone : undefined}
                  >
                    {chore.title}
                  </Text>
                  {chore.assignedTo ? (
                    <Text variant="bodySmall" style={styles.assignee}>
                      → {chore.assignedTo}
                    </Text>
                  ) : null}
                </View>
                <IconButton
                  icon="trash-can-outline"
                  size={18}
                  onPress={() => deleteChoreRemote(chore.id)}
                />
              </View>
            ))}
          </Card.Content>
        </Card>

        {/* ── Projects ── */}
        <Card style={styles.card} mode="elevated">
          <Card.Content>
            <View style={styles.sectionHeader}>
              <Text variant="titleMedium" style={styles.cardTitle}>
                Projects
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
                No projects yet — dream big!
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
                    <Text variant="bodyLarge" style={{ flex: 1 }}>
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
                      {STATUS_LABELS[proj.status]}
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
        onDismiss={() => setChoreModalOpen(false)}
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
  title: { fontWeight: "800", color: "#1A1A2E", marginBottom: 20 },
  card: { borderRadius: 16, backgroundColor: "#FFFFFF", marginBottom: 20 },
  cardTitle: { fontWeight: "700", color: "#1A1A2E", flex: 1 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  emptyText: { color: "#6B6B8D", marginBottom: 4 },

  // Notes
  noteRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#F0EEFF",
  },
  noteContent: { flex: 1, cursor: "pointer" } as any,
  noteTitle: { fontWeight: "600" },
  noteBody: { color: "#6B6B8D", marginTop: 2 },

  // Chores
  choreRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 2,
  },
  choreText: { flex: 1, marginLeft: 4 },
  choreDone: { textDecorationLine: "line-through", color: "#8E8BA8" },
  assignee: { color: "#6B6B8D" },

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
  statusChip: { borderRadius: 12, height: 26 },
  projDesc: { color: "#6B6B8D", marginTop: 4 },
  progressBar: { height: 5, borderRadius: 3, marginTop: 8 },
  progressLabel: { color: "#8E8BA8", marginTop: 2 },
});
