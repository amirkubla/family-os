/**
 * SectionHeader — consistent section title across the app.
 *
 * Usage:
 *   <SectionHeader label="משימות היום" />
 */

import React from "react";
import { View, StyleSheet } from "react-native";
import { Text } from "react-native-paper";
import { C, S } from "@src/ui/tokens";
import { TEXT_RIGHT } from "@src/ui/rtl";

interface Props {
  label: string;
}

export default function SectionHeader({ label }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: S.xl,
    marginBottom: S.md,
  },
  label: {
    fontSize: 15,
    fontWeight: "700",
    color: C.textPrimary,
    textAlign: TEXT_RIGHT,
  },
});
