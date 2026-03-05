import React, { useState, useEffect, useRef, useCallback } from "react";
import { View, StyleSheet, PanResponder, LayoutChangeEvent, Platform } from "react-native";
import { Text, TextInput, Button } from "react-native-paper";
import type { Project, ProjectStatus } from "@src/models/project";
import { addProjectRemote, updateProjectRemote } from "@src/lib/sync/remoteCrud";
import { t, statusLabel } from "@src/i18n";
import { RTL_ROW } from "@src/ui/rtl";
import ModalWrapper from "./ModalWrapper";

const STATUS_OPTIONS: { value: ProjectStatus; label: string }[] = [
  { value: "idea", label: statusLabel("idea") },
  { value: "in_progress", label: statusLabel("in_progress") },
  { value: "done", label: statusLabel("done") },
];

// ---------------------------------------------------------------------------
// ProgressSlider — custom 0-100 slider (no external dependency)
// ---------------------------------------------------------------------------

const THUMB_SIZE = 24;
const TRACK_HEIGHT = 6;
const SLIDER_COLOR = "#6C63FF";

function ProgressSlider({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const clamp = (v: number) => Math.round(Math.min(100, Math.max(0, v)));
  const pct = Math.min(100, Math.max(0, value));

  // ── Shared ref for native (PanResponder) path ──
  const trackWidth = useRef(0);
  const layoutX = useRef(0);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const ratio = (evt.nativeEvent.pageX - layoutX.current) / trackWidth.current;
        onChangeRef.current(clamp(ratio * 100));
      },
      onPanResponderMove: (evt) => {
        const ratio = (evt.nativeEvent.pageX - layoutX.current) / trackWidth.current;
        onChangeRef.current(clamp(ratio * 100));
      },
    }),
  ).current;

  const onTrackLayout = (e: LayoutChangeEvent) => {
    trackWidth.current = e.nativeEvent.layout.width;
    layoutX.current = e.nativeEvent.layout.x;
    (e.target as any)?.measureInWindow?.((x: number) => {
      if (x != null) layoutX.current = x;
    });
  };

  // ── Web pointer handler (getBoundingClientRect is reliable on web) ──
  const handleWebPointer = useCallback(
    (e: any) => {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const x = e.clientX - rect.left;
      onChange(clamp((x / rect.width) * 100));
    },
    [onChange],
  );

  // On web: use native pointer events; on native: use PanResponder
  const trackProps =
    Platform.OS === "web"
      ? {
          onPointerDown: (e: any) => {
            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
            handleWebPointer(e);
          },
          onPointerMove: (e: any) => {
            if (e.buttons === 0) return;
            handleWebPointer(e);
          },
        }
      : panResponder.panHandlers;

  return (
    <View style={styles.sliderContainer}>
      <View style={styles.sliderLabels}>
        <Text style={styles.sliderEdge}>0</Text>
        <Text style={[styles.sliderValue, { color: SLIDER_COLOR }]}>
          {Math.round(pct)}%
        </Text>
        <Text style={styles.sliderEdge}>100</Text>
      </View>
      <View
        style={styles.sliderTrackWrap}
        onLayout={onTrackLayout}
        {...trackProps}
      >
        <View style={styles.sliderTrack} pointerEvents="none">
          <View
            style={[
              styles.sliderFill,
              { width: `${pct}%` },
            ]}
          />
        </View>
        <View
          pointerEvents="none"
          style={[
            styles.sliderThumb,
            Platform.OS === "web"
              ? { right: `${pct}%`, marginRight: -(THUMB_SIZE / 2) }
              : { left: `${pct}%`, marginLeft: -(THUMB_SIZE / 2) },
          ]}
        />
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------

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
          <ProgressSlider value={progress} onChange={setProgress} />
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
    flexDirection: RTL_ROW,
    gap: 6,
    marginBottom: 12,
  },
  statusBtn: { borderRadius: 20 },
  statusLabel: { fontSize: 12 },

  // Slider
  sliderContainer: { marginBottom: 16, direction: "ltr" },
  sliderLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  sliderEdge: { fontSize: 12, color: "#6B6B8D" },
  sliderValue: { fontSize: 16, fontWeight: "700" },
  sliderTrackWrap: {
    height: THUMB_SIZE + 8,
    justifyContent: "center",
    position: "relative",
    ...(Platform.OS === "web" ? { cursor: "pointer" } : {}),
  },
  sliderTrack: {
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    backgroundColor: "#E8E6FF",
    overflow: "hidden",
  },
  sliderFill: {
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    backgroundColor: SLIDER_COLOR,
  },
  sliderThumb: {
    position: "absolute",
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: "#FFFFFF",
    borderWidth: 3,
    borderColor: SLIDER_COLOR,
    top: (THUMB_SIZE + 8 - THUMB_SIZE) / 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  actions: {
    flexDirection: RTL_ROW,
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 12,
  },
});
