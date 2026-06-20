import React from "react";
import {
  View,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Portal } from "react-native-paper";
import { R, S, SHADOW } from "@src/ui/tokens";

/** When provided, ModalWrapper renders prev/next arrows flanking the card. */
export interface ModalCarousel {
  onPrev: () => void;
  onNext: () => void;
}

interface Props {
  visible: boolean;
  onDismiss: () => void;
  children: React.ReactNode;
  /** Optional carousel arrows shown to the left & right of the modal card. */
  carousel?: ModalCarousel;
}

export default function ModalWrapper({ visible, onDismiss, children, carousel }: Props) {
  if (!visible) return null;

  const card = (
    <View style={styles.container}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </View>
  );

  return (
    // Portal teleports the overlay to the app root (PaperProvider host), so a
    // modal opened from inside a ScrollView is positioned relative to the
    // screen — not the scrolled content — and stays put on native (iOS) instead
    // of jumping to the top of the page.
    <Portal>
    <View
      style={[
        styles.overlay,
        Platform.OS === "web" && ({ position: "fixed" } as any),
      ]}
    >
      <Pressable style={styles.backdrop} onPress={onDismiss} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.center}
        pointerEvents="box-none"
      >
        {carousel ? (
          <View style={styles.carouselRow} pointerEvents="box-none">
            {card}
            {/* Arrows overlaid at the screen edges so the card keeps full width.
                A translucent disc keeps the white chevron visible whether it sits
                over the dark backdrop (web) or the card edge (phone). */}
            <Pressable
              style={[styles.sideArrow, styles.arrowStart]}
              onPress={carousel.onPrev}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="הקודם"
              testID="carousel-prev"
            >
              <Ionicons name="chevron-forward" size={26} color="#FFFFFF" style={styles.arrowIcon} />
            </Pressable>
            <Pressable
              style={[styles.sideArrow, styles.arrowEnd]}
              onPress={carousel.onNext}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="הבא"
              testID="carousel-next"
            >
              <Ionicons name="chevron-back" size={26} color="#FFFFFF" style={styles.arrowIcon} />
            </Pressable>
          </View>
        ) : (
          card
        )}
      </KeyboardAvoidingView>
    </View>
    </Portal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    justifyContent: "center",
    alignItems: "center",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15,15,30,0.45)",
  },
  center: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: S.xxl,
    flex: 1,
    pointerEvents: "box-none",
  },
  // Carousel: the card keeps full width (same as a regular modal) and the
  // arrows are overlaid at the screen edges. flex:1 gives the row a definite
  // height so the card's maxHeight "85%" resolves and the inner ScrollView can
  // scroll instead of spilling off-screen.
  carouselRow: {
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    flex: 1,
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
  arrowStart: { right: S.xs },
  arrowEnd: { left: S.xs },
  // Soft dark halo so the white chevron stands out on any background.
  arrowIcon: {
    textShadowColor: "rgba(0,0,0,0.45)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  container: {
    backgroundColor: "#FFFFFF",
    width: "92%",
    maxWidth: 460,
    maxHeight: "85%",
    padding: S.lg + 4,
    borderRadius: R.xl,
    ...SHADOW.lg,
    shadowOpacity: 0.2,
    shadowRadius: 24,
  },
});
