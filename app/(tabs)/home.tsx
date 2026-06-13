/**
 * Home — pure launcher dashboard (FamilyWall-style).
 *
 * A header (avatar · family name · settings) and a grid of FeatureTiles with
 * live counts. Every tile navigates to a dedicated screen — notes, chores and
 * projects each have their own route; kids open their schedule. No content is
 * managed inline here; the grid is purely a launcher.
 */

import React, { useMemo } from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { Text, IconButton } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { useAuthStore } from "@src/auth/useAuthStore";
import { useFamilyStore } from "@src/store/useFamilyStore";
import { t } from "@src/i18n";
import FeatureTile from "@src/components/FeatureTile";
import { RTL_ROW, TEXT_RIGHT } from "@src/ui/rtl";
import { C, S } from "@src/ui/tokens";

// Tile accent palette — mirrors the nav tab colours for a cohesive feel.
const TILE = {
  calendar: "#3A7BD5",
  grocery: "#2D9F6F",
  today: "#C49A2A",
  notes: "#D97706",
  chores: "#0D9488",
  projects: "#6C63FF",
  kids: "#E0699B",
};

export default function HomeScreen() {
  const router = useRouter();

  // Family-wide notes/projects only (kid-owned live in /kid/[kidId]).
  const allNotes = useFamilyStore((s) => s.notes);
  const allProjects = useFamilyStore((s) => s.projects);
  const chores = useFamilyStore((s) => s.chores);
  const grocery = useFamilyStore((s) => s.grocery);
  const familyEvents = useFamilyStore((s) => s.familyEvents);
  const kids = useFamilyStore((s) => s.kids);
  const familyName = useFamilyStore((s) => s.familyName);
  const username = useAuthStore((s) => s.session?.user?.username ?? "");

  const activeKids = useMemo(() => kids.filter((k) => k.isActive), [kids]);

  // ── Live counts for the launcher tiles ──
  const counts = useMemo(() => {
    const notes = allNotes.filter((n) => !n.kidId);
    const projects = allProjects.filter((p) => !p.kidId);

    const today = new Date();
    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const ymd = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const todayYMD = ymd(today);
    const weekEndYMD = ymd(weekEnd);

    // Events this week: all recurring (weekly) + one-time within 7 days.
    const eventsWeek = familyEvents.filter((e) =>
      e.isRecurring ? true : !!e.date && e.date >= todayYMD && e.date <= weekEndYMD,
    ).length;

    return {
      eventsWeek,
      grocery: grocery.filter((g) => !g.isBought).length,
      todayTasks: chores.filter((c) => c.selectedForToday && !c.done).length,
      notes: notes.length,
      chores: chores.filter((c) => !c.done).length,
      projects: projects.filter((p) => p.status !== "done").length,
    };
  }, [allNotes, allProjects, chores, grocery, familyEvents]);

  // Tile subtitle helper: "{n} …" or a friendly zero-state string.
  const sub = (n: number, key: string, zeroKey: string) =>
    n > 0 ? t(key, { count: n }) : t(zeroKey);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* ── Header: avatar · family name · settings ── */}
        <View style={styles.headerRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{(username || "·").slice(0, 2)}</Text>
          </View>
          <View style={styles.headerCenter}>
            <Text style={styles.headerGreeting}>{t("home.greeting")}</Text>
            {!!familyName && (
              <Text style={styles.headerFamily} numberOfLines={1}>
                {t("familyBadge.prefix")} {familyName}
              </Text>
            )}
          </View>
          <IconButton
            icon="cog-outline"
            size={24}
            iconColor={C.textSecondary}
            onPress={() => router.push("/settings")}
            accessibilityLabel={t("tabs.settings")}
            testID="home-settings"
          />
        </View>

        {/* ── Launcher tile grid ── */}
        <Text style={styles.gridLabel}>{t("home.quickAccess")}</Text>
        <View style={styles.grid}>
          <FeatureTile
            title={t("tabs.calendar")} emoji="📅" accent={TILE.calendar}
            subtitle={sub(counts.eventsWeek, "home.tileEventsWeek", "home.tileEventsWeekZero")}
            onPress={() => router.push("/calendar")} testID="tile-calendar"
          />
          <FeatureTile
            title={t("tabs.grocery")} emoji="🛒" accent={TILE.grocery}
            subtitle={sub(counts.grocery, "home.tileGrocery", "home.tileGroceryZero")}
            onPress={() => router.push("/grocery")} testID="tile-grocery"
          />
          <FeatureTile
            title={t("tabs.today")} emoji="☀️" accent={TILE.today}
            subtitle={sub(counts.todayTasks, "home.tileToday", "home.tileTodayZero")}
            onPress={() => router.push("/today")} testID="tile-today"
          />
          <FeatureTile
            title={t("home.notes")} emoji="📝" accent={TILE.notes}
            subtitle={sub(counts.notes, "home.tileNotes", "home.tileNotesZero")}
            onPress={() => router.push("/notes")} testID="tile-notes"
          />
          <FeatureTile
            title={t("home.chores")} emoji="✅" accent={TILE.chores}
            subtitle={sub(counts.chores, "home.tileChores", "home.tileChoresZero")}
            onPress={() => router.push("/chores")} testID="tile-chores"
          />
          <FeatureTile
            title={t("home.projects")} emoji="🚀" accent={TILE.projects}
            subtitle={sub(counts.projects, "home.tileProjects", "home.tileProjectsZero")}
            onPress={() => router.push("/projects")} testID="tile-projects"
          />
        </View>

        {/* ── Kids — each opens their schedule. Add/edit lives in Settings. ── */}
        {activeKids.length > 0 && (
          <>
            <Text style={styles.gridLabel}>{t("home.kids")}</Text>
            <View style={styles.grid}>
              {activeKids.map((kid) => (
                <FeatureTile
                  key={kid.id}
                  title={kid.name}
                  emoji={kid.emoji ?? "🧒"}
                  accent={kid.color ?? TILE.kids}
                  subtitle={t("home.viewSchedule")}
                  onPress={() => router.push(`/kid/${kid.id}`)}
                  testID={`tile-kid-${kid.id}`}
                />
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  container: { padding: S.lg, paddingBottom: S.xxl + S.lg },

  // ── Header ──
  headerRow: {
    flexDirection: RTL_ROW,
    alignItems: "center",
    gap: S.sm,
    marginBottom: S.lg,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#2AACB4",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
  headerCenter: { flex: 1 },
  headerGreeting: {
    fontSize: 13,
    color: C.textSecondary,
    textAlign: TEXT_RIGHT,
    writingDirection: "rtl",
  },
  headerFamily: {
    fontSize: 19,
    fontWeight: "800",
    color: C.textPrimary,
    textAlign: TEXT_RIGHT,
    writingDirection: "rtl",
  },

  // ── Launcher grid ──
  gridLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: C.textMuted,
    letterSpacing: 0.6,
    textAlign: TEXT_RIGHT,
    writingDirection: "rtl",
    marginBottom: S.sm,
  },
  grid: {
    flexDirection: RTL_ROW,
    flexWrap: "wrap",
    gap: S.sm,
    marginBottom: S.xl,
  },
});
