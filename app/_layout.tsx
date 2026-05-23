import { useEffect, useState, useCallback } from "react";
import { I18nManager, Platform } from "react-native";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { PaperProvider, Snackbar } from "react-native-paper";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import * as Updates from "expo-updates";
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
import OnboardingWizard from "@src/components/OnboardingWizard";

// ── RTL bootstrap (runs once at module load, before any render) ──
//
// On native (Android/iOS), `I18nManager.forceRTL(true)` persists the RTL flag
// but does NOT flip `I18nManager.isRTL` until the next app launch. That means
// on the first run after install, the JS still sees `isRTL === false`, and any
// style that relies on the engine's auto-mirror (or default text alignment)
// renders LTR — a user-visible bug on Android (the calendar/grocery/event
// modal labels, the chip rows, etc.).
//
// Fix: after calling forceRTL, immediately trigger a JS bundle reload via
// expo-updates. The reload re-reads I18nManager.isRTL, which now returns true,
// and every component renders with proper RTL on this same install. Production
// only — in dev (`__DEV__`), Updates.reloadAsync may error or fight with
// Metro's HMR, so we skip and rely on the developer to manually reload.
if (Platform.OS !== "web" && !I18nManager.isRTL) {
  I18nManager.allowRTL(true);
  I18nManager.forceRTL(true);
  if (!__DEV__) {
    // Defer to next tick so any error from reloadAsync doesn't crash the
    // initial render. Swallow errors silently — if it fails, the user just
    // sees LTR until their next manual app launch (current behavior).
    Updates.reloadAsync().catch(() => {});
  }
}

if (Platform.OS === "web" && typeof document !== "undefined") {
  document.documentElement.lang = "he";
  document.documentElement.dir = "rtl";

  // Fix React Native Paper outlined TextInput label positioning for RTL.
  // Paper hardcodes `left: 0` on the animated label; override to `right: 0`.
  const style = document.createElement("style");
  style.textContent = `
    [dir="rtl"] [data-testid="text-input-outlined-label-active"],
    [dir="rtl"] [data-testid="text-input-outlined-label-inactive"] {
      left: auto !important;
      right: 0 !important;
      text-align: right !important;
    }
  `;
  document.head.appendChild(style);
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
        // Auto-complete onboarding for joining users (second parent via invite)
        // Only auto-complete if user didn't create this family (they have no claimed member yet)
        const s = useFamilyStore.getState();
        const userId = useAuthStore.getState().session?.user.id;
        const hasClaimed = s.familyMembers.some((m) => m.userId === userId);
        if (!s.onboardingComplete && hasClaimed) {
          s.setOnboardingComplete(true);
        }
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

  const onboardingComplete = useFamilyStore((s) => s.onboardingComplete);

  // Hide splash once fonts are loaded, store hydrated, and auth resolved
  const ready = fontsLoaded && hydrated && authStatus !== "booting";
  useEffect(() => {
    if (ready) {
      SplashScreen.hideAsync();
    }
  }, [ready]);

  if (!ready) return null;

  const showOnboarding = authStatus === "loggedIn" && !onboardingComplete;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {/* SafeAreaProvider is required for useSafeAreaInsets() to return real
          values. Without it, insets are always 0 and on Android with
          edgeToEdgeEnabled the bottom tab bar gets overlapped by the system
          navigation buttons (3-button mode on Xiaomi/Redmi etc.) or the
          gesture handle. */}
      <SafeAreaProvider>
        <PaperProvider theme={theme}>
          <AuthGate />
          <Stack>
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="index" options={{ headerShown: false }} />
          </Stack>
          {showOnboarding && <OnboardingWizard />}
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
      </SafeAreaProvider>
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
