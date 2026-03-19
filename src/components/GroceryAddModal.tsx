import React, { useState, useEffect } from "react";
import { View } from "react-native";
import { Text, TextInput, Button } from "react-native-paper";
import { SUBCATEGORIES } from "@src/models/grocery";
import type { ShoppingCategory } from "@src/models/grocery";
import { addGroceryRemote, updateGroceryRemote } from "@src/lib/sync/remoteCrud";
import type { GroceryItem } from "@src/models/grocery";
import { t, groceryCategoryLabel } from "@src/i18n";
import { MS } from "@src/ui/modalStyles";
import ModalWrapper from "./ModalWrapper";

interface Props {
  visible: boolean;
  onDismiss: () => void;
  defaultShoppingCategory?: ShoppingCategory;
  editItem?: GroceryItem | null;
}

export default function GroceryAddModal({
  visible,
  onDismiss,
  defaultShoppingCategory = "grocery",
  editItem,
}: Props) {
  const isEditing = !!editItem;
  const subcats = SUBCATEGORIES[isEditing ? editItem.shoppingCategory : defaultShoppingCategory];

  const [title, setTitle] = useState("");
  const [subcategory, setSubcategory] = useState(subcats[0]);
  const [qty, setQty] = useState("");

  useEffect(() => {
    if (!visible) return;
    if (editItem) {
      setTitle(editItem.title);
      setSubcategory(editItem.subcategory ?? subcats[0]);
      setQty(editItem.qty ?? "");
    } else {
      setTitle("");
      setSubcategory(SUBCATEGORIES[defaultShoppingCategory][0]);
      setQty("");
    }
  }, [visible, editItem, defaultShoppingCategory]);

  const reset = () => { setTitle(""); setSubcategory(subcats[0]); setQty(""); };

  const handleSubmit = () => {
    if (!title.trim()) return;
    if (isEditing) {
      updateGroceryRemote(editItem.id, {
        title: title.trim(),
        subcategory: subcategory || undefined,
        qty: qty.trim() || undefined,
      });
    } else {
      addGroceryRemote({
        title: title.trim(),
        shoppingCategory: defaultShoppingCategory,
        subcategory: subcategory || undefined,
        qty: qty.trim() || undefined,
      });
    }
    reset();
    onDismiss();
  };

  const handleDismiss = () => { reset(); onDismiss(); };

  return (
    <ModalWrapper visible={visible} onDismiss={handleDismiss}>
      <Text style={MS.heading}>
        {isEditing ? t("groceryModal.editTitle") : t("groceryModal.title")}
      </Text>

      <TextInput
        placeholder={t("groceryModal.itemName")}
        value={title}
        onChangeText={setTitle}
        mode="outlined"
        style={MS.input}
        contentStyle={MS.inputContent}
        autoFocus
      />

      <Text style={MS.label}>{t("groceryModal.category")}</Text>
      <View style={MS.chipRow}>
        {subcats.map((cat) => (
          <Button
            key={cat}
            mode={subcategory === cat ? "contained" : "outlined"}
            compact
            onPress={() => setSubcategory(cat)}
            style={MS.chip}
            labelStyle={MS.chipLabel}
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
        style={MS.input}
        contentStyle={MS.inputContent}
      />

      <View style={MS.actions}>
        <Button onPress={handleDismiss}>{t("cancel")}</Button>
        <Button mode="contained" onPress={handleSubmit} disabled={!title.trim()}>
          {isEditing ? t("save") : t("add")}
        </Button>
      </View>
    </ModalWrapper>
  );
}
