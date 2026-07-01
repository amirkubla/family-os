/**
 * Documents — a family document browser (folders + files).
 *
 * The folder tree + file metadata live in Postgres and sync like everything
 * else; file bytes live in GCS and are fetched on demand (viewing/upload land
 * in a later phase). This screen navigates the tree and manages folders
 * (create / rename / delete). Reached from the nav drawer + home launcher.
 */

import React, { useState, useMemo, useCallback } from "react";
import { View, StyleSheet, Pressable, Alert } from "react-native";
import ScreenScrollView from "@src/components/ScreenScrollView";
import { Text, IconButton, FAB, ActivityIndicator } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";

import { useFamilyStore } from "@src/store/useFamilyStore";
import type { Folder } from "@src/models/document";
import { deleteFolderRemote, deleteDocumentRemote } from "@src/lib/sync/remoteCrud";
import { pickFromCamera, pickFromLibrary, pickDocument, type PickedFile } from "@src/lib/documents/capture";
import { uploadDocument } from "@src/lib/documents/upload";
import { openDocument } from "@src/lib/documents/view";
import FolderModal from "@src/components/FolderModal";
import DocumentAddSheet from "@src/components/DocumentAddSheet";
import PageHeader from "@src/components/PageHeader";
import ConfirmDeleteModal from "@src/components/ConfirmDeleteModal";
import { useConfirmDelete } from "@src/hooks/useConfirmDelete";
import { t } from "@src/i18n";
import { C, R, S, SHADOW } from "@src/ui/tokens";
import { useThemeColor } from "@src/ui/useThemeColor";
import { RTL_ROW, TEXT_RIGHT } from "@src/ui/rtl";
import { FAB_LEFT } from "@src/ui/fabAnchor";

function fileIcon(contentType: string): keyof typeof Ionicons.glyphMap {
  if (contentType === "application/pdf") return "document-text-outline";
  if (contentType.startsWith("image/")) return "image-outline";
  return "document-outline";
}

function formatSize(bytes: number): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentsScreen() {
  const insets = useSafeAreaInsets();
  const theme = useThemeColor();
  const folders = useFamilyStore((s) => s.folders);
  const documents = useFamilyStore((s) => s.documents);
  const { confirmVisible, requestDelete, confirmDelete, dismissConfirm } = useConfirmDelete();

  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [folderModal, setFolderModal] = useState(false);
  const [editFolder, setEditFolder] = useState<Folder | null>(null);
  const [addSheet, setAddSheet] = useState(false);
  const [uploading, setUploading] = useState(false);
  // Message for the shared confirm dialog (folders and documents differ).
  const [deleteMsg, setDeleteMsg] = useState(t("documents.deleteFolderConfirm"));

  // Pick a file (camera / library / document) then run the 3-step upload.
  const handlePick = useCallback(
    async (picker: () => Promise<PickedFile | null>) => {
      try {
        const file = await picker();
        if (!file) return; // cancelled / permission denied
        setUploading(true);
        await uploadDocument(file, currentFolderId ?? undefined);
      } catch {
        Alert.alert(t("documents.uploadError"));
      } finally {
        setUploading(false);
      }
    },
    [currentFolderId],
  );

  const handleView = useCallback(async (id: string) => {
    try {
      await openDocument(id);
    } catch {
      Alert.alert(t("documents.viewError"));
    }
  }, []);

  // Return to root when leaving the screen — avoids landing inside a folder
  // that was deleted (e.g. by the other parent) on the next visit.
  useFocusEffect(useCallback(() => () => setCurrentFolderId(null), []));

  const subfolders = useMemo(
    () =>
      folders
        .filter((f) => (f.parentId ?? null) === currentFolderId)
        .sort((a, b) => a.name.localeCompare(b.name, "he")),
    [folders, currentFolderId],
  );
  const files = useMemo(
    () =>
      documents
        .filter((d) => (d.folderId ?? null) === currentFolderId)
        .sort((a, b) => a.name.localeCompare(b.name, "he")),
    [documents, currentFolderId],
  );

  // Breadcrumb path: root → … → current folder.
  const trail = useMemo(() => {
    const byId = new Map(folders.map((f) => [f.id, f]));
    const path: Folder[] = [];
    let cur = currentFolderId ? byId.get(currentFolderId) : undefined;
    while (cur) {
      path.unshift(cur);
      cur = cur.parentId ? byId.get(cur.parentId) : undefined;
    }
    return path;
  }, [folders, currentFolderId]);

  const isEmpty = subfolders.length === 0 && files.length === 0;

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <PageHeader title={t("documents.title")} />
      <ScreenScrollView style={styles.list} contentContainerStyle={styles.container}>
        {/* Breadcrumb */}
        <View style={styles.crumbs}>
          <Pressable onPress={() => setCurrentFolderId(null)} testID="crumb-root">
            <Text style={[styles.crumb, currentFolderId === null && styles.crumbActive]}>
              {t("documents.root")}
            </Text>
          </Pressable>
          {trail.map((f) => (
            <View key={f.id} style={styles.crumbSeg}>
              <Ionicons name="chevron-back" size={13} color={C.textMuted} />
              <Pressable onPress={() => setCurrentFolderId(f.id)}>
                <Text
                  style={[styles.crumb, f.id === currentFolderId && styles.crumbActive]}
                  numberOfLines={1}
                >
                  {f.name}
                </Text>
              </Pressable>
            </View>
          ))}
        </View>

        {isEmpty ? (
          <View style={styles.empty}>
            <Text style={{ fontSize: 34 }}>📁</Text>
            <Text style={styles.emptyText}>
              {currentFolderId ? t("documents.emptyFolder") : t("documents.empty")}
            </Text>
          </View>
        ) : (
          <>
            {subfolders.map((f) => (
              <View key={f.id} style={styles.row}>
                <Pressable
                  style={styles.rowMain}
                  onPress={() => setCurrentFolderId(f.id)}
                  testID={`folder-${f.name}`}
                  accessibilityRole="button"
                  accessibilityLabel={f.name}
                >
                  <View style={[styles.iconWrap, { backgroundColor: theme + "18" }]}>
                    <Ionicons name="folder" size={20} color={theme} />
                  </View>
                  <Text style={styles.rowName} numberOfLines={1}>
                    {f.name}
                  </Text>
                </Pressable>
                <IconButton
                  icon="pencil-outline"
                  size={18}
                  iconColor={C.textMuted}
                  onPress={() => {
                    setEditFolder(f);
                    setFolderModal(true);
                  }}
                  accessibilityLabel={t("documents.renameFolder")}
                />
                <IconButton
                  icon="trash-can-outline"
                  size={18}
                  iconColor={C.textMuted}
                  onPress={() => {
                    setDeleteMsg(t("documents.deleteFolderConfirm"));
                    requestDelete(() => deleteFolderRemote(f.id));
                  }}
                  testID={`folder-delete-${f.name}`}
                />
              </View>
            ))}

            {files.map((d) => {
              const isPending = d.status === "pending";
              return (
                <View key={d.id} style={styles.row}>
                  <Pressable
                    style={styles.rowMain}
                    disabled={isPending}
                    onPress={() => handleView(d.id)}
                    testID={`doc-${d.name}`}
                    accessibilityRole="button"
                    accessibilityLabel={d.name}
                  >
                    <View style={styles.iconWrap}>
                      {isPending ? (
                        <ActivityIndicator size={16} color={C.textSecondary} />
                      ) : (
                        <Ionicons name={fileIcon(d.contentType)} size={20} color={C.textSecondary} />
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rowName} numberOfLines={1}>
                        {d.name}
                      </Text>
                      <Text style={styles.rowMeta} numberOfLines={1}>
                        {isPending ? t("documents.pending") : formatSize(d.sizeBytes)}
                      </Text>
                    </View>
                  </Pressable>
                  {!isPending && (
                    <IconButton
                      icon="trash-can-outline"
                      size={18}
                      iconColor={C.textMuted}
                      onPress={() => {
                        setDeleteMsg(t("documents.deleteDocConfirm"));
                        requestDelete(() => deleteDocumentRemote(d.id));
                      }}
                      testID={`doc-delete-${d.name}`}
                    />
                  )}
                </View>
              );
            })}
          </>
        )}
      </ScreenScrollView>

      <FAB
        customSize={50}
        icon={uploading ? "progress-upload" : "plus"}
        loading={uploading}
        disabled={uploading}
        testID="btn-doc-add"
        style={[styles.fab, { bottom: insets.bottom + S.lg, backgroundColor: theme, borderRadius: 26 }]}
        color="#FFF"
        onPress={() => setAddSheet(true)}
        accessibilityRole="button"
        accessibilityLabel={t("documents.addDocument")}
      />

      <DocumentAddSheet
        visible={addSheet}
        onDismiss={() => setAddSheet(false)}
        onCamera={() => handlePick(pickFromCamera)}
        onLibrary={() => handlePick(pickFromLibrary)}
        onFile={() => handlePick(pickDocument)}
        onNewFolder={() => {
          setEditFolder(null);
          setFolderModal(true);
        }}
      />

      <FolderModal
        visible={folderModal}
        onDismiss={() => {
          setFolderModal(false);
          setEditFolder(null);
        }}
        editFolder={editFolder}
        parentId={currentFolderId ?? undefined}
      />
      <ConfirmDeleteModal
        visible={confirmVisible}
        onConfirm={confirmDelete}
        onDismiss={dismissConfirm}
        message={deleteMsg}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  list: { flex: 1 },
  container: { padding: S.lg, paddingBottom: S.xxl + S.xxl, gap: S.sm },
  crumbs: { flexDirection: RTL_ROW, alignItems: "center", flexWrap: "wrap", marginBottom: S.xs },
  crumbSeg: { flexDirection: RTL_ROW, alignItems: "center" },
  crumb: {
    fontSize: 13,
    color: C.textSecondary,
    writingDirection: "rtl",
    paddingHorizontal: 2,
  },
  crumbActive: { color: C.textPrimary, fontWeight: "800" },
  empty: { alignItems: "center", paddingVertical: S.xxl, gap: S.sm },
  emptyText: { color: C.textMuted, fontSize: 14, textAlign: "center", writingDirection: "rtl" },
  row: {
    flexDirection: RTL_ROW,
    alignItems: "center",
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: R.md,
    paddingVertical: S.sm,
    paddingHorizontal: S.md,
    ...SHADOW.sm,
  },
  rowMain: { flex: 1, flexDirection: RTL_ROW, alignItems: "center", gap: S.md },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: R.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  rowName: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: C.textPrimary,
    textAlign: TEXT_RIGHT,
    writingDirection: "rtl",
  },
  rowMeta: { fontSize: 12, color: C.textSecondary, textAlign: TEXT_RIGHT, writingDirection: "rtl", marginTop: 1 },
  fab: { position: "absolute", ...FAB_LEFT, bottom: S.lg },
});
