/**
 * PersonStats — the stats strip shown at the top of a person page (kid or
 * parent). A wrapping row of compact cards (value + label) tinted with the
 * person's accent colour. Shared so kid and parent pages stay identical.
 */

import React from "react";
import { View, StyleSheet } from "react-native";
import { Text } from "react-native-paper";

import { C, R, S, SHADOW } from "@src/ui/tokens";
import { RTL_ROW } from "@src/ui/rtl";

export interface PersonStat {
  value: string;
  label: string;
}

export default function PersonStats({ stats, accent }: { stats: PersonStat[]; accent: string }) {
  return (
    <View style={styles.row}>
      {stats.map((s, i) => (
        <View key={i} style={[styles.card, { borderColor: accent + "33" }]}>
          <Text style={[styles.value, { color: accent }]} numberOfLines={1}>{s.value}</Text>
          <Text style={styles.label} numberOfLines={1}>{s.label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: RTL_ROW, flexWrap: "wrap", gap: S.sm, marginBottom: S.md },
  card: {
    flexGrow: 1,
    minWidth: 88,
    alignItems: "center",
    paddingVertical: S.md,
    paddingHorizontal: S.sm,
    borderRadius: R.lg,
    backgroundColor: C.surface,
    borderWidth: 1,
    ...SHADOW.sm,
  },
  value: { fontSize: 20, fontWeight: "800" },
  label: { fontSize: 11, color: C.textSecondary, marginTop: 2, writingDirection: "rtl" },
});
