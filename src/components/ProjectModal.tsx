import React, { useState, useEffect, useRef, useCallback } from "react";
import { View, StyleSheet, PanResponder, LayoutChangeEvent, Platform } from "react-native";
import { Text, Button } from "react-native-paper";
import ModalTextInput from "./ModalTextInput";
import type { Project, ProjectStatus } from "@src/models/project";
import { addProjectRemote, updateProjectRemote } from "@src/lib/sync/remoteCrud";
import { t, statusLabel } from "@src/i18n";
import { MS } from "@src/ui/modalStyles";
import { C } from "@src/ui/tokens";
import { useThemeColor } from "@src/ui/useThemeColor";
import { RTL_ROW } from "@src/ui/rtl";
import ModalWrapper, { ModalCarousel } from "./ModalWrapper";
import OwnerPicker from "./OwnerPicker";

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
  const theme = useThemeColor();
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
        <Text style={[sliderStyles.value, { color: theme }]}>{Math.round(pct)}%</Text>
        <Text style={sliderStyles.edge}>100</Text>
      </View>
      <View style={sliderStyles.trackWrap} onLayout={onTrackLayout} {...trackProps}>
        <View style={[sliderStyles.track, { backgroundColor: theme + "22" }]} pointerEvents="none">
          <View style={[sliderStyles.fill, { width: `${pct}%`, backgroundColor: theme }]} />
        </View>
        {wrapperW > 0 && (
          <View pointerEvents="none" style={[sliderStyles.thumb, { left: thumbLeft, borderColor: theme }]} />
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
    // backgroundColor applied inline from the family theme (theme + "22").
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    overflow: "hidden",
    marginHorizontal: THUMB_SIZE / 2,
  },
  fill: {
    // backgroundColor applied inline from the family theme.
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
  },
  thumb: {
    position: "absolute",
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: C.surface,
    borderWidth: 3,
    // borderColor applied inline from the family theme.
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
  /** Pre-select a kid (used by the kid view's "+" button). */
  defaultKidId?: string;
  /** Pre-select a status for new projects (used by deep links, e.g. ?status=in_progress). */
  initialStatus?: ProjectStatus;
  /**
   * When set (kid-page context), the project is locked to this kid: the owner
   * picker is hidden and the kid's name is shown in the modal title.
   */
  lockedKidName?: string;
  /** Pre-select a member owner when opening fresh (parent-page context). */
  defaultOwnerMemberId?: string;
  /** When set (parent-page context), lock the project to this member: the owner
   *  picker is hidden and the member's name is shown in the modal title. */
  lockedMemberName?: string;
  /** When set, shows carousel arrows to swap between the kid "add" modals. */
  carousel?: ModalCarousel;
  /**
   * When set (and not editing), pre-fills name + description for review — used
   * by the voice-project flow to open the editor on a transcribed draft.
   */
  initialDraft?: { title?: string; description?: string };
}

export default function ProjectModal({ visible, onDismiss, editProject, defaultKidId, initialStatus, lockedKidName, defaultOwnerMemberId, lockedMemberName, carousel, initialDraft }: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<ProjectStatus>(initialStatus ?? "idea");
  const [progress, setProgress] = useState(0);
  const [kidId, setKidId] = useState<string | undefined>(undefined);
  const [ownerMemberId, setOwnerMemberId] = useState<string | undefined>(undefined);
  // In-flight guard against rapid double-clicks (QA Pass 1 BUG #2).
  // Ref for synchronous re-entrancy check; state for visual disabled/loading.
  const submittingRef = useRef(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    submittingRef.current = false;
    setSubmitting(false);
    if (editProject) {
      setTitle(editProject.title);
      setDescription(editProject.description ?? "");
      setStatus(editProject.status);
      setProgress(editProject.progress);
      setKidId(editProject.kidId);
      setOwnerMemberId(editProject.ownerMemberId);
    } else {
      setTitle(initialDraft?.title ?? ""); setDescription(initialDraft?.description ?? "");
      setStatus(initialStatus ?? "idea"); setProgress(0);
      setKidId(defaultKidId);
      setOwnerMemberId(defaultOwnerMemberId);
    }
  }, [editProject, visible, defaultKidId, defaultOwnerMemberId, initialStatus, initialDraft]);

  const reset = () => {
    setTitle(""); setDescription(""); setStatus("idea"); setProgress(0);
    setKidId(undefined); setOwnerMemberId(undefined);
  };

  const handleSubmit = () => {
    if (submittingRef.current) return; // double-click guard (synchronous)
    if (!title.trim()) return;
    submittingRef.current = true;
    setSubmitting(true);
    if (editProject) {
      updateProjectRemote(editProject.id, {
        title: title.trim(),
        description: description.trim() || undefined,
        status,
        progress: Math.round(progress),
        kidId,
        ownerMemberId,
      });
    } else {
      addProjectRemote({
        title: title.trim(),
        description: description.trim() || undefined,
        kidId,
        ownerMemberId,
      });
    }
    reset();
    onDismiss();
  };

  const handleDismiss = () => { reset(); onDismiss(); };

  return (
    <ModalWrapper
      visible={visible}
      onDismiss={handleDismiss}
      carousel={carousel}
      icon="rocket-outline"
      title={(editProject ? t("projectModal.editTitle") : t("projectModal.addTitle")) +
        ((lockedKidName ?? lockedMemberName) ? ` ל${lockedKidName ?? lockedMemberName}` : "")}
      onSave={handleSubmit}
      saveDisabled={!title.trim() || submitting}
      saveLoading={submitting}
    >
      <ModalTextInput
        testID="input-project-title"
        placeholder={t("projectModal.projectTitle")}
        value={title}
        onChangeText={setTitle}
        onSubmitEditing={handleSubmit}
        returnKeyType="done"
        mode="outlined"
        style={MS.input}
        contentStyle={MS.inputContent}
      />

      <ModalTextInput
        placeholder={t("projectModal.description")}
        value={description}
        onChangeText={setDescription}
        mode="outlined"
        multiline
        numberOfLines={6}
        style={[MS.input, { minHeight: 120 }]}
        contentStyle={[MS.inputContent, { minHeight: 110 }]}
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
          <ProgressSlider
            value={progress}
            onChange={(v) => {
              setProgress(v);
              // Any progress moves the project into "in progress".
              if (v > 0 && status !== "in_progress") setStatus("in_progress");
            }}
          />
        </>
      )}

      {/* Hidden in kid/parent-page context — the project is locked to that person. */}
      {!(lockedKidName || lockedMemberName) && (
        <OwnerPicker
          kidId={kidId}
          ownerMemberId={ownerMemberId}
          onChange={(next) => {
            setKidId(next.kidId);
            setOwnerMemberId(next.ownerMemberId);
          }}
          label={t("projectModal.assignToKid")}
        />
      )}

    </ModalWrapper>
  );
}
