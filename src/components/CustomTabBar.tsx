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
import { useRouter } from "expo-router";

import { useFamilyStore } from "@src/store/useFamilyStore";
import { FAB_RIGHT } from "@src/ui/fabAnchor";
import { C } from "@src/ui/tokens";
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

// Routes shown directly in the main menu (today/calendar/home); everything else
// lives in OPS_ITEMS, also rendered inline.
const MAIN_ROUTES = ["today", "calendar", "home"];

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

  // Active kids drive the nested "ילדים" layer.
  const kids = useFamilyStore((s) => s.kids);
  const activeKids = kids.filter((k) => k.isActive);

  const [expanded, setExpanded] = useState(false);
  // Which menu layer is showing: the flat main menu, or the nested kid list.
  const [view, setView] = useState<"main" | "kids">("main");
  const anim = useRef(new Animated.Value(0)).current;
  const collapseTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Native driver is unsupported on web (react-native-web warns + no-ops);
  // fall back to JS-driven animation there.
  const SPRING = { useNativeDriver: !isWeb, tension: 240, friction: 22 };

  const expand = useCallback(() => {
    if (collapseTimer.current) clearTimeout(collapseTimer.current);
    setView("main"); // always open on the main layer
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
      setView("main"); // reset so the next open starts on the main layer
    }, 240);
  }, [anim]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = useCallback(() => {
    if (expanded) collapse();
    else expand();
  }, [expanded, expand, collapse]);

  const handleKidSelect = useCallback(
    (kidId: string) => {
      router.push(`/kid/${kidId}`);
      collapse();
    },
    [router, collapse],
  );

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
  const navRoutes = state.routes.filter((r) => MAIN_ROUTES.includes(r.name));
  // Currently focused route name — drives the "selected" inversion for every
  // item (main tabs + ops actions are all registered tab screens).
  const activeName = state.routes[state.index]?.name;

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
            style={[styles.circle, webCursor, isFocused && styles.circleActive]}
            accessibilityRole="button"
            accessibilityLabel={label}
            accessibilityState={{ selected: isFocused }}
            testID={`tab-${route.name}`}
          >
            <Ionicons
              name={TAB_ICONS[route.name] ?? "ellipse"}
              size={32}
              color={isFocused ? C.primary : "#FFFFFF"}
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
            style={[styles.circle, webCursor, isFocused && styles.circleActive]}
            accessibilityRole="button"
            accessibilityLabel={t(op.labelKey)}
            accessibilityState={{ selected: isFocused }}
            testID={`nav-op-${op.route}`}
          >
            <Ionicons name={op.icon} size={32} color={isFocused ? C.primary : "#FFFFFF"} />
          </Pressable>
        ),
      };
    }),
    ...(activeKids.length > 0
      ? [
          {
            key: "kids-trigger",
            node: (
              <Pressable
                onPress={() => setView("kids")}
                style={[styles.circle, webCursor]}
                accessibilityRole="button"
                accessibilityLabel={t("home.kids")}
                testID="nav-kids"
              >
                <Ionicons name="happy" size={32} color="#FFFFFF" />
              </Pressable>
            ),
          },
        ]
      : []),
  ];

  const kidsItems: { key: string; node: React.ReactNode }[] = [
    ...activeKids.map((kid) => ({
      key: kid.id,
      node: (
        <Pressable
          onPress={() => handleKidSelect(kid.id)}
          style={[styles.circle, webCursor]}
          accessibilityRole="button"
          accessibilityLabel={kid.name}
          testID={`nav-kid-${kid.id}`}
        >
          <Text style={styles.kidEmoji}>{kid.emoji ?? "🧒"}</Text>
        </Pressable>
      ),
    })),
    {
      key: "kids-back",
      node: (
        <Pressable
          onPress={() => setView("main")}
          style={[styles.circle, webCursor]}
          accessibilityRole="button"
          accessibilityLabel={t("nav.back")}
          testID="nav-kids-back"
        >
          <Ionicons name="chevron-forward" size={32} color="#FFFFFF" />
        </Pressable>
      ),
    },
  ];

  const items = view === "kids" ? kidsItems : mainItems;

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
            { backgroundColor: expanded ? "#3A3A4A" : C.primary },
          ]}
          accessibilityRole="button"
          accessibilityLabel={expanded ? "סגור תפריט ניווט" : "פתח תפריט ניווט"}
          accessibilityState={{ expanded }}
          testID="nav-fab"
        >
          <Ionicons name={expanded ? "close" : "list"} size={26} color="#FFFFFF" />
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
    width: 56, // match the FAB width so the circles centre over it
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  // Icon-only circular menu button (no text labels — icons are intuitive).
  // Themed fill (C.primary) with a white ring and a white icon.
  circle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.primary,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  // Current tab — inverted (white fill, themed ring + icon) as the selected cue.
  circleActive: {
    backgroundColor: "#FFFFFF",
    borderColor: C.primary,
  },
  kidEmoji: {
    fontSize: 30,
    lineHeight: 34,
    textAlign: "center",
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
