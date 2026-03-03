import { MD3LightTheme, configureFonts } from "react-native-paper";

export const theme = {
  ...MD3LightTheme,
  roundness: 16,
  fonts: configureFonts({ config: { fontFamily: "Rubik" } }),
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
