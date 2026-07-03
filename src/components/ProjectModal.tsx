import React, { useState, useEffect, useRef, useCallback } from "react";
import { View, StyleSheet, PanResponder, LayoutChangeEvent, Platform, TextInput, Pressable } from "react-native";
import { Text, Button, IconButton } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import ModalTextInput from "./ModalTextInput";
import type { Project, ProjectStatus, SubTask } from "@src/models/project";
import { computeProjectProgress } from "@src/models/project";
import { useFamilyStore } from "@src/store/useFamilyStore";
import { addProjectRemote, updateProjectRemote } from "@src/lib/sync/remoteCrud";
import { makeId } from "@src/utils/id";
import { t, statusLabel } from "@src/i18n";
import { MS } from "@src/ui/modalStyles";
import { C, R, S } from "@src/ui/tokens";
import { useThemeColor } from "@src/ui/useThemeColor";
import { RTL_ROW, TEXT_RIGHT } from "@src/ui/rtl";
import { CATEGORY_ICON_OPTIONS } from "@src/ui/semanticColors";
import ModalWrapper, { ModalCarousel } from "./ModalWrapper";
import OwnerPicker from "./OwnerPicker";
import PaginatedPicker from "./PaginatedPicker";
import DateTimeField from "./DateTimeField";

const STATUS_OPTIONS: { value: ProjectStatus; label: string }[] = [
  { value: "idea", label: statusLabel("idea") },
  { value: "in_progress", label: statusLabel("in_progress") },
  { value: "done", label: statusLabel("done") },
];

// ---------------------------------------------------------------------------
// Date <-> ms helpers ("YYYY-MM-DD" is the DateTimeField contract; the model
// stores ms). Anchor at local noon so DST / timezone never shifts the day.
// ---------------------------------------------------------------------------
const pad2 = (n: number) => String(n).padStart(2, "0");
function msToYMD(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function ymdToMs(ymd: string): number {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 12).getTime();
}
function todayYMD(): string {
  return msToYMD(Date.now());
}

// ---------------------------------------------------------------------------
// ProgressSlider — custom 0-100 slider (no external dependency).
// `compact` drops the 0 / % / 100 labels and shrinks the track for subtask rows.
// ---------------------------------------------------------------------------

const THUMB_SIZE = 24;
const TRACK_HEIGHT = 6;

function ProgressSlider({
  value,
  onChange,
  compact,
}: {
  value: number;
  onChange: (v: number) => void;
  compact?: boolean;
}) {
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
    <View style={compact ? sliderStyles.containerCompact : sliderStyles.container}>
      {!compact && (
        <View style={sliderStyles.labels}>
          <Text style={sliderStyles.edge}>0</Text>
          <Text style={[sliderStyles.value, { color: theme }]}>{Math.round(pct)}%</Text>
          <Text style={sliderStyles.edge}>100</Text>
        </View>
      )}
      <View
        style={[sliderStyles.trackWrap, compact && sliderStyles.trackWrapCompact]}
        onLayout={onTrackLayout}
        {...trackProps}
      >
        <View style={[sliderStyles.track, { backgroundColor: theme + "22" }]} pointerEvents="none">
          <View style={[sliderStyles.fill, { width: `${pct}%`, backgroundColor: theme }]} />
        </View>
        {wrapperW > 0 && (
          <View
            pointerEvents="none"
            style={[
              sliderStyles.thumb,
              compact && sliderStyles.thumbCompact,
              { left: compact ? Math.max(0, thumbLeft) : thumbLeft, borderColor: theme },
            ]}
          />
        )}
      </View>
    </View>
  );
}

const sliderStyles = StyleSheet.create({
  container: { marginBottom: 16 },
  containerCompact: { marginTop: 6 },
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
  trackWrapCompact: { height: 18 },
  track: {
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    overflow: "hidden",
    marginHorizontal: THUMB_SIZE / 2,
  },
  fill: {
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
    top: (THUMB_SIZE + 8 - THUMB_SIZE) / 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  thumbCompact: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, top: 1 },
});

// ---------------------------------------------------------------------------
// SubtasksEditor — add / rename / remove subtasks, each with its own progress.
// ---------------------------------------------------------------------------

function SubtasksEditor({
  subTasks,
  onChange,
}: {
  subTasks: SubTask[];
  onChange: (next: SubTask[]) => void;
}) {
  const theme = useThemeColor();

  const update = (id: string, patch: Partial<SubTask>) =>
    onChange(subTasks.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  const remove = (id: string) => onChange(subTasks.filter((s) => s.id !== id));
  const add = () => onChange([...subTasks, { id: makeId(), title: "", progress: 0 }]);

  return (
    <View>
      {subTasks.map((s) => (
        <View key={s.id} style={[subStyles.row, { borderColor: theme + "22" }]}>
          <View style={subStyles.rowTop}>
            <TextInput
              style={subStyles.input}
              value={s.title}
              onChangeText={(v) => update(s.id, { title: v })}
              placeholder={t("projectModal.subtaskPlaceholder")}
              placeholderTextColor={C.textMuted}
              testID={`subtask-input-${subTasks.indexOf(s)}`}
            />
            <Text style={[subStyles.pct, { color: theme }]}>{Math.round(s.progress)}%</Text>
            <IconButton
              icon="trash-can-outline"
              size={16}
              iconColor={C.textMuted}
              style={subStyles.trash}
              onPress={() => remove(s.id)}
              accessibilityLabel={t("projectModal.removeSubtask")}
            />
          </View>
          <ProgressSlider value={s.progress} onChange={(v) => update(s.id, { progress: v })} compact />
        </View>
      ))}
      <Pressable style={[subStyles.addBtn, { borderColor: theme }]} onPress={add} testID="add-subtask">
        <Ionicons name="add" size={16} color={theme} />
        <Text style={[subStyles.addText, { color: theme }]}>{t("projectModal.addSubtask")}</Text>
      </Pressable>
    </View>
  );
}

const subStyles = StyleSheet.create({
  row: {
    borderWidth: 1,
    borderRadius: R.md,
    paddingHorizontal: S.sm,
    paddingVertical: S.xs,
    marginBottom: S.xs,
  },
  rowTop: { flexDirection: RTL_ROW, alignItems: "center", gap: S.xs },
  input: {
    flex: 1,
    fontSize: 14,
    color: C.textPrimary,
    textAlign: TEXT_RIGHT,
    writingDirection: "rtl",
    paddingVertical: Platform.OS === "web" ? 6 : 2,
    ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as any) : {}),
  },
  pct: { fontSize: 13, fontWeight: "800", minWidth: 40, textAlign: "center" },
  trash: { margin: 0, width: 28, height: 28 },
  addBtn: {
    flexDirection: RTL_ROW,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: S.sm,
    marginTop: 2,
    borderRadius: R.md,
    borderWidth: 1.5,
    borderStyle: "dashed",
  },
  addText: { fontSize: 14, fontWeight: "700" },
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
  const theme = useThemeColor();
  const members = useFamilyStore((s) => s.familyMembers);
  const activeMembers = members.filter((m) => m.isActive);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<ProjectStatus>(initialStatus ?? "idea");
  const [progress, setProgress] = useState(0);
  const [kidId, setKidId] = useState<string | undefined>(undefined);
  const [ownerMemberId, setOwnerMemberId] = useState<string | undefined>(undefined);
  const [emoji, setEmoji] = useState("");
  const [dueDate, setDueDate] = useState<string>(""); // "" = no due date
  const [subTasks, setSubTasks] = useState<SubTask[]>([]);
  const [memberIds, setMemberIds] = useState<string[]>([]);
  // In-flight guard against rapid double-clicks (QA Pass 1 BUG #2).
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
      setEmoji(editProject.emoji ?? "");
      setDueDate(editProject.dueDate ? msToYMD(editProject.dueDate) : "");
      setSubTasks(editProject.subTasks ?? []);
      setMemberIds(editProject.memberIds ?? []);
    } else {
      setTitle(initialDraft?.title ?? ""); setDescription(initialDraft?.description ?? "");
      setStatus(initialStatus ?? "idea"); setProgress(0);
      setKidId(defaultKidId);
      setOwnerMemberId(defaultOwnerMemberId);
      setEmoji(""); setDueDate(""); setSubTasks([]); setMemberIds([]);
    }
  }, [editProject, visible, defaultKidId, defaultOwnerMemberId, initialStatus, initialDraft]);

  const reset = () => {
    setTitle(""); setDescription(""); setStatus("idea"); setProgress(0);
    setKidId(undefined); setOwnerMemberId(undefined);
    setEmoji(""); setDueDate(""); setSubTasks([]); setMemberIds([]);
  };

  // Drop blank subtasks (never persist an empty title) and keep them ordered.
  const cleanSubTasks = () =>
    subTasks.map((s) => ({ ...s, title: s.title.trim() })).filter((s) => s.title.length > 0);

  const hasSubtasks = subTasks.length > 0;

  const toggleMember = (id: string) =>
    setMemberIds((prev) => (prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]));

  const handleSubmit = () => {
    if (submittingRef.current) return; // double-click guard (synchronous)
    if (!title.trim()) return;
    submittingRef.current = true;
    setSubmitting(true);
    const subs = cleanSubTasks();
    const due = dueDate ? ymdToMs(dueDate) : undefined;
    if (editProject) {
      updateProjectRemote(editProject.id, {
        title: title.trim(),
        description: description.trim() || undefined,
        status,
        progress: Math.round(progress),
        kidId,
        ownerMemberId,
        emoji: emoji || undefined,
        dueDate: due,
        subTasks: subs,
        memberIds,
      });
    } else {
      addProjectRemote({
        title: title.trim(),
        description: description.trim() || undefined,
        status,
        kidId,
        ownerMemberId,
        emoji: emoji || undefined,
        dueDate: due,
        subTasks: subs,
        memberIds,
      });
    }
    reset();
    onDismiss();
  };

  const handleDismiss = () => { reset(); onDismiss(); };

  const derivedProgress = computeProjectProgress(subTasks, progress);

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
        numberOfLines={4}
        style={[MS.input, { minHeight: 96 }]}
        contentStyle={[MS.inputContent, { minHeight: 86 }]}
      />

      {/* Contextual icon */}
      <Text style={MS.label}>{t("projectModal.icon")}</Text>
      <PaginatedPicker
        kind="emoji"
        options={CATEGORY_ICON_OPTIONS}
        value={emoji}
        onChange={setEmoji}
        testIDPrefix="project-emoji"
      />

      {/* Due date — optional; toggled on/off */}
      <Text style={MS.label}>{t("projectModal.dueDate")}</Text>
      {dueDate ? (
        <View style={{ flexDirection: RTL_ROW, alignItems: "center", gap: S.sm, marginBottom: 12 }}>
          <View style={{ flex: 1 }}>
            <DateTimeField
              mode="date"
              value={dueDate}
              onChange={setDueDate}
              title={t("projectModal.dueDate")}
              testID="project-due-date"
            />
          </View>
          <IconButton
            icon="close"
            size={18}
            iconColor={C.textMuted}
            onPress={() => setDueDate("")}
            accessibilityLabel={t("projectModal.clearDueDate")}
          />
        </View>
      ) : (
        <Pressable
          style={[styles.ghostBtn, { borderColor: theme }]}
          onPress={() => setDueDate(todayYMD())}
          testID="project-add-due-date"
        >
          <Ionicons name="calendar-outline" size={16} color={theme} />
          <Text style={[styles.ghostText, { color: theme }]}>{t("projectModal.setDueDate")}</Text>
        </Pressable>
      )}

      {/* Assigned family members */}
      {activeMembers.length > 0 && (
        <>
          <Text style={MS.label}>{t("projectModal.members")}</Text>
          <View style={styles.memberWrap}>
            {activeMembers.map((m) => {
              const on = memberIds.includes(m.id);
              return (
                <Pressable
                  key={m.id}
                  onPress={() => toggleMember(m.id)}
                  style={[
                    styles.memberChip,
                    { borderColor: on ? (m.color ?? theme) : C.border, backgroundColor: on ? (m.color ?? theme) + "1A" : C.surface },
                  ]}
                  testID={`project-member-${m.id}`}
                >
                  <Text style={{ fontSize: 15 }}>{m.avatarEmoji ?? "👤"}</Text>
                  <Text style={[styles.memberName, on && { color: m.color ?? theme, fontWeight: "800" }]}>{m.name}</Text>
                </Pressable>
              );
            })}
          </View>
        </>
      )}

      {/* Subtasks — drive the overall progress when present */}
      <Text style={MS.label}>{t("projectModal.subtasks")}</Text>
      <SubtasksEditor subTasks={subTasks} onChange={setSubTasks} />

      {/* Progress — derived (read-only) when there are subtasks, manual otherwise.
          Manual slider stays edit-only to preserve the original add-flow. */}
      {hasSubtasks ? (
        <View style={styles.derivedRow}>
          <Text style={MS.label}>{t("projectModal.progress", { n: derivedProgress })}</Text>
          <View style={styles.derivedTrack}>
            <View style={[styles.derivedFill, { width: `${derivedProgress}%` as any, backgroundColor: theme }]} />
          </View>
        </View>
      ) : editProject ? (
        <>
          <Text style={MS.label}>{t("projectModal.progress", { n: Math.round(progress) })}</Text>
          <ProgressSlider
            value={progress}
            onChange={(v) => {
              setProgress(v);
              // Any progress moves the project into "in progress".
              if (v > 0 && status !== "in_progress") setStatus("in_progress");
            }}
          />
        </>
      ) : null}

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

const styles = StyleSheet.create({
  ghostBtn: {
    flexDirection: RTL_ROW,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: S.sm,
    marginBottom: 12,
    borderRadius: R.md,
    borderWidth: 1.5,
    borderStyle: "dashed",
  },
  ghostText: { fontSize: 14, fontWeight: "700" },
  memberWrap: { flexDirection: RTL_ROW, flexWrap: "wrap", gap: S.xs, marginBottom: 12 },
  memberChip: {
    flexDirection: RTL_ROW,
    alignItems: "center",
    gap: 6,
    paddingHorizontal: S.sm + 2,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1.5,
  },
  memberName: { fontSize: 13, fontWeight: "600", color: C.textPrimary, writingDirection: "rtl" },
  derivedRow: { marginBottom: 12 },
  derivedTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: C.border,
    overflow: "hidden",
    marginTop: 6,
  },
  derivedFill: { height: 8, borderRadius: 4 },
});
