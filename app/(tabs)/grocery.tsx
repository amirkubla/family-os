import React, { useState } from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import {
  Card,
  Text,
  Button,
  Checkbox,
  IconButton,
  Chip,
  Divider,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFamilyStore } from "@src/store/useFamilyStore";
import GroceryAddModal from "@src/components/GroceryAddModal";

export default function GroceryScreen() {
  const grocery = useFamilyStore((s) => s.grocery);
  const toggleBought = useFamilyStore((s) => s.toggleGroceryBought);
  const deleteGrocery = useFamilyStore((s) => s.deleteGrocery);
  const clearBought = useFamilyStore((s) => s.clearBought);
  const [modalOpen, setModalOpen] = useState(false);

  const unbought = grocery.filter((g) => !g.isBought);
  const bought = grocery.filter((g) => g.isBought);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text variant="headlineLarge" style={styles.title}>
          Grocery
        </Text>

        <Card style={styles.card} mode="elevated">
          <Card.Content>
            <Text variant="titleMedium" style={styles.cardTitle}>
              Shopping List
            </Text>

            {grocery.length === 0 && (
              <Text variant="bodyMedium" style={styles.cardBody}>
                Your list is empty — add items below!
              </Text>
            )}

            {unbought.map((item) => (
              <View key={item.id} style={styles.row}>
                <Checkbox
                  status="unchecked"
                  onPress={() => toggleBought(item.id)}
                />
                <View style={styles.rowText}>
                  <Text variant="bodyLarge">{item.title}</Text>
                  <View style={styles.meta}>
                    <Chip compact textStyle={styles.chipText} style={styles.chip}>
                      {item.category}
                    </Chip>
                    {item.qty ? (
                      <Text variant="bodySmall" style={styles.qty}>
                        ×{item.qty}
                      </Text>
                    ) : null}
                  </View>
                </View>
                <IconButton
                  icon="trash-can-outline"
                  size={18}
                  onPress={() => deleteGrocery(item.id)}
                />
              </View>
            ))}

            {bought.length > 0 && (
              <>
                <Divider style={styles.divider} />
                <View style={styles.boughtHeader}>
                  <Text variant="labelLarge" style={styles.boughtLabel}>
                    Bought ({bought.length})
                  </Text>
                  <Button compact onPress={clearBought} textColor="#FF6B6B">
                    Clear
                  </Button>
                </View>
                {bought.map((item) => (
                  <View key={item.id} style={[styles.row, styles.boughtRow]}>
                    <Checkbox
                      status="checked"
                      onPress={() => toggleBought(item.id)}
                    />
                    <View style={styles.rowText}>
                      <Text
                        variant="bodyLarge"
                        style={styles.boughtText}
                      >
                        {item.title}
                      </Text>
                    </View>
                    <IconButton
                      icon="trash-can-outline"
                      size={18}
                      onPress={() => deleteGrocery(item.id)}
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
          Quick Add
        </Button>
      </ScrollView>

      <GroceryAddModal
        visible={modalOpen}
        onDismiss={() => setModalOpen(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FAFAFE" },
  container: { padding: 20, paddingBottom: 40 },
  title: { fontWeight: "800", color: "#1A1A2E", marginBottom: 20 },
  card: { borderRadius: 16, backgroundColor: "#FFFFFF", marginBottom: 24 },
  cardTitle: { fontWeight: "700", color: "#1A1A2E", marginBottom: 8 },
  cardBody: { color: "#6B6B8D" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
  },
  rowText: { flex: 1, marginLeft: 4 },
  meta: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
  chip: { height: 24, backgroundColor: "#F0EEFF" },
  chipText: { fontSize: 11 },
  qty: { color: "#6B6B8D" },
  divider: { marginVertical: 12 },
  boughtHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  boughtLabel: { color: "#8E8BA8" },
  boughtRow: { opacity: 0.5 },
  boughtText: { textDecorationLine: "line-through", color: "#8E8BA8" },
  addButton: { borderRadius: 14, backgroundColor: "#FF6B6B" },
  addButtonContent: { paddingVertical: 6 },
});
