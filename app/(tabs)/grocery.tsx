import React, { useState, useMemo, useEffect } from "react";
import { View, StyleSheet, ScrollView, Platform } from "react-native";
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
} from "@src/lib/sync/remoteCrud";
import GroceryAddModal from "@src/components/GroceryAddModal";
import { t, groceryCategoryLabel, shoppingCategoryLabel } from "@src/i18n";
import type { GroceryItem, ShoppingCategory } from "@src/models/grocery";
import { SHOPPING_CATEGORIES } from "@src/models/grocery";
import {
  effectiveSubcategories,
  OTHER_SUBCATEGORY,
  type GrocerySubcategory,
} from "@src/models/customization";
import { RTL_ROW, TEXT_RIGHT } from "@src/ui/rtl";
import { FAB_LEFT } from "@src/ui/fabAnchor";
import { C, R, S } from "@src/ui/tokens";

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

const EMPTY_KEYS: Record<ShoppingCategory, string> = {
  grocery: "grocery.emptyGrocery",
  health: "grocery.emptyHealth",
  home: "grocery.emptyHome",
};

export default function GroceryScreen() {
  const insets = useSafeAreaInsets();
  const grocery = useFamilyStore((s) => s.grocery);
  const customizations = useFamilyStore((s) => s.customizations);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<GroceryItem | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<ShoppingCategory>("grocery");
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

  const CATEGORY_EMOJI: Record<ShoppingCategory, string> = {
    grocery: "🛒",
    health: "🧴",
    home: "🏠",
  };
  // Single accent for the active underline — the פארם (pharm) teal — used
  // across all three categories rather than a per-category colour.
  const PHARM_ACCENT = "#2AACB4";
  const segmentOptions = SHOPPING_CATEGORIES.map((cat) => ({
    value: cat,
    label: shoppingCategoryLabel(cat),
    emoji: CATEGORY_EMOJI[cat],
    color: PHARM_ACCENT,
  }));

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Category tabs */}
        <View style={styles.segments}>
          <SegmentedPills
            value={selectedCategory}
            onChange={(v) => setSelectedCategory(v as ShoppingCategory)}
            options={segmentOptions}
            testIDPrefix="grocery-cat"
          />
        </View>

        {/* Item count + clear all */}
        <View style={styles.countRow}>
          <Text style={styles.itemCount}>
            {t("grocery.itemCount", { count: unbought.length })}
          </Text>
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
                {t(EMPTY_KEYS[selectedCategory])}
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
                    <Checkbox
                      testID={"grocery-check-" + item.title}
                      status="unchecked"
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
                    <Checkbox
                      status="checked"
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

      </ScrollView>

      {/* Floating action button — consistent with /calendar and /kid/*.
          The previous design was a wide purple bar scrolling with the
          list, which disappeared on long lists; a FAB stays visible. */}
      <FAB
        icon="plus"
        style={[styles.fab, { bottom: insets.bottom + S.lg }]}
        color="#FFF"
        onPress={() => setModalOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={t("grocery.quickAdd")}
        testID="add-grocery-item"
      />

      <GroceryAddModal
        visible={modalOpen || !!editingItem}
        onDismiss={() => { setModalOpen(false); setEditingItem(null); }}
        defaultShoppingCategory={selectedCategory}
        editItem={editingItem}
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
    marginBottom: S.sm,
  },
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
    backgroundColor: C.purple,
  },
});
