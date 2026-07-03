/**
 * ProjectCard — the modern, compact, theme-aware project card shared by the
 * Projects dashboard, the kid page, and the parent page so all three match.
 *
 * Surfaces (in priority order) title, overall progress, subtask breakdown,
 * next task, task count, assigned members, due date, and creation date. Tint +
 * accents derive from the family theme (useThemeColor), not a hardcoded palette.
 * Reorder chevrons render only when onMoveUp/onMoveDown are supplied.
 */

import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Pressable, Platform, Animated, Easing } from "react-native";
import { Text, IconButton } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";

import type { Project } from "@src/models/project";
import { computeProjectProgress } from "@src/models/project";
import type { FamilyMember } from "@src/models/familyMember";
import { t, statusLabel } from "@src/i18n";
import { C, S, SHADOW } from "@src/ui/tokens";
import { useThemeColor } from "@src/ui/useThemeColor";
import { RTL_ROW, TEXT_RIGHT } from "@src/ui/rtl";
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

/** Web-only theme-tinted hover shadow (native uses elevation via SHADOW.md). */
function webShadow(theme: string) {
  return Platform.OS === "web" ? ({ boxShadow: `0 10px 24px ${theme}33` } as any) : null;
}

const MAX_SUBTASK_ROWS = 3;
const MAX_AVATARS = 4;

interface Props {
  proj: Project;
  /** Resolved assigned members (for the avatar stack). */
  members: FamilyMember[];
  /** Position in its list — used for the staggered entrance animation. */
  index?: number;
  onPress: () => void;
  onDelete: () => void;
  /** Reorder — chevrons show only when both are provided. */
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  isFirst?: boolean;
  isLast?: boolean;
}

export default function ProjectCard({
  proj,
  members,
  index = 0,
  onPress,
  onDelete,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}: Props) {
  const theme = useThemeColor();
  const statusColor = STATUS_COLORS[proj.status];

  const subs = proj.subTasks ?? [];
  const progress = computeProjectProgress(subs, proj.progress);
  const doneCount = subs.filter((s) => s.progress >= 100).length;
  const nextTask = subs.find((s) => s.progress < 100)?.title;
  const due = proj.dueDate ? describeDue(proj.dueDate) : null;
  const dueColor = due?.tone === "danger" ? C.red : due?.tone === "warn" ? C.amber : C.textSecondary;
  const canReorder = !!(onMoveUp || onMoveDown);

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
        onPress={onPress}
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
          {canReorder && (
            <>
              <IconButton
                icon="chevron-up"
                size={15}
                disabled={isFirst}
                iconColor={C.textMuted}
                style={styles.miniBtn}
                onPress={onMoveUp}
              />
              <IconButton
                icon="chevron-down"
                size={15}
                disabled={isLast}
                iconColor={C.textMuted}
                style={styles.miniBtn}
                onPress={onMoveDown}
              />
            </>
          )}
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

const styles = StyleSheet.create({
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
});
