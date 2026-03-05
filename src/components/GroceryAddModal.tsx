import React, { useState, useEffect } from "react";
import { View, StyleSheet } from "react-native";
import { Text, TextInput, Button } from "react-native-paper";
import { SUBCATEGORIES } from "@src/models/grocery";
import type { ShoppingCategory } from "@src/models/grocery";
import { addGroceryRemote } from "@src/lib/sync/remoteCrud";
import { t, groceryCategoryLabel } from "@src/i18n";
import { RTL_ROW } from "@src/ui/rtl";
import ModalWrapper from "./ModalWrapper";

interface Props {
  visible: boolean;
  onDismiss: () => void;
  defaultShoppingCategory?: ShoppingCategory;
}

export default function GroceryAddModal({
  visible,
  onDismiss,
  defaultShoppingCategory = "grocery",
}: Props) {
  const subcats = SUBCATEGORIES[defaultShoppingCategory];
  const defaultSubcat = subcats[0];

  const [title, setTitle] = useState("");
  const [subcategory, setSubcategory] = useState(defaultSubcat);
  const [qty, setQty] = useState("");

  // Reset subcategory when modal opens with a new default
  useEffect(() => {
    if (visible) {
      setSubcategory(SUBCATEGORIES[defaultShoppingCategory][0]);
    }
  }, [visible, defaultShoppingCategory]);

  const reset = () => {
    setTitle("");
    setSubcategory(defaultSubcat);
    setQty("");
  };

  const handleSubmit = () => {
    if (!title.trim()) return;
    addGroceryRemote({
      title: title.trim(),
      shoppingCategory: defaultShoppingCategory,
      subcategory: subcategory || undefined,
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
        placeholder={t("groceryModal.itemName")}
        value={title}
        onChangeText={setTitle}
        mode="outlined"
        style={styles.input}
        contentStyle={styles.inputContent}
        autoFocus
      />

      <Text variant="labelLarge" style={styles.label}>
        {t("groceryModal.category")}
      </Text>
      <View style={styles.categoryWrap}>
        {subcats.map((cat) => (
          <Button
            key={cat}
            mode={subcategory === cat ? "contained" : "outlined"}
            compact
            onPress={() => setSubcategory(cat)}
            style={styles.catChip}
            labelStyle={styles.catLabel}
          >
            {groceryCategoryLabel(cat)}
          </Button>
        ))}
      </View>

      <TextInput
        placeholder={t("groceryModal.qty")}
        value={qty}
        onChangeText={setQty}
        mode="outlined"
        style={styles.input}
        contentStyle={styles.inputContent}
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
  input: { marginBottom: 12, textAlign: "right", writingDirection: "rtl" },
  inputContent: { textAlign: "right" },
  label: { marginBottom: 8, color: "#6B6B8D", textAlign: "right" },
  categoryWrap: {
    flexDirection: RTL_ROW,
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 12,
  },
  catChip: { borderRadius: 20 },
  catLabel: { fontSize: 12 },
  actions: {
    flexDirection: RTL_ROW,
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 8,
  },
});
