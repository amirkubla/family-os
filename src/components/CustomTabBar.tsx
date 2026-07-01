/**
 * CustomTabBar — space-saving navigation, all platforms.
 *
 * A small circular FAB floats in the bottom-RIGHT corner (screen FABs live
 * bottom-left, so no collision). Tapping it slides a full-height **drawer** in
 * from the RIGHT edge (RTL) over a dimmed backdrop, listing every menu action
 * as a coloured icon + label row. Tapping the FAB again (now an ✕) or the
 * backdrop closes it. The bar's root is `position: absolute`, so it is removed
 * from the flex flow and screens fill the whole height — nothing is permanently
 * reserved at the bottom.
 */

import React, { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  Animated,
  ScrollView,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useRouter } from "expo-router";

import { useFamilyStore } from "@src/store/useFamilyStore";
import { C, S, SHADOW } from "@src/ui/tokens";
import { RTL_ROW, TEXT_RIGHT } from "@src/ui/rtl";
import { useThemeColor } from "@src/ui/useThemeColor";
import { t } from "@src/i18n";

// ── Menu items ────────────────────────────────────────────────────────────────
// Every navigable destination, in display order (top → bottom). Each row gets
// its own accent colour (icon + label), matching the colourful drawer design.
// `name` is the registered (tabs) route name; all of these are Tab.Screen
// entries (some with href:null), so navigation.navigate reaches them and the
// focused one lights up.
type MenuItem = {
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  labelKey: string;
  color: string;
};

const MENU_ITEMS: MenuItem[] = [
  { name: "home",          icon: "home",          labelKey: "tabs.home",             color: "#2BA896" },
  { name: "today",         icon: "sunny",         labelKey: "tabs.today",            color: "#E08600" },
  { name: "calendar",      icon: "calendar",      labelKey: "tabs.calendar",         color: "#2F80ED" },
  { name: "grocery",       icon: "cart",          labelKey: "tabs.grocery",          color: "#1FA45B" },
  { name: "budget",        icon: "wallet",        labelKey: "tabs.budget",           color: "#0E9AA5" },
  { name: "chores",        icon: "checkbox",      labelKey: "home.chores",           color: "#E67E22" },
  { name: "notes",         icon: "document-text", labelKey: "home.notes",            color: "#CA8A04" },
  { name: "projects",      icon: "rocket",        labelKey: "home.projects",         color: "#6C63FF" },
  { name: "family",        icon: "people",        labelKey: "family.title",          color: "#E5534B" },
  { name: "customization", icon: "color-palette", labelKey: "settings.customization", color: "#9B51E0" },
  { name: "settings",      icon: "settings",      labelKey: "tabs.settings",         color: "#64748B" },
];

const isWeb = Platform.OS === "web";
const webCursor = isWeb ? ({ cursor: "pointer" } as any) : {};
// Anchor the drawer flush to the PHYSICAL right edge on every platform. Native
// mirrors absolute left/right under RTL (so `left:0` lands on the right); web
// does not (so `right:0`). Same trick as fabAnchor, with a 0 inset.
const DRAWER_SIDE = isWeb ? ({ right: 0 } as const) : ({ left: 0 } as const);

// ── Component ─────────────────────────────────────────────────────────────

export default function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  // Match the page add-FABs, which sit at inset + 16 (S.lg) from the screen
  // bottom — so the nav FAB and a page's "+" FAB align horizontally.
  const bottomPad = insets.bottom + 16;
  const router = useRouter();

  const theme = useThemeColor();
  const familyName = useFamilyStore((s) => s.familyName);

  const [expanded, setExpanded] = useState(false);
  const anim = useRef(new Animated.Value(0)).current;
  const collapseTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Drawer width — capped so it never swallows the whole screen on tablets/web.
  const panelWidth = Math.min(340, Math.round(width * 0.84));

  // Native driver is unsupported on web (react-native-web warns + no-ops);
  // fall back to JS-driven animation there.
  const SPRING = { useNativeDriver: !isWeb, tension: 240, friction: 24 };

  const expand = useCallback(() => {
    if (collapseTimer.current) clearTimeout(collapseTimer.current);
    setExpanded(true);
    Animated.spring(anim, { toValue: 1, ...SPRING }).start();
  }, [anim]); // eslint-disable-line react-hooks/exhaustive-deps

  const collapse = useCallback(() => {
    Animated.spring(anim, { toValue: 0, ...SPRING }).start();
    // Flip state on a timer rather than the spring's `finished` callback —
    // a navigation re-render (router.navigate) can deliver finished:false and
    // strand the drawer open. The timer is cleared by expand() on rapid re-open.
    if (collapseTimer.current) clearTimeout(collapseTimer.current);
    collapseTimer.current = setTimeout(() => {
      setExpanded(false);
    }, 260);
  }, [anim]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = useCallback(() => {
    if (expanded) collapse();
    else expand();
  }, [expanded, expand, collapse]);

  const activeName = state.routes[state.index]?.name;

  // Navigate to a menu item. All items are registered (tabs) screens, so use
  // the idiomatic tabPress + navigate (keeps tab state, no back-stack buildup).
  // Falls back to router for any name that isn't a registered route.
  const go = useCallback(
    (name: string) => {
      const route = state.routes.find((r) => r.name === name);
      if (route) {
        const isFocused = state.routes[state.index]?.name === name;
        const event = navigation.emit({
          type: "tabPress",
          target: route.key,
          canPreventDefault: true,
        });
        if (!isFocused && !event.defaultPrevented) {
          navigation.navigate(name as never);
        }
      } else {
        router.navigate(("/" + name) as any);
      }
      collapse();
    },
    [state, navigation, router, collapse],
  );

  const backdropOpacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  // Closed → panel pushed off the right edge by its own width; open → flush.
  const panelTranslate = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [panelWidth, 0],
  });

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

      {/* The drawer panel — slides in from the right edge (RTL) */}
      {expanded && (
        <Animated.View
          style={[
            styles.drawer,
            DRAWER_SIDE,
            { width: panelWidth, transform: [{ translateX: panelTranslate }] },
          ]}
          pointerEvents="auto"
          accessibilityRole={isWeb ? ("menu" as any) : undefined}
        >
          {/* Brand wordmark */}
          <View style={[styles.brand, { paddingTop: insets.top + S.md }]}>
            <View style={[styles.brandBadge, { backgroundColor: theme }]}>
              <Ionicons name="sparkles" size={18} color="#FFFFFF" />
            </View>
            <Text style={styles.brandText} numberOfLines={1}>
              {familyName || "Family OS"}
            </Text>
          </View>

          <View style={styles.divider} />

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: bottomPad + 64, paddingTop: S.xs }}
          >
            {MENU_ITEMS.map((item) => {
              const focused = item.name === activeName;
              return (
                <Pressable
                  key={item.name}
                  onPress={() => go(item.name)}
                  style={[
                    styles.row,
                    webCursor,
                    focused && { backgroundColor: item.color + "1A" },
                  ]}
                  accessibilityRole={isWeb ? ("menuitem" as any) : "button"}
                  accessibilityLabel={t(item.labelKey)}
                  accessibilityState={{ selected: focused }}
                  testID={`tab-${item.name}`}
                >
                  <Ionicons name={item.icon} size={24} color={item.color} />
                  <Text style={[styles.rowLabel, { color: item.color }]} numberOfLines={1}>
                    {t(item.labelKey)}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </Animated.View>
      )}

      {/* Bottom-right anchored FAB — toggles the drawer open/close */}
      <View style={[styles.anchor, { bottom: bottomPad }]} pointerEvents="box-none">
        <Pressable
          onPress={toggle}
          style={[
            styles.fab,
            webCursor,
            { backgroundColor: expanded ? "#3A3A4A" : theme },
          ]}
          accessibilityRole="button"
          accessibilityLabel={expanded ? "סגור תפריט ניווט" : "פתח תפריט ניווט"}
          accessibilityState={{ expanded }}
          testID="nav-fab"
        >
          <Ionicons name={expanded ? "close" : "list"} size={24} color="#FFFFFF" />
        </Pressable>
      </View>
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15,15,30,0.32)",
  },
  drawer: {
    position: "absolute",
    top: 0,
    bottom: 0,
    backgroundColor: C.surface,
    // Round only the inner (content-facing) vertical edge. borderTop/BottomLeft
    // are physical props (not RTL-swapped), and the panel's inner edge is the
    // physical left on both web and native — so this rounds the right spot.
    borderTopLeftRadius: 22,
    borderBottomLeftRadius: 22,
    ...SHADOW.lg,
    ...(isWeb ? ({ zIndex: 1 } as any) : {}),
  },
  brand: {
    flexDirection: RTL_ROW,
    alignItems: "center",
    gap: 10,
    paddingHorizontal: S.lg,
    paddingBottom: S.md,
  },
  brandBadge: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  brandText: {
    flex: 1,
    fontSize: 20,
    fontWeight: "800",
    color: C.textPrimary,
    writingDirection: "rtl",
    textAlign: TEXT_RIGHT,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: C.border,
    marginHorizontal: S.lg,
    marginBottom: S.xs,
  },
  row: {
    flexDirection: RTL_ROW,
    alignItems: "center",
    gap: 14,
    paddingVertical: 13,
    paddingHorizontal: S.md,
    marginHorizontal: S.sm,
    borderRadius: 14,
  },
  rowLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    writingDirection: "rtl",
    textAlign: TEXT_RIGHT,
  },
  anchor: {
    position: "absolute",
    ...(isWeb ? { right: 16 } : { left: 16 }), // physical bottom-right on all platforms
    alignItems: "flex-end",
    ...(isWeb ? ({ zIndex: 2 } as any) : {}),
    // bottom set inline from safe-area inset
  },
  fab: {
    width: 50,
    height: 50,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#1E293B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 12,
  },
});
