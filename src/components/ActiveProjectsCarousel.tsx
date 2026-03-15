/**
 * ActiveProjectsCarousel — Horizontal swipeable carousel of active (in-progress) projects.
 *
 * Uses a native horizontal ScrollView with snap-to-interval for cross-platform
 * compatibility (web + iOS). RTL-aware via I18nManager.
 *
 * Follows the same pattern as PinnedNotesCarousel.
 */

import React, { useRef } from "react";
import {
  View,
  StyleSheet,
  I18nManager,
  useWindowDimensions,
  Pressable,
  ScrollView,
  Platform,
} from "react-native";
import { Text, ProgressBar } from "react-native-paper";
import type { Project } from "@src/models/project";
import { t, statusLabel } from "@src/i18n";
import { RTL_ROW } from "@src/ui/rtl";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface Props {
  projects: Project[];
  onProjectPress: (project: Project) => void;
  onAddPress: () => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CARD_WIDTH_RATIO = 0.65;
const GAP = 12;

const STATUS_COLORS: Record<string, string> = {
  idea: "#8E8BA8",
  in_progress: "#6C63FF",
  done: "#4ECDC4",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ActiveProjectsCarousel({
  projects,
  onProjectPress,
  onAddPress,
}: Props) {
  const { width: screenWidth } = useWindowDimensions();
  const CARD_W = screenWidth * CARD_WIDTH_RATIO;
  const SNAP_INTERVAL = CARD_W + GAP;
  const sideInset = (screenWidth - CARD_W) / 2;
  const scrollRef = useRef<ScrollView>(null);

  return (
    <View style={styles.wrapper}>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={SNAP_INTERVAL}
        decelerationRate="fast"
        contentContainerStyle={{
          paddingHorizontal: sideInset - GAP / 2,
        }}
        // Flip scroll direction for RTL on web
        style={I18nManager.isRTL && Platform.OS === "web" ? { direction: "rtl" } : undefined}
      >
        {projects.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            cardWidth={CARD_W}
            onPress={() => onProjectPress(project)}
          />
        ))}
        {/* Add card */}
        <AddCard cardWidth={CARD_W} onPress={onAddPress} />
      </ScrollView>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Project Card
// ---------------------------------------------------------------------------

function ProjectCard({
  project,
  cardWidth,
  onPress,
}: {
  project: Project;
  cardWidth: number;
  onPress: () => void;
}) {
  const color = STATUS_COLORS[project.status] ?? "#6C63FF";

  return (
    <View style={{ width: cardWidth, marginHorizontal: GAP / 2 }}>
      <Pressable onPress={onPress} style={styles.projectCard}>
        <View style={styles.topRow}>
          <Text
            variant="titleSmall"
            style={styles.projectTitle}
            numberOfLines={1}
          >
            {project.title}
          </Text>
          <Text
            style={[
              styles.statusBadge,
              { color, backgroundColor: color + "22" },
            ]}
          >
            {statusLabel(project.status)}
          </Text>
        </View>
        {project.description ? (
          <Text
            variant="bodySmall"
            style={styles.projectDesc}
            numberOfLines={2}
          >
            {project.description}
          </Text>
        ) : null}
        <View style={styles.progressRow}>
          <Text style={[styles.progressLabel, { color }]}>
            {project.progress}%
          </Text>
          <View style={styles.progressBarWrap}>
            <ProgressBar
              progress={project.progress / 100}
              color={color}
              style={styles.progressBar}
            />
          </View>
        </View>
      </Pressable>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Add Card
// ---------------------------------------------------------------------------

function AddCard({
  cardWidth,
  onPress,
}: {
  cardWidth: number;
  onPress: () => void;
}) {
  return (
    <View style={{ width: cardWidth, marginHorizontal: GAP / 2 }}>
      <Pressable onPress={onPress} style={styles.addCard}>
        <Text style={styles.addIcon}>+</Text>
        <Text style={styles.addLabel}>{t("today.addProject")}</Text>
      </Pressable>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 24,
    overflow: "visible",
  },

  // Project card
  projectCard: {
    backgroundColor: "#E8E6FF",
    borderRadius: 16,
    padding: 16,
    minHeight: 110,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    justifyContent: "space-between",
  },
  topRow: {
    flexDirection: RTL_ROW,
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 4,
  },
  projectTitle: {
    fontWeight: "700",
    color: "#1A1A2E",
    textAlign: "right",
    flex: 1,
  },
  statusBadge: {
    fontSize: 10,
    fontWeight: "600",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    overflow: "hidden",
  },
  projectDesc: {
    color: "#6B6B8D",
    textAlign: "right",
    lineHeight: 18,
    marginBottom: 4,
  },
  progressRow: {
    flexDirection: RTL_ROW,
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  progressBarWrap: {
    flex: 1,
  },
  progressBar: {
    height: 5,
    borderRadius: 3,
  },
  progressLabel: {
    fontSize: 11,
    fontWeight: "700",
  },

  // Add card
  addCard: {
    borderWidth: 2,
    borderColor: "#6C63FF44",
    borderStyle: "dashed",
    borderRadius: 16,
    padding: 16,
    minHeight: 110,
    alignItems: "center",
    justifyContent: "center",
  },
  addIcon: {
    fontSize: 32,
    color: "#6C63FF",
    fontWeight: "300",
    marginBottom: 4,
  },
  addLabel: {
    fontSize: 13,
    color: "#6C63FF",
    fontWeight: "600",
  },
});
