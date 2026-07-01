import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
  Easing,
  ActivityIndicator,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Portal } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { C, S } from "@src/ui/tokens";
import { FAB_LEFT, FAB_RIGHT } from "@src/ui/fabAnchor";
import { RTL_ROW } from "@src/ui/rtl";
import { useThemeColor } from "@src/ui/useThemeColor";
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
  /** Docked-header title (the modal's "context", e.g. "הוספת אירוע"). */
  title?: string;
  /** Header logo — an Ionicons glyph shown beside the title. */
  icon?: keyof typeof Ionicons.glyphMap;
  /** Optional caption under the title. */
  subtitle?: string;
  /** Primary action. When set, a Save button is docked at the header's right. */
  onSave?: () => void;
  saveDisabled?: boolean;
  saveLoading?: boolean;
  /** Save-button label (default: "שמור"). */
  saveLabel?: string;
  /** Optional carousel arrows shown at the screen edges (kid "add" modals). */
  carousel?: ModalCarousel;
}

/**
 * ModalWrapper — full-screen sheet that wipes up from the bottom, with a docked
 * header: cancel (✕) at the top-left, the modal's logo + title centred, and an
 * optional Save at the top-right. Content scrolls on a grey area below (so the
 * white section cards pop), capped + centred on wide screens.
 */
export default function ModalWrapper({
  visible,
  onDismiss,
  children,
  title,
  icon,
  subtitle,
  onSave,
  saveDisabled,
  saveLoading,
  saveLabel,
  carousel,
}: Props) {
  const theme = useThemeColor();
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const anim = useRef(new Animated.Value(1)).current; // 1 = closed (off bottom), 0 = open
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
  const btnTop = insets.top + S.sm;

  return (
    <Portal>
      <Animated.View
        style={[
          styles.fullscreen,
          Platform.OS === "web" && ({ position: "fixed" } as any),
          { transform: [{ translateY }] },
        ]}
      >
        {/* ── Docked header ── */}
        <View style={[styles.header, { paddingTop: insets.top + S.sm }]}>
          <View style={styles.headerCenter}>
            {title ? (
              <View style={styles.titleRow}>
                {icon ? <Ionicons name={icon} size={20} color={theme} /> : null}
                <Text style={[styles.title, { color: theme }]} numberOfLines={1}>{title}</Text>
              </View>
            ) : null}
            {subtitle ? <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
          </View>

          <Pressable
            style={[styles.cancelBtn, { top: btnTop }]}
            onPress={onDismiss}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t("cancel")}
            testID="modal-cancel"
          >
            <Ionicons name="close" size={24} color={C.textPrimary} />
          </Pressable>

          {onSave ? (
            /* Icon-only ✓ — a themed circle mirroring the ✕ so a long title can
               never overlap it (both buttons fit inside the header clearance).
               The action's text still rides on accessibilityLabel. */
            <Pressable
              onPress={onSave}
              disabled={saveDisabled || saveLoading}
              style={[styles.saveBtn, { top: btnTop, backgroundColor: theme }, (saveDisabled || saveLoading) && styles.saveBtnDisabled]}
              accessibilityRole="button"
              accessibilityLabel={saveLabel ?? t("save")}
              testID="btn-save"
            >
              {saveLoading ? (
                <ActivityIndicator size={18} color="#FFFFFF" />
              ) : (
                <Ionicons name="checkmark" size={24} color="#FFFFFF" />
              )}
            </Pressable>
          ) : null}
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.flex}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + S.xl }]}
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
    backgroundColor: C.bg,
  },
  header: {
    backgroundColor: C.surface,
    paddingBottom: S.md,
    paddingHorizontal: 64, // clearance so a long title never sits under the buttons
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
    ...(Platform.OS === "web" ? ({ zIndex: 2 } as any) : {}),
  },
  headerCenter: { alignItems: "center", justifyContent: "center", minHeight: 40 },
  titleRow: { flexDirection: RTL_ROW, alignItems: "center", gap: 6 },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: C.primary,
    writingDirection: "rtl",
  },
  subtitle: {
    fontSize: 13,
    color: C.textSecondary,
    writingDirection: "rtl",
    marginTop: 2,
  },
  cancelBtn: {
    position: "absolute",
    ...FAB_LEFT,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.surfaceSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtn: {
    position: "absolute",
    ...FAB_RIGHT,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.primary,
  },
  saveBtnDisabled: { opacity: 0.45 },
  flex: { flex: 1 },
  content: {
    paddingHorizontal: S.lg,
    paddingTop: S.lg,
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
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
