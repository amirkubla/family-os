import React, { useState, useEffect } from "react";
import { View, StyleSheet } from "react-native";
import { Text, TextInput, Button, ProgressBar } from "react-native-paper";
import type { Project, ProjectStatus } from "@src/models/project";
import { addProjectRemote, updateProjectRemote } from "@src/lib/sync/remoteCrud";
import ModalWrapper from "./ModalWrapper";

const STATUS_OPTIONS: { value: ProjectStatus; label: string }[] = [
  { value: "idea", label: "Idea" },
  { value: "in_progress", label: "In Progress" },
  { value: "done", label: "Done" },
];

interface Props {
  visible: boolean;
  onDismiss: () => void;
  editProject?: Project | null;
}

export default function ProjectModal({
  visible,
  onDismiss,
  editProject,
}: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<ProjectStatus>("idea");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (editProject) {
      setTitle(editProject.title);
      setDescription(editProject.description ?? "");
      setStatus(editProject.status);
      setProgress(editProject.progress);
    } else {
      setTitle("");
      setDescription("");
      setStatus("idea");
      setProgress(0);
    }
  }, [editProject, visible]);

  const reset = () => {
    setTitle("");
    setDescription("");
    setStatus("idea");
    setProgress(0);
  };

  const handleSubmit = () => {
    if (!title.trim()) return;
    if (editProject) {
      updateProjectRemote(editProject.id, {
        title: title.trim(),
        description: description.trim() || undefined,
        status,
        progress: Math.round(progress),
      });
    } else {
      addProjectRemote({
        title: title.trim(),
        description: description.trim() || undefined,
      });
    }
    reset();
    onDismiss();
  };

  const handleDismiss = () => {
    reset();
    onDismiss();
  };

  return (
    <ModalWrapper visible={visible} onDismiss={handleDismiss}>
      <Text variant="titleLarge" style={styles.heading}>
        {editProject ? "Edit Project" : "Add Project"}
      </Text>

      <TextInput
        label="Project title"
        value={title}
        onChangeText={setTitle}
        mode="outlined"
        style={styles.input}
      />

      <TextInput
        label="Description (optional)"
        value={description}
        onChangeText={setDescription}
        mode="outlined"
        multiline
        numberOfLines={3}
        style={styles.input}
      />

      {editProject && (
        <>
          <Text variant="labelLarge" style={styles.label}>
            Status
          </Text>
          <View style={styles.statusRow}>
            {STATUS_OPTIONS.map((opt) => (
              <Button
                key={opt.value}
                mode={status === opt.value ? "contained" : "outlined"}
                compact
                onPress={() => setStatus(opt.value)}
                style={styles.statusBtn}
                labelStyle={styles.statusLabel}
              >
                {opt.label}
              </Button>
            ))}
          </View>

          <Text variant="labelLarge" style={styles.label}>
            Progress: {Math.round(progress)}%
          </Text>
          <View style={styles.sliderRow}>
            <Text style={styles.sliderEdge}>0</Text>
            <TextInput
              style={styles.progressInput}
              mode="outlined"
              keyboardType="numeric"
              value={String(Math.round(progress))}
              onChangeText={(v) => {
                const n = parseInt(v, 10);
                if (!isNaN(n)) setProgress(Math.min(100, Math.max(0, n)));
              }}
              dense
            />
            <Text style={styles.sliderEdge}>100</Text>
          </View>
          <ProgressBar
            progress={progress / 100}
            color="#6C63FF"
            style={styles.progressBar}
          />
        </>
      )}

      <View style={styles.actions}>
        <Button onPress={handleDismiss}>Cancel</Button>
        <Button
          mode="contained"
          onPress={handleSubmit}
          disabled={!title.trim()}
        >
          {editProject ? "Save" : "Add"}
        </Button>
      </View>
    </ModalWrapper>
  );
}

const styles = StyleSheet.create({
  heading: { fontWeight: "700", marginBottom: 16 },
  input: { marginBottom: 12 },
  label: { marginBottom: 8, marginTop: 4, color: "#6B6B8D" },
  statusRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 12,
  },
  statusBtn: { borderRadius: 20 },
  statusLabel: { fontSize: 12 },
  sliderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  sliderEdge: { fontSize: 12, color: "#6B6B8D" },
  progressInput: { width: 64, textAlign: "center" },
  progressBar: { height: 6, borderRadius: 3, marginBottom: 12 },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 12,
  },
});
