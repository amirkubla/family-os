/**
 * auth/useAppleAuth.ts — Sign in with Apple via expo-apple-authentication.
 *
 * iOS-only (the native module is unavailable on web/Android). Returns
 * { available, signIn }. On success it hands the identity token (a JWT signed
 * by Apple) plus the full name to `onCredential`; the screen then calls
 * loginWithApple({ identityToken, fullName }).
 *
 * Apple returns the user's name ONLY on the first authorization, so we forward
 * it whenever present. The backend (`/v1/auth/apple`) verifies the token's
 * audience (our iOS bundle ID) against Apple's public keys.
 */

import { useEffect, useState } from "react";
import { Platform } from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";

export function useAppleAuth(
  onCredential: (identityToken: string, fullName?: string) => void,
) {
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    if (Platform.OS !== "ios") return;
    AppleAuthentication.isAvailableAsync()
      .then(setAvailable)
      .catch(() => setAvailable(false));
  }, []);

  const signIn = async () => {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!credential.identityToken) return;
      const fn = credential.fullName;
      const fullName =
        [fn?.givenName, fn?.familyName].filter(Boolean).join(" ").trim() ||
        undefined;
      onCredential(credential.identityToken, fullName);
    } catch (e: unknown) {
      // User dismissed the Apple sheet — not an error worth surfacing.
      if ((e as { code?: string })?.code === "ERR_REQUEST_CANCELED") return;
      throw e;
    }
  };

  return { available, signIn };
}
