/**
 * auth/googleConfig.ts — Google OAuth client IDs.
 *
 * These are NOT secret (they're embedded in the app/bundle, like the
 * EXPO_PUBLIC_* vars). The backend verifies the ID token's audience against
 * the same set via the GOOGLE_CLIENT_IDS env var.
 */

export const GOOGLE_CLIENT_IDS = {
  web: "644824480156-euqa7p83vqpohsce7d2ns37ggahrl417.apps.googleusercontent.com",
  ios: "644824480156-tqikrmi5n397qjmnq3g6ji412fbj9akl.apps.googleusercontent.com",
  android: "644824480156-stsi0hu5puk69ga3ieie41bjjk106rkm.apps.googleusercontent.com",
} as const;
