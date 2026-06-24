/**
 * AuthDivider — "—— או ——" separator between the password form and the
 * social sign-in button.
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";

import { C, S } from "@src/ui/tokens";
import { RTL_ROW } from "@src/ui/rtl";

export default function AuthDivider({ label }: { label: string }) {
  return (
    <View style={styles.row}>
      <View style={styles.line} />
      <Text style={styles.label}>{label}</Text>
      <View style={styles.line} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: RTL_ROW, alignItems: "center", marginVertical: S.md },
  line: { flex: 1, height: 1, backgroundColor: C.border },
  label: {
    marginHorizontal: S.md,
    color: C.textSecondary,
    fontSize: 13,
    writingDirection: "rtl",
  },
});
