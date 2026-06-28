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
import { t } from "@src/i18n";

// ── Per-tab accent colours ──────────────────────────────────────────────────

// Settings is intentionally absent — it's reached via the gear on the home
// dashboard, so it doesn't need a slot in the floating nav.
const TAB_COLORS: Record<string, { active: string; bg: string }> = {
  today:    { active: "#C49A2A", bg: "#FBF5E4" },  // honey gold
  calendar: { active: "#3A7BD5", bg: "#E8F0FB" },  // sapphire blue
  grocery:  { active: "#2D9F6F", bg: "#E6F6EF" },  // emerald green
  home:     { active: "#2AACB4", bg: "#E4F6F7" },  // ocean teal
  budget:   { active: "#9B59B6", bg: "#F3EBF9" },  // violet purple
};

const TAB_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  today:    "sunny-outline",
  calendar: "calendar-outline",
  grocery:  "cart-outline",
  home:     "home-outline",
  budget:   "wallet-outline",
};

// "ילדים" entry + its nested kid layer.
const KIDS_PAL = { active: "#E0699B", bg: "#FBE9F1" };

// "ניהול" (ops) entry + its nested layer. Grocery + budget live here too
// (demoted from the main row) alongside chores/notes/projects.
const OPS_PAL = { active: "#5B6CCF", bg: "#ECEEFB" };
const OPS_ITEMS: { route: string; icon: keyof typeof Ionicons.glyphMap; color: string; labelKey: string }[] = [
  { route: "grocery",  icon: "cart-outline",          color: "#2D9F6F", labelKey: "tabs.grocery" },
  { route: "budget",   icon: "wallet-outline",        color: "#9B59B6", labelKey: "tabs.budget" },
  { route: "chores",   icon: "checkbox-outline",      color: "#1FA67A", labelKey: "home.chores" },
  { route: "notes",    icon: "document-text-outline", color: "#C49A2A", labelKey: "home.notes" },
  { route: "projects", icon: "rocket-outline",        color: "#6C63FF", labelKey: "home.projects" },
];

// Routes shown directly in the main speed-dial row (everything else — grocery,
// budget — lives under the "ניהול" ops layer).
const MAIN_ROUTES = ["today", "calendar", "home"];

const C_TEXT_MUTED = "#A8A3B8";

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
  // Which menu layer is showing: the main tabs, the nested kid list, or the
  // nested ops (chores/notes/projects) list.
  const [view, setView] = useState<"main" | "kids" | "ops">("main");
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

  // Main-row tabs only (today/calendar/home). Grocery + budget live under the
  // ops layer; href:null screens (kid/customization) are excluded.
  const navRoutes = state.routes.filter((r) => MAIN_ROUTES.includes(r.name));

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
            {view === "main" ? (
              <>
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
                        styles.circle,
                        webCursor,
                        { backgroundColor: isFocused ? pal.active : "#FFFFFF" },
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={label}
                      accessibilityState={{ selected: isFocused }}
                      testID={`tab-${route.name}`}
                    >
                      <Ionicons
                        name={TAB_ICONS[route.name] ?? "ellipse-outline"}
                        size={24}
                        color={isFocused ? "#FFFFFF" : pal.active}
                      />
                    </Pressable>
                  );
                })}

                {/* "ניהול" — opens the nested chores/notes/projects layer */}
                <Pressable
                  onPress={() => setView("ops")}
                  style={[styles.circle, webCursor]}
                  accessibilityRole="button"
                  accessibilityLabel={t("nav.ops")}
                  testID="nav-ops"
                >
                  <Ionicons name="apps-outline" size={24} color={OPS_PAL.active} />
                </Pressable>

                {/* "ילדים" — opens the nested kid layer (does not navigate) */}
                {activeKids.length > 0 && (
                  <Pressable
                    onPress={() => setView("kids")}
                    style={[styles.circle, webCursor]}
                    accessibilityRole="button"
                    accessibilityLabel={t("home.kids")}
                    testID="nav-kids"
                  >
                    <Ionicons name="happy-outline" size={24} color={KIDS_PAL.active} />
                  </Pressable>
                )}
              </>
            ) : view === "kids" ? (
              <>
                {activeKids.map((kid) => {
                  const color = kid.color ?? KIDS_PAL.active;
                  return (
                    <Pressable
                      key={kid.id}
                      onPress={() => handleKidSelect(kid.id)}
                      style={[styles.circle, webCursor, { borderColor: color, borderWidth: 2 }]}
                      accessibilityRole="button"
                      accessibilityLabel={kid.name}
                      testID={`nav-kid-${kid.id}`}
                    >
                      <Text style={styles.kidEmoji}>{kid.emoji ?? "🧒"}</Text>
                    </Pressable>
                  );
                })}

                {/* Back to the main layer */}
                <Pressable
                  onPress={() => setView("main")}
                  style={[styles.circle, webCursor]}
                  accessibilityRole="button"
                  accessibilityLabel={t("nav.back")}
                  testID="nav-kids-back"
                >
                  <Ionicons name="chevron-forward" size={24} color={C_TEXT_MUTED} />
                </Pressable>
              </>
            ) : (
              <>
                {OPS_ITEMS.map((op) => (
                  <Pressable
                    key={op.route}
                    onPress={() => handleOpSelect(op.route)}
                    style={[styles.circle, webCursor, { borderColor: op.color, borderWidth: 2 }]}
                    accessibilityRole="button"
                    accessibilityLabel={t(op.labelKey)}
                    testID={`nav-op-${op.route}`}
                  >
                    <Ionicons name={op.icon} size={24} color={op.color} />
                  </Pressable>
                ))}

                {/* Back to the main layer */}
                <Pressable
                  onPress={() => setView("main")}
                  style={[styles.circle, webCursor]}
                  accessibilityRole="button"
                  accessibilityLabel={t("nav.back")}
                  testID="nav-ops-back"
                >
                  <Ionicons name="chevron-forward" size={24} color={C_TEXT_MUTED} />
                </Pressable>
              </>
            )}
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
  circle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(226, 232, 240, 0.8)",
    shadowColor: "#1E293B",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
  },
  kidEmoji: {
    fontSize: 22,
    lineHeight: 26,
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
