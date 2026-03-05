/**
 * CustomTabBar — a tab bar with per-tab colored highlight blocks.
 *
 * Each tab gets its own accent color. The active tab has a filled pill
 * background; on web, hovering a tab also shows a lighter tinted pill.
 */

import React, { useState, useCallback } from "react";
import {
  View,
  Pressable,
  StyleSheet,
  Platform,
} from "react-native";
import { Text } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";

// ── Per-tab accent colours ──

const TAB_COLORS: Record<string, { active: string; bg: string; hover: string }> = {
  today:    { active: "#FFA726", bg: "#FFF3E0", hover: "#FFF8F0" },  // amber
  calendar: { active: "#26C6DA", bg: "#E0F7FA", hover: "#F0FBFC" },  // cyan
  grocery:  { active: "#66BB6A", bg: "#E8F5E9", hover: "#F1F9F1" },  // green
  home:     { active: "#E0BE60", bg: "#FFFAED", hover: "#FFFDF5" },  // light gold icon + cream pill
  settings: { active: "#6C63FF", bg: "#EDE7F6", hover: "#F5F2FF" },  // purple
};

const INACTIVE_COLOR = "#8E8BA8";

const TAB_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  today: "sunny",
  calendar: "calendar",
  grocery: "cart",
  home: "home",
  settings: "settings-outline",
};

// ── Component ──

export default function CustomTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  return (
    <View style={styles.bar}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label = options.title ?? route.name;
        const isFocused = state.index === index;
        const name = route.name;
        const palette = TAB_COLORS[name] ?? TAB_COLORS.settings;
        const iconName = TAB_ICONS[name] ?? "ellipse";

        const onPress = () => {
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <TabItem
            key={route.key}
            label={label}
            iconName={iconName}
            isFocused={isFocused}
            palette={palette}
            onPress={onPress}
          />
        );
      })}
    </View>
  );
}

// ── Single tab item (handles hover state) ──

interface TabItemProps {
  label: string;
  iconName: keyof typeof Ionicons.glyphMap;
  isFocused: boolean;
  palette: { active: string; bg: string; hover: string };
  onPress: () => void;
}

function TabItem({ label, iconName, isFocused, palette, onPress }: TabItemProps) {
  const [hovered, setHovered] = useState(false);

  const webHover = Platform.OS === "web"
    ? {
        onMouseEnter: () => setHovered(true),
        onMouseLeave: () => setHovered(false),
      }
    : {};

  const pillBg = isFocused
    ? palette.bg
    : hovered
      ? palette.hover
      : "transparent";

  const iconColor = isFocused ? palette.active : hovered ? palette.active : INACTIVE_COLOR;
  const textColor = isFocused ? palette.active : hovered ? palette.active : INACTIVE_COLOR;

  return (
    <Pressable
      onPress={onPress}
      style={styles.tabWrapper}
      {...webHover}
    >
      <View style={[styles.pill, { backgroundColor: pillBg }]}>
        <Ionicons name={iconName} size={24} color={iconColor} />
        <Text
          style={[
            styles.label,
            { color: textColor, fontWeight: isFocused ? "700" : "500" },
          ]}
          numberOfLines={1}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

// ── Styles ──

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E0DFF5",
    paddingBottom: Platform.OS === "ios" ? 28 : 8,
    paddingTop: 6,
    paddingHorizontal: 4,
  },
  tabWrapper: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    ...(Platform.OS === "web" ? { cursor: "pointer" } : {}),
  },
  pill: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 16,
    minWidth: 64,
    gap: 2,
  },
  label: {
    fontSize: 11,
    fontFamily: "Rubik-Medium",
    textAlign: "center",
  },
});
