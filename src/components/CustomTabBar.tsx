/**
 * CustomTabBar — Premium floating tab bar with per-tab colored highlights.
 *
 * Features a frosted-glass elevated bar with smooth pill transitions,
 * subtle gradients, and polished hover/active states.
 */

import React, { useState } from "react";
import {
  View,
  Pressable,
  StyleSheet,
  Platform,
} from "react-native";
import { Text } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";

// ── Per-tab accent colours ──

// Premium jewel-tone palette — muted enough for luxury, vivid enough to pop.
// Designed as a cohesive set: warm gold → cool sapphire → natural emerald
//   → soft coral → dusty violet. Equal visual weight, no two adjacent clash.
const TAB_COLORS: Record<string, { active: string; bg: string; hover: string }> = {
  today:    { active: "#C49A2A", bg: "#FBF5E4", hover: "#FDF9F0" },  // honey gold
  calendar: { active: "#3A7BD5", bg: "#E8F0FB", hover: "#F2F7FD" },  // sapphire blue
  grocery:  { active: "#2D9F6F", bg: "#E6F6EF", hover: "#F1FAF6" },  // emerald green
  home:     { active: "#2AACB4", bg: "#E4F6F7", hover: "#F0FAFB" },  // ocean teal
  settings: { active: "#8E7CC3", bg: "#F0ECF8", hover: "#F7F5FB" },  // dusty violet
};

const INACTIVE_COLOR = "#A8A3B8";

const TAB_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  today:    "sunny-outline",
  calendar: "calendar-outline",
  grocery:  "cart-outline",
  home:     "home-outline",
  settings: "settings-outline",
};

// ── Component ──

export default function CustomTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  // Bottom inset = height of the system navigation area (3-button bar on
  // Xiaomi/Redmi/Pixel-button-mode, or gesture handle in gesture mode, or the
  // home indicator on iOS). Without adding it to paddingBottom, the tab bar
  // visually overlaps with the system buttons when edgeToEdgeEnabled is true.
  const insets = useSafeAreaInsets();
  // Keep a small floor so the tab bar still has some breathing room on
  // devices that report 0 insets (e.g. older Androids without a system nav
  // bar, or web).
  const bottomPad = Math.max(insets.bottom, Platform.OS === "ios" ? 16 : 6);
  return (
    <View style={[styles.barOuter, { paddingBottom: bottomPad }]}>
      <View style={styles.bar}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          if (!(route.name in TAB_COLORS)) return null;
          const label = options.title ?? route.name;
          const isFocused = state.index === index;
          const name = route.name;
          const palette = TAB_COLORS[name];
          const iconName = TAB_ICONS[name] ?? "ellipse-outline";

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
    </View>
  );
}

// ── Single tab item ──

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

  const iconColor = isFocused || hovered ? palette.active : INACTIVE_COLOR;
  const textColor = isFocused ? palette.active : hovered ? palette.active : INACTIVE_COLOR;
  return (
    <Pressable
      onPress={onPress}
      style={styles.tabWrapper}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: isFocused }}
      testID={`tab-${label}`}
      {...webHover}
    >
      <View
        style={[
          styles.pill,
          { backgroundColor: pillBg },
          isFocused && styles.pillActive,
          hovered && !isFocused && styles.pillHover,
        ]}
      >
        <Ionicons name={iconName} size={22} color={iconColor} />
        <Text
          style={[
            styles.label,
            {
              color: textColor,
              fontWeight: isFocused ? "700" : "500",
              opacity: isFocused ? 1 : hovered ? 0.9 : 0.7,
            },
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
  barOuter: {
    backgroundColor: "transparent",
    paddingHorizontal: 8,
    // paddingBottom is set dynamically per device — see useSafeAreaInsets()
    // in the component above.
  },
  bar: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 4,
    // Elevated shadow
    shadowColor: "#1E293B",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 12,
    // Subtle top border
    borderWidth: 1,
    borderColor: "rgba(226, 232, 240, 0.6)",
  },
  tabWrapper: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    ...(Platform.OS === "web" ? { cursor: "pointer" } : {}),
  },
  pill: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 18,
    width: "90%",
    gap: 3,
    ...(Platform.OS === "web"
      ? { transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)" } as any
      : {}),
  },
  pillActive: {
    transform: [{ scale: 1.05 }],
  },
  pillHover: {
    transform: [{ scale: 1.02 }],
  },
  label: {
    fontSize: 11,
    letterSpacing: 0.2,
    textAlign: "center",
  },
});
