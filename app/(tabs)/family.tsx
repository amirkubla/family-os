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
import { DEFAULT_FAMILY_EMOJI } from "@src/models/customization";
import FeatureTile from "@src/components/FeatureTile";
import FamilyStats from "@src/components/FamilyStats";
import FamilyPhotoBackdrop from "@src/components/FamilyPhotoBackdrop";
import { t } from "@src/i18n";
import { C, S, R, SHADOW } from "@src/ui/tokens";
import { RTL_ROW, TEXT_RIGHT } from "@src/ui/rtl";
import { useThemeColor } from "@src/ui/useThemeColor";

const PARENT_FALLBACK = "#6C63FF";
const KID_FALLBACK = "#E0699B";

export default function FamilyScreen() {
  const router = useRouter();
  const members = useFamilyStore((s) => s.familyMembers);
  const kids = useFamilyStore((s) => s.kids);
  const familyName = useFamilyStore((s) => s.familyName);
  const familyEmoji = useFamilyStore((s) => s.customizations.familyEmoji) || DEFAULT_FAMILY_EMOJI;
  const familyPhoto = useFamilyStore((s) => s.customizations.familyPhoto);

  const activeMembers = useMemo(() => members.filter((m) => m.isActive), [members]);
  const activeKids = useMemo(() => kids.filter((k) => k.isActive), [kids]);
  const theme = useThemeColor();

  // Decorative "family lineup" — everyone's avatar in one row.
  const lineup = [
    ...activeMembers.map((m) => ({ id: `m-${m.id}`, emoji: m.avatarEmoji ?? "👤", color: m.color ?? PARENT_FALLBACK })),
    ...activeKids.map((k) => ({ id: `k-${k.id}`, emoji: k.emoji ?? "🧒", color: k.color ?? KID_FALLBACK })),
  ];

  const onPhoto = !!familyPhoto;
  // Shared hero content — same layout whether over a photo or the themed card.
  const heroInner = (
    <>
      <View style={styles.heroTop}>
        <View style={[styles.emojiCircle, { backgroundColor: onPhoto ? "rgba(255,255,255,0.25)" : theme + "14" }]}>
          <Text style={styles.emojiText}>{familyEmoji}</Text>
        </View>
        <View style={styles.heroTitleWrap}>
          <Text
            style={[styles.familyName, { color: onPhoto ? "#FFFFFF" : theme }, onPhoto && styles.onPhotoShadow]}
            numberOfLines={1}
          >
            {familyName ? `${t("familyBadge.prefix")} ${familyName}` : t("family.title")}
          </Text>
          <Text style={[styles.familyMeta, onPhoto && styles.familyMetaPhoto]}>
            {`${activeMembers.length} ${t("family.parents")} · ${activeKids.length} ${t("family.kids")}`}
          </Text>
        </View>
      </View>
      {lineup.length > 0 && (
        <View style={styles.avatarRow}>
          {lineup.map((a) => (
            <View
              key={a.id}
              style={[styles.avatar, { backgroundColor: a.color + "22", borderColor: onPhoto ? "#FFFFFF" : a.color }]}
            >
              <Text style={styles.avatarEmoji}>{a.emoji}</Text>
            </View>
          ))}
        </View>
      )}
    </>
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <ScreenScrollView contentContainerStyle={styles.container}>
        {/* ── Family identity hero (no back header — nav is via the drawer).
            A family photo, when set, becomes the hero background. ── */}
        {onPhoto ? (
          <FamilyPhotoBackdrop uri={familyPhoto!} radius={R.xl} scrim={0.45} style={styles.heroPhoto}>
            {heroInner}
          </FamilyPhotoBackdrop>
        ) : (
          <View style={[styles.hero, { borderColor: theme + "22" }]}>{heroInner}</View>
        )}

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

        {/* ── Per-member statistics roll-up ── */}
        <FamilyStats />
      </ScreenScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  container: { padding: S.lg, paddingBottom: S.xxl + S.lg },

  // ── Family identity hero ──
  hero: {
    backgroundColor: C.surface,
    borderRadius: R.xl,
    borderWidth: 1,
    padding: S.lg,
    marginBottom: S.md,
    ...SHADOW.sm,
  },
  heroPhoto: {
    borderRadius: R.xl,
    overflow: "hidden",
    padding: S.lg,
    marginBottom: S.md,
    minHeight: 132,
    justifyContent: "center",
  },
  onPhotoShadow: {
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  familyMetaPhoto: { color: "rgba(255,255,255,0.92)" },
  heroTop: { flexDirection: RTL_ROW, alignItems: "center", gap: S.md },
  emojiCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  emojiText: { fontSize: 30 },
  heroTitleWrap: { flex: 1 },
  familyName: {
    fontSize: 22,
    fontWeight: "800",
    textAlign: TEXT_RIGHT,
    writingDirection: "rtl",
  },
  familyMeta: {
    fontSize: 13,
    color: C.textSecondary,
    textAlign: TEXT_RIGHT,
    writingDirection: "rtl",
    marginTop: 2,
  },
  avatarRow: { flexDirection: RTL_ROW, flexWrap: "wrap", gap: S.xs, marginTop: S.md },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarEmoji: { fontSize: 16 },

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
