/**
 * Home — pure launcher dashboard (FamilyWall-style).
 *
 * A header (avatar · family name · settings) and a grid of FeatureTiles with
 * live counts. Every tile navigates to a dedicated screen — notes, chores and
 * projects each have their own route; kids open their schedule. No content is
 * managed inline here; the grid is purely a launcher.
 */

import React, { useMemo } from "react";
import { View, StyleSheet } from "react-native";
import ScreenScrollView from "@src/components/ScreenScrollView";
import { Text, IconButton } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { useFamilyStore } from "@src/store/useFamilyStore";
import { DEFAULT_FAMILY_EMOJI } from "@src/models/customization";
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
  budget: "#9B59B6",
};

export default function HomeScreen() {
  const router = useRouter();

  // Family-wide notes/projects only (kid-owned live in /kid/[kidId]).
  const allNotes = useFamilyStore((s) => s.notes);
  const allProjects = useFamilyStore((s) => s.projects);
  const chores = useFamilyStore((s) => s.chores);
  const grocery = useFamilyStore((s) => s.grocery);
  const familyEvents = useFamilyStore((s) => s.familyEvents);
  const allExpenses = useFamilyStore((s) => s.expenses);
  const familyName = useFamilyStore((s) => s.familyName);
  const familyEmoji = useFamilyStore((s) => s.customizations.familyEmoji) || DEFAULT_FAMILY_EMOJI;

  // ── Live counts for the launcher tiles ──
  const counts = useMemo(() => {
    // Counts include kid-owned notes/projects too — they're now shown on the
    // main notes/projects pages (labeled with a kid badge), so the launcher
    // tile counts should match.
    const notes = allNotes;
    const projects = allProjects;

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

    const currentYM = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;

    return {
      eventsWeek,
      grocery: grocery.filter((g) => !g.isBought).length,
      todayTasks: chores.filter((c) => c.selectedForToday && !c.done).length,
      notes: notes.length,
      chores: chores.filter((c) => !c.done).length,
      projects: projects.filter((p) => p.status !== "done").length,
      budgetExpenses: allExpenses.filter((e) => e.date.startsWith(currentYM)).length,
    };
  }, [allNotes, allProjects, chores, grocery, familyEvents, allExpenses]);

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenScrollView contentContainerStyle={styles.container}>
        {/* ── Header: family name · settings (spacer balances the cog) ── */}
        <View style={styles.headerRow}>
          {/* Settings cog on the RIGHT (leading in RTL); spacer balances it. */}
          <IconButton
            icon="cog-outline"
            size={24}
            iconColor={C.textSecondary}
            onPress={() => router.push("/settings")}
            accessibilityLabel={t("tabs.settings")}
            testID="home-settings"
          />
          <View style={[{ flexDirection: RTL_ROW }, styles.headerCenter]}>
            <View style={styles.familyBadge}>
              <Text style={styles.familyBadgeEmoji}>{familyEmoji}</Text>
            </View>
            {!!familyName && (
              <Text style={styles.headerFamily} numberOfLines={1}>
                {t("familyBadge.prefix")} {familyName}
              </Text>
            )}
          </View>
          <View style={styles.headerSpacer} />
        </View>

        {/* ── Launcher tile grid ── */}
        <Text style={styles.gridLabel}>{t("home.quickAccess")}</Text>
        <View style={styles.grid}>
          <FeatureTile
            title={t("tabs.calendar")} icon="calendar-outline" accent={TILE.calendar}
            count={counts.eventsWeek}
            onPress={() => router.push("/calendar")} testID="tile-calendar"
          />
          <FeatureTile
            title={t("tabs.grocery")} icon="cart-outline" accent={TILE.grocery}
            count={counts.grocery}
            onPress={() => router.push("/grocery")} testID="tile-grocery"
          />
          <FeatureTile
            title={t("tabs.today")} icon="sunny-outline" accent={TILE.today}
            count={counts.todayTasks}
            onPress={() => router.push("/today")} testID="tile-today"
          />
          <FeatureTile
            title={t("home.notes")} icon="document-text-outline" accent={TILE.notes}
            count={counts.notes}
            onPress={() => router.push("/notes")} testID="tile-notes"
          />
          <FeatureTile
            title={t("home.chores")} icon="checkbox-outline" accent={TILE.chores}
            count={counts.chores}
            onPress={() => router.push("/chores")} testID="tile-chores"
          />
          <FeatureTile
            title={t("home.projects")} icon="rocket-outline" accent={TILE.projects}
            count={counts.projects}
            onPress={() => router.push("/projects")} testID="tile-projects"
          />
          <FeatureTile
            title={t("tabs.budget")} icon="wallet-outline" accent={TILE.budget}
            count={counts.budgetExpenses}
            onPress={() => router.push("/budget" as any)} testID="tile-budget"
          />
        </View>

      </ScreenScrollView>
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
  headerSpacer: { width: 40 },
  headerCenter: { flex: 1, alignItems: "center", justifyContent: "center", gap: S.xs },
  familyBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: C.purple + "18",
    alignItems: "center",
    justifyContent: "center",
  },
  familyBadgeEmoji: { fontSize: 19 },
  headerFamily: {
    flexShrink: 1,
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
