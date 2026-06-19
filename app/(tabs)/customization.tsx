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

import React, { useState, useMemo, useCallback } from "react";
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
import GrocerySubcategoryModal from "@src/components/GrocerySubcategoryModal";
import { useConfirmDelete } from "@src/hooks/useConfirmDelete";
import type { BudgetCategory } from "@src/models/budget";
import SectionHeader from "@src/components/SectionHeader";
import {
  effectiveSubcategories,
  OTHER_SUBCATEGORY,
  type FamilyCustomizations,
  type GrocerySubcategory,
} from "@src/models/customization";
import type { ShoppingCategory } from "@src/models/grocery";
import { SHOPPING_CATEGORIES } from "@src/models/grocery";
import { t, shoppingCategoryLabel } from "@src/i18n";
import { RTL_ROW, TEXT_RIGHT } from "@src/ui/rtl";
import { C, R, S } from "@src/ui/tokens";

// ---------------------------------------------------------------------------
// One grocery subcategory section (grocery / health / home)
// ---------------------------------------------------------------------------

function GrocerySubcategoriesSection({
  category,
  list,
  onChange,
}: {
  category: ShoppingCategory;
  list: GrocerySubcategory[];
  onChange: (next: GrocerySubcategory[]) => void;
}) {
  const { confirmVisible, requestDelete, confirmDelete, dismissConfirm } = useConfirmDelete();
  const [modalVisible, setModalVisible] = useState(false);
  const [editItem, setEditItem] = useState<GrocerySubcategory | null>(null);

  const handleSave = (data: GrocerySubcategory) => {
    if (editItem) {
      onChange(list.map((s) => (s.name === editItem.name ? data : s)));
    } else {
      // Insert before "אחר" so it stays last.
      const otherIdx = list.findIndex((s) => s.name === OTHER_SUBCATEGORY);
      const next =
        otherIdx >= 0
          ? [...list.slice(0, otherIdx), data, ...list.slice(otherIdx)]
          : [...list, data];
      onChange(next);
    }
    setEditItem(null);
  };

  const SECTION_LABEL: Record<ShoppingCategory, string> = {
    grocery: "customization.grocerySubcategories",
    health: "customization.healthSubcategories",
    home: "customization.homeSubcategories",
  };

  return (
    <>
      <SectionHeader label={`${t(SECTION_LABEL[category])} · ${shoppingCategoryLabel(category)}`} />
      <Card style={styles.card} mode="elevated">
        <Card.Content>
          {list.map((sub) => {
            const isOther = sub.name === OTHER_SUBCATEGORY;
            return (
              <View key={sub.name} style={styles.catRow}>
                <View style={[styles.catDot, { backgroundColor: sub.color }]}>
                  <Text style={styles.catEmoji}>{sub.icon}</Text>
                </View>
                <Text style={styles.catName}>{sub.name}</Text>
                <IconButton
                  icon={isOther ? "lock-outline" : "pencil-outline"}
                  size={18}
                  disabled={isOther}
                  onPress={isOther ? undefined : () => { setEditItem(sub); setModalVisible(true); }}
                  accessibilityLabel={
                    isOther ? t("customization.otherCategoryLocked") : t("customization.editSubcategory")
                  }
                />
                <IconButton
                  icon="trash-can-outline"
                  size={18}
                  disabled={isOther}
                  onPress={isOther ? undefined : () =>
                    requestDelete(() => onChange(list.filter((s) => s.name !== sub.name)))
                  }
                  accessibilityLabel={t("customization.deleteSubcategory")}
                />
              </View>
            );
          })}

          <Pressable
            style={styles.addCatBtn}
            onPress={() => { setEditItem(null); setModalVisible(true); }}
          >
            <Text style={styles.addCatText}>+ {t("customization.addSubcategory")}</Text>
          </Pressable>
        </Card.Content>
      </Card>

      <GrocerySubcategoryModal
        visible={modalVisible}
        onDismiss={() => { setModalVisible(false); setEditItem(null); }}
        editSubcategory={editItem}
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
              <View style={[styles.catDot, { backgroundColor: cat.color }]}>
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

export default function CustomizationScreen() {
  const router = useRouter();
  const customizations = useFamilyStore((s) => s.customizations);

  const effective = useMemo(
    () =>
      Object.fromEntries(
        SHOPPING_CATEGORIES.map((cat) => [cat, effectiveSubcategories(customizations, cat)]),
      ) as Record<ShoppingCategory, GrocerySubcategory[]>,
    [customizations],
  );

  const setListFor = useCallback(
    (cat: ShoppingCategory, nextList: GrocerySubcategory[]) => {
      const next: FamilyCustomizations = {
        ...customizations,
        grocerySubcategories: {
          ...(customizations.grocerySubcategories ?? {}),
          [cat]: nextList,
        },
      };
      updateCustomizationsRemote(next);
    },
    [customizations],
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <PageHeader title={t("customization.title")} onBack={() => router.replace("/settings")} />
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.subtitle}>{t("customization.subtitle")}</Text>
        <Text style={styles.hint}>{t("customization.subcategoriesHint")}</Text>

        {SHOPPING_CATEGORIES.map((cat) => (
          <GrocerySubcategoriesSection
            key={cat}
            category={cat}
            list={effective[cat]}
            onChange={(next) => setListFor(cat, next)}
          />
        ))}

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
