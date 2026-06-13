/**
 * PageHeader — fixed top bar for full-screen pages reached from the home
 * launcher (notes / chores / projects).
 *
 * RTL layout: the back button sits on the RIGHT edge with the title beside
 * it (reading right-to-left). Tapping back returns to the previous screen,
 * falling back to /home if there's no history (deep link / refresh).
 */

import React, { useCallback } from "react";
import { View, Pressable, StyleSheet, Platform } from "react-native";
import { Text } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { t } from "@src/i18n";
import { C, S } from "@src/ui/tokens";
import { RTL_ROW, TEXT_RIGHT } from "@src/ui/rtl";

interface Props {
  title: string;
}

export default function PageHeader({ title }: Props) {
  const router = useRouter();

  // Always return to the home launcher (these pages are only reached from it),
  // so the button is predictable regardless of how the screen was opened.
  const goBack = useCallback(() => {
    router.replace("/home");
  }, [router]);

  return (
    <View style={styles.bar}>
      <Pressable
        onPress={goBack}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel={t("nav.back")}
        testID="page-back"
        style={[styles.backBtn, Platform.OS === "web" && ({ cursor: "pointer" } as any)]}
      >
        <Ionicons name="chevron-forward" size={26} color={C.textSecondary} />
      </Pressable>
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: RTL_ROW, // back button on the right, title beside it
    alignItems: "center",
    gap: S.xs,
    paddingHorizontal: S.md,
    paddingVertical: S.sm,
    backgroundColor: C.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: C.textPrimary,
    textAlign: TEXT_RIGHT,
    writingDirection: "rtl",
  },
});
