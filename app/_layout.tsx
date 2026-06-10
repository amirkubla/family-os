import { useEffect, useState, useCallback } from "react";
import { I18nManager, Platform, DevSettings } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
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
import { MaterialCommunityIcons } from "@expo/vector-icons";
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
// and every component renders with proper RTL on this same install.
//
// We do this in BOTH prod and dev (incl. Expo Go) because the only way to
// flip the running JS context's `isRTL` is a reload. Older code skipped the
// reload in `__DEV__` to "avoid fighting Metro HMR" — but that just left
// devs in LTR forever in Expo Go, which is what tripped iOS testing.
//
// The infinite-loop concern: if forceRTL ever FAILS to persist (Expo Go iOS
// has been observed to do this), the next module init still sees
// isRTL=false, re-enters this block, reloads again, etc. Guard against it
// by tracking "we've already tried this install" in AsyncStorage and
// bailing out if so.
const RTL_RELOAD_KEY = "family-os:rtl-reload-attempted-v2"; // v2: uses DevSettings.reload() in dev
if (Platform.OS !== "web" && !I18nManager.isRTL) {
  I18nManager.allowRTL(true);
  I18nManager.forceRTL(true);
  // Async IIFE so the synchronous module load isn't blocked by storage.
  // If forceRTL persists, the next module init takes the early-return at
  // the `!I18nManager.isRTL` check above — the flag is harmlessly left
  // set. If forceRTL didn't persist, the flag prevents a reload loop;
  // user sees LTR and we know dev-only iOS is the limit.
  (async () => {
    try {
      const already = await AsyncStorage.getItem(RTL_RELOAD_KEY);
      if (already) return;
      await AsyncStorage.setItem(RTL_RELOAD_KEY, "1");
    } catch {
      // AsyncStorage hiccup — still safe to attempt the reload once,
      // since forceRTL persistence (when it works) makes this naturally
      // single-shot.
    }
    // In Expo Go, expo-updates is disabled and reloadAsync() throws
    // ERR_UPDATES_DISABLED (silently caught). Use DevSettings.reload()
    // instead — that's the Metro bridge restart, always available in dev.
    // In production builds, Updates.reloadAsync() is the right call.
    if (__DEV__) {
      DevSettings.reload();
    } else {
      Updates.reloadAsync().catch(() => {});
    }
  })();
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
    // MaterialCommunityIcons.font is the glyph map react-native-paper's
    // <IconButton> + every other `icon="…"` Paper prop renders from. In
    // Expo Go this loads automatically; in a prebuilt dev client / iOS
    // simulator the .ttf is NOT bundled by default, so we have to ask
    // expo-font to register it explicitly here. Without this, every icon
    // in the app renders as a missing-glyph "?" box on iOS.
    ...MaterialCommunityIcons.font,
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

  // Tracks which session's pull has completed. Used to gate OnboardingWizard
  // so it doesn't flash for ~500ms during the pull/auto-complete window for
  // returning users (logout() resets onboardingComplete to false; the
  // .then() below flips it back to true once we confirm a claimed member).
  const [pulledForSession, setPulledForSession] = useState<number | null>(null);

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
        setPulledForSession(sessionIssuedAt);
      })
      .catch((err) => {
        console.warn("[sync] Initial pull failed:", err.message);
        // Fall back to current behavior: if the pull failed we can't tell
        // whether onboarding is needed, so honor the persisted store flag.
        // For a truly new user on a flaky network this means the wizard
        // still shows; for a returning user with cleared local state it
        // also shows (same as before this gate existed).
        setPulledForSession(sessionIssuedAt);
      });
  }, [hydrated, authStatus, authFamilyId, sessionIssuedAt]);

  // Register push token once auth is complete (native only)
  useEffect(() => {
    if (authStatus !== "loggedIn" || !authFamilyId) return;
    registerForPushNotifications(authFamilyId).catch((err) => {
      console.warn("[push] Token registration failed:", err.message);
    });
  }, [authStatus, authFamilyId]);

  // Deep-link from a tapped push notification to the relevant event.
  // The reminder push carries `data.eventId`; without this listener, tapping
  // the notification just opens the app to the last screen (QA Pass 2 BUG-N4).
  // Native-only — expo-notifications is no-op on web.
  const router = useRouter();
  useEffect(() => {
    if (Platform.OS === "web") return;
    let sub: { remove: () => void } | undefined;
    let cancelled = false;
    (async () => {
      try {
        const N = await import("expo-notifications");
        if (cancelled) return;
        // Handle taps that arrive while the app is running
        sub = N.addNotificationResponseReceivedListener((response) => {
          const data = response.notification.request.content.data as
            | { eventId?: string }
            | undefined;
          if (data?.eventId) {
            router.push(`/(tabs)/calendar?focus=${encodeURIComponent(data.eventId)}`);
          }
        });
        // Handle a tap that LAUNCHED the app from a cold start
        const last = await N.getLastNotificationResponseAsync();
        const lastData = last?.notification.request.content.data as
          | { eventId?: string }
          | undefined;
        if (lastData?.eventId) {
          router.push(`/(tabs)/calendar?focus=${encodeURIComponent(lastData.eventId)}`);
        }
      } catch (err) {
        console.warn("[push] Failed to install notification tap listener", err);
      }
    })();
    return () => {
      cancelled = true;
      sub?.remove();
    };
  }, [router]);

  const onboardingComplete = useFamilyStore((s) => s.onboardingComplete);

  // Hide splash once fonts are loaded, store hydrated, and auth resolved
  const ready = fontsLoaded && hydrated && authStatus !== "booting";
  useEffect(() => {
    if (ready) {
      SplashScreen.hideAsync();
    }
  }, [ready]);

  if (!ready) return null;

  // Only show the wizard once we've actually confirmed the user's
  // onboarding state from the server. The .then() above flips
  // onboardingComplete=true for returning users with a claimed member;
  // without this gate, the wizard renders for the duration of the pull
  // (~500ms) and then disappears — a visible flash on every login.
  const showOnboarding =
    authStatus === "loggedIn" &&
    !onboardingComplete &&
    pulledForSession === sessionIssuedAt;

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
