/**
 * baseUrl.ts — Resolves the API base URL with platform-aware localhost handling.
 *
 * On the Android emulator, `localhost` resolves to the emulator itself, NOT the
 * host machine. To reach the host's localhost, Android emulator exposes it at
 * the magic alias `10.0.2.2`. Web and iOS simulators don't have this problem.
 *
 * See: https://developer.android.com/studio/run/emulator-networking
 */

import { Platform } from "react-native";

export function getApiBaseUrl(): string {
  const raw = process.env.EXPO_PUBLIC_API_URL ?? "";
  if (Platform.OS !== "android") return raw;
  return raw.replace(/^(https?:\/\/)(localhost|127\.0\.0\.1)(?=[:/]|$)/, "$110.0.2.2");
}
