import React, { useEffect, useRef, useState } from "react";
import {
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
  Easing,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Portal } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { C, S } from "@src/ui/tokens";
import { FAB_LEFT } from "@src/ui/fabAnchor";
import { t } from "@src/i18n";

/** When provided, ModalWrapper renders prev/next arrows flanking the content. */
export interface ModalCarousel {
  onPrev: () => void;
  onNext: () => void;
}

interface Props {
  visible: boolean;
  onDismiss: () => void;
  children: React.ReactNode;
  /** Optional carousel arrows shown at the screen edges (kid "add" modals). */
  carousel?: ModalCarousel;
}

/**
 * ModalWrapper — full-screen sheet that wipes up from the bottom.
 *
 * Every modal in the app renders through this: it covers the whole page, slides
 * in from the bottom (and back down on close), and shows a cancel (✕) at the
 * top-left. Content scrolls; on wide screens it's capped + centred for
 * readability while the surface still fills the page.
 */
export default function ModalWrapper({ visible, onDismiss, children, carousel }: Props) {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  // 1 = closed (translated off the bottom), 0 = fully open.
  const anim = useRef(new Animated.Value(1)).current;
  const [rendered, setRendered] = useState(visible);

  useEffect(() => {
    if (visible) {
      setRendered(true);
      Animated.timing(anim, {
        toValue: 0,
        duration: 380,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: Platform.OS !== "web",
      }).start();
    } else if (rendered) {
      Animated.timing(anim, {
        toValue: 1,
        duration: 300,
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

  return (
    // Portal hosts the sheet at the app root so it covers the whole screen
    // regardless of which scroll container opened it.
    <Portal>
      <Animated.View
        style={[
          styles.fullscreen,
          Platform.OS === "web" && ({ position: "fixed" } as any),
          { transform: [{ translateY }] },
        ]}
      >
        {/* Cancel (✕) — top-left on every platform (web:left / native:right→mirrored). */}
        <Pressable
          style={[styles.cancelBtn, { top: insets.top + S.sm }]}
          onPress={onDismiss}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t("cancel")}
          testID="modal-cancel"
        >
          <Ionicons name="close" size={26} color={C.textPrimary} />
        </Pressable>

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.flex}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.content,
              { paddingTop: insets.top + 52, paddingBottom: insets.bottom + S.xl },
            ]}
          >
            {children}
          </ScrollView>
        </KeyboardAvoidingView>

        {carousel ? (
          <>
            <Pressable
              style={[styles.sideArrow, styles.arrowRight]}
              onPress={carousel.onPrev}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="הקודם"
              testID="carousel-prev"
            >
              <Ionicons name="chevron-forward" size={26} color="#FFFFFF" style={styles.arrowIcon} />
            </Pressable>
            <Pressable
              style={[styles.sideArrow, styles.arrowLeft]}
              onPress={carousel.onNext}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="הבא"
              testID="carousel-next"
            >
              <Ionicons name="chevron-back" size={26} color="#FFFFFF" style={styles.arrowIcon} />
            </Pressable>
          </>
        ) : null}
      </Animated.View>
    </Portal>
  );
}

const styles = StyleSheet.create({
  fullscreen: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    backgroundColor: C.surface,
  },
  flex: { flex: 1 },
  content: {
    paddingHorizontal: S.lg,
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
  },
  cancelBtn: {
    position: "absolute",
    ...FAB_LEFT,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  sideArrow: {
    position: "absolute",
    top: "50%",
    marginTop: -22,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(15,15,30,0.45)",
  },
  arrowRight: Platform.OS === "web" ? { right: S.xs } : { left: S.xs },
  arrowLeft: Platform.OS === "web" ? { left: S.xs } : { right: S.xs },
  arrowIcon: {
    textShadowColor: "rgba(0,0,0,0.45)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});
