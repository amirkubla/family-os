import React, { useState, useEffect, useRef } from "react";
import { View } from "react-native";
import { Text, TextInput, Button } from "react-native-paper";
import { SUBCATEGORIES } from "@src/models/grocery";
import type { ShoppingCategory } from "@src/models/grocery";
import { addGroceryRemote, updateGroceryRemote } from "@src/lib/sync/remoteCrud";
import { inferGrocerySubcategory } from "@src/lib/groceryCategoryInfer";
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
  const [subcategory, setSubcategory] = useState("Other");
  const [qty, setQty] = useState("");
  // Whether the user has manually picked a category — stops auto-inference
  // from overriding their choice when they keep typing.
  const [categoryTouched, setCategoryTouched] = useState(false);
  // In-flight guard against rapid double-clicks creating duplicate rows
  // (QA Pass 1 BUG #2 — 5 clicks created 5 server rows).
  //
  // We use BOTH a ref and a state:
  //  - submittingRef.current is the synchronous guard. Within the same JS tick,
  //    React state updates haven't flushed yet, so a useState alone leaves all
  //    rapid clicks reading `submitting=false` from the same closure.
  //  - submitting (state) drives the visual disabled/loading on the button.
  const submittingRef = useRef(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!visible) return;
    submittingRef.current = false;
    setSubmitting(false);
    if (editItem) {
      setTitle(editItem.title);
      setSubcategory(editItem.subcategory ?? "Other");
      setQty(editItem.qty ?? "");
      setCategoryTouched(true); // keep existing category when editing
    } else {
      setTitle("");
      setSubcategory("Other");
      setQty("");
      setCategoryTouched(false);
    }
  }, [visible, editItem, defaultShoppingCategory]);

  // Infer subcategory from the title as the user types — but only on add (not
  // edit) and only until the user manually picks a category. Without this the
  // default was "first option in the list" (Produce), so milk landed under
  // vegetables. See src/lib/groceryCategoryInfer.ts for the keyword map.
  useEffect(() => {
    if (!visible || isEditing || categoryTouched) return;
    const inferred = inferGrocerySubcategory(title, defaultShoppingCategory);
    setSubcategory(inferred);
  }, [title, visible, isEditing, categoryTouched, defaultShoppingCategory]);

  const reset = () => {
    setTitle("");
    setSubcategory("Other");
    setQty("");
    setCategoryTouched(false);
  };

  const handleSubmit = () => {
    if (submittingRef.current) return; // double-click guard (synchronous)
    if (!title.trim()) return;
    submittingRef.current = true;
    setSubmitting(true);
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
          testID="input-grocery-name"
          placeholder={t("groceryModal.itemName")}
          value={title}
          onChangeText={setTitle}
          onSubmitEditing={handleSubmit}
          returnKeyType="done"
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
          testID="input-grocery-qty"
          placeholder={t("groceryModal.qty")}
          value={qty}
          onChangeText={setQty}
          onSubmitEditing={handleSubmit}
          returnKeyType="done"
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
                onPress={() => { setSubcategory(cat); setCategoryTouched(true); }}
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
          testID="btn-save"
          mode="contained"
          onPress={handleSubmit}
          disabled={!title.trim() || submitting}
          loading={submitting}
          style={MS.saveBtn}
          labelStyle={MS.saveBtnLabel}
        >
          {isEditing ? t("save") : t("add")}
        </Button>
      </View>
    </ModalWrapper>
  );
}
