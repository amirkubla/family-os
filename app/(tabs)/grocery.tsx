import React, { useState, useMemo, useEffect } from "react";
import { View, StyleSheet, Platform } from "react-native";
import ScreenScrollView from "@src/components/ScreenScrollView";
import {
  Card,
  Text,
  Button,
  Checkbox,
  IconButton,
  Divider,
  FAB,
} from "react-native-paper";
import SegmentedPills from "@src/components/SegmentedPills";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import { useFamilyStore } from "@src/store/useFamilyStore";
import {
  toggleGroceryBoughtRemote,
  deleteGroceryRemote,
  clearBoughtRemote,
  clearAllCategoryRemote,
  addGroceryRemote,
  updateCustomizationsRemote,
} from "@src/lib/sync/remoteCrud";
import GroceryAddModal from "@src/components/GroceryAddModal";
import GroceryCategoriesModal from "@src/components/GroceryCategoriesModal";
import ShoppingCategoriesModal from "@src/components/ShoppingCategoriesModal";
import VoiceReviewModal from "@src/components/VoiceReviewModal";
import { useGroceryVoice } from "@src/hooks/useGroceryVoice";
import { useVoiceCapture } from "@src/hooks/useVoiceCapture";
import VoiceFab from "@src/components/VoiceFab";
import { inferGrocerySubcategory } from "@src/lib/groceryCategoryInfer";
import type { VoiceGroceryResult } from "@src/lib/api/endpoints";
import { t, groceryCategoryLabel, shoppingCategoryLabel } from "@src/i18n";
import type { GroceryItem, ShoppingCategory } from "@src/models/grocery";
import {
  effectiveSubcategories,
  effectiveShoppingCategories,
  OTHER_SUBCATEGORY,
  type GrocerySubcategory,
  type ShoppingCategoryDef,
} from "@src/models/customization";
import { RTL_ROW, TEXT_RIGHT } from "@src/ui/rtl";
import { FAB_LEFT } from "@src/ui/fabAnchor";
import { C, R, S } from "@src/ui/tokens";
import { useThemeColor } from "@src/ui/useThemeColor";

/** Fallback emoji map for items with legacy English subcategory keys not found
 *  in the family's effective list (e.g. items added before customization). */
const LEGACY_EMOJI: Record<string, string> = {
  Produce: "🥬", Dairy: "🧀", Meat: "🥩", Fish: "🐟", Bakery: "🥖",
  Frozen: "🧊", Snacks: "🍿", Beverages: "🥤", Canned: "🥫", Spices: "🌶️",
  Medications: "💊", Vitamins: "💪", PersonalCare: "🧴", BabyCare: "🍼",
  FirstAid: "🩹", Skincare: "✨", HairCare: "💇",
  Cleaning: "🧹", Laundry: "👕", Kitchen: "🍳", Bathroom: "🚿",
  PaperGoods: "🧻", Tools: "🔧", Decor: "🖼️", Other: "📦",
};

/** Main shopping-category emoji for the voice review list. */
const CAT_EMOJI: Record<string, string> = { grocery: "🛒", home: "🏠", health: "💊" };

export default function GroceryScreen() {
  const insets = useSafeAreaInsets();
  const theme = useThemeColor();
  const grocery = useFamilyStore((s) => s.grocery);
  const customizations = useFamilyStore((s) => s.customizations);
  const [modalOpen, setModalOpen] = useState(false);
  const [catModalOpen, setCatModalOpen] = useState(false); // sub-categories
  const [mainCatModalOpen, setMainCatModalOpen] = useState(false); // main categories
  const [editingItem, setEditingItem] = useState<GroceryItem | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<ShoppingCategory>("grocery");

  // The family's configurable main categories (defaults when unset).
  const shoppingCategories = useMemo(
    () => effectiveShoppingCategories(customizations),
    [customizations],
  );
  const activeCat = shoppingCategories.find((c) => c.key === selectedCategory);

  // Keep selectedCategory valid: on first load, or after a category is
  // deleted/renamed away, fall back to the first available category.
  useEffect(() => {
    if (!shoppingCategories.some((c) => c.key === selectedCategory)) {
      setSelectedCategory(shoppingCategories[0]?.key ?? "grocery");
    }
  }, [shoppingCategories, selectedCategory]);

  // Persist an add/edit of the main-category list (optimistic + synced).
  const setShoppingCategoriesList = (next: ShoppingCategoryDef[]) =>
    updateCustomizationsRemote({ ...customizations, shoppingCategories: next });

  // Delete a main category: remove its items (cascade), drop its sub-category
  // list, and remove it from the list — all in one customizations write.
  const deleteShoppingCategory = (key: string) => {
    clearAllCategoryRemote(key);
    const nextSubs = { ...(customizations.grocerySubcategories ?? {}) };
    delete (nextSubs as Record<string, unknown>)[key];
    updateCustomizationsRemote({
      ...customizations,
      shoppingCategories: shoppingCategories.filter((c) => c.key !== key),
      grocerySubcategories: nextSubs,
    });
    if (selectedCategory === key) {
      setSelectedCategory(shoppingCategories.find((c) => c.key !== key)?.key ?? "grocery");
    }
  };

  const itemCountForCategory = (key: string) =>
    grocery.filter((g) => g.shoppingCategory === key).length;

  // Save the active category's sub-category list (optimistic + synced).
  const setSubcategoriesFor = (next: GrocerySubcategory[]) =>
    updateCustomizationsRemote({
      ...customizations,
      grocerySubcategories: {
        ...(customizations.grocerySubcategories ?? {}),
        [selectedCategory]: next,
      },
    });
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);
  const { modal } = useLocalSearchParams<{ modal?: string }>();

  // Deep-link modal opener: familyos://grocery?modal=add
  // Used by QA flows to bypass RTL tap issues on iOS.
  useEffect(() => {
    if (modal === "add") {
      setEditingItem(null);
      setModalOpen(true);
    }
  }, [modal]);

  // ── Voice → grocery (POC) ──
  const [voiceResult, setVoiceResult] = useState<VoiceGroceryResult | null>(null);
  const { status: voiceStatus, onMic } = useVoiceCapture(useGroceryVoice, {
    // The family's sub-category names per category so the Assistant can label items.
    getContext: () => {
      const taxonomy: Record<string, string[]> = {};
      for (const cat of shoppingCategories) {
        taxonomy[cat.key] = effectiveSubcategories(customizations, cat.key).map((s) => s.name);
      }
      return taxonomy;
    },
    onResult: setVoiceResult,
  });

  // Add the reviewed items through the normal optimistic grocery CRUD.
  const handleVoiceConfirm = (items: VoiceGroceryResult["items"]) => {
    for (const it of items) {
      const cat = shoppingCategories.some((c) => c.key === it.shopping_category)
        ? it.shopping_category
        : shoppingCategories[0]?.key ?? "grocery";
      addGroceryRemote({
        title: it.title,
        shoppingCategory: cat,
        qty: it.qty ?? undefined,
        // Prefer the Assistant's category label; fall back to keyword inference.
        subcategory: it.subcategory ?? inferGrocerySubcategory(it.title, cat),
      });
    }
    setVoiceResult(null);
  };

  const filtered = grocery.filter((g) => g.shoppingCategory === selectedCategory);
  const unbought = filtered.filter((g) => !g.isBought);
  const bought = filtered.filter((g) => g.isBought);

  // Group unbought items by subcategory in the family's preferred order.
  //
  // Lookup is tried in two steps for backward compatibility with items that
  // have legacy English subcategory keys ("Produce", "Dairy", …):
  //   1. Direct: item.subcategory matches a GrocerySubcategory.name.
  //   2. Translated: groceryCategoryLabel(item.subcategory) matches a name.
  // Anything still unresolved falls into "אחר". Empty buckets are hidden.
  const unboughtGroups = useMemo(() => {
    const order = effectiveSubcategories(customizations, selectedCategory);
    const nameSet = new Set(order.map((s) => s.name));
    const subByName = new Map<string, GrocerySubcategory>(order.map((s) => [s.name, s]));
    const buckets = new Map<string, GroceryItem[]>();
    for (const sub of order) buckets.set(sub.name, []);
    for (const item of unbought) {
      let key = OTHER_SUBCATEGORY;
      if (item.subcategory) {
        if (nameSet.has(item.subcategory)) {
          key = item.subcategory;
        } else {
          const translated = groceryCategoryLabel(item.subcategory);
          if (nameSet.has(translated)) key = translated;
        }
      }
      buckets.get(key)?.push(item);
    }
    return order
      .map((sub) => ({ subcategory: subByName.get(sub.name)!, items: buckets.get(sub.name) ?? [] }))
      .filter((g) => g.items.length > 0);
  }, [unbought, customizations, selectedCategory]);

  // Tabs are the family's configurable main categories (name + emoji). The
  // active pill underline uses the family theme colour.
  const segmentOptions = shoppingCategories.map((cat) => ({
    value: cat.key,
    label: cat.name,
    emoji: cat.emoji,
    color: theme,
  }));

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenScrollView contentContainerStyle={styles.container}>
        {/* Category tabs */}
        <View style={styles.segments}>
          <SegmentedPills
            value={selectedCategory}
            onChange={(v) => setSelectedCategory(v as ShoppingCategory)}
            options={segmentOptions}
            testIDPrefix="grocery-cat"
          />
        </View>

        {/* Manage main categories + sub-categories, and clear all */}
        <View style={styles.countRow}>
          <View style={styles.mgmtBtns}>
            <Button
              compact
              icon="tag-multiple-outline"
              onPress={() => setMainCatModalOpen(true)}
              textColor={theme}
              testID="btn-manage-categories"
            >
              {t("grocery.customizeCategories")}
            </Button>
            <Button
              compact
              icon="tag-outline"
              onPress={() => setCatModalOpen(true)}
              textColor={theme}
              testID="btn-manage-subcategories"
            >
              {t("grocery.manageSubcategories")}
            </Button>
          </View>
          {filtered.length > 0 && (
            <Button
              compact
              onPress={() => clearAllCategoryRemote(selectedCategory)}
              textColor={C.red}
              icon="delete-sweep-outline"
            >
              {t("grocery.clearAll")}
            </Button>
          )}
        </View>

        <Card style={styles.card} mode="elevated">
          <Card.Content>
            {filtered.length === 0 && (
              <Text style={styles.emptyText}>
                {t("grocery.emptyCategory", { name: activeCat?.name ?? "" })}
              </Text>
            )}

            {/* Grouped by subcategory in the family's preferred order. The
                row-level chip showing the subcategory is now redundant (the
                group header carries the same info), so we drop it inside
                groups to reduce visual noise. */}
            {unboughtGroups.map((group, gi) => (
              <View key={group.subcategory.name}>
                <View style={styles.groupHeaderRow}>
                  <Text style={styles.groupHeaderText}>
                    {group.subcategory.icon
                      || LEGACY_EMOJI[group.subcategory.name]
                      || "📦"}{" "}
                    {group.subcategory.name}
                  </Text>
                  <Text style={styles.groupHeaderCount}>{group.items.length}</Text>
                </View>
                {group.items.map((item) => (
                  <View
                    key={item.id}
                    testID={"grocery-row-" + item.title}
                    style={[styles.row, hoveredItemId === item.id && styles.rowHover]}
                    {...(Platform.OS === "web" ? {
                      onPointerEnter: () => setHoveredItemId(item.id),
                      onPointerLeave: () => setHoveredItemId(null),
                    } : {} as any)}
                  >
                    {/* Force the Android-style checkbox on all platforms:
                        Paper's default <Checkbox> uses Checkbox.IOS on iOS,
                        which draws nothing when unchecked (no outlined square),
                        making the tap target invisible. Checkbox.Android always
                        renders the square. */}
                    <Checkbox.Android
                      testID={"grocery-check-" + item.title}
                      status="unchecked"
                      uncheckedColor={C.textSecondary}
                      onPress={() => toggleGroceryBoughtRemote(item.id)}
                    />
                    <View style={styles.rowText}>
                      <Text style={styles.itemTitle}>{item.title}</Text>
                      {item.qty ? (
                        <View style={styles.meta}>
                          <Text style={styles.qty}>x{item.qty}</Text>
                        </View>
                      ) : null}
                    </View>
                    <IconButton
                      icon="pencil-outline"
                      size={18}
                      onPress={() => setEditingItem(item)}
                    />
                    <IconButton
                      testID={"grocery-delete-" + item.title}
                      icon="trash-can-outline"
                      size={18}
                      onPress={() => deleteGroceryRemote(item.id)}
                    />
                  </View>
                ))}
                {gi < unboughtGroups.length - 1 && (
                  <Divider style={styles.groupDivider} />
                )}
              </View>
            ))}

            {bought.length > 0 && (
              <>
                <Divider style={styles.divider} />
                <View style={styles.boughtHeader}>
                  <Text style={styles.boughtLabel}>
                    {t("grocery.bought", { count: bought.length })}
                  </Text>
                  <Button
                    compact
                    onPress={() => clearBoughtRemote(selectedCategory)}
                    textColor={C.red}
                  >
                    {t("grocery.clear")}
                  </Button>
                </View>
                {bought.map((item) => (
                  <View
                    key={item.id}
                    testID={"grocery-row-" + item.title}
                    style={[styles.row, styles.boughtRow, hoveredItemId === item.id && styles.rowHover]}
                    {...(Platform.OS === "web" ? {
                      onPointerEnter: () => setHoveredItemId(item.id),
                      onPointerLeave: () => setHoveredItemId(null),
                    } : {} as any)}
                  >
                    <Checkbox.Android
                      status="checked"
                      color={theme}
                      onPress={() => toggleGroceryBoughtRemote(item.id)}
                    />
                    <View style={styles.rowText}>
                      <Text style={[styles.itemTitle, styles.boughtText]}>
                        {item.title}
                      </Text>
                    </View>
                    <IconButton
                      icon="pencil-outline"
                      size={18}
                      onPress={() => setEditingItem(item)}
                    />
                    <IconButton
                      icon="trash-can-outline"
                      size={18}
                      onPress={() => deleteGroceryRemote(item.id)}
                      testID={"grocery-delete-" + item.title}
                      accessibilityLabel={"grocery-delete-" + item.title}
                    />
                  </View>
                ))}
              </>
            )}
          </Card.Content>
        </Card>

      </ScreenScrollView>

      {/* Floating action button — consistent with /calendar and /kid/*.
          The previous design was a wide purple bar scrolling with the
          list, which disappeared on long lists; a FAB stays visible. */}
      <FAB
        customSize={50}
        icon="plus"
        style={[styles.fab, { bottom: insets.bottom + S.lg, backgroundColor: theme, borderRadius: 26 }]}
        color="#FFF"
        onPress={() => setModalOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={t("grocery.quickAdd")}
        testID="add-grocery-item"
      />

      {/* Voice → grocery: records, transcribes via the Assistant, then opens a
          review sheet. Stacked above the "+" add FAB. */}
      <VoiceFab
        status={voiceStatus}
        onPress={onMic}
        bottom={insets.bottom + S.lg + 68}
        testID="grocery-voice-fab"
      />

      <GroceryAddModal
        visible={modalOpen || !!editingItem}
        onDismiss={() => { setModalOpen(false); setEditingItem(null); }}
        defaultShoppingCategory={selectedCategory}
        editItem={editingItem}
      />

      <ShoppingCategoriesModal
        visible={mainCatModalOpen}
        onDismiss={() => setMainCatModalOpen(false)}
        list={shoppingCategories}
        onChange={setShoppingCategoriesList}
        onDeleteCategory={deleteShoppingCategory}
        itemCount={itemCountForCategory}
      />

      <GroceryCategoriesModal
        visible={catModalOpen}
        onDismiss={() => setCatModalOpen(false)}
        categoryLabel={activeCat?.name}
        list={effectiveSubcategories(customizations, selectedCategory)}
        onChange={setSubcategoriesFor}
      />

      <VoiceReviewModal
        visible={!!voiceResult}
        transcript={voiceResult?.transcript ?? ""}
        items={voiceResult?.items ?? []}
        getTitle={(it) => it.title + (it.qty ? `  ·  ${it.qty}` : "")}
        getMeta={(it) =>
          `${CAT_EMOJI[it.shopping_category] ?? "🛒"} ${shoppingCategoryLabel(it.shopping_category)}`
        }
        onConfirm={handleVoiceConfirm}
        onDismiss={() => setVoiceResult(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  container: { padding: S.lg, paddingBottom: S.xxl + S.lg },
  segments: { marginBottom: S.md },
  countRow: {
    flexDirection: RTL_ROW,
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    marginBottom: S.sm,
  },
  mgmtBtns: { flexDirection: RTL_ROW, alignItems: "center", flexWrap: "wrap" },
  itemCount: { fontSize: 12, color: C.textMuted, textAlign: TEXT_RIGHT },
  card: { borderRadius: R.lg, backgroundColor: C.surface, marginBottom: S.lg },
  emptyText: {
    color: C.textMuted,
    textAlign: TEXT_RIGHT,
    fontSize: 14,
    paddingVertical: S.xs,
  },
  row: {
    flexDirection: RTL_ROW,
    alignItems: "center",
    paddingVertical: S.xs,
    paddingHorizontal: S.xs,
    borderRadius: R.sm,
  },
  rowHover: { backgroundColor: C.hoverBg },
  rowText: { flex: 1, marginStart: S.xs },
  itemTitle: { fontSize: 15, color: C.textPrimary, textAlign: TEXT_RIGHT },
  meta: { flexDirection: RTL_ROW, alignItems: "center", gap: S.sm, marginTop: 2, flexWrap: "wrap" },
  chip: { backgroundColor: C.border },
  chipText: { fontSize: 10, lineHeight: 14 },
  qty: { fontSize: 12, color: C.textSecondary, textAlign: TEXT_RIGHT },
  divider: { marginVertical: S.md },

  // Group section header — emoji + Hebrew label on the right, item count on
  // the left. RTL_ROW so the order is right-to-left visually.
  groupHeaderRow: {
    flexDirection: RTL_ROW,
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: S.sm,
    paddingTop: S.sm,
    paddingBottom: S.xs,
  },
  groupHeaderText: {
    fontSize: 13,
    fontWeight: "700",
    color: C.textPrimary,
    textAlign: TEXT_RIGHT,
    writingDirection: "rtl",
  },
  groupHeaderCount: {
    fontSize: 11,
    color: C.textMuted,
    minWidth: 18,
    textAlign: "center",
  },
  groupDivider: { marginVertical: S.sm, opacity: 0.4 },
  boughtHeader: {
    flexDirection: RTL_ROW,
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: S.xs,
  },
  boughtLabel: { fontSize: 13, fontWeight: "600", color: C.textSecondary, textAlign: TEXT_RIGHT },
  boughtRow: { opacity: 0.5 },
  boughtText: { textDecorationLine: "line-through", color: C.textMuted, textAlign: TEXT_RIGHT },
  // FAB matches the /calendar + /kid FAB styling so all three feel like
  // the same app. Bottom-left in RTL-web (RN Web doesn't auto-mirror
  // physical left/right; iOS native does, so this lands bottom-left on
  // web and bottom-right on iOS — consistent with the other tabs).
  fab: {
    position: "absolute",
    ...FAB_LEFT,
    bottom: S.lg,
    backgroundColor: C.primary,
  },
});
