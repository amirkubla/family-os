import React, { useState, useEffect } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Text, TextInput, Button } from "react-native-paper";
import ModalWrapper from "./ModalWrapper";
import { MS } from "@src/ui/modalStyles";
import { C, S, R } from "@src/ui/tokens";
import { RTL_ROW } from "@src/ui/rtl";
import { t } from "@src/i18n";
import type { GrocerySubcategory } from "@src/models/customization";

const ICON_OPTIONS = [
  // Grocery
  "🥬", "🧀", "🥩", "🐟", "🥖", "🧊", "🍿", "🥤", "🥫", "🌶️",
  "🍎", "🫐", "🥚", "🍗", "🌽", "🥑", "🍞", "🧁", "🫙", "🥜",
  // Health
  "💊", "💪", "🧴", "🍼", "🩹", "✨", "💇", "🩺", "🌿", "🧼",
  // Home
  "🧹", "👕", "🍳", "🚿", "🧻", "🔧", "🖼️", "🏠", "🪣", "🪴",
  // Generic
  "📦", "🛍️", "⭐",
];

const COLOR_SWATCHES = [
  "#2D9F6F", "#3A7BD5", "#E0699B", "#F59E0B", "#9B59B6",
  "#EF4444", "#20B2AA", "#E67E22", "#888888", "#2ECC71",
];

interface Props {
  visible: boolean;
  onDismiss: () => void;
  editSubcategory?: GrocerySubcategory | null;
  onSave: (data: GrocerySubcategory) => void;
}

export default function GrocerySubcategoryModal({ visible, onDismiss, editSubcategory, onSave }: Props) {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("📦");
  const [color, setColor] = useState(COLOR_SWATCHES[0]);
  const [nameError, setNameError] = useState("");

  useEffect(() => {
    if (!visible) return;
    if (editSubcategory) {
      setName(editSubcategory.name);
      setIcon(editSubcategory.icon);
      setColor(editSubcategory.color);
    } else {
      setName(""); setIcon("📦"); setColor(COLOR_SWATCHES[0]);
    }
    setNameError("");
  }, [visible, editSubcategory]);

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) { setNameError("יש להזין שם"); return; }
    onSave({ name: trimmed, icon, color });
    onDismiss();
  };

  return (
    <ModalWrapper visible={visible} onDismiss={onDismiss}>
      <Text style={MS.heading}>
        {editSubcategory ? t("customization.editSubcategory") : t("customization.addSubcategoryTitle")}
      </Text>

      <Text style={MS.label}>{t("customization.subcategoryName")}</Text>
      <TextInput
        placeholder={t("customization.subcategoryPlaceholder")}
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

      <Text style={MS.label}>{t("customization.subcategoryIcon")}</Text>
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

      <Text style={MS.label}>{t("customization.subcategoryColor")}</Text>
      <View style={styles.row}>
        {COLOR_SWATCHES.map((sw) => (
          <Pressable
            key={sw}
            onPress={() => setColor(sw)}
            style={[styles.colorCell, { backgroundColor: sw }, color === sw && styles.colorSelected]}
          />
        ))}
      </View>

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
