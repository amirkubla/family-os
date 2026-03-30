import React, { useState, useEffect } from "react";
import { View } from "react-native";
import { Text, TextInput, Button } from "react-native-paper";
import { SUBCATEGORIES } from "@src/models/grocery";
import type { ShoppingCategory } from "@src/models/grocery";
import { addGroceryRemote, updateGroceryRemote } from "@src/lib/sync/remoteCrud";
import type { GroceryItem } from "@src/models/grocery";
import { t, groceryCategoryLabel } from "@src/i18n";
import { MS } from "@src/ui/modalStyles";
import { C, S } from "@src/ui/tokens";
import ModalWrapper from "./ModalWrapper";

interface Props {
  visible: boolean;
  onDismiss: () => void;
  defaultShoppingCategory?: ShoppingCategory;
  editItem?: GroceryItem | null;
}

const CATEGORY_ICON: Record<ShoppingCategory, string> = {
  grocery: "🛒",
  health: "💊",
  home: "🏠",
};

export default function GroceryAddModal({
  visible,
  onDismiss,
  defaultShoppingCategory = "grocery",
  editItem,
}: Props) {
  const isEditing = !!editItem;
  const shoppingCat = isEditing ? editItem.shoppingCategory : defaultShoppingCategory;
  const subcats = SUBCATEGORIES[shoppingCat];

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
      {/* ── Header ── */}
      <View style={[MS.headerBar, { marginTop: S.sm, marginBottom: S.md }]}>
        <View style={MS.headerIconWrap}>
          <Text style={MS.headerIcon}>{CATEGORY_ICON[shoppingCat]}</Text>
        </View>
        <Text style={MS.heading}>
          {isEditing ? t("groceryModal.editTitle") : t("groceryModal.title")}
        </Text>
      </View>

      {/* ── Product details ── */}
      <View style={MS.section}>
        <View style={MS.sectionHeader}>
          <Text style={MS.sectionIcon}>✏️</Text>
          <Text style={MS.sectionLabel}>{t("groceryModal.itemName")}</Text>
        </View>
        <TextInput
          placeholder={t("groceryModal.itemName")}
          value={title}
          onChangeText={setTitle}
          mode="outlined"
          style={MS.input}
          contentStyle={MS.inputContent}
          autoFocus
        />

        <View style={MS.sectionHeader}>
          <Text style={MS.sectionIcon}>📦</Text>
          <Text style={MS.sectionLabel}>{t("groceryModal.qty")}</Text>
        </View>
        <TextInput
          placeholder={t("groceryModal.qty")}
          value={qty}
          onChangeText={setQty}
          mode="outlined"
          style={[MS.input, { marginBottom: 0 }]}
          contentStyle={MS.inputContent}
        />
      </View>

      {/* ── Category ── */}
      <View style={MS.section}>
        <View style={MS.sectionHeader}>
          <Text style={MS.sectionIcon}>🏷️</Text>
          <Text style={MS.sectionLabel}>{t("groceryModal.category")}</Text>
        </View>
        <View style={[MS.chipRow, { marginBottom: 0 }]}>
          {subcats.map((cat) => {
            const sel = subcategory === cat;
            return (
              <Button
                key={cat}
                mode={sel ? "contained" : "outlined"}
                compact
                onPress={() => setSubcategory(cat)}
                style={MS.chip}
                labelStyle={MS.chipLabel}
                buttonColor={sel ? C.selectBg : undefined}
                textColor={sel ? C.selectText : C.textSecondary}
              >
                {groceryCategoryLabel(cat)}
              </Button>
            );
          })}
        </View>
      </View>

      {/* ── Actions ── */}
      <View style={[MS.actions, { marginTop: S.md }]}>
        <Button
          mode="outlined"
          onPress={handleDismiss}
          style={MS.cancelBtn}
          labelStyle={MS.cancelLabel}
        >
          {t("cancel")}
        </Button>
        <Button
          mode="contained"
          onPress={handleSubmit}
          disabled={!title.trim()}
          style={MS.saveBtn}
          labelStyle={MS.saveBtnLabel}
        >
          {isEditing ? t("save") : t("add")}
        </Button>
      </View>
    </ModalWrapper>
  );
}
