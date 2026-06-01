/**
 * AuthShell — shared layout for /auth/login and /auth/register.
 *
 * Owns the visual chrome both screens want to be consistent about:
 *   - SafeArea + keyboard avoidance
 *   - Subtle wordmark at the top (quiet brand presence)
 *   - Centered column with generous vertical rhythm
 *   - On web, caps the column at 420 px and centers horizontally so the
 *     form doesn't span a desktop browser
 *   - Title / optional subtitle slots with a fixed type hierarchy
 *   - Footer slot for the cross-page toggle link
 *
 * The shell is intentionally style-only — no form state, no submit logic.
 * Login/register pass their inputs as children and their toggle link in
 * `footer`. This keeps the auth flows' actual logic (validation, API
 * calls, error mapping) where it lives today.
 */

import React, { ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

import { C, R, S } from "@src/ui/tokens";
import { TEXT_RIGHT } from "@src/ui/rtl";

interface Props {
  title: string;
  /** Optional one-line context under the title. Keep it short — a single sentence. */
  subtitle?: string;
  /** The form fields + primary action button. */
  children: ReactNode;
  /** Cross-page toggle ("don't have an account? sign up"). Rendered at the bottom. */
  footer?: ReactNode;
}

export default function AuthShell({ title, subtitle, children, footer }: Props) {
  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        // iOS needs "padding" to lift the form above the keyboard; on Android
        // the system handles it via adjustResize so we leave it undefined.
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/*
         * ScrollView so the form is never clipped on small phones in
         * landscape or when the keyboard pushes content up. centerContent
         * keeps it vertically balanced when there's room.
         */}
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.column}>
            <Text style={styles.wordmark}>Family OS</Text>

            <Text accessibilityRole="header" style={styles.title}>
              {title}
            </Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}

            <View style={styles.formBlock}>{children}</View>

            {footer ? <View style={styles.footer}>{footer}</View> : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  flex: { flex: 1 },

  scrollContent: {
    flexGrow: 1,
    // Generous breathing room top/bottom. The form vertically centers via
    // justifyContent on the inner column so this padding just sets the
    // minimum gap from the edges.
    paddingVertical: S.xxl,
    paddingHorizontal: S.xl,
    alignItems: "center",
    justifyContent: "center",
  },

  /**
   * Centered column. On web we cap the width so the form doesn't span a
   * desktop browser (looks "minimal, confident" — Linear/Stripe-shaped
   * single column rather than a 1200-px wide form).
   */
  column: {
    width: "100%",
    maxWidth: Platform.OS === "web" ? 420 : undefined,
  },

  /** Quiet brand presence — small, muted, not a hero. */
  wordmark: {
    fontSize: 13,
    fontWeight: "600",
    color: C.textMuted,
    letterSpacing: 1,
    textAlign: "center",
    marginBottom: S.xxl,
  },

  /**
   * Big confident page title. Slightly tightened tracking is what makes
   * a sans-serif headline feel intentional vs. default-text-y.
   */
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: C.textPrimary,
    letterSpacing: -0.5,
    textAlign: "center",
    // Hebrew renders right-to-left within a centered block; keep the
    // writing direction explicit so mixed glyphs stay correct.
    writingDirection: "rtl",
  },

  subtitle: {
    fontSize: 15,
    fontWeight: "400",
    color: C.textSecondary,
    textAlign: "center",
    writingDirection: "rtl",
    marginTop: S.sm,
    // Tighter than line-height defaults — calmer.
    lineHeight: 22,
  },

  formBlock: {
    marginTop: S.xxl,
    // gap is what gives us consistent vertical rhythm between the form
    // fields without each TextInput needing its own marginBottom. Pages
    // just drop their inputs in sequence and let the gap do the work.
    gap: S.lg,
  },

  footer: {
    marginTop: S.xl,
    alignItems: "center",
  },
});

// ---------------------------------------------------------------------------
// FooterLink — the cross-page toggle.
//
// Exposed as a named export so login/register can render it without each
// rebuilding the same pattern. Pure presentation; tapping it is the
// caller's responsibility.
// ---------------------------------------------------------------------------

export function AuthFooterLink({
  prompt,
  action,
  onPress,
}: {
  /** The non-tappable lead-in ("Don't have an account?"). */
  prompt: string;
  /** The tappable verb ("Sign up"). Rendered in the accent color. */
  action: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="link"
      accessibilityLabel={`${prompt} ${action}`}
      // Hover/press feedback — subtle, no scale gymnastics.
      style={({ pressed, hovered }: any) => [
        footerLinkStyles.row,
        hovered && footerLinkStyles.hovered,
        pressed && footerLinkStyles.pressed,
      ]}
    >
      <Text style={footerLinkStyles.prompt}>
        {prompt}{" "}
        <Text style={footerLinkStyles.action}>{action}</Text>
      </Text>
    </Pressable>
  );
}

const footerLinkStyles = StyleSheet.create({
  row: {
    paddingVertical: S.sm,
    paddingHorizontal: S.md,
    borderRadius: R.sm,
  },
  hovered: {
    backgroundColor: C.hoverBg,
  },
  pressed: {
    opacity: 0.7,
  },
  prompt: {
    fontSize: 14,
    color: C.textSecondary,
    textAlign: TEXT_RIGHT,
    writingDirection: "rtl",
  },
  action: {
    color: C.purple,
    fontWeight: "700",
  },
});
