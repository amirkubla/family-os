import React, { useState, useEffect } from "react";
import { View } from "react-native";
import { Text, TextInput, Button } from "react-native-paper";
import ModalWrapper from "./ModalWrapper";
import PaginatedPicker from "./PaginatedPicker";
import { MS } from "@src/ui/modalStyles";
import { t } from "@src/i18n";
import type { GrocerySubcategory } from "@src/models/customization";
import { CATEGORY_ICON_OPTIONS, CATEGORY_COLOR_SWATCHES } from "@src/ui/semanticColors";

const ICON_OPTIONS = CATEGORY_ICON_OPTIONS;
const COLOR_SWATCHES = CATEGORY_COLOR_SWATCHES;

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
      <PaginatedPicker
        kind="emoji"
        options={ICON_OPTIONS}
        value={icon}
        onChange={setIcon}
        testIDPrefix="subcat-icon"
      />

      <Text style={MS.label}>{t("customization.subcategoryColor")}</Text>
      <PaginatedPicker
        kind="color"
        options={COLOR_SWATCHES}
        value={color}
        onChange={setColor}
        testIDPrefix="subcat-color"
      />

      <View style={MS.actions}>
        <Button onPress={onDismiss}>{t("cancel")}</Button>
        <Button mode="contained" onPress={handleSave}>{t("save")}</Button>
      </View>
    </ModalWrapper>
  );
}
