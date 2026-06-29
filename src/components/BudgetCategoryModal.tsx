import React, { useState, useEffect } from "react";
import { Text, TextInput } from "react-native-paper";
import ModalWrapper from "./ModalWrapper";
import PaginatedPicker from "./PaginatedPicker";
import { MS } from "@src/ui/modalStyles";
import { t } from "@src/i18n";
import type { BudgetCategory } from "@src/models/budget";
import { parseILS } from "@src/models/budget";
import { CATEGORY_ICON_OPTIONS, CATEGORY_COLOR_SWATCHES } from "@src/ui/semanticColors";

const ICON_OPTIONS = CATEGORY_ICON_OPTIONS;
const COLOR_SWATCHES = CATEGORY_COLOR_SWATCHES;

interface Props {
  visible: boolean;
  onDismiss: () => void;
  editCategory?: BudgetCategory | null;
  onSave: (data: { name: string; icon: string; color: string; monthlyCap?: number }) => void;
}

export default function BudgetCategoryModal({ visible, onDismiss, editCategory, onSave }: Props) {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("📦");
  const [color, setColor] = useState(COLOR_SWATCHES[0]);
  const [capText, setCapText] = useState("");
  const [nameError, setNameError] = useState("");

  useEffect(() => {
    if (!visible) return;
    if (editCategory) {
      setName(editCategory.name);
      setIcon(editCategory.icon);
      setColor(editCategory.color);
      setCapText(editCategory.monthlyCap ? String(editCategory.monthlyCap / 100) : "");
    } else {
      setName(""); setIcon("📦"); setColor(COLOR_SWATCHES[0]); setCapText("");
    }
    setNameError("");
  }, [visible, editCategory]);

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) { setNameError("יש להזין שם"); return; }
    const monthlyCap = capText.trim() ? parseILS(capText) : undefined;
    onSave({ name: trimmed, icon, color, monthlyCap: monthlyCap || undefined });
    onDismiss();
  };

  return (
    <ModalWrapper
      visible={visible}
      onDismiss={onDismiss}
      icon="pricetag-outline"
      title={editCategory ? t("budget.editCategory") : t("budget.addCategory")}
      onSave={handleSave}
    >
      <Text style={MS.label}>{t("budget.categoryName")}</Text>
      <TextInput
        placeholder={t("budget.categoryNamePlaceholder")}
        value={name}
        onChangeText={(v) => { setName(v); setNameError(""); }}
        onSubmitEditing={handleSave}
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

      {/* Emoji-only — no colour selection. A default colour is still stored
          (preserved on edit) so the budget spend visualisation stays valid. */}

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

    </ModalWrapper>
  );
}
