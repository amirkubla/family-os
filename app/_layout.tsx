import { useEffect, useState, useCallback } from "react";
import { I18nManager, Platform } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { PaperProvider, Snackbar } from "react-native-paper";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import {
  Rubik_400Regular,
  Rubik_500Medium,
  Rubik_700Bold,
  Rubik_800ExtraBold,
} from "@expo-google-fonts/rubik";
import { theme } from "@src/theme/theme";
import { pullAll } from "@src/lib/sync/syncEngine";
import { setSyncErrorHandler } from "@src/lib/sync/remoteCrud";
import { seedScheduleIfEmpty } from "@src/store/scheduleSeed";
import { t } from "@src/i18n";

// ── RTL bootstrap (runs once at module load, before any render) ──
if (!I18nManager.isRTL) {
  I18nManager.allowRTL(true);
  I18nManager.forceRTL(true);
}

if (Platform.OS === "web" && typeof document !== "undefined") {
  document.documentElement.dir = "rtl";
  document.documentElement.lang = "he";

  // Force RTL direction for flex layout. We only set `direction` here;
  // text-align is handled per-component via RN StyleSheet so that
  // Paper TextInput floating labels aren't broken.
  const style = document.createElement("style");
  style.textContent = "* { direction: rtl !important; }";
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

  // Best-effort initial pull on mount
  useEffect(() => {
    pullAll().catch((err) => {
      console.warn("[sync] Initial pull failed:", err.message);
    });
  }, []);

  // Seed schedule blocks on first run
  useEffect(() => {
    seedScheduleIfEmpty();
  }, []);

  // Hide splash once fonts are loaded
  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <PaperProvider theme={theme}>
      <Stack>
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
  );
}
