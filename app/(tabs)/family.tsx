/**
 * Family — the family hub, reached from the floating-nav family icon.
 *
 * Two launcher grids: PARENTS (each opens a member profile collecting their
 * assigned items + stats) and KIDS (each opens the kid schedule). The kids grid
 * used to live on the home dashboard; it now lives here.
 */

import React, { useMemo } from "react";
import { View, StyleSheet } from "react-native";
import ScreenScrollView from "@src/components/ScreenScrollView";
import { Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { useFamilyStore } from "@src/store/useFamilyStore";
import PageHeader from "@src/components/PageHeader";
import FeatureTile from "@src/components/FeatureTile";
import { t } from "@src/i18n";
import { C, S } from "@src/ui/tokens";
import { TEXT_RIGHT } from "@src/ui/rtl";

const PARENT_FALLBACK = "#6C63FF";
const KID_FALLBACK = "#E0699B";

export default function FamilyScreen() {
  const router = useRouter();
  const members = useFamilyStore((s) => s.familyMembers);
  const kids = useFamilyStore((s) => s.kids);

  const activeMembers = useMemo(() => members.filter((m) => m.isActive), [members]);
  const activeKids = useMemo(() => kids.filter((k) => k.isActive), [kids]);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <PageHeader title={t("family.title")} onBack={() => router.replace("/home")} />
      <ScreenScrollView contentContainerStyle={styles.container}>
        {/* ── Parents ── */}
        <Text style={styles.gridLabel}>{t("family.parents")}</Text>
        {activeMembers.length === 0 ? (
          <Text style={styles.empty}>{t("family.noParents")}</Text>
        ) : (
          <View style={styles.grid}>
            {activeMembers.map((m) => (
              <FeatureTile
                key={m.id}
                title={m.name}
                emoji={m.avatarEmoji ?? "👤"}
                accent={m.color ?? PARENT_FALLBACK}
                onPress={() => router.push(`/parent/${m.id}`)}
                testID={`tile-parent-${m.id}`}
              />
            ))}
          </View>
        )}

        {/* ── Kids — each opens their schedule ── */}
        <Text style={styles.gridLabel}>{t("family.kids")}</Text>
        {activeKids.length === 0 ? (
          <Text style={styles.empty}>{t("family.noKids")}</Text>
        ) : (
          <View style={styles.grid}>
            {activeKids.map((kid) => (
              <FeatureTile
                key={kid.id}
                title={kid.name}
                emoji={kid.emoji ?? "🧒"}
                accent={kid.color ?? KID_FALLBACK}
                onPress={() => router.push(`/kid/${kid.id}`)}
                testID={`tile-kid-${kid.id}`}
              />
            ))}
          </View>
        )}
      </ScreenScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  container: { padding: S.lg, paddingBottom: S.xxl + S.lg },
  gridLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: C.textPrimary,
    textAlign: TEXT_RIGHT,
    writingDirection: "rtl",
    marginTop: S.lg,
    marginBottom: S.sm,
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: S.md },
  empty: {
    fontSize: 13,
    color: C.textMuted,
    textAlign: TEXT_RIGHT,
    writingDirection: "rtl",
    marginBottom: S.sm,
  },
});
