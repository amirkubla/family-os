/**
 * DocumentAddSheet — the "+" menu on the documents screen: scan/camera, pick
 * image, pick file, or new folder. A dim-backdrop bottom sheet (matches the
 * app's other sheets). Each action dismisses the sheet then runs its handler.
 */

import React from "react";
import { View, Text, Pressable, StyleSheet, Platform } from "react-native";
import { Portal } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { C, S, R } from "@src/ui/tokens";
import { RTL_ROW, TEXT_RIGHT } from "@src/ui/rtl";
import { useThemeColor } from "@src/ui/useThemeColor";
import { t } from "@src/i18n";

interface Props {
  visible: boolean;
  onDismiss: () => void;
  onCamera: () => void;
  onLibrary: () => void;
  onFile: () => void;
  onNewFolder: () => void;
}

export default function DocumentAddSheet({
  visible,
  onDismiss,
  onCamera,
  onLibrary,
  onFile,
  onNewFolder,
}: Props) {
  const insets = useSafeAreaInsets();
  const theme = useThemeColor();
  if (!visible) return null;

  const actions: { key: string; icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }[] = [
    { key: "camera", icon: "camera-outline", label: t("documents.scan"), onPress: onCamera },
    { key: "library", icon: "image-outline", label: t("documents.pickImage"), onPress: onLibrary },
    { key: "file", icon: "document-outline", label: t("documents.pickFile"), onPress: onFile },
    { key: "folder", icon: "folder-outline", label: t("documents.newFolder"), onPress: onNewFolder },
  ];

  return (
    <Portal>
      <Pressable
        style={[styles.backdrop, Platform.OS === "web" && ({ position: "fixed" } as any)]}
        onPress={onDismiss}
        accessibilityLabel={t("cancel")}
      />
      <View
        style={[styles.anchor, Platform.OS === "web" && ({ position: "fixed" } as any)]}
        pointerEvents="box-none"
      >
        <View style={[styles.sheet, { paddingBottom: insets.bottom + S.md }]}>
          <View style={styles.handle} />
          <Text style={styles.title}>{t("documents.addDocument")}</Text>
          {actions.map((a) => (
            <Pressable
              key={a.key}
              style={({ pressed }: any) => [styles.row, pressed && styles.rowPressed]}
              onPress={() => {
                onDismiss();
                a.onPress();
              }}
              testID={`doc-add-${a.key}`}
              accessibilityRole="button"
              accessibilityLabel={a.label}
            >
              <View style={[styles.iconWrap, { backgroundColor: theme + "18" }]}>
                <Ionicons name={a.icon} size={20} color={theme} />
              </View>
              <Text style={styles.label}>{a.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </Portal>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(15,15,30,0.35)", zIndex: 10000 },
  anchor: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10001,
    justifyContent: "flex-end",
    alignItems: "center",
  },
  sheet: {
    backgroundColor: C.surface,
    borderTopLeftRadius: R.xl,
    borderTopRightRadius: R.xl,
    width: "100%",
    maxWidth: 560,
    paddingHorizontal: S.lg,
    paddingTop: S.md,
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.border,
    marginBottom: S.md,
  },
  title: {
    fontSize: 16,
    fontWeight: "800",
    color: C.textPrimary,
    textAlign: TEXT_RIGHT,
    writingDirection: "rtl",
    marginBottom: S.sm,
  },
  row: {
    flexDirection: RTL_ROW,
    alignItems: "center",
    gap: S.md,
    paddingVertical: S.md,
  },
  rowPressed: { opacity: 0.6 },
  iconWrap: { width: 40, height: 40, borderRadius: R.md, alignItems: "center", justifyContent: "center" },
  label: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: C.textPrimary,
    textAlign: TEXT_RIGHT,
    writingDirection: "rtl",
  },
});
