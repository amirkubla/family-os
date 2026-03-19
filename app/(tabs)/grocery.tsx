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
import { t, groceryCategoryLabel, shoppingCategoryLabel } from "@src/i18n";
import type { GroceryItem, ShoppingCategory } from "@src/models/grocery";
import { SHOPPING_CATEGORIES } from "@src/models/grocery";
import { RTL_ROW } from "@src/ui/rtl";
import { C, R, S } from "@src/ui/tokens";

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
  }));

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text variant="headlineLarge" style={styles.title}>
          {t("grocery.title")}
        </Text>

        {/* Category tabs */}
        <SegmentedButtons
          value={selectedCategory}
          onValueChange={(v) => setSelectedCategory(v as ShoppingCategory)}
          buttons={segmentButtons}
          style={styles.segments}
        />

        {/* Item count + clear all */}
        <View style={styles.countRow}>
          <Text variant="bodySmall" style={styles.itemCount}>
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
              <Text variant="bodyMedium" style={styles.cardBody}>
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
                  <Text variant="bodyLarge" style={styles.itemTitle}>{item.title}</Text>
                  <View style={styles.meta}>
                    {item.subcategory ? (
                      <Chip compact textStyle={styles.chipText} style={styles.chip}>
                        {groceryCategoryLabel(item.subcategory)}
                      </Chip>
                    ) : null}
                    {item.qty ? (
                      <Text variant="bodySmall" style={styles.qty}>
                        x{item.qty}
                      </Text>
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
                  <Text variant="labelLarge" style={styles.boughtLabel}>
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
                      <Text
                        variant="bodyLarge"
                        style={[styles.itemTitle, styles.boughtText]}
                      >
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
  container: { padding: S.xl, paddingBottom: 40 },
  title: { fontWeight: "800", color: C.textPrimary, marginBottom: S.lg, textAlign: "right" },
  segments: { marginBottom: S.md },
  countRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: S.md,
  },
  itemCount: { color: C.textSecondary, textAlign: "right" },
  card: { borderRadius: R.lg, backgroundColor: C.surface, marginBottom: S.xl },
  cardBody: { color: C.textSecondary, textAlign: "right" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: S.xs,
    paddingHorizontal: S.xs,
    borderRadius: R.sm,
  },
  rowHover: { backgroundColor: C.hoverBg },
  rowText: { flex: 1, marginStart: S.xs },
  itemTitle: { textAlign: "right" },
  meta: { flexDirection: RTL_ROW, alignItems: "center", gap: 6, marginTop: 2, flexWrap: "wrap" },
  chip: { backgroundColor: C.border },
  chipText: { fontSize: 11, lineHeight: 16 },
  qty: { color: C.textSecondary, textAlign: "right" },
  divider: { marginVertical: S.md },
  boughtHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: S.xs,
  },
  boughtLabel: { color: C.textSecondary, textAlign: "right" },
  boughtRow: { opacity: 0.5 },
  boughtText: { textDecorationLine: "line-through", color: C.textSecondary, textAlign: "right" },
  addButton: { borderRadius: R.lg, backgroundColor: C.purple },
  addButtonContent: { paddingVertical: 6 },
});
