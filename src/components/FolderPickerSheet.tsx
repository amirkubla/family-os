/**
 * FolderPickerSheet — pick a destination folder (or the root) when moving a
 * document or folder. Bottom sheet listing the root + the folder tree,
 * indented by depth. `excludeIds` hides folders that aren't valid targets
 * (when moving a folder: itself + its descendants, to prevent a cycle).
 * `currentId` marks the item's present location (not selectable).
 */

import React, { useMemo } from "react";
import { View, Text, Pressable, StyleSheet, Platform, ScrollView } from "react-native";
import { Portal } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { Folder } from "@src/models/document";
import { C, S, R } from "@src/ui/tokens";
import { RTL_ROW, TEXT_RIGHT } from "@src/ui/rtl";
import { useThemeColor } from "@src/ui/useThemeColor";
import { t } from "@src/i18n";

interface Props {
  visible: boolean;
  onDismiss: () => void;
  title: string;
  folders: Folder[];
  /** Folders to hide (a folder being moved + its descendants). */
  excludeIds?: Set<string>;
  /** The item's current parent/folder (null = root) — shown as "current". */
  currentId?: string | null;
  onPick: (folderId: string | null) => void;
}

export default function FolderPickerSheet({
  visible,
  onDismiss,
  title,
  folders,
  excludeIds,
  currentId,
  onPick,
}: Props) {
  const insets = useSafeAreaInsets();
  const theme = useThemeColor();

  // Depth-first tree order with an indentation depth per folder.
  const ordered = useMemo(() => {
    const exclude = excludeIds ?? new Set<string>();
    const out: { folder: Folder; depth: number }[] = [];
    const childrenOf = (pid: string | null) =>
      folders
        .filter((f) => (f.parentId ?? null) === pid && !exclude.has(f.id))
        .sort((a, b) => a.name.localeCompare(b.name, "he"));
    const walk = (pid: string | null, depth: number) => {
      for (const f of childrenOf(pid)) {
        out.push({ folder: f, depth });
        walk(f.id, depth + 1);
      }
    };
    walk(null, 0);
    return out;
  }, [folders, excludeIds]);

  if (!visible) return null;

  const Row = ({
    id,
    name,
    depth,
    icon,
  }: {
    id: string | null;
    name: string;
    depth: number;
    icon: keyof typeof Ionicons.glyphMap;
  }) => {
    const isCurrent = (currentId ?? null) === id;
    return (
      <Pressable
        style={({ pressed }: any) => [styles.row, pressed && !isCurrent && styles.rowPressed]}
        onPress={() => {
          if (isCurrent) return;
          onDismiss();
          onPick(id);
        }}
        disabled={isCurrent}
        testID={`move-to-${id ?? "root"}`}
        accessibilityRole="button"
        accessibilityLabel={name}
      >
        <View style={{ width: depth * 18 }} />
        <Ionicons name={icon} size={18} color={isCurrent ? C.textMuted : theme} />
        <Text style={[styles.label, isCurrent && styles.labelCurrent]} numberOfLines={1}>
          {name}
        </Text>
        {isCurrent ? <Text style={styles.currentTag}>{t("documents.currentLocation")}</Text> : null}
      </Pressable>
    );
  };

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
          <Text style={styles.title}>{title}</Text>
          <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">
            <Row id={null} name={t("documents.root")} depth={0} icon="home-outline" />
            {ordered.map(({ folder, depth }) => (
              <Row key={folder.id} id={folder.id} name={folder.name} depth={depth + 1} icon="folder-outline" />
            ))}
          </ScrollView>
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
  scroll: { maxHeight: 360 },
  row: { flexDirection: RTL_ROW, alignItems: "center", gap: S.sm, paddingVertical: S.md },
  rowPressed: { opacity: 0.6 },
  label: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: C.textPrimary,
    textAlign: TEXT_RIGHT,
    writingDirection: "rtl",
  },
  labelCurrent: { color: C.textMuted },
  currentTag: { fontSize: 11, color: C.textMuted, writingDirection: "rtl" },
});
