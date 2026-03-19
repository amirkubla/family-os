import React, { useState, useEffect, useRef, useCallback } from "react";
import { View, StyleSheet, PanResponder, LayoutChangeEvent, Platform } from "react-native";
import { Text, TextInput, Button } from "react-native-paper";
import type { Project, ProjectStatus } from "@src/models/project";
import { addProjectRemote, updateProjectRemote } from "@src/lib/sync/remoteCrud";
import { t, statusLabel } from "@src/i18n";
import { MS } from "@src/ui/modalStyles";
import { C } from "@src/ui/tokens";
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

function ProgressSlider({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const clamp = (v: number) => Math.round(Math.min(100, Math.max(0, v)));
  const pct = Math.min(100, Math.max(0, value));

  const [wrapperW, setWrapperW] = useState(0);
  const usable = Math.max(0, wrapperW - THUMB_SIZE);

  const thumbLeft =
    Platform.OS === "web"
      ? (1 - pct / 100) * usable
      : (pct / 100) * usable;

  const wrapperWRef = useRef(0);
  const layoutX = useRef(0);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const ratio = (evt.nativeEvent.pageX - layoutX.current) / wrapperWRef.current;
        onChangeRef.current(clamp((1 - ratio) * 100));
      },
      onPanResponderMove: (evt) => {
        const ratio = (evt.nativeEvent.pageX - layoutX.current) / wrapperWRef.current;
        onChangeRef.current(clamp((1 - ratio) * 100));
      },
    }),
  ).current;

  const onTrackLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    wrapperWRef.current = w;
    setWrapperW(w);
    layoutX.current = e.nativeEvent.layout.x;
    (e.target as any)?.measureInWindow?.((x: number) => {
      if (x != null) layoutX.current = x;
    });
  };

  const handleWebPointer = useCallback(
    (e: any) => {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const x = e.clientX - rect.left;
      onChange(clamp(((rect.width - x) / rect.width) * 100));
    },
    [onChange],
  );

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
    <View style={sliderStyles.container}>
      <View style={sliderStyles.labels}>
        <Text style={sliderStyles.edge}>0</Text>
        <Text style={[sliderStyles.value, { color: C.purple }]}>{Math.round(pct)}%</Text>
        <Text style={sliderStyles.edge}>100</Text>
      </View>
      <View style={sliderStyles.trackWrap} onLayout={onTrackLayout} {...trackProps}>
        <View style={sliderStyles.track} pointerEvents="none">
          <View style={[sliderStyles.fill, { width: `${pct}%` }]} />
        </View>
        {wrapperW > 0 && (
          <View pointerEvents="none" style={[sliderStyles.thumb, { left: thumbLeft }]} />
        )}
      </View>
    </View>
  );
}

const sliderStyles = StyleSheet.create({
  container: { marginBottom: 16 },
  labels: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  edge: { fontSize: 12, color: C.textSecondary },
  value: { fontSize: 16, fontWeight: "700" },
  trackWrap: {
    height: THUMB_SIZE + 8,
    justifyContent: "center",
    position: "relative",
    ...(Platform.OS === "web" ? { cursor: "pointer" } : {}),
  },
  track: {
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    backgroundColor: C.purple + "22",
    overflow: "hidden",
    marginHorizontal: THUMB_SIZE / 2,
  },
  fill: {
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    backgroundColor: C.purple,
  },
  thumb: {
    position: "absolute",
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: C.surface,
    borderWidth: 3,
    borderColor: C.purple,
    top: (THUMB_SIZE + 8 - THUMB_SIZE) / 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
});

// ---------------------------------------------------------------------------

interface Props {
  visible: boolean;
  onDismiss: () => void;
  editProject?: Project | null;
}

export default function ProjectModal({ visible, onDismiss, editProject }: Props) {
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
      setTitle(""); setDescription(""); setStatus("idea"); setProgress(0);
    }
  }, [editProject, visible]);

  const reset = () => { setTitle(""); setDescription(""); setStatus("idea"); setProgress(0); };

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

  const handleDismiss = () => { reset(); onDismiss(); };

  return (
    <ModalWrapper visible={visible} onDismiss={handleDismiss}>
      <Text style={MS.heading}>
        {editProject ? t("projectModal.editTitle") : t("projectModal.addTitle")}
      </Text>

      <TextInput
        placeholder={t("projectModal.projectTitle")}
        value={title}
        onChangeText={setTitle}
        mode="outlined"
        style={MS.input}
        contentStyle={MS.inputContent}
      />

      <TextInput
        placeholder={t("projectModal.description")}
        value={description}
        onChangeText={setDescription}
        mode="outlined"
        multiline
        numberOfLines={3}
        style={MS.input}
        contentStyle={MS.inputContent}
      />

      {editProject && (
        <>
          <Text style={MS.label}>{t("projectModal.status")}</Text>
          <View style={{ flexDirection: RTL_ROW, gap: 6, marginBottom: 12 }}>
            {STATUS_OPTIONS.map((opt) => (
              <Button
                key={opt.value}
                mode={status === opt.value ? "contained" : "outlined"}
                compact
                onPress={() => setStatus(opt.value)}
                style={MS.chip}
                labelStyle={MS.chipLabel}
              >
                {opt.label}
              </Button>
            ))}
          </View>

          <Text style={MS.label}>
            {t("projectModal.progress", { n: Math.round(progress) })}
          </Text>
          <ProgressSlider value={progress} onChange={setProgress} />
        </>
      )}

      <View style={MS.actions}>
        <Button onPress={handleDismiss}>{t("cancel")}</Button>
        <Button mode="contained" onPress={handleSubmit} disabled={!title.trim()}>
          {editProject ? t("save") : t("add")}
        </Button>
      </View>
    </ModalWrapper>
  );
}
