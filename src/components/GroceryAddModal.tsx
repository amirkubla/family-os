import React, { useState } from "react";
import { View, StyleSheet } from "react-native";
import { Text, TextInput, Button } from "react-native-paper";
import { GROCERY_CATEGORIES } from "@src/models/grocery";
import { useFamilyStore } from "@src/store/useFamilyStore";
import ModalWrapper from "./ModalWrapper";

interface Props {
  visible: boolean;
  onDismiss: () => void;
}

export default function GroceryAddModal({ visible, onDismiss }: Props) {
  const addGrocery = useFamilyStore((s) => s.addGrocery);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Produce");
  const [qty, setQty] = useState("");

  const reset = () => {
    setTitle("");
    setCategory("Produce");
    setQty("");
  };

  const handleSubmit = () => {
    if (!title.trim()) return;
    addGrocery({
      title: title.trim(),
      category,
      qty: qty.trim() || undefined,
    });
    reset();
    onDismiss();
  };

  const handleDismiss = () => {
    reset();
    onDismiss();
  };

  return (
    <ModalWrapper visible={visible} onDismiss={handleDismiss}>
      <Text variant="titleLarge" style={styles.heading}>
        Add Grocery Item
      </Text>

      <TextInput
        label="Item name"
        value={title}
        onChangeText={setTitle}
        mode="outlined"
        style={styles.input}
        autoFocus
      />

      <Text variant="labelLarge" style={styles.label}>
        Category
      </Text>
      <View style={styles.categoryWrap}>
        {GROCERY_CATEGORIES.map((cat) => (
          <Button
            key={cat}
            mode={category === cat ? "contained" : "outlined"}
            compact
            onPress={() => setCategory(cat)}
            style={styles.catChip}
            labelStyle={styles.catLabel}
          >
            {cat}
          </Button>
        ))}
      </View>

      <TextInput
        label="Qty (optional)"
        value={qty}
        onChangeText={setQty}
        mode="outlined"
        style={styles.input}
      />

      <View style={styles.actions}>
        <Button onPress={handleDismiss}>Cancel</Button>
        <Button
          mode="contained"
          onPress={handleSubmit}
          disabled={!title.trim()}
        >
          Add
        </Button>
      </View>
    </ModalWrapper>
  );
}

const styles = StyleSheet.create({
  heading: { fontWeight: "700", marginBottom: 16 },
  input: { marginBottom: 12 },
  label: { marginBottom: 8, color: "#6B6B8D" },
  categoryWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 12,
  },
  catChip: { borderRadius: 20 },
  catLabel: { fontSize: 12 },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 8,
  },
});
