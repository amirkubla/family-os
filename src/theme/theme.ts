import { MD3LightTheme, configureFonts } from "react-native-paper";
import { Platform } from "react-native";

export const theme = {
  ...MD3LightTheme,
  roundness: 16,
  // Use Rubik on web + Android. Skip it on iOS: when iOS renders text
  // with an explicit fontFamily, CoreText does NOT fall back to Apple
  // Color Emoji for emoji codepoints, so every emoji in a Text element
  // (member avatars 👨, kid icons 👶, calendar event chip glyphs) rendered
  // as a missing-glyph "?". iOS system font (SF Pro / SF Hebrew) renders
  // Hebrew beautifully and falls back to Apple Color Emoji on the fly,
  // so omitting fontFamily on iOS fixes emoji app-wide.
  // Why this didn't bite in Expo Go: Expo Go's binary doesn't ship the
  // Rubik .ttf, so the "Rubik" string silently no-op'd and iOS used the
  // system font anyway (with the fallback that gave us working emoji).
  // Our prebuilt dev client loads Rubik for real via expo-font, which
  // is what surfaced the regression.
  fonts: configureFonts({
    config: { fontFamily: Platform.OS === "ios" ? undefined : "Rubik" },
  }),
  colors: {
    ...MD3LightTheme.colors,
    primary: "#6C63FF", // friendly purple
    primaryContainer: "#E8E6FF",
    secondary: "#FF6B6B", // warm coral
    secondaryContainer: "#FFE0E0",
    tertiary: "#4ECDC4", // teal accent
    tertiaryContainer: "#D4F5F2",
    surface: "#FFFFFF",
    surfaceVariant: "#F5F3FF",
    background: "#FAFAFE",
    error: "#FF6B6B",
    onPrimary: "#FFFFFF",
    onSecondary: "#FFFFFF",
    onBackground: "#1A1A2E",
    onSurface: "#1A1A2E",
    outline: "#E0DFF5",
    elevation: {
      ...MD3LightTheme.colors.elevation,
      level1: "#FFFFFF",
      level2: "#F8F7FF",
    },
  },
};

export type AppTheme = typeof theme;
