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
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useRouter } from "expo-router";

import { FAB_RIGHT } from "@src/ui/fabAnchor";
import { useThemeColor } from "@src/ui/useThemeColor";
import { t } from "@src/i18n";

// ── Nav icons ────────────────────────────────────────────────────────────────
// Filled (heavy brush) glyphs, rendered white on the themed circle.

// Settings is intentionally absent — it's reached via the gear on the home
// dashboard, so it doesn't need a slot in the floating nav.
const TAB_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  today:    "sunny",
  calendar: "calendar",
  grocery:  "cart",
  home:     "home",
  budget:   "wallet",
};

// Management actions — rendered inline in the main menu (no nested layer).
// Grocery + budget live here too, alongside chores/notes/projects.
const OPS_ITEMS: { route: string; icon: keyof typeof Ionicons.glyphMap; labelKey: string }[] = [
  { route: "grocery",  icon: "cart",          labelKey: "tabs.grocery" },
  { route: "budget",   icon: "wallet",        labelKey: "tabs.budget" },
  { route: "chores",   icon: "checkbox",      labelKey: "home.chores" },
  { route: "notes",    icon: "document-text", labelKey: "home.notes" },
  { route: "projects", icon: "rocket",        labelKey: "home.projects" },
];

// Routes shown directly in the main menu, in display order (top → bottom).
// Everything else lives in OPS_ITEMS, also rendered inline.
const MAIN_ROUTES = ["home", "today", "calendar"];

// Per-item circle background — a soft pastel palette so each menu item has its
// own colour, while the icon stays the family theme colour on top. Keyed by
// route (or "family"); falls back to the theme tint if a key is missing.
const MENU_BG: Record<string, string> = {
  home:     "#E4F6F7", // mint
  today:    "#FBF0DA", // warm cream
  calendar: "#E6EEFB", // periwinkle
  grocery:  "#E4F6EC", // soft green
  budget:   "#F1EAFB", // lavender
  chores:   "#E0F5F1", // aqua
  notes:    "#FBF3DC", // butter
  projects: "#ECEAFE", // soft indigo
  family:   "#FBE7F0", // pink
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
  // Match the page add-FABs, which sit at inset + 16 (S.lg) from the screen
  // bottom — so the nav FAB and a page's "+" FAB align horizontally.
  const bottomPad = insets.bottom + 16;
  const router = useRouter();

  const theme = useThemeColor();

  const [expanded, setExpanded] = useState(false);
  const anim = useRef(new Animated.Value(0)).current;
  const collapseTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Native driver is unsupported on web (react-native-web warns + no-ops);
  // fall back to JS-driven animation there.
  const SPRING = { useNativeDriver: !isWeb, tension: 240, friction: 22 };

  const expand = useCallback(() => {
    if (collapseTimer.current) clearTimeout(collapseTimer.current);
    setExpanded(true);
    Animated.spring(anim, { toValue: 1, ...SPRING }).start();
  }, [anim]); // eslint-disable-line react-hooks/exhaustive-deps

  const collapse = useCallback(() => {
    Animated.spring(anim, { toValue: 0, ...SPRING }).start();
    // Flip state on a timer rather than the spring's `finished` callback —
    // a navigation re-render (router.push) can deliver finished:false and
    // strand the menu open. The timer is cleared by expand() on rapid re-open.
    if (collapseTimer.current) clearTimeout(collapseTimer.current);
    collapseTimer.current = setTimeout(() => {
      setExpanded(false);
    }, 240);
  }, [anim]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = useCallback(() => {
    if (expanded) collapse();
    else expand();
  }, [expanded, expand, collapse]);

  const handleOpSelect = useCallback(
    (route: string) => {
      router.push(`/${route}` as any);
      collapse();
    },
    [router, collapse],
  );

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

  // Main-row tabs only (today/calendar/home). Grocery + budget live under the
  // ops layer; href:null screens (kid/customization) are excluded.
  // Ordered by MAIN_ROUTES (display order), not the tab-registration order.
  const navRoutes = MAIN_ROUTES
    .map((name) => state.routes.find((r) => r.name === name))
    .filter((r): r is (typeof state.routes)[number] => !!r);
  // Currently focused route name — drives the "selected" inversion for every
  // item (main tabs + ops actions are all registered tab screens).
  const activeName = state.routes[state.index]?.name;

  // Each circle gets its own pastel background (MENU_BG); the icon stays the
  // family theme colour on top. The focused item gets a thin theme ring as the
  // "you are here" cue.
  const circleBg = (key: string, focused: boolean) => [
    { backgroundColor: MENU_BG[key] ?? theme },
    focused ? { borderWidth: 2, borderColor: theme } : null,
  ];

  const backdropOpacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const menuOpacity = anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0.4, 1] });
  const menuTranslate = anim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] });

  // Flat list of circles for the current layer. Main = the tabs + every
  // management action inline (no nested "ניהול" tap); kids = the kid list + back.
  const mainItems: { key: string; node: React.ReactNode }[] = [
    ...navRoutes.map((route) => {
      const idx = state.routes.indexOf(route);
      const isFocused = state.index === idx;
      const label = descriptors[route.key]?.options?.title ?? route.name;
      return {
        key: route.key,
        node: (
          <Pressable
            onPress={() => handleSelect(route.name, route.key, isFocused)}
            style={[styles.circle, webCursor, circleBg(route.name, isFocused)]}
            accessibilityRole="button"
            accessibilityLabel={label}
            accessibilityState={{ selected: isFocused }}
            testID={`tab-${route.name}`}
          >
            <Ionicons
              name={TAB_ICONS[route.name] ?? "ellipse"}
              size={28}
              color={theme}
            />
          </Pressable>
        ),
      };
    }),
    ...OPS_ITEMS.map((op) => {
      const isFocused = op.route === activeName;
      return {
        key: `op-${op.route}`,
        node: (
          <Pressable
            onPress={() => handleOpSelect(op.route)}
            style={[styles.circle, webCursor, circleBg(op.route, isFocused)]}
            accessibilityRole="button"
            accessibilityLabel={t(op.labelKey)}
            accessibilityState={{ selected: isFocused }}
            testID={`nav-op-${op.route}`}
          >
            <Ionicons name={op.icon} size={28} color={theme} />
          </Pressable>
        ),
      };
    }),
    {
      key: "family",
      node: (
        <Pressable
          onPress={() => { router.push("/family"); collapse(); }}
          style={[styles.circle, webCursor, circleBg("family", activeName === "family")]}
          accessibilityRole="button"
          accessibilityLabel={t("family.title")}
          testID="nav-family"
        >
          <Ionicons name="people" size={28} color={theme} />
        </Pressable>
      ),
    },
  ];

  const items = mainItems;

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
        {/* Speed-dial menu items (above the FAB) — open together */}
        {expanded && (
          <Animated.View
            style={[
              styles.menu,
              { opacity: menuOpacity, transform: [{ translateY: menuTranslate }] },
            ]}
            pointerEvents="auto"
          >
            {items.map((item) => (
              <React.Fragment key={item.key}>{item.node}</React.Fragment>
            ))}
          </Animated.View>
        )}

        {/* The FAB — toggles open/close */}
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
    backgroundColor: "rgba(15,15,30,0.18)",
  },
  anchor: {
    position: "absolute",
    ...FAB_RIGHT, // always bottom-right (web reference); native would mirror a bare `right`
    alignItems: "flex-end",
    // bottom set inline from safe-area inset
  },
  menu: {
    width: 50, // match the FAB width so the circles centre over it
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  // Icon-only circular menu button (no text labels — icons are intuitive).
  // Layout only — each item's pastel background (MENU_BG) + the theme-coloured
  // icon are applied inline (see circleBg); the focused item gets a theme ring.
  circle: {
    width: 48,
    height: 48,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
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
