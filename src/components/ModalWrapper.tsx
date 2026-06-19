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
import { C, R, S, SHADOW } from "@src/ui/tokens";

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
    <View style={[styles.container, carousel && styles.containerCarousel]}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </View>
  );

  return (
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
            {/* physical-left arrow */}
            <Pressable
              style={styles.sideArrow}
              onPress={carousel.onPrev}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="הקודם"
              testID="carousel-prev"
            >
              <Ionicons name="chevron-back" size={26} color={C.purple} />
            </Pressable>
            {card}
            {/* physical-right arrow */}
            <Pressable
              style={styles.sideArrow}
              onPress={carousel.onNext}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="הבא"
              testID="carousel-next"
            >
              <Ionicons name="chevron-forward" size={26} color={C.purple} />
            </Pressable>
          </View>
        ) : (
          card
        )}
      </KeyboardAvoidingView>
    </View>
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
  // Carousel: [arrow] [card] [arrow], centered as a group.
  carouselRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    paddingHorizontal: S.xs,
    gap: S.xs,
  },
  sideArrow: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center",
    justifyContent: "center",
    ...SHADOW.md,
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
  // In carousel mode the card shrinks so the arrows sit beside it.
  containerCarousel: {
    width: undefined,
    flexShrink: 1,
    flexGrow: 1,
    maxWidth: 420,
  },
});
