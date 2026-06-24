/**
 * auth/useGoogleAuth.ts — Google sign-in via expo-auth-session.
 *
 * Returns { promptAsync, ready }. On a successful Google flow it extracts the
 * ID token and hands it to `onIdToken` — the screen then calls
 * loginWithGoogle({ idToken }). Works on web + iOS + Android with the client
 * IDs from googleConfig.
 */

import { useEffect } from "react";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";

import { GOOGLE_CLIENT_IDS } from "./googleConfig";

// Required so the auth popup/redirect can complete and dismiss itself (web).
WebBrowser.maybeCompleteAuthSession();

export function useGoogleAuth(onIdToken: (idToken: string) => void) {
  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: GOOGLE_CLIENT_IDS.web,
    iosClientId: GOOGLE_CLIENT_IDS.ios,
    androidClientId: GOOGLE_CLIENT_IDS.android,
    // We only need identity — request the standard OIDC scopes.
    scopes: ["openid", "profile", "email"],
  });

  useEffect(() => {
    if (response?.type === "success") {
      const idToken =
        (response.params as { id_token?: string } | undefined)?.id_token ??
        response.authentication?.idToken ??
        null;
      if (idToken) onIdToken(idToken);
    }
  }, [response]); // eslint-disable-line react-hooks/exhaustive-deps

  return { promptAsync, ready: !!request };
}
