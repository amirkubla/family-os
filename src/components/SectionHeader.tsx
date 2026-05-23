/**
 * SectionHeader — consistent section title across the app.
 *
 * Two modes:
 *   1. Static (default):
 *        <SectionHeader label="משימות היום" />
 *   2. Collapsible — adds a chevron toggle and reports presses:
 *        <SectionHeader
 *          label="פתקים"
 *          collapsible
 *          expanded={notesExpanded}
 *          onToggle={() => toggleHomeSection("notes")}
 *        />
 *
 * The header itself is the tap target when collapsible, so the entire row
 * (label + chevron) responds. Wrapped in Pressable with accessibilityRole=
 * "button" and accessibilityState.expanded so screen readers + automation
 * can read/toggle it.
 */

import React from "react";
import { View, StyleSheet, Pressable, Platform } from "react-native";
import { Text } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { C, S } from "@src/ui/tokens";
import { TEXT_RIGHT } from "@src/ui/rtl";

interface Props {
  label: string;
  /** When true, renders a chevron and makes the row pressable. */
  collapsible?: boolean;
  /** Only meaningful when collapsible — chevron rotates based on this. */
  expanded?: boolean;
  /** Called when the header is tapped in collapsible mode. */
  onToggle?: () => void;
  /** Stable testID for automation (suffix `-header` is appended). */
  testID?: string;
}

export default function SectionHeader({
  label,
  collapsible,
  expanded = true,
  onToggle,
  testID,
}: Props) {
  if (!collapsible) {
    return (
      <View style={styles.container}>
        <Text style={styles.label}>{label}</Text>
      </View>
    );
  }

  return (
    <Pressable
      onPress={onToggle}
      style={[
        styles.containerCollapsible,
        // Web only — show pointer on hover for affordance.
        Platform.OS === "web" && ({ cursor: "pointer" } as any),
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ expanded }}
      testID={testID ? `${testID}-header` : undefined}
    >
      <Ionicons
        name={expanded ? "chevron-down" : "chevron-up"}
        size={18}
        color={C.textSecondary}
        style={styles.chevron}
      />
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: S.xl,
    marginBottom: S.md,
  },
  containerCollapsible: {
    // RTL_ROW = "row" — the engine mirrors when in RTL mode, so the chevron
    // sits at the LEFT (end of the row in RTL) and the label at the RIGHT.
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: S.xl,
    marginBottom: S.md,
    // Small vertical hit-padding so the row is comfortably tappable on phones.
    paddingVertical: S.xs,
  },
  label: {
    fontSize: 15,
    fontWeight: "700",
    color: C.textPrimary,
    textAlign: TEXT_RIGHT,
    // Take all remaining space so the chevron pins to the opposite edge.
    flex: 1,
  },
  chevron: {
    // No additional spacing — the row's `justify-content: space-between`
    // pushes the chevron to the opposite edge of the label.
    opacity: 0.7,
  },
});
