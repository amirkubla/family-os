/**
 * Projects — dedicated full screen (reached from the home launcher grid).
 *
 * Family-wide projects only (kidId == null). Add via the FAB or the
 * ?modal=add deep link; ?status=in_progress pre-selects a status.
 */

import React, { useState, useEffect, useMemo } from "react";
import { View, StyleSheet, Pressable, ScrollView, Platform } from "react-native";
import { Text, IconButton, FAB } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";

import { useFamilyStore } from "@src/store/useFamilyStore";
import type { Project } from "@src/models/project";
import { deleteProjectRemote } from "@src/lib/sync/remoteCrud";
import ProjectModal from "@src/components/ProjectModal";
import PageHeader from "@src/components/PageHeader";
import ConfirmDeleteModal from "@src/components/ConfirmDeleteModal";
import { useConfirmDelete } from "@src/hooks/useConfirmDelete";
import { t, statusLabel } from "@src/i18n";
import { C, R, S, SHADOW } from "@src/ui/tokens";
import { RTL_ROW, TEXT_RIGHT } from "@src/ui/rtl";
import { STATUS_COLORS } from "@src/ui/semanticColors";

const PROJECT_COLORS = {
  accent: "#6C63FF",
  bg: "#F8F7FF",
  border: "#E8E5FF",
  hover: "#EEEAFF",
} as const;

export default function ProjectsScreen() {
  const { modal, status: initialStatus } = useLocalSearchParams<{ modal?: string; status?: string }>();
  const { confirmVisible, requestDelete, confirmDelete, dismissConfirm } = useConfirmDelete();

  const allProjects = useFamilyStore((s) => s.projects);
  const projects = useMemo(() => allProjects.filter((p) => !p.kidId), [allProjects]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  useEffect(() => {
    if (modal === "add") {
      setEditingProject(null);
      setModalOpen(true);
    }
  }, [modal]);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <PageHeader title={t("home.projects")} />
      <ScrollView contentContainerStyle={styles.container}>
        {projects.length > 0 && (
          <View style={styles.statsRow}>
            <View style={styles.statsPill}>
              <Text style={styles.statsText}>
                {projects.filter((p) => p.status === "in_progress").length} {t("today.activeProjects").toLowerCase()}
              </Text>
            </View>
          </View>
        )}

        {projects.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={{ fontSize: 32 }}>🚀</Text>
            <Text style={styles.emptyText}>{t("home.noProjects")}</Text>
          </View>
        )}

        {projects.map((proj) => {
          const statusColor = STATUS_COLORS[proj.status];
          const statusEmoji = proj.status === "done" ? "✅" : proj.status === "in_progress" ? "🔨" : "💡";
          return (
            <Pressable
              key={proj.id}
              testID={"project-card-" + proj.title}
              style={({ pressed, hovered }: any) => [
                styles.projectCard,
                hovered && styles.projectCardHover,
                pressed && { transform: [{ scale: 0.98 }] },
              ]}
              onPress={() => {
                setEditingProject(proj);
                setModalOpen(true);
              }}
            >
              <View style={[styles.projectStripe, { backgroundColor: statusColor }]} />
              <View style={styles.projectBody}>
                <View style={styles.projectTopRow}>
                  <View style={[styles.projectStatusChip, { backgroundColor: statusColor + "18" }]}>
                    <Text style={{ fontSize: 12 }}>{statusEmoji}</Text>
                    <Text style={[styles.projectStatusText, { color: statusColor }]}>
                      {statusLabel(proj.status)}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }} />
                  <IconButton
                    testID={"project-delete-" + proj.title}
                    icon="trash-can-outline"
                    size={16}
                    iconColor={C.textMuted}
                    style={styles.projectActionBtn}
                    onPress={() => requestDelete(() => deleteProjectRemote(proj.id))}
                  />
                </View>

                <Text style={styles.projectTitle} numberOfLines={1}>
                  {proj.title}
                </Text>

                {proj.description ? (
                  <Text style={styles.projDesc} numberOfLines={2}>
                    {proj.description}
                  </Text>
                ) : null}

                <View style={styles.projectProgressRow}>
                  <View style={styles.projectProgressTrack}>
                    <View
                      style={[
                        styles.projectProgressFill,
                        { backgroundColor: statusColor, width: `${proj.progress}%` as any },
                      ]}
                    />
                  </View>
                  <Text style={[styles.projectProgressLabel, { color: statusColor }]}>
                    {proj.progress}%
                  </Text>
                </View>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      <FAB
        icon="plus"
        testID="btn-add-project"
        accessibilityLabel="btn-add-project"
        style={[styles.fab, { backgroundColor: PROJECT_COLORS.accent }]}
        color="#FFF"
        onPress={() => {
          setEditingProject(null);
          setModalOpen(true);
        }}
      />

      <ProjectModal
        visible={modalOpen}
        onDismiss={() => {
          setModalOpen(false);
          setEditingProject(null);
        }}
        editProject={editingProject}
        initialStatus={!editingProject && initialStatus ? (initialStatus as any) : undefined}
      />
      <ConfirmDeleteModal visible={confirmVisible} onConfirm={confirmDelete} onDismiss={dismissConfirm} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  container: { padding: S.lg, paddingBottom: S.xxl + S.xxl, gap: S.xs },
  statsRow: { flexDirection: RTL_ROW, alignItems: "center", marginBottom: S.sm },
  statsPill: {
    backgroundColor: PROJECT_COLORS.accent + "14",
    paddingHorizontal: S.md,
    paddingVertical: S.xs,
    borderRadius: 20,
  },
  statsText: { fontSize: 13, fontWeight: "700", color: PROJECT_COLORS.accent },
  emptyState: { alignItems: "center", paddingVertical: S.xxl, gap: S.sm },
  emptyText: { color: C.textMuted, fontSize: 14 },
  projectCard: {
    flexDirection: RTL_ROW,
    backgroundColor: PROJECT_COLORS.bg,
    borderWidth: 1,
    borderColor: PROJECT_COLORS.border,
    borderRadius: R.lg,
    marginBottom: S.md,
    overflow: "hidden",
    ...SHADOW.sm,
    ...(Platform.OS === "web" ? { cursor: "pointer" as any, transition: "all 0.2s ease" } : {}),
  },
  projectCardHover: {
    backgroundColor: PROJECT_COLORS.hover,
    borderColor: PROJECT_COLORS.accent + "40",
    transform: [{ translateY: -2 }],
    ...SHADOW.md,
  },
  projectStripe: { width: 5, alignSelf: "stretch" },
  projectBody: { flex: 1, padding: S.lg, gap: S.xs },
  projectTopRow: { flexDirection: RTL_ROW, alignItems: "center", marginBottom: S.xs },
  projectStatusChip: {
    flexDirection: RTL_ROW,
    alignItems: "center",
    gap: 4,
    paddingHorizontal: S.sm + 2,
    paddingVertical: 3,
    borderRadius: 12,
  },
  projectStatusText: { fontSize: 11, fontWeight: "700" },
  projectActionBtn: { margin: 0, width: 28, height: 28 },
  projectTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: C.textPrimary,
    textAlign: TEXT_RIGHT,
    writingDirection: "rtl",
  },
  projDesc: {
    fontSize: 13,
    color: C.textSecondary,
    textAlign: TEXT_RIGHT,
    writingDirection: "rtl",
    lineHeight: 19,
  },
  projectProgressRow: { flexDirection: RTL_ROW, alignItems: "center", gap: S.sm, marginTop: S.sm },
  projectProgressTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: PROJECT_COLORS.accent + "15",
    overflow: "hidden",
  },
  projectProgressFill: { height: 6, borderRadius: 3 },
  projectProgressLabel: { fontSize: 12, fontWeight: "700", minWidth: 36, textAlign: "left" },
  fab: { position: "absolute", left: S.lg, bottom: S.lg },
});
