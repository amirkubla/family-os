/**
 * PickerSheet — a bottom sheet for picking a value (time / date), with a
 * Cancel · Title · Done header bar and a wheel below.
 *
 * Slides up over the current modal with a dim backdrop. The caller keeps a
 * draft value while open; Done commits it, Cancel (or backdrop tap) discards.
 * Centred + width-capped on wide screens.
 */

import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
  Easing,
  Platform,
  useWindowDimensions,
} from "react-native";
import { Portal } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { C, S, R } from "@src/ui/tokens";
import { RTL_ROW } from "@src/ui/rtl";
import { useThemeColor } from "@src/ui/useThemeColor";
import { t } from "@src/i18n";

interface Props {
  visible: boolean;
  title: string;
  onCancel: () => void;
  onDone: () => void;
  children: React.ReactNode;
}

export default function PickerSheet({ visible, title, onCancel, onDone, children }: Props) {
  const theme = useThemeColor();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const anim = useRef(new Animated.Value(1)).current; // 1 = closed (off bottom), 0 = open
  const [rendered, setRendered] = useState(visible);

  useEffect(() => {
    if (visible) {
      setRendered(true);
      Animated.timing(anim, {
        toValue: 0,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: Platform.OS !== "web",
      }).start();
    } else if (rendered) {
      Animated.timing(anim, {
        toValue: 1,
        duration: 200,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: Platform.OS !== "web",
      }).start(({ finished }) => {
        if (finished) setRendered(false);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  if (!rendered) return null;

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, height] });
  const backdropOpacity = anim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });

  return (
    <Portal>
      <Animated.View
        style={[styles.backdrop, Platform.OS === "web" && ({ position: "fixed" } as any), { opacity: backdropOpacity }]}
        pointerEvents={visible ? "auto" : "none"}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} accessibilityLabel={t("cancel")} />
      </Animated.View>

      <Animated.View
        style={[
          styles.sheet,
          Platform.OS === "web" && ({ position: "fixed" } as any),
          { paddingBottom: insets.bottom + S.md, transform: [{ translateY }] },
        ]}
      >
        <View style={styles.header}>
          <Pressable onPress={onCancel} hitSlop={10} testID="picker-cancel">
            <Text style={[styles.action, { color: theme }]}>{t("cancel")}</Text>
          </Pressable>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          <Pressable onPress={onDone} hitSlop={10} testID="picker-done">
            <Text style={[styles.action, styles.done, { color: theme }]}>{t("done")}</Text>
          </Pressable>
        </View>
        <View style={styles.content}>{children}</View>
      </Animated.View>
    </Portal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15,15,30,0.35)",
    zIndex: 10000,
  },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10001,
    backgroundColor: C.surface,
    borderTopLeftRadius: R.xl,
    borderTopRightRadius: R.xl,
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
  },
  header: {
    flexDirection: RTL_ROW,
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: S.lg,
    paddingVertical: S.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
  },
  action: { fontSize: 16, fontWeight: "600", writingDirection: "rtl" },
  done: { fontWeight: "800" },
  title: { fontSize: 16, fontWeight: "800", color: C.textPrimary, writingDirection: "rtl" },
  content: { paddingHorizontal: S.lg, paddingTop: S.md },
});
