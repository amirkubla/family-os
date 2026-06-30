/**
 * GroceryCategoriesModal — manage one shopping category's sub-categories inline.
 *
 * Opened from the grocery page for the active shopping category. One modal, two
 * states: a LIST of the category's sub-categories (edit / delete / add), and an
 * add/edit FORM. The "add" / "edit" actions swap the modal content to the form
 * (no nested modal); the header ✕ acts as "back to list" while on the form and
 * closes the modal from the list. Edits apply optimistically via `onChange`.
 */

import React, { useState, useEffect } from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { Text, IconButton } from "react-native-paper";
import ModalTextInput from "./ModalTextInput";

import ModalWrapper from "./ModalWrapper";
import PaginatedPicker from "./PaginatedPicker";
import ConfirmDeleteModal from "./ConfirmDeleteModal";
import { useConfirmDelete } from "@src/hooks/useConfirmDelete";
import { MS } from "@src/ui/modalStyles";
import { C, R, S } from "@src/ui/tokens";
import { RTL_ROW, TEXT_RIGHT } from "@src/ui/rtl";
import { useThemeColor } from "@src/ui/useThemeColor";
import { t, shoppingCategoryLabel } from "@src/i18n";
import { OTHER_SUBCATEGORY, type GrocerySubcategory } from "@src/models/customization";
import type { ShoppingCategory } from "@src/models/grocery";
import { CATEGORY_ICON_OPTIONS } from "@src/ui/semanticColors";

const ICON_OPTIONS = CATEGORY_ICON_OPTIONS;
// Sub-categories are emoji-only; a colour is still stored for legacy display.
const DEFAULT_COLOR = "#9AA0B5";

interface Props {
  visible: boolean;
  onDismiss: () => void;
  category: ShoppingCategory;
  list: GrocerySubcategory[];
  onChange: (next: GrocerySubcategory[]) => void;
}

export default function GroceryCategoriesModal({ visible, onDismiss, category, list, onChange }: Props) {
  const theme = useThemeColor();
  const { confirmVisible, requestDelete, confirmDelete, dismissConfirm } = useConfirmDelete();

  const [mode, setMode] = useState<"list" | "form">("list");
  const [editItem, setEditItem] = useState<GrocerySubcategory | null>(null);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("📦");
  const [nameError, setNameError] = useState("");

  // Always (re)open on the list.
  useEffect(() => {
    if (visible) { setMode("list"); setEditItem(null); }
  }, [visible]);

  const openForm = (item: GrocerySubcategory | null) => {
    setEditItem(item);
    setName(item?.name ?? "");
    setIcon(item?.icon ?? "📦");
    setNameError("");
    setMode("form");
  };

  const saveForm = () => {
    const trimmed = name.trim();
    if (!trimmed) { setNameError("יש להזין שם"); return; }
    if (editItem) {
      onChange(list.map((s) => (s.name === editItem.name ? { ...s, name: trimmed, icon } : s)));
    } else {
      const data: GrocerySubcategory = { name: trimmed, icon, color: DEFAULT_COLOR };
      // Insert before "אחר" so it stays last.
      const otherIdx = list.findIndex((s) => s.name === OTHER_SUBCATEGORY);
      const next =
        otherIdx >= 0
          ? [...list.slice(0, otherIdx), data, ...list.slice(otherIdx)]
          : [...list, data];
      onChange(next);
    }
    setMode("list");
    setEditItem(null);
  };

  // ✕ is "back to list" while editing, "close" from the list.
  const handleDismiss = () => {
    if (mode === "form") { setMode("list"); setEditItem(null); }
    else onDismiss();
  };

  const isForm = mode === "form";

  return (
    <>
      <ModalWrapper
        visible={visible}
        onDismiss={handleDismiss}
        icon="pricetags-outline"
        title={
          isForm
            ? editItem
              ? t("customization.editSubcategory")
              : t("customization.addSubcategoryTitle")
            : `${t("grocery.customizeCategories")} · ${shoppingCategoryLabel(category)}`
        }
        onSave={isForm ? saveForm : undefined}
        saveLabel={t("save")}
      >
        {isForm ? (
          <>
            <Text style={MS.label}>{t("customization.subcategoryName")}</Text>
            <ModalTextInput
              placeholder={t("customization.subcategoryPlaceholder")}
              value={name}
              onChangeText={(v) => { setName(v); setNameError(""); }}
              onSubmitEditing={saveForm}
              returnKeyType="done"
              mode="outlined"
              style={MS.input}
              contentStyle={MS.inputContent}
              autoFocus
              error={!!nameError}
            />
            {nameError ? <Text style={MS.error}>{nameError}</Text> : null}

            <Text style={MS.label}>{t("customization.subcategoryIcon")}</Text>
            <PaginatedPicker
              kind="emoji"
              options={ICON_OPTIONS}
              value={icon}
              onChange={setIcon}
              testIDPrefix="subcat-icon"
            />
          </>
        ) : (
          <View style={MS.section}>
            {list.map((sub) => {
              const isOther = sub.name === OTHER_SUBCATEGORY;
              return (
                <View key={sub.name} style={styles.row}>
                  <View style={styles.dot}>
                    <Text style={styles.emoji}>{sub.icon}</Text>
                  </View>
                  <Text style={styles.name}>{sub.name}</Text>
                  <IconButton
                    icon={isOther ? "lock-outline" : "pencil-outline"}
                    size={18}
                    disabled={isOther}
                    onPress={isOther ? undefined : () => openForm(sub)}
                    accessibilityLabel={
                      isOther ? t("customization.otherCategoryLocked") : t("customization.editSubcategory")
                    }
                  />
                  <IconButton
                    icon="trash-can-outline"
                    size={18}
                    disabled={isOther}
                    onPress={
                      isOther
                        ? undefined
                        : () => requestDelete(() => onChange(list.filter((s) => s.name !== sub.name)))
                    }
                    accessibilityLabel={t("customization.deleteSubcategory")}
                  />
                </View>
              );
            })}

            <Pressable
              style={[styles.addBtn, { borderColor: theme }]}
              onPress={() => openForm(null)}
              testID="add-subcategory"
            >
              <Text style={[styles.addText, { color: theme }]}>+ {t("customization.addSubcategory")}</Text>
            </Pressable>
          </View>
        )}
      </ModalWrapper>

      <ConfirmDeleteModal visible={confirmVisible} onConfirm={confirmDelete} onDismiss={dismissConfirm} />
    </>
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
});
