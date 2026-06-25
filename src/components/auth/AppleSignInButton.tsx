/**
 * AppleSignInButton — Apple's official "Sign in with Apple" button.
 *
 * iOS-only and App Store-compliant (uses Apple's native button component,
 * which renders the correct branding + localized label). Renders nothing on
 * web/Android or when Apple auth isn't available.
 */

import React from "react";
import { StyleSheet, Platform } from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";

import { R, S } from "@src/ui/tokens";

interface Props {
  onPress: () => void;
  available: boolean;
}

export default function AppleSignInButton({ onPress, available }: Props) {
  if (Platform.OS !== "ios" || !available) return null;
  return (
    <AppleAuthentication.AppleAuthenticationButton
      buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
      buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
      cornerRadius={R.md}
      style={styles.btn}
      onPress={onPress}
    />
  );
}

const styles = StyleSheet.create({
  btn: { height: 48, marginTop: S.sm },
});
