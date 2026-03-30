import React, { useState } from "react";
import { View, StyleSheet, ScrollView, Platform } from "react-native";
import {
  Card,
  Text,
  Button,
  Checkbox,
  IconButton,
  Chip,
  Divider,
  SegmentedButtons,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFamilyStore } from "@src/store/useFamilyStore";
import {
  toggleGroceryBoughtRemote,
  deleteGroceryRemote,
  clearBoughtRemote,
  clearAllCategoryRemote,
} from "@src/lib/sync/remoteCrud";
import GroceryAddModal from "@src/components/GroceryAddModal";
import FamilyBadge from "@src/components/FamilyBadge";
import { t, groceryCategoryLabel, shoppingCategoryLabel } from "@src/i18n";
import type { GroceryItem, ShoppingCategory } from "@src/models/grocery";
import { SHOPPING_CATEGORIES } from "@src/models/grocery";
import { RTL_ROW } from "@src/ui/rtl";
import { C, R, S } from "@src/ui/tokens";

/** Emoji per subcategory — keyed by English key AND Hebrew label for compat with legacy data. */
const SUBCATEGORY_EMOJI: Record<string, string> = {
  // Grocery — English keys
  Produce: "🥬", Dairy: "🧀", Meat: "🥩", Bakery: "🥖",
  Frozen: "🧊", Snacks: "🍿", Beverages: "🥤",
  Canned: "🥫", Spices: "🌶️", Fish: "🐟",
  // Grocery — Hebrew labels (legacy seed data)
  "ירקות ופירות": "🥬", "ירקות": "🥬", "פירות": "🥬",
  "מוצרי חלב": "🧀", "בשר": "🥩", "בשר ועוף": "🥩",
  "מאפים": "🥖", "קפואים": "🧊", "חטיפים": "🍿",
  "משקאות": "🥤", "שימורים": "🥫", "תבלינים ורטבים": "🌶️",
  "שמנים": "🌶️", "דגים": "🐟", "קטניות ודגנים": "🥫",
  // Health — English keys
  Medications: "💊", Vitamins: "💪", PersonalCare: "🧴", BabyCare: "🍼",
  FirstAid: "🩹", Skincare: "✨", HairCare: "💇",
  // Health — Hebrew labels
  "תרופות": "💊", "ויטמינים": "💪", "טיפוח אישי": "🧴",
  "תינוקות": "🍼", "עזרה ראשונה": "🩹", "טיפוח עור": "✨", "טיפוח שיער": "💇",
  // Home — English keys
  Cleaning: "🧹", Laundry: "👕", Kitchen: "🍳", Bathroom: "🚿",
  PaperGoods: "🧻", Tools: "🔧", Decor: "🖼️",
  // Home — Hebrew labels
  "ניקיון": "🧹", "כביסה": "👕", "מטבח": "🍳", "אמבטיה": "🚿",
  "מוצרי נייר": "🧻", "כלי עבודה": "🔧", "קישוט ועיצוב": "🖼️",
  // Shared
  Household: "🏠", Other: "📦", "מוצרי בית": "🏠", "אחר": "📦",
  "ארוחת בוקר": "🥣",
};

const EMPTY_KEYS: Record<ShoppingCategory, string> = {
  grocery: "grocery.emptyGrocery",
  health: "grocery.emptyHealth",
  home: "grocery.emptyHome",
};

export default function GroceryScreen() {
  const grocery = useFamilyStore((s) => s.grocery);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<GroceryItem | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<ShoppingCategory>("grocery");
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);

  const filtered = grocery.filter((g) => g.shoppingCategory === selectedCategory);
  const unbought = filtered.filter((g) => !g.isBought);
  const bought = filtered.filter((g) => g.isBought);

  const segmentButtons = SHOPPING_CATEGORIES.map((cat) => ({
    value: cat,
    label: shoppingCategoryLabel(cat),
    checkedColor: C.selectText,
    uncheckedColor: C.textSecondary,
  }));

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>{t("grocery.title")}</Text>
        <FamilyBadge />

        {/* Category tabs */}
        <SegmentedButtons
          value={selectedCategory}
          onValueChange={(v) => setSelectedCategory(v as ShoppingCategory)}
          buttons={segmentButtons}
          style={styles.segments}
          theme={{ colors: { secondaryContainer: C.selectBg, onSecondaryContainer: C.selectText } }}
        />

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

            {unbought.map((item) => (
              <View
                key={item.id}
                style={[styles.row, hoveredItemId === item.id && styles.rowHover]}
                {...(Platform.OS === "web" ? {
                  onPointerEnter: () => setHoveredItemId(item.id),
                  onPointerLeave: () => setHoveredItemId(null),
                } : {} as any)}
              >
                <Checkbox
                  status="unchecked"
                  onPress={() => toggleGroceryBoughtRemote(item.id)}
                />
                <View style={styles.rowText}>
                  <Text style={styles.itemTitle}>{item.title}</Text>
                  <View style={styles.meta}>
                    {item.subcategory ? (
                      <Chip compact textStyle={styles.chipText} style={styles.chip}>
                        {SUBCATEGORY_EMOJI[item.subcategory] ?? ""} {groceryCategoryLabel(item.subcategory)}
                      </Chip>
                    ) : null}
                    {item.qty ? (
                      <Text style={styles.qty}>x{item.qty}</Text>
                    ) : null}
                  </View>
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
                />
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
                    />
                  </View>
                ))}
              </>
            )}
          </Card.Content>
        </Card>

        <Button
          mode="contained"
          icon="plus"
          style={styles.addButton}
          contentStyle={styles.addButtonContent}
          onPress={() => setModalOpen(true)}
        >
          {t("grocery.quickAdd")}
        </Button>
      </ScrollView>

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
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: C.textPrimary,
    marginBottom: S.lg,
    textAlign: "right",
  },
  segments: { marginBottom: S.md },
  countRow: {
    flexDirection: RTL_ROW,
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: S.sm,
  },
  itemCount: { fontSize: 12, color: C.textMuted, textAlign: "right" },
  card: { borderRadius: R.lg, backgroundColor: C.surface, marginBottom: S.lg },
  emptyText: {
    color: C.textMuted,
    textAlign: "right",
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
  itemTitle: { fontSize: 15, color: C.textPrimary, textAlign: "right" },
  meta: { flexDirection: RTL_ROW, alignItems: "center", gap: S.sm, marginTop: 2, flexWrap: "wrap" },
  chip: { backgroundColor: C.border },
  chipText: { fontSize: 10, lineHeight: 14 },
  qty: { fontSize: 12, color: C.textSecondary, textAlign: "right" },
  divider: { marginVertical: S.md },
  boughtHeader: {
    flexDirection: RTL_ROW,
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: S.xs,
  },
  boughtLabel: { fontSize: 13, fontWeight: "600", color: C.textSecondary, textAlign: "right" },
  boughtRow: { opacity: 0.5 },
  boughtText: { textDecorationLine: "line-through", color: C.textMuted, textAlign: "right" },
  addButton: { borderRadius: R.md, backgroundColor: C.purple },
  addButtonContent: { paddingVertical: S.sm },
});
