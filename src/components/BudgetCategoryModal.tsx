import React, { useState, useEffect } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Text, TextInput, Button } from "react-native-paper";
import ModalWrapper from "./ModalWrapper";
import { MS } from "@src/ui/modalStyles";
import { C, S, R } from "@src/ui/tokens";
import { RTL_ROW } from "@src/ui/rtl";
import { t } from "@src/i18n";
import type { BudgetCategory } from "@src/models/budget";
import { parseILS } from "@src/models/budget";

const ICON_OPTIONS = ["🛒", "🏠", "👶", "🚗", "🎉", "💊", "📦", "✈️", "🍽️", "👗", "📚", "💻", "🎭", "🏋️", "💇", "🐾"];
const COLOR_SWATCHES = ["#2D9F6F", "#3A7BD5", "#E0699B", "#F59E0B", "#9B59B6", "#EF4444", "#888888", "#20B2AA", "#E67E22", "#2ECC71"];

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
    <ModalWrapper visible={visible} onDismiss={onDismiss}>
      <Text style={MS.heading}>
        {editCategory ? t("budget.editCategory") : t("budget.addCategory")}
      </Text>

      <TextInput
        label={t("budget.categoryName")}
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
      <View style={styles.row}>
        {ICON_OPTIONS.map((em) => (
          <Pressable
            key={em}
            onPress={() => setIcon(em)}
            style={[styles.iconCell, icon === em && { borderColor: color, borderWidth: 2 }]}
          >
            <Text style={styles.iconText}>{em}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={MS.label}>{t("budget.categoryColor")}</Text>
      <View style={styles.row}>
        {COLOR_SWATCHES.map((sw) => (
          <Pressable
            key={sw}
            onPress={() => setColor(sw)}
            style={[styles.colorCell, { backgroundColor: sw }, color === sw && styles.colorSelected]}
          />
        ))}
      </View>

      <TextInput
        label={t("budget.monthlyCap")}
        placeholder={t("budget.monthlyCapPlaceholder")}
        value={capText}
        onChangeText={setCapText}
        keyboardType="numeric"
        mode="outlined"
        style={MS.input}
        contentStyle={MS.inputContent}
      />

      <View style={MS.actions}>
        <Button onPress={onDismiss}>{t("cancel")}</Button>
        <Button mode="contained" onPress={handleSave}>{t("save")}</Button>
      </View>
    </ModalWrapper>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: RTL_ROW,
    flexWrap: "wrap",
    gap: S.xs,
    marginBottom: S.sm,
  },
  iconCell: {
    width: 40,
    height: 40,
    borderRadius: R.sm,
    backgroundColor: C.surfaceSubtle,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },
  iconText: { fontSize: 20 },
  colorCell: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  colorSelected: {
    borderWidth: 3,
    borderColor: C.textPrimary,
  },
});
