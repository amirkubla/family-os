/**
 * EmojiField — a compact "selected emoji + tap to change" control that opens
 * the full searchable <EmojiPicker>. Drop-in replacement for the old inline
 * emoji chip grids across the onboarding + customization pickers.
 */

import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import EmojiPicker from "./EmojiPicker";
import { t } from "@src/i18n";
import { C, R, S } from "@src/ui/tokens";
import { RTL_ROW, TEXT_RIGHT } from "@src/ui/rtl";

interface Props {
  value?: string;
  onChange: (emoji: string) => void;
  /** Optional field label shown above the control. */
  label?: string;
  /** Fallback emoji shown when nothing is selected. */
  placeholder?: string;
  testID?: string;
}

export default function EmojiField({
  value,
  onChange,
  label,
  placeholder = "🙂",
  testID,
}: Props) {
  const [open, setOpen] = useState(false);
  return (
    <View>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <Pressable
        style={styles.btn}
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={t("emoji.choose")}
        testID={testID ?? "emoji-field"}
      >
        <View style={styles.swatch}>
          <Text style={styles.emoji}>{value || placeholder}</Text>
        </View>
        <Text style={styles.hint}>{t("emoji.choose")}</Text>
        <Ionicons name="chevron-down" size={18} color={C.textMuted} />
      </Pressable>

      <EmojiPicker
        visible={open}
        onDismiss={() => setOpen(false)}
        onSelect={onChange}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: C.textSecondary,
    textAlign: TEXT_RIGHT,
    writingDirection: "rtl",
    marginBottom: S.xs,
  },
  btn: {
    flexDirection: RTL_ROW,
    alignItems: "center",
    gap: S.sm,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: R.md,
    paddingHorizontal: S.md,
    paddingVertical: S.sm,
    backgroundColor: C.surface,
  },
  swatch: {
    width: 40,
    height: 40,
    borderRadius: R.sm,
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },
  emoji: { fontSize: 26 },
  hint: {
    flex: 1,
    fontSize: 14,
    color: C.textSecondary,
    textAlign: TEXT_RIGHT,
    writingDirection: "rtl",
  },
});
