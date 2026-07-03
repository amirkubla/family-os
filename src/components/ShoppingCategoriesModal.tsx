/**
 * ShoppingCategoriesModal — manage the family's MAIN grocery categories
 * (the top tabs). One modal, two states: a LIST (edit / delete / add) and an
 * add/edit FORM (name + emoji). Edits keep the category's stable `key`, so
 * items stay put and just re-label. Deleting a category cascades: all its
 * items are removed (via onDeleteCategory) — confirmed first, with the count.
 *
 * Sibling of GroceryCategoriesModal (which manages a category's SUB-categories).
 */

import React, { useState, useEffect } from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { Text, IconButton } from "react-native-paper";
import ModalTextInput from "./ModalTextInput";

import ModalWrapper from "./ModalWrapper";
import PaginatedPicker from "./PaginatedPicker";
import { MS } from "@src/ui/modalStyles";
import { C, R, S } from "@src/ui/tokens";
import { RTL_ROW, TEXT_RIGHT } from "@src/ui/rtl";
import { useThemeColor } from "@src/ui/useThemeColor";
import { t } from "@src/i18n";
import type { ShoppingCategoryDef } from "@src/models/customization";
import { CATEGORY_ICON_OPTIONS } from "@src/ui/semanticColors";
import { makeId } from "@src/utils/id";

const ICON_OPTIONS = CATEGORY_ICON_OPTIONS;

/** Main categories are capped — the grocery tab bar only fits a few. */
const MAX_MAIN_CATEGORIES = 4;

interface Props {
  visible: boolean;
  onDismiss: () => void;
  list: ShoppingCategoryDef[];
  /** Persist an add / edit / reorder of the category list. */
  onChange: (next: ShoppingCategoryDef[]) => void;
  /** Remove a category AND its items + sub-categories (cascade). */
  onDeleteCategory: (key: string) => void;
  /** How many grocery items live in a category (for the delete confirmation). */
  itemCount: (key: string) => number;
}

export default function ShoppingCategoriesModal({
  visible,
  onDismiss,
  list,
  onChange,
  onDeleteCategory,
  itemCount,
}: Props) {
  const theme = useThemeColor();

  const [mode, setMode] = useState<"list" | "form">("list");
  const [editItem, setEditItem] = useState<ShoppingCategoryDef | null>(null);
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("🛒");
  const [nameError, setNameError] = useState("");
  // Inline per-row delete confirmation (a nested Paper Dialog renders invisibly
  // inside this modal's Portal on web, so confirm inline instead).
  const [confirmingKey, setConfirmingKey] = useState<string | null>(null);

  // Always (re)open on the list.
  useEffect(() => {
    if (visible) {
      setMode("list");
      setEditItem(null);
      setConfirmingKey(null);
    }
  }, [visible]);

  const openForm = (item: ShoppingCategoryDef | null) => {
    setEditItem(item);
    setName(item?.name ?? "");
    setEmoji(item?.emoji ?? "🛒");
    setNameError("");
    setConfirmingKey(null);
    setMode("form");
  };

  const saveForm = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setNameError(t("groceryModal.itemName"));
      return;
    }
    if (editItem) {
      // Keep the key — items reference it; only name/emoji change.
      onChange(list.map((c) => (c.key === editItem.key ? { ...c, name: trimmed, emoji } : c)));
    } else {
      if (list.length >= MAX_MAIN_CATEGORIES) { setMode("list"); return; } // cap guard
      onChange([...list, { key: makeId(), name: trimmed, emoji }]);
    }
    setMode("list");
    setEditItem(null);
  };

  // ✕ is "back to list" while editing, "close" from the list.
  const handleDismiss = () => {
    if (mode === "form") {
      setMode("list");
      setEditItem(null);
    } else {
      onDismiss();
    }
  };

  const isForm = mode === "form";

  return (
      <ModalWrapper
        visible={visible}
        onDismiss={handleDismiss}
        icon="pricetags-outline"
        title={
          isForm
            ? editItem
              ? t("grocery.editCategory")
              : t("grocery.newCategory")
            : t("grocery.customizeCategories")
        }
        onSave={isForm ? saveForm : undefined}
        saveLabel={t("save")}
      >
        {isForm ? (
          <>
            <Text style={MS.label}>{t("grocery.categoryName")}</Text>
            <ModalTextInput
              placeholder={t("grocery.categoryNamePlaceholder")}
              value={name}
              onChangeText={(v) => {
                setName(v);
                setNameError("");
              }}
              onSubmitEditing={saveForm}
              returnKeyType="done"
              mode="outlined"
              style={MS.input}
              contentStyle={MS.inputContent}
              autoFocus
              error={!!nameError}
            />
            {nameError ? <Text style={MS.error}>{nameError}</Text> : null}

            <Text style={MS.label}>{t("grocery.categoryEmoji")}</Text>
            <PaginatedPicker
              kind="emoji"
              options={ICON_OPTIONS}
              value={emoji}
              onChange={setEmoji}
              testIDPrefix="maincat-emoji"
            />
          </>
        ) : (
          <View style={MS.section}>
            {list.map((cat) => (
              <View key={cat.key} style={styles.row}>
                {confirmingKey === cat.key ? (
                  <>
                    <IconButton
                      icon="check"
                      size={20}
                      iconColor={C.red}
                      onPress={() => { onDeleteCategory(cat.key); setConfirmingKey(null); }}
                      accessibilityLabel={t("confirmDelete.confirm")}
                      testID={`maincat-delete-confirm-${cat.name}`}
                    />
                    <IconButton
                      icon="close"
                      size={20}
                      onPress={() => setConfirmingKey(null)}
                      accessibilityLabel={t("confirmDelete.cancel")}
                    />
                    <Text style={styles.confirmText} numberOfLines={2}>
                      {t("grocery.deleteCategoryConfirm", { count: itemCount(cat.key) })}
                    </Text>
                  </>
                ) : (
                  <>
                    <View style={styles.dot}>
                      <Text style={styles.emoji}>{cat.emoji}</Text>
                    </View>
                    <Text style={styles.name}>{cat.name}</Text>
                    <IconButton
                      icon="pencil-outline"
                      size={18}
                      onPress={() => openForm(cat)}
                      accessibilityLabel={t("grocery.editCategory")}
                    />
                    {/* Keep at least one main category — hide delete on the last. */}
                    {list.length > 1 && (
                      <IconButton
                        icon="trash-can-outline"
                        size={18}
                        onPress={() => setConfirmingKey(cat.key)}
                        accessibilityLabel={t("grocery.deleteCategory")}
                        testID={`maincat-delete-${cat.name}`}
                      />
                    )}
                  </>
                )}
              </View>
            ))}

            {list.length < MAX_MAIN_CATEGORIES ? (
              <Pressable
                style={[styles.addBtn, { borderColor: theme }]}
                onPress={() => openForm(null)}
                testID="add-maincat"
              >
                <Text style={[styles.addText, { color: theme }]}>+ {t("grocery.addCategory")}</Text>
              </Pressable>
            ) : (
              <Text style={styles.maxHint}>{t("grocery.categoriesMax")}</Text>
            )}
          </View>
        )}
      </ModalWrapper>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: RTL_ROW, alignItems: "center", paddingVertical: S.xs, gap: S.xs },
  dot: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  emoji: { fontSize: 18 },
  name: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: C.textPrimary,
    textAlign: TEXT_RIGHT,
    writingDirection: "rtl",
  },
  addBtn: {
    alignItems: "center",
    paddingVertical: S.sm,
    marginTop: S.xs,
    borderRadius: R.md,
    borderWidth: 1.5,
    borderStyle: "dashed",
  },
  addText: { fontSize: 14, fontWeight: "600" },
  maxHint: {
    fontSize: 12,
    color: C.textMuted,
    textAlign: "center",
    writingDirection: "rtl",
    marginTop: S.sm,
  },
  confirmText: {
    flex: 1,
    fontSize: 12,
    color: C.red,
    fontWeight: "600",
    textAlign: TEXT_RIGHT,
    writingDirection: "rtl",
  },
});
