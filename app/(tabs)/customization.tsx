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

import React, { useState } from "react";
import { StyleSheet, View, Image } from "react-native";
import ScreenScrollView from "@src/components/ScreenScrollView";
import { Card, Text, Button } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

import { useFamilyStore } from "@src/store/useFamilyStore";
import { updateCustomizationsRemote } from "@src/lib/sync/remoteCrud";
import { pickFamilyPhoto } from "@src/lib/pickFamilyPhoto";
import SectionHeader from "@src/components/SectionHeader";
import PaginatedPicker from "@src/components/PaginatedPicker";
import { FAMILY_EMOJI_OPTIONS, COLOR_SWATCHES_LARGE } from "@src/ui/semanticColors";
import { DEFAULT_FAMILY_EMOJI } from "@src/models/customization";
import { useThemeColor } from "@src/ui/useThemeColor";
import { t } from "@src/i18n";
import { RTL_ROW, TEXT_RIGHT } from "@src/ui/rtl";
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
// Family photo section — an optional photo shown behind the family name in the
// nav drawer, the home header, and the family page. Stored as a data: URI in
// the customizations blob (no separate upload pipeline).
// ---------------------------------------------------------------------------

function FamilyPhotoSection() {
  const customizations = useFamilyStore((s) => s.customizations);
  const photo = customizations.familyPhoto;
  const theme = useThemeColor();
  const [busy, setBusy] = useState(false);

  const choose = async () => {
    setBusy(true);
    try {
      const uri = await pickFamilyPhoto();
      if (uri) updateCustomizationsRemote({ ...customizations, familyPhoto: uri });
    } finally {
      setBusy(false);
    }
  };

  const remove = () => {
    const next = { ...customizations };
    delete next.familyPhoto;
    updateCustomizationsRemote(next);
  };

  return (
    <>
      <SectionHeader label={t("customization.familyPhoto")} />
      <Card style={styles.card} mode="elevated">
        <Card.Content>
          {photo ? (
            <Image source={{ uri: photo }} style={styles.photoPreview} resizeMode="cover" />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Text style={styles.photoHint}>{t("customization.familyPhotoHint")}</Text>
            </View>
          )}
          <View style={styles.photoActions}>
            <Button
              mode="contained"
              icon="image"
              onPress={choose}
              loading={busy}
              disabled={busy}
              buttonColor={theme}
              testID="family-photo-choose"
            >
              {photo ? t("customization.familyPhotoChange") : t("customization.familyPhotoChoose")}
            </Button>
            {photo ? (
              <Button mode="outlined" icon="trash-can-outline" textColor={C.red} onPress={remove}>
                {t("customization.familyPhotoRemove")}
              </Button>
            ) : null}
          </View>
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

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <ScreenScrollView contentContainerStyle={styles.container}>
        <Text style={styles.subtitle}>{t("customization.subtitle")}</Text>

        <FamilyIconSection />

        <FamilyPhotoSection />

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

  photoPreview: {
    width: "100%",
    height: 140,
    borderRadius: R.md,
    marginBottom: S.md,
    backgroundColor: C.bg,
  },
  photoPlaceholder: {
    width: "100%",
    height: 100,
    borderRadius: R.md,
    marginBottom: S.md,
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: S.lg,
  },
  photoHint: {
    fontSize: 13,
    color: C.textMuted,
    textAlign: "center",
    writingDirection: "rtl",
  },
  photoActions: { flexDirection: RTL_ROW, gap: S.sm, flexWrap: "wrap" },
});
