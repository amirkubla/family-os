/**
 * CustomTabBar — space-saving navigation, all platforms.
 *
 * A small circular FAB floats in the bottom-RIGHT corner (screen FABs live
 * bottom-left, so no collision). Tapping it fans a vertical speed-dial menu
 * UP over the content; a dimmed backdrop + the FAB (now an ✕) both collapse
 * it. The bar's root is `position: absolute`, so it is removed from the flex
 * flow and screens fill the whole height — nothing is permanently reserved
 * at the bottom.
 */

import React, { useState, useRef, useCallback } from "react";
import {
  View,
  Pressable,
  StyleSheet,
  Platform,
  Animated,
} from "react-native";
import { Text } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";

// ── Per-tab accent colours ──────────────────────────────────────────────────

const TAB_COLORS: Record<string, { active: string; bg: string }> = {
  today:    { active: "#C49A2A", bg: "#FBF5E4" },  // honey gold
  calendar: { active: "#3A7BD5", bg: "#E8F0FB" },  // sapphire blue
  grocery:  { active: "#2D9F6F", bg: "#E6F6EF" },  // emerald green
  home:     { active: "#2AACB4", bg: "#E4F6F7" },  // ocean teal
  settings: { active: "#8E7CC3", bg: "#F0ECF8" },  // dusty violet
};

const TAB_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  today:    "sunny-outline",
  calendar: "calendar-outline",
  grocery:  "cart-outline",
  home:     "home-outline",
  settings: "settings-outline",
};

const isWeb = Platform.OS === "web";
const webCursor = isWeb ? ({ cursor: "pointer" } as any) : {};

// ── Component ─────────────────────────────────────────────────────────────

export default function CustomTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, 12);

  const [expanded, setExpanded] = useState(false);
  const anim = useRef(new Animated.Value(0)).current;

  // Native driver is unsupported on web (react-native-web warns + no-ops);
  // fall back to JS-driven animation there.
  const SPRING = { useNativeDriver: !isWeb, tension: 240, friction: 22 };

  const expand = useCallback(() => {
    setExpanded(true);
    Animated.spring(anim, { toValue: 1, ...SPRING }).start();
  }, [anim]); // eslint-disable-line react-hooks/exhaustive-deps

  const collapse = useCallback(() => {
    Animated.spring(anim, { toValue: 0, ...SPRING }).start(({ finished }) => {
      if (finished) setExpanded(false);
    });
  }, [anim]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = useCallback(() => {
    if (expanded) collapse();
    else expand();
  }, [expanded, expand, collapse]);

  // Active tab → FAB colour + icon
  const activeRoute = state.routes[state.index];
  const activeName = activeRoute?.name ?? "home";
  const activePal = TAB_COLORS[activeName] ?? TAB_COLORS.home;
  const activeIcon = TAB_ICONS[activeName] ?? "ellipse-outline";

  const handleSelect = useCallback(
    (routeName: string, routeKey: string, isFocused: boolean) => {
      const event = navigation.emit({
        type: "tabPress",
        target: routeKey,
        canPreventDefault: true,
      });
      if (!isFocused && !event.defaultPrevented) {
        navigation.navigate(routeName);
      }
      collapse();
    },
    [navigation, collapse],
  );

  // Only the real tabs (skip href:null screens like kid/customization)
  const navRoutes = state.routes.filter((r) => r.name in TAB_COLORS);

  const backdropOpacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const menuOpacity = anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0.4, 1] });
  const menuTranslate = anim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] });

  return (
    <View
      style={[StyleSheet.absoluteFill, isWeb && ({ position: "fixed" } as any)]}
      pointerEvents="box-none"
    >
      {/* Backdrop — only intercepts touches while expanded */}
      {expanded && (
        <Animated.View
          style={[styles.backdrop, { opacity: backdropOpacity }]}
          pointerEvents="auto"
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={collapse} />
        </Animated.View>
      )}

      {/* Bottom-right anchored column: menu items + FAB */}
      <View style={[styles.anchor, { bottom: bottomPad }]} pointerEvents="box-none">
        {/* Speed-dial menu items (above the FAB) */}
        {expanded && (
          <Animated.View
            style={[
              styles.menu,
              { opacity: menuOpacity, transform: [{ translateY: menuTranslate }] },
            ]}
            pointerEvents="auto"
          >
            {navRoutes.map((route) => {
              const idx = state.routes.indexOf(route);
              const isFocused = state.index === idx;
              const pal = TAB_COLORS[route.name];
              const label = descriptors[route.key]?.options?.title ?? route.name;
              return (
                <Pressable
                  key={route.key}
                  onPress={() => handleSelect(route.name, route.key, isFocused)}
                  style={[
                    styles.menuItem,
                    webCursor,
                    isFocused && { backgroundColor: pal.bg, borderColor: pal.active + "55" },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={label}
                  accessibilityState={{ selected: isFocused }}
                  testID={`tab-${route.name}`}
                >
                  <Text
                    style={[
                      styles.menuLabel,
                      { color: isFocused ? pal.active : "#3A3A4A", fontWeight: isFocused ? "800" : "600" },
                    ]}
                    numberOfLines={1}
                  >
                    {label}
                  </Text>
                  <View
                    style={[
                      styles.menuIconWrap,
                      { backgroundColor: isFocused ? pal.active : pal.bg },
                    ]}
                  >
                    <Ionicons
                      name={TAB_ICONS[route.name] ?? "ellipse-outline"}
                      size={18}
                      color={isFocused ? "#FFFFFF" : pal.active}
                    />
                  </View>
                </Pressable>
              );
            })}
          </Animated.View>
        )}

        {/* The FAB — toggles open/close */}
        <Pressable
          onPress={toggle}
          style={[
            styles.fab,
            webCursor,
            { backgroundColor: expanded ? "#3A3A4A" : activePal.active },
          ]}
          accessibilityRole="button"
          accessibilityLabel={expanded ? "סגור תפריט ניווט" : "פתח תפריט ניווט"}
          accessibilityState={{ expanded }}
          testID="nav-fab"
        >
          <Ionicons name={expanded ? "close" : activeIcon} size={26} color="#FFFFFF" />
        </Pressable>
      </View>
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15,15,30,0.18)",
  },
  anchor: {
    position: "absolute",
    right: 16,
    alignItems: "flex-end",
    // bottom set inline from safe-area inset
  },
  menu: {
    alignItems: "flex-end",
    gap: 10,
    marginBottom: 12,
  },
  menuItem: {
    flexDirection: "row", // label (left) + icon circle (right, near edge)
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FFFFFF",
    paddingVertical: 7,
    paddingHorizontal: 10,
    paddingStart: 16,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(226, 232, 240, 0.7)",
    shadowColor: "#1E293B",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
  },
  menuLabel: {
    fontSize: 14,
    writingDirection: "rtl",
    textAlign: "right",
  },
  menuIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#1E293B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 12,
  },
});
