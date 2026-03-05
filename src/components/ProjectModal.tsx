import React, { useState, useEffect } from "react";
import { View, StyleSheet } from "react-native";
import { Text, TextInput, Button, ProgressBar } from "react-native-paper";
import type { Project, ProjectStatus } from "@src/models/project";
import { addProjectRemote, updateProjectRemote } from "@src/lib/sync/remoteCrud";
import { t, statusLabel } from "@src/i18n";
import ModalWrapper from "./ModalWrapper";

const STATUS_OPTIONS: { value: ProjectStatus; label: string }[] = [
  { value: "idea", label: statusLabel("idea") },
  { value: "in_progress", label: statusLabel("in_progress") },
  { value: "done", label: statusLabel("done") },
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
        {editProject ? t("projectModal.editTitle") : t("projectModal.addTitle")}
      </Text>

      <TextInput
        placeholder={t("projectModal.projectTitle")}
        value={title}
        onChangeText={setTitle}
        mode="outlined"
        style={styles.input}
        contentStyle={styles.inputContent}
      />

      <TextInput
        placeholder={t("projectModal.description")}
        value={description}
        onChangeText={setDescription}
        mode="outlined"
        multiline
        numberOfLines={3}
        style={styles.input}
        contentStyle={styles.inputContent}
      />

      {editProject && (
        <>
          <Text variant="labelLarge" style={styles.label}>
            {t("projectModal.status")}
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
            {t("projectModal.progress", { n: Math.round(progress) })}
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
        <Button onPress={handleDismiss}>{t("cancel")}</Button>
        <Button
          mode="contained"
          onPress={handleSubmit}
          disabled={!title.trim()}
        >
          {editProject ? t("save") : t("add")}
        </Button>
      </View>
    </ModalWrapper>
  );
}

const styles = StyleSheet.create({
  heading: { fontWeight: "700", marginBottom: 16, textAlign: "right" },
  input: { marginBottom: 12, textAlign: "right", writingDirection: "rtl" },
  inputContent: { textAlign: "right" },
  label: { marginBottom: 8, marginTop: 4, color: "#6B6B8D", textAlign: "right" },
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
