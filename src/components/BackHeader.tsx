/**
 * BackHeader — slim top bar with a single back button, rendered by the
 * (tabs) layout above every screen except the home launcher.
 *
 * RTL: the button sits on the RIGHT edge and the chevron points right (">"),
 * which reads as "back" in Hebrew. Tapping it always returns to the home
 * launcher (the main menu), regardless of how the user got here.
 */

import React, { useCallback } from "react";
import { View, Pressable, StyleSheet, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { t } from "@src/i18n";
import { C, S } from "@src/ui/tokens";
import { RTL_ROW } from "@src/ui/rtl";

export default function BackHeader() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const goBack = useCallback(() => router.navigate("/home"), [router]);

  return (
    <View style={[styles.bar, { paddingTop: insets.top + S.xs }]}>
      <Pressable
        onPress={goBack}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel={t("nav.back")}
        testID="page-back"
        style={({ pressed }) => [
          styles.backBtn,
          pressed && styles.pressed,
          Platform.OS === "web" && ({ cursor: "pointer" } as any),
        ]}
      >
        <Ionicons name="chevron-forward" size={24} color={C.textPrimary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: RTL_ROW, // first child lands on the right edge
    alignItems: "center",
    paddingHorizontal: S.md,
    paddingBottom: S.xs,
    backgroundColor: C.bg,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.surface,
  },
  pressed: {
    opacity: 0.6,
  },
});
