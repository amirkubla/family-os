/**
 * Projects — modern, compact, theme-aware dashboard.
 *
 * A single-column list of dense project cards (see ProjectCard) that surface a
 * project's status in a couple of seconds. Family-wide projects plus any
 * kid/member-owned ones (which carry an owner badge). Add via the FAB or the
 * ?modal=add deep link; ?status=in_progress pre-selects a status.
 */

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { View, StyleSheet, Alert } from "react-native";
import ScreenScrollView from "@src/components/ScreenScrollView";
import { Text, FAB } from "react-native-paper";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";

import { useFamilyStore } from "@src/store/useFamilyStore";
import { useBlurRemountKey } from "@src/hooks/useBlurRemountKey";
import type { Project } from "@src/models/project";
import type { FamilyMember } from "@src/models/familyMember";
import { deleteProjectRemote, reorderProjectsRemote } from "@src/lib/sync/remoteCrud";
import ProjectCard from "@src/components/ProjectCard";
import ProjectModal from "@src/components/ProjectModal";
import ConfirmDeleteModal from "@src/components/ConfirmDeleteModal";
import { useConfirmDelete } from "@src/hooks/useConfirmDelete";
import { useProjectVoice } from "@src/hooks/useProjectVoice";
import { useVoiceCapture } from "@src/hooks/useVoiceCapture";
import VoiceFab from "@src/components/VoiceFab";
import { t } from "@src/i18n";
import { C, S } from "@src/ui/tokens";
import { useThemeColor } from "@src/ui/useThemeColor";
import { RTL_ROW } from "@src/ui/rtl";
import { FAB_LEFT } from "@src/ui/fabAnchor";

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
                  members={(item.memberIds ?? []).map((id) => memberById.get(id)).filter(Boolean) as FamilyMember[]}
                  onPress={() => {
                    setVoiceDraft(undefined);
                    setEditingProject(item);
                    setModalOpen(true);
                  }}
                  onDelete={() => requestDelete(() => deleteProjectRemote(item.id))}
                  onMoveUp={() => moveProject(index, -1)}
                  onMoveDown={() => moveProject(index, 1)}
                  isFirst={index === 0}
                  isLast={index === projects.length - 1}
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

  fab: { position: "absolute", ...FAB_LEFT, bottom: S.lg },
});
