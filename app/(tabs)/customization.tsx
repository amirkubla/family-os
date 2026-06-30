/**
 * Customization screen — per-family preferences.
 *
 * Route: /customization (hidden from the tab bar; reached via the Settings link).
 *
 * Two sections:
 *   1. Grocery subcategories — per main category (grocery / health / home).
 *      Each subcategory has a name, emoji icon, and colour. "אחר" is locked.
 *   2. Budget categories — name, icon, colour, optional monthly cap.
 *
 * Every edit is optimistic: we update the local store immediately and
 * fire-and-forget the PUT. Server errors surface via the global snackbar.
 */

import React from "react";
import { StyleSheet } from "react-native";
import ScreenScrollView from "@src/components/ScreenScrollView";
import { Card, Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import PageHeader from "@src/components/PageHeader";

import { useFamilyStore } from "@src/store/useFamilyStore";
import { updateCustomizationsRemote } from "@src/lib/sync/remoteCrud";
import SectionHeader from "@src/components/SectionHeader";
import PaginatedPicker from "@src/components/PaginatedPicker";
import { FAMILY_EMOJI_OPTIONS, COLOR_SWATCHES_LARGE } from "@src/ui/semanticColors";
import { DEFAULT_FAMILY_EMOJI } from "@src/models/customization";
import { t } from "@src/i18n";
import { TEXT_RIGHT } from "@src/ui/rtl";
import { C, R, S } from "@src/ui/tokens";

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Family icon section
// ---------------------------------------------------------------------------

function FamilyIconSection() {
  const customizations = useFamilyStore((s) => s.customizations);
  const current = customizations.familyEmoji ?? DEFAULT_FAMILY_EMOJI;
  return (
    <>
      <SectionHeader label={t("customization.familyIcon")} />
      <Card style={styles.card} mode="elevated">
        <Card.Content>
          <PaginatedPicker
            kind="emoji"
            options={FAMILY_EMOJI_OPTIONS}
            value={current}
            onChange={(emoji) => updateCustomizationsRemote({ ...customizations, familyEmoji: emoji })}
            testIDPrefix="family-emoji"
          />
        </Card.Content>
      </Card>
    </>
  );
}

// ---------------------------------------------------------------------------
// Theme colour section — the family's brand accent, applied app-wide to modal
// buttons, the floating nav menu, and the page FABs (via useThemeColor).
// ---------------------------------------------------------------------------

function ThemeColorSection() {
  const customizations = useFamilyStore((s) => s.customizations);
  const current = customizations.themeColor ?? C.primary;
  return (
    <>
      <SectionHeader label={t("customization.themeColor")} />
      <Card style={styles.card} mode="elevated">
        <Card.Content>
          <PaginatedPicker
            kind="color"
            options={COLOR_SWATCHES_LARGE}
            value={current}
            onChange={(color) => updateCustomizationsRemote({ ...customizations, themeColor: color })}
            testIDPrefix="theme-color"
          />
        </Card.Content>
      </Card>
    </>
  );
}

// ---------------------------------------------------------------------------

export default function CustomizationScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <PageHeader title={t("customization.title")} onBack={() => router.replace("/settings")} />
      <ScreenScrollView contentContainerStyle={styles.container}>
        <Text style={styles.subtitle}>{t("customization.subtitle")}</Text>

        <FamilyIconSection />

        <ThemeColorSection />
      </ScreenScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  container: { padding: S.lg, paddingBottom: S.xxl + S.xxl },

  subtitle: {
    fontSize: 14,
    color: C.textSecondary,
    textAlign: TEXT_RIGHT,
    writingDirection: "rtl",
    marginTop: S.xs,
    marginBottom: S.md,
  },

  card: { borderRadius: R.lg, backgroundColor: C.surface, marginBottom: S.lg },
});
