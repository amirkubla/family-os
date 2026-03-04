import { useEffect, useState, useCallback } from "react";
import { I18nManager, Platform } from "react-native";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { PaperProvider, Snackbar } from "react-native-paper";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import {
  Rubik_400Regular,
  Rubik_500Medium,
  Rubik_700Bold,
  Rubik_800ExtraBold,
} from "@expo-google-fonts/rubik";
import { theme } from "@src/theme/theme";
import { useFamilyStore } from "@src/store/useFamilyStore";
import { useAuthStore } from "@src/auth/useAuthStore";
import { pullAll } from "@src/lib/sync/syncEngine";
import { setSyncErrorHandler } from "@src/lib/sync/remoteCrud";
import { registerForPushNotifications } from "@src/lib/notifications/registerPushToken";
import { t } from "@src/i18n";

// ── RTL bootstrap (runs once at module load, before any render) ──
if (!I18nManager.isRTL) {
  I18nManager.allowRTL(true);
  I18nManager.forceRTL(true);
}

if (Platform.OS === "web" && typeof document !== "undefined") {
  document.documentElement.lang = "he";
  document.documentElement.dir = "rtl";
}

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Rubik: Rubik_400Regular,
    "Rubik-Medium": Rubik_500Medium,
    "Rubik-Bold": Rubik_700Bold,
    "Rubik-ExtraBold": Rubik_800ExtraBold,
  });

  // Wait for Zustand to rehydrate from AsyncStorage/localStorage before rendering.
  const [hydrated, setHydrated] = useState(
    useFamilyStore.persist.hasHydrated(),
  );
  useEffect(() => {
    if (hydrated) return;
    return useFamilyStore.persist.onFinishHydration(() => setHydrated(true));
  }, [hydrated]);

  // Bootstrap auth — load session from SecureStore
  const authStatus = useAuthStore((s) => s.status);
  const bootstrap = useAuthStore((s) => s.bootstrap);
  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  const [snackMsg, setSnackMsg] = useState("");
  const [snackVisible, setSnackVisible] = useState(false);

  const showSnack = useCallback((msg: string) => {
    setSnackMsg(msg);
    setSnackVisible(true);
  }, []);

  // Register global sync error handler for fire-and-forget CRUD
  useEffect(() => {
    setSyncErrorHandler(showSnack);
  }, [showSnack]);

  // Pull from backend once hydration + auth are complete.
  // Re-runs on every fresh login (sessionIssuedAt changes each time).
  // Logout clears family data via useAuthStore.logout().
  const authFamilyId = useAuthStore((s) => s.session?.user.familyId ?? null);
  const sessionIssuedAt = useAuthStore((s) => s.session?.issuedAt ?? 0);
  useEffect(() => {
    if (!hydrated || authStatus !== "loggedIn" || !authFamilyId) return;

    console.log("[sync] Pulling data for family:", authFamilyId);
    pullAll(authFamilyId)
      .then(() => {
        console.log("[sync] Pull succeeded");
      })
      .catch((err) => {
        console.warn("[sync] Initial pull failed:", err.message);
      });
  }, [hydrated, authStatus, authFamilyId, sessionIssuedAt]);

  // Register push token once auth is complete (native only)
  useEffect(() => {
    if (authStatus !== "loggedIn" || !authFamilyId) return;
    registerForPushNotifications(authFamilyId).catch((err) => {
      console.warn("[push] Token registration failed:", err.message);
    });
  }, [authStatus, authFamilyId]);

  // Hide splash once fonts are loaded, store hydrated, and auth resolved
  const ready = fontsLoaded && hydrated && authStatus !== "booting";
  useEffect(() => {
    if (ready) {
      SplashScreen.hideAsync();
    }
  }, [ready]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PaperProvider theme={theme}>
        <AuthGate />
        <Stack>
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="kid/[kidId]" options={{ headerShown: true }} />
        </Stack>
        <StatusBar style="dark" />
        <Snackbar
          visible={snackVisible}
          onDismiss={() => setSnackVisible(false)}
          duration={3000}
          action={{ label: t("ok"), onPress: () => setSnackVisible(false) }}
        >
          {snackMsg}
        </Snackbar>
      </PaperProvider>
    </GestureHandlerRootView>
  );
}

// ---------------------------------------------------------------------------
// AuthGate — redirects based on auth status (renders nothing)
// ---------------------------------------------------------------------------

function AuthGate() {
  const status = useAuthStore((s) => s.status);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (status === "booting") return;

    const inAuth = segments[0] === "(auth)";

    if (status === "loggedOut" && !inAuth) {
      router.replace("/(auth)/login");
    } else if (status === "loggedIn" && inAuth) {
      router.replace("/(tabs)/today");
    }
  }, [status, segments, router]);

  return null;
}
