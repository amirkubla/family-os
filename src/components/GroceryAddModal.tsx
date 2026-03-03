import React, { useState } from "react";
import { View, StyleSheet } from "react-native";
import { Text, TextInput, Button } from "react-native-paper";
import { GROCERY_CATEGORIES } from "@src/models/grocery";
import { addGroceryRemote } from "@src/lib/sync/remoteCrud";
import { t, groceryCategoryLabel } from "@src/i18n";
import ModalWrapper from "./ModalWrapper";

interface Props {
  visible: boolean;
  onDismiss: () => void;
}

export default function GroceryAddModal({ visible, onDismiss }: Props) {
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
    addGroceryRemote({
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
        {t("groceryModal.title")}
      </Text>

      <TextInput
        label={t("groceryModal.itemName")}
        value={title}
        onChangeText={setTitle}
        mode="outlined"
        style={styles.input}
        autoFocus
      />

      <Text variant="labelLarge" style={styles.label}>
        {t("groceryModal.category")}
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
            {groceryCategoryLabel(cat)}
          </Button>
        ))}
      </View>

      <TextInput
        label={t("groceryModal.qty")}
        value={qty}
        onChangeText={setQty}
        mode="outlined"
        style={styles.input}
      />

      <View style={styles.actions}>
        <Button onPress={handleDismiss}>{t("cancel")}</Button>
        <Button
          mode="contained"
          onPress={handleSubmit}
          disabled={!title.trim()}
        >
          {t("add")}
        </Button>
      </View>
    </ModalWrapper>
  );
}

const styles = StyleSheet.create({
  heading: { fontWeight: "700", marginBottom: 16, textAlign: "right" },
  input: { marginBottom: 12, textAlign: "right" },
  label: { marginBottom: 8, color: "#6B6B8D", textAlign: "right" },
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
