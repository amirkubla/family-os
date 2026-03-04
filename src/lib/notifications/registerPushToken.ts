/**
 * registerPushToken.ts — Request permission, get Expo push token,
 * register it with the backend for push notification delivery.
 */

import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { http } from "../api/http";

// Configure how notifications appear when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

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

  // 1. Check / request permission
  const { status: existingStatus } =
    await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
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

  const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
  const token = tokenData.data;
  console.log("[push] Expo push token:", token);

  // 3. Set up Android notification channel
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("reminders", {
      name: "תזכורות אירועים",
      importance: Notifications.AndroidImportance.HIGH,
      sound: "default",
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  // 4. Register the token with the backend
  await http.post(`/v1/family/${familyId}/push-tokens`, { token });
  console.log("[push] Token registered with backend");

  return token;
}
