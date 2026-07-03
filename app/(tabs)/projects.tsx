/**
 * Projects — modern, compact, theme-aware dashboard.
 *
 * A single-column list of dense project cards. Each card surfaces (in priority
 * order) title, overall progress, subtask breakdown, next task, task count,
 * assigned members, due date, and creation date — so a project's status reads
 * in a couple of seconds. The card's tint + accents derive from the family's
 * chosen theme colour (see useThemeColor), not a hardcoded palette.
 *
 * Family-wide projects only (kidId == null) plus any kid/member-owned ones,
 * which carry an owner badge. Add via the FAB or the ?modal=add deep link;
 * ?status=in_progress pre-selects a status.
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { View, StyleSheet, Pressable, Platform, Alert, Animated, Easing } from "react-native";
import ScreenScrollView from "@src/components/ScreenScrollView";
import { Text, IconButton, FAB } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";

import { useFamilyStore } from "@src/store/useFamilyStore";
import { useBlurRemountKey } from "@src/hooks/useBlurRemountKey";
import type { Project } from "@src/models/project";
import { computeProjectProgress } from "@src/models/project";
import type { FamilyMember } from "@src/models/familyMember";
import { deleteProjectRemote, reorderProjectsRemote } from "@src/lib/sync/remoteCrud";
import ProjectModal from "@src/components/ProjectModal";
import OwnerBadge from "@src/components/OwnerBadge";
import ConfirmDeleteModal from "@src/components/ConfirmDeleteModal";
import { useConfirmDelete } from "@src/hooks/useConfirmDelete";
import { useProjectVoice } from "@src/hooks/useProjectVoice";
import { useVoiceCapture } from "@src/hooks/useVoiceCapture";
import VoiceFab from "@src/components/VoiceFab";
import { t, statusLabel } from "@src/i18n";
import { C, S, SHADOW } from "@src/ui/tokens";
import { useThemeColor } from "@src/ui/useThemeColor";
import { RTL_ROW, TEXT_RIGHT } from "@src/ui/rtl";
import { FAB_LEFT } from "@src/ui/fabAnchor";
import { STATUS_COLORS } from "@src/ui/semanticColors";

const MONTHS_HE = [
  "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
  "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר",
];

const STATUS_DOT: Record<Project["status"], string> = {
  idea: "🟡",
  in_progress: "🟣",
  done: "🟢",
};

const MS_PER_DAY = 86_400_000;
const midnight = (ms: number) => {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

/** Relative/absolute due label + a tone for colouring. */
function describeDue(dueMs: number): { text: string; tone: "danger" | "warn" | "normal" } {
  const diff = Math.round((midnight(dueMs) - midnight(Date.now())) / MS_PER_DAY);
  if (diff < 0) {
    const n = -diff;
    return { text: n === 1 ? t("project.overdueOne") : t("project.overdue", { count: n }), tone: "danger" };
  }
  if (diff === 0) return { text: t("project.dueToday"), tone: "warn" };
  if (diff === 1) return { text: t("project.dueTomorrow"), tone: "warn" };
  const d = new Date(dueMs);
  return { text: `${d.getDate()} ${MONTHS_HE[d.getMonth()]}`, tone: "normal" };
}

function shortDate(ms: number): string {
  const d = new Date(ms);
  return `${d.getDate()} ${MONTHS_HE[d.getMonth()]}`;
}

// ---------------------------------------------------------------------------
// ProjectCard — dense, theme-tinted. Fully clickable → opens the editor.
// ---------------------------------------------------------------------------

const MAX_SUBTASK_ROWS = 3;
const MAX_AVATARS = 4;

function ProjectCard({
  proj,
  index,
  count,
  members,
  onEdit,
  onDelete,
  onMove,
}: {
  proj: Project;
  index: number;
  count: number;
  members: FamilyMember[];
  onEdit: () => void;
  onDelete: () => void;
  onMove: (dir: -1 | 1) => void;
}) {
  const theme = useThemeColor();
  const statusColor = STATUS_COLORS[proj.status];

  const subs = proj.subTasks ?? [];
  const progress = computeProjectProgress(subs, proj.progress);
  const doneCount = subs.filter((s) => s.progress >= 100).length;
  const nextTask = subs.find((s) => s.progress < 100)?.title;
  const due = proj.dueDate ? describeDue(proj.dueDate) : null;
  const dueColor = due?.tone === "danger" ? C.red : due?.tone === "warn" ? C.amber : C.textSecondary;

  // Entrance: gentle fade + rise on mount (replays each visit via remount key).
  const enter = useRef(new Animated.Value(0)).current;
  // Animated progress-bar width.
  const pAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(enter, {
      toValue: 1,
      duration: 220,
      delay: Math.min(index, 6) * 40,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [enter, index]);

  useEffect(() => {
    Animated.timing(pAnim, {
      toValue: progress,
      duration: 420,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [pAnim, progress]);

  const widthInterp = pAnim.interpolate({ inputRange: [0, 100], outputRange: ["0%", "100%"] });

  const avatars = members.slice(0, MAX_AVATARS);
  const extraMembers = members.length - avatars.length;

  return (
    <Animated.View
      style={{
        opacity: enter,
        transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
      }}
    >
      <Pressable
        testID={"project-card-" + proj.title}
        onPress={onEdit}
        style={({ pressed, hovered }: any) => [
          styles.card,
          { backgroundColor: theme + "0F", borderColor: theme + "26" },
          hovered && [styles.cardHover, { borderColor: theme + "59" }, webShadow(theme)],
          pressed && { transform: [{ scale: 0.985 }] },
        ]}
      >
        {/* ── Header: icon + title · status badge · reorder/delete ── */}
        <View style={styles.header}>
          <View style={[styles.iconBubble, { backgroundColor: theme + "1A" }]}>
            <Text style={styles.iconText}>{proj.emoji || STATUS_DOT[proj.status]}</Text>
          </View>
          <Text style={styles.title} numberOfLines={1}>
            {proj.title}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + "1F" }]}>
            <Text style={styles.statusDot}>{STATUS_DOT[proj.status]}</Text>
            <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel(proj.status)}</Text>
          </View>
          <IconButton
            icon="chevron-up"
            size={15}
            disabled={index === 0}
            iconColor={C.textMuted}
            style={styles.miniBtn}
            onPress={onMove.bind(null, -1)}
          />
          <IconButton
            icon="chevron-down"
            size={15}
            disabled={index === count - 1}
            iconColor={C.textMuted}
            style={styles.miniBtn}
            onPress={onMove.bind(null, 1)}
          />
          <IconButton
            testID={"project-delete-" + proj.title}
            icon="trash-can-outline"
            size={15}
            iconColor={C.textMuted}
            style={styles.miniBtn}
            onPress={onDelete}
          />
        </View>

        {/* ── Overall progress ── */}
        <View style={styles.progressRow}>
          <View style={[styles.progressTrack, { backgroundColor: theme + "1A" }]}>
            <Animated.View style={[styles.progressFill, { width: widthInterp, backgroundColor: theme }]} />
          </View>
          <Text style={[styles.progressPct, { color: theme }]}>{progress}%</Text>
        </View>

        {/* ── Task count ── */}
        {subs.length > 0 && (
          <Text style={styles.taskCount}>{t("project.tasks", { done: doneCount, total: subs.length })}</Text>
        )}

        {/* ── Subtask breakdown (capped) ── */}
        {subs.length > 0 && (
          <View style={styles.subList}>
            {subs.slice(0, MAX_SUBTASK_ROWS).map((s) => (
              <View key={s.id} style={styles.subRow}>
                <View style={[styles.subTrack, { backgroundColor: theme + "14" }]}>
                  <View style={[styles.subFill, { width: `${Math.min(100, s.progress)}%` as any, backgroundColor: theme + "B3" }]} />
                </View>
                <Text style={styles.subName} numberOfLines={1}>{s.title}</Text>
              </View>
            ))}
            {subs.length > MAX_SUBTASK_ROWS && (
              <Text style={styles.moreSub}>+{subs.length - MAX_SUBTASK_ROWS}</Text>
            )}
          </View>
        )}

        {/* ── Next task ── */}
        {nextTask ? (
          <Text style={styles.next} numberOfLines={1}>
            <Text style={[styles.nextLabel, { color: theme }]}>{t("project.next")}: </Text>
            {nextTask}
          </Text>
        ) : null}

        <OwnerBadge kidId={proj.kidId} ownerMemberId={proj.ownerMemberId} style={{ marginTop: S.xs }} />

        {/* ── Footer: members · meta · open affordance ── */}
        <View style={styles.footer}>
          {avatars.length > 0 ? (
            <View style={styles.avatars}>
              {avatars.map((m) => (
                <View
                  key={m.id}
                  style={[styles.avatar, { backgroundColor: (m.color ?? theme) + "22", borderColor: m.color ?? theme }]}
                >
                  <Text style={styles.avatarEmoji}>{m.avatarEmoji ?? "👤"}</Text>
                </View>
              ))}
              {extraMembers > 0 && (
                <View style={[styles.avatar, styles.avatarMore]}>
                  <Text style={styles.avatarMoreText}>+{extraMembers}</Text>
                </View>
              )}
            </View>
          ) : (
            <View style={{ flex: 1 }} />
          )}

          <View style={styles.meta}>
            <Text style={styles.metaLabel}>{t("project.created")}</Text>
            <Text style={styles.metaValue}>{shortDate(proj.createdAt)}</Text>
          </View>
          {due && (
            <View style={styles.meta}>
              <Text style={styles.metaLabel}>{t("project.due")}</Text>
              <Text style={[styles.metaValue, { color: dueColor }]}>{due.text}</Text>
            </View>
          )}
          <Ionicons name="chevron-back" size={18} color={theme} style={styles.openChevron} />
        </View>
      </Pressable>
    </Animated.View>
  );
}

/** Web-only theme-tinted hover shadow (native uses elevation via SHADOW.md). */
function webShadow(theme: string) {
  return Platform.OS === "web" ? ({ boxShadow: `0 10px 24px ${theme}33` } as any) : null;
}

export default function ProjectsScreenRoute() {
  return <ProjectsScreen key={useBlurRemountKey()} />;
}

function ProjectsScreen() {
  const insets = useSafeAreaInsets();
  const theme = useThemeColor();
  const { modal, status: initialStatus } = useLocalSearchParams<{ modal?: string; status?: string }>();
  const { confirmVisible, requestDelete, confirmDelete, dismissConfirm } = useConfirmDelete();

  const allProjects = useFamilyStore((s) => s.projects);
  const familyMembers = useFamilyStore((s) => s.familyMembers);
  const memberById = useMemo(() => new Map(familyMembers.map((m) => [m.id, m])), [familyMembers]);

  // All projects (family-wide + owned), sorted by manual drag order.
  const projects = useMemo(
    () => [...allProjects].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
    [allProjects],
  );

  const moveProject = useCallback(
    (index: number, dir: -1 | 1) => {
      const j = index + dir;
      if (j < 0 || j >= projects.length) return;
      const next = [...projects];
      [next[index], next[j]] = [next[j], next[index]];
      reorderProjectsRemote(next.map((p) => p.id));
    },
    [projects],
  );

  const [modalOpen, setModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  // Voice-project draft pre-filled into the editor (cleared on every other open).
  const [voiceDraft, setVoiceDraft] = useState<{ title?: string; description?: string } | undefined>(undefined);
  // Open the editor pre-filled on the transcribed draft (or warn if empty).
  const { status: voiceStatus, onMic } = useVoiceCapture(useProjectVoice, {
    onResult: (r) => {
      if (r.description.trim()) {
        setVoiceDraft({ title: r.title || undefined, description: r.description });
        setEditingProject(null);
        setModalOpen(true);
      } else {
        Alert.alert(t("voice.noNote"));
      }
    },
  });

  useEffect(() => {
    if (modal === "add") {
      setVoiceDraft(undefined);
      setEditingProject(null);
      setModalOpen(true);
    }
  }, [modal]);

  const activeCount = projects.filter((p) => p.status === "in_progress").length;

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <ScreenScrollView style={styles.list} contentContainerStyle={styles.container}>
        <View style={styles.inner}>
          {projects.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={{ fontSize: 32 }}>🚀</Text>
              <Text style={styles.emptyText}>{t("home.noProjects")}</Text>
            </View>
          ) : (
            <>
              <View style={styles.statsRow}>
                <View style={[styles.statsPill, { backgroundColor: theme + "14" }]}>
                  <Text style={[styles.statsText, { color: theme }]}>
                    {activeCount} {t("today.activeProjects").toLowerCase()}
                  </Text>
                </View>
              </View>
              {projects.map((item, index) => (
                <ProjectCard
                  key={item.id}
                  proj={item}
                  index={index}
                  count={projects.length}
                  members={(item.memberIds ?? []).map((id) => memberById.get(id)).filter(Boolean) as FamilyMember[]}
                  onEdit={() => {
                    setVoiceDraft(undefined);
                    setEditingProject(item);
                    setModalOpen(true);
                  }}
                  onDelete={() => requestDelete(() => deleteProjectRemote(item.id))}
                  onMove={(dir) => moveProject(index, dir)}
                />
              ))}
            </>
          )}
        </View>
      </ScreenScrollView>

      {/* Voice → project: record, transcribe via the Assistant, then open the
          editor pre-filled for review. Stacked above the "+" add FAB. */}
      <VoiceFab
        status={voiceStatus}
        onPress={onMic}
        bottom={insets.bottom + S.lg + 68}
        testID="project-voice-fab"
      />

      <FAB
        customSize={50}
        icon="plus"
        testID="btn-add-project"
        accessibilityLabel="btn-add-project"
        style={[styles.fab, { bottom: insets.bottom + S.lg, backgroundColor: theme, borderRadius: 26 }]}
        color="#FFF"
        onPress={() => {
          setVoiceDraft(undefined);
          setEditingProject(null);
          setModalOpen(true);
        }}
      />

      <ProjectModal
        visible={modalOpen}
        onDismiss={() => {
          setModalOpen(false);
          setEditingProject(null);
          setVoiceDraft(undefined);
        }}
        editProject={editingProject}
        initialStatus={!editingProject && initialStatus ? (initialStatus as any) : undefined}
        initialDraft={voiceDraft}
      />
      <ConfirmDeleteModal visible={confirmVisible} onConfirm={confirmDelete} onDismiss={dismissConfirm} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  list: { flex: 1 },
  container: { padding: S.lg, paddingBottom: S.xxl + S.xxl },
  // Centered single column, capped for large screens.
  inner: { width: "100%", maxWidth: 1200, alignSelf: "center", gap: S.sm },

  statsRow: { flexDirection: RTL_ROW, alignItems: "center", marginBottom: S.xs },
  statsPill: { paddingHorizontal: S.md, paddingVertical: S.xs, borderRadius: 20 },
  statsText: { fontSize: 13, fontWeight: "700" },

  emptyState: { alignItems: "center", paddingVertical: S.xxl, gap: S.sm },
  emptyText: { color: C.textMuted, fontSize: 14 },

  // ── Card ──
  card: {
    borderWidth: 1,
    borderRadius: 18,
    paddingVertical: S.md,
    paddingHorizontal: S.md,
    ...SHADOW.sm,
    ...(Platform.OS === "web" ? ({ cursor: "pointer", transition: "all 0.18s ease" } as any) : {}),
  },
  cardHover: {
    transform: [{ translateY: -2 }],
    ...SHADOW.md,
  },

  header: { flexDirection: RTL_ROW, alignItems: "center", gap: S.xs },
  iconBubble: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  iconText: { fontSize: 18 },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: "800",
    color: C.textPrimary,
    textAlign: TEXT_RIGHT,
    writingDirection: "rtl",
  },
  statusBadge: {
    flexDirection: RTL_ROW,
    alignItems: "center",
    gap: 3,
    paddingHorizontal: S.sm,
    paddingVertical: 3,
    borderRadius: 999,
  },
  statusDot: { fontSize: 9 },
  statusText: { fontSize: 11, fontWeight: "800" },
  miniBtn: { margin: 0, width: 26, height: 26 },

  progressRow: { flexDirection: RTL_ROW, alignItems: "center", gap: S.sm, marginTop: S.sm },
  progressTrack: { flex: 1, height: 8, borderRadius: 4, overflow: "hidden" },
  progressFill: { height: 8, borderRadius: 4 },
  progressPct: { fontSize: 13, fontWeight: "800", minWidth: 40, textAlign: "left" },

  taskCount: {
    fontSize: 12,
    fontWeight: "600",
    color: C.textSecondary,
    textAlign: TEXT_RIGHT,
    writingDirection: "rtl",
    marginTop: S.xs,
  },

  subList: { marginTop: S.xs, gap: 4 },
  subRow: { flexDirection: RTL_ROW, alignItems: "center", gap: S.sm },
  subTrack: { width: 88, height: 6, borderRadius: 3, overflow: "hidden" },
  subFill: { height: 6, borderRadius: 3 },
  subName: {
    flex: 1,
    fontSize: 12,
    color: C.textSecondary,
    textAlign: TEXT_RIGHT,
    writingDirection: "rtl",
  },
  moreSub: { fontSize: 11, color: C.textMuted, textAlign: TEXT_RIGHT, writingDirection: "rtl" },

  next: {
    fontSize: 12,
    color: C.textPrimary,
    textAlign: TEXT_RIGHT,
    writingDirection: "rtl",
    marginTop: S.xs,
  },
  nextLabel: { fontWeight: "800" },

  footer: { flexDirection: RTL_ROW, alignItems: "center", gap: S.md, marginTop: S.sm },
  avatars: { flexDirection: RTL_ROW, flex: 1, alignItems: "center", paddingStart: 6 },
  avatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    marginStart: -6,
  },
  avatarEmoji: { fontSize: 13 },
  avatarMore: { backgroundColor: C.bg, borderColor: C.border },
  avatarMoreText: { fontSize: 10, fontWeight: "800", color: C.textSecondary },

  meta: { alignItems: "center", minWidth: 52 },
  metaLabel: { fontSize: 10, color: C.textMuted, writingDirection: "rtl" },
  metaValue: { fontSize: 12, fontWeight: "700", color: C.textSecondary, writingDirection: "rtl" },

  openChevron: { marginStart: S.xs },

  fab: { position: "absolute", ...FAB_LEFT, bottom: S.lg },
});
