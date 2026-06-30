/**
 * BudgetCategoriesModal — manage budget categories inline.
 *
 * Opened from the budget page. One modal, two states: a LIST of categories
 * (edit / delete / add) and an inline add/edit FORM (name + icon + monthly cap).
 * The add/edit action swaps the modal content to the form (no nested modal);
 * the header ✕ is "back to list" while on the form and "close" from the list.
 * CRUD goes through the normal optimistic budget-category remotes.
 */

import React, { useState, useEffect } from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { Text, TextInput, IconButton } from "react-native-paper";

import ModalWrapper from "./ModalWrapper";
import PaginatedPicker from "./PaginatedPicker";
import ConfirmDeleteModal from "./ConfirmDeleteModal";
import { useConfirmDelete } from "@src/hooks/useConfirmDelete";
import { useFamilyStore } from "@src/store/useFamilyStore";
import {
  addBudgetCategoryRemote,
  updateBudgetCategoryRemote,
  deleteBudgetCategoryRemote,
} from "@src/lib/sync/remoteCrud";
import { MS } from "@src/ui/modalStyles";
import { C, R, S } from "@src/ui/tokens";
import { RTL_ROW, TEXT_RIGHT } from "@src/ui/rtl";
import { useThemeColor } from "@src/ui/useThemeColor";
import { t } from "@src/i18n";
import type { BudgetCategory } from "@src/models/budget";
import { parseILS } from "@src/models/budget";
import { CATEGORY_ICON_OPTIONS, CATEGORY_COLOR_SWATCHES } from "@src/ui/semanticColors";

const ICON_OPTIONS = CATEGORY_ICON_OPTIONS;
const DEFAULT_COLOR = CATEGORY_COLOR_SWATCHES[0];

interface Props {
  visible: boolean;
  onDismiss: () => void;
}

export default function BudgetCategoriesModal({ visible, onDismiss }: Props) {
  const theme = useThemeColor();
  const budgetCategories = useFamilyStore((s) => s.budgetCategories);
  const { confirmVisible, requestDelete, confirmDelete, dismissConfirm } = useConfirmDelete();

  const [mode, setMode] = useState<"list" | "form">("list");
  const [editItem, setEditItem] = useState<BudgetCategory | null>(null);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("📦");
  const [capText, setCapText] = useState("");
  const [nameError, setNameError] = useState("");

  // Always (re)open on the list.
  useEffect(() => {
    if (visible) { setMode("list"); setEditItem(null); }
  }, [visible]);

  const openForm = (item: BudgetCategory | null) => {
    setEditItem(item);
    setName(item?.name ?? "");
    setIcon(item?.icon ?? "📦");
    setCapText(item?.monthlyCap ? String(item.monthlyCap / 100) : "");
    setNameError("");
    setMode("form");
  };

  const saveForm = () => {
    const trimmed = name.trim();
    if (!trimmed) { setNameError("יש להזין שם"); return; }
    const monthlyCap = capText.trim() ? parseILS(capText) : undefined;
    const data = {
      name: trimmed,
      icon,
      color: editItem?.color ?? DEFAULT_COLOR,
      monthlyCap: monthlyCap || undefined,
    };
    if (editItem) {
      updateBudgetCategoryRemote(editItem.id, data);
    } else {
      addBudgetCategoryRemote({ ...data, sortOrder: budgetCategories.length });
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
        icon="pricetag-outline"
        title={
          isForm
            ? editItem
              ? t("budget.editCategory")
              : t("budget.addCategory")
            : t("budget.categories")
        }
        onSave={isForm ? saveForm : undefined}
        saveLabel={t("save")}
      >
        {isForm ? (
          <>
            <Text style={MS.label}>{t("budget.categoryName")}</Text>
            <TextInput
              placeholder={t("budget.categoryNamePlaceholder")}
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

            <Text style={MS.label}>{t("budget.categoryIcon")}</Text>
            <PaginatedPicker
              kind="emoji"
              options={ICON_OPTIONS}
              value={icon}
              onChange={setIcon}
              testIDPrefix="cat-icon"
            />

            <Text style={MS.label}>{t("budget.monthlyCap")}</Text>
            <TextInput
              placeholder={t("budget.monthlyCapPlaceholder")}
              value={capText}
              onChangeText={setCapText}
              keyboardType="numeric"
              mode="outlined"
              style={MS.input}
              contentStyle={MS.inputContentNumeric}
            />
          </>
        ) : (
          <View style={MS.section}>
            {budgetCategories.map((cat) => (
              <View key={cat.id} style={styles.row}>
                <View style={styles.dot}>
                  <Text style={styles.emoji}>{cat.icon}</Text>
                </View>
                <Text style={styles.name}>{cat.name}</Text>
                {cat.monthlyCap ? (
                  <Text style={styles.cap}>₪{(cat.monthlyCap / 100).toLocaleString()}</Text>
                ) : null}
                <IconButton
                  icon="pencil-outline"
                  size={18}
                  onPress={() => openForm(cat)}
                  accessibilityLabel={t("budget.editCategory")}
                />
                <IconButton
                  icon="trash-can-outline"
                  size={18}
                  onPress={() => requestDelete(() => deleteBudgetCategoryRemote(cat.id))}
                  accessibilityLabel={t("delete")}
                />
              </View>
            ))}

            <Pressable
              style={[styles.addBtn, { borderColor: theme }]}
              onPress={() => openForm(null)}
              testID="add-budget-category"
            >
              <Text style={[styles.addText, { color: theme }]}>+ {t("budget.addCategory")}</Text>
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
  cap: { fontSize: 12, color: C.textSecondary },
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
