/**
 * registerPushToken.ts — Request permission, get Expo push token,
 * register it with the backend for push notification delivery.
 */

import { Platform } from "react-native";
import Constants from "expo-constants";
import { http } from "../api/http";

// Lazy-load expo-notifications to avoid crash in Expo Go on Android (SDK 53+)
let Notifications: typeof import("expo-notifications") | null = null;

async function getNotifications() {
  if (!Notifications) {
    Notifications = await import("expo-notifications");
  }
  return Notifications;
}

// Configure how notifications appear when the app is in the foreground.
// Deferred to avoid top-level crash in Expo Go on Android.
let handlerConfigured = false;
async function ensureNotificationHandler() {
  if (handlerConfigured || Platform.OS === "web") return;
  try {
    const N = await getNotifications();
    N.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
    handlerConfigured = true;
  } catch {
    console.warn("[push] Failed to configure notification handler");
  }
}

/**
 * Request notification permissions, retrieve the Expo push token,
 * and register it with the backend.
 *
 * Returns the token string or null if permission was denied.
 */
export async function registerForPushNotifications(
  familyId: string,
): Promise<string | null> {
  // Web doesn't support Expo push tokens
  if (Platform.OS === "web") return null;

  const N = await getNotifications();
  if (!N) return null;

  await ensureNotificationHandler();

  // 1. Check / request permission
  const { status: existingStatus } = await N.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await N.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.warn("[push] Notification permission not granted");
    return null;
  }

  // 2. Get the Expo push token
  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    process.env.EXPO_PUBLIC_PROJECT_ID;

  if (!projectId) {
    console.warn("[push] No EAS projectId found — run `npx eas init` to link your project");
    return null;
  }

  const tokenData = await N.getExpoPushTokenAsync({ projectId });
  const token = tokenData.data;
  console.log("[push] Expo push token:", token);

  // 3. Set up Android notification channel
  if (Platform.OS === "android") {
    await N.setNotificationChannelAsync("reminders", {
      name: "תזכורות אירועים",
      importance: N.AndroidImportance.HIGH,
      sound: "default",
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  // 4. Register the token with the backend
  await http.post(`/v1/family/${familyId}/push-tokens`, { token });
  console.log("[push] Token registered with backend");

  return token;
}
