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
import { View, StyleSheet, ScrollView, Platform, Pressable } from "react-native";
import {
  Card,
  Text,
  IconButton,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import PageHeader from "@src/components/PageHeader";

import { useFamilyStore } from "@src/store/useFamilyStore";
import {
  updateCustomizationsRemote,
  addBudgetCategoryRemote,
  updateBudgetCategoryRemote,
  deleteBudgetCategoryRemote,
} from "@src/lib/sync/remoteCrud";
import ConfirmDeleteModal from "@src/components/ConfirmDeleteModal";
import BudgetCategoryModal from "@src/components/BudgetCategoryModal";
import { useConfirmDelete } from "@src/hooks/useConfirmDelete";
import type { BudgetCategory } from "@src/models/budget";
import SectionHeader from "@src/components/SectionHeader";
import PaginatedPicker from "@src/components/PaginatedPicker";
import { FAMILY_EMOJI_OPTIONS, COLOR_SWATCHES_LARGE } from "@src/ui/semanticColors";
import { DEFAULT_FAMILY_EMOJI } from "@src/models/customization";
import { t } from "@src/i18n";
import { RTL_ROW, TEXT_RIGHT } from "@src/ui/rtl";
import { C, R, S } from "@src/ui/tokens";

// ---------------------------------------------------------------------------
// Budget categories section
// ---------------------------------------------------------------------------

function BudgetCategoriesSection() {
  const budgetCategories = useFamilyStore((s) => s.budgetCategories);
  const { confirmVisible, requestDelete, confirmDelete, dismissConfirm } = useConfirmDelete();
  const [catModalVisible, setCatModalVisible] = useState(false);
  const [editCategory, setEditCategory] = useState<BudgetCategory | null>(null);

  const handleSave = (data: Parameters<typeof addBudgetCategoryRemote>[0]) => {
    if (editCategory) {
      updateBudgetCategoryRemote(editCategory.id, data);
    } else {
      addBudgetCategoryRemote({ ...data, sortOrder: budgetCategories.length });
    }
    setEditCategory(null);
  };

  return (
    <>
      <SectionHeader label={t("budget.categories")} />
      <Text style={styles.hint}>{t("customization.budgetCategoriesHint")}</Text>
      <Card style={styles.card} mode="elevated">
        <Card.Content>
          {budgetCategories.map((cat) => (
            <View key={cat.id} style={styles.catRow}>
              <View style={styles.catDot}>
                <Text style={styles.catEmoji}>{cat.icon}</Text>
              </View>
              <Text style={styles.catName}>{cat.name}</Text>
              {cat.monthlyCap ? (
                <Text style={styles.catCap}>
                  ₪{(cat.monthlyCap / 100).toLocaleString()}
                </Text>
              ) : null}
              <IconButton
                icon="pencil-outline"
                size={18}
                onPress={() => { setEditCategory(cat); setCatModalVisible(true); }}
              />
              <IconButton
                icon="trash-can-outline"
                size={18}
                onPress={() => requestDelete(() => deleteBudgetCategoryRemote(cat.id))}
              />
            </View>
          ))}
          <Pressable
            style={styles.addCatBtn}
            onPress={() => { setEditCategory(null); setCatModalVisible(true); }}
          >
            <Text style={styles.addCatText}>+ {t("budget.addCategory")}</Text>
          </Pressable>
        </Card.Content>
      </Card>

      <BudgetCategoryModal
        visible={catModalVisible}
        onDismiss={() => { setCatModalVisible(false); setEditCategory(null); }}
        editCategory={editCategory}
        onSave={handleSave}
      />
      <ConfirmDeleteModal
        visible={confirmVisible}
        onConfirm={confirmDelete}
        onDismiss={dismissConfirm}
      />
    </>
  );
}

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
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.subtitle}>{t("customization.subtitle")}</Text>

        <FamilyIconSection />

        <ThemeColorSection />

        <BudgetCategoriesSection />
      </ScrollView>
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
  hint: {
    fontSize: 12,
    color: C.textMuted,
    textAlign: TEXT_RIGHT,
    writingDirection: "rtl",
    marginBottom: S.md,
  },

  card: { borderRadius: R.lg, backgroundColor: C.surface, marginBottom: S.lg },

  catRow: {
    flexDirection: RTL_ROW,
    alignItems: "center",
    paddingVertical: S.xs,
    gap: S.xs,
  },
  catDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  catEmoji: { fontSize: 18 },
  catName: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: C.textPrimary,
    textAlign: TEXT_RIGHT,
  },
  catCap: {
    fontSize: 12,
    color: C.textSecondary,
  },

  addCatBtn: {
    alignItems: "center",
    paddingVertical: S.sm,
    marginTop: S.xs,
    borderRadius: R.md,
    borderWidth: 1.5,
    borderColor: C.purple,
    borderStyle: "dashed",
    ...(Platform.OS === "web" ? {} : {}),
  },
  addCatText: { fontSize: 14, color: C.purple, fontWeight: "600" },
});
