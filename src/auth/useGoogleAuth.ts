/**
 * auth/useGoogleAuth.ts — Google sign-in via expo-auth-session.
 *
 * Returns { promptAsync, ready }. On a successful Google flow it extracts the
 * ID token and hands it to `onIdToken` — the screen then calls
 * loginWithGoogle({ idToken }).
 *
 * Uses `useIdTokenAuthRequest` (NOT `useAuthRequest`): on web this requests
 * `response_type=id_token` so Google returns the ID token directly in
 * `response.params.id_token` (no code exchange, auto-nonce). On native it
 * falls back to the auth-code flow, which yields the ID token via
 * `response.authentication.idToken`. The backend (`/v1/auth/google`) verifies
 * that ID token's audience against the same client IDs.
 *
 * The OAuth redirect URI is the app's own origin (e.g. http://localhost:8083
 * on web dev, the Cloud Run URL in prod). Each origin must be registered as an
 * "Authorized redirect URI" on the **Web** OAuth client in Google Cloud.
 */

import { useEffect } from "react";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";

import { GOOGLE_CLIENT_IDS } from "./googleConfig";

// Required so the auth popup/redirect can complete and dismiss itself (web).
WebBrowser.maybeCompleteAuthSession();

export function useGoogleAuth(onIdToken: (idToken: string) => void) {
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    webClientId: GOOGLE_CLIENT_IDS.web,
    iosClientId: GOOGLE_CLIENT_IDS.ios,
    androidClientId: GOOGLE_CLIENT_IDS.android,
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
