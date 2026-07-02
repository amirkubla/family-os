/**
 * Documents — a family document browser (folders + files).
 *
 * The folder tree + file metadata live in Postgres and sync like everything
 * else; file bytes live in GCS and are fetched on demand (viewing/upload land
 * in a later phase). This screen navigates the tree and manages folders
 * (create / rename / delete). Reached from the nav drawer + home launcher.
 */

import React, { useState, useMemo, useCallback } from "react";
import { View, StyleSheet, Pressable, Alert, Platform } from "react-native";
import ScreenScrollView from "@src/components/ScreenScrollView";
import { Text, IconButton, FAB } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";

import { useFamilyStore } from "@src/store/useFamilyStore";
import type { Folder, FamilyDocument } from "@src/models/document";
import {
  deleteFolderRemote,
  deleteDocumentRemote,
  updateFolderRemote,
  updateDocumentRemote,
} from "@src/lib/sync/remoteCrud";
import {
  pickFromCamera,
  pickFromLibrary,
  pickDocument,
  scanDocuments,
  type PickedFile,
} from "@src/lib/documents/capture";
import { uploadDocument } from "@src/lib/documents/upload";
import { openDocument } from "@src/lib/documents/view";
import FolderModal from "@src/components/FolderModal";
import RenameModal from "@src/components/RenameModal";
import FolderPickerSheet from "@src/components/FolderPickerSheet";
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
  // Document rename (folders rename via FolderModal).
  const [renameDoc, setRenameDoc] = useState<FamilyDocument | null>(null);
  // Move destination picker target: a document (by folderId) or folder (by parentId).
  const [moveTarget, setMoveTarget] = useState<
    { kind: "doc" | "folder"; id: string; currentParent: string | null } | null
  >(null);

  // When moving a folder, its own subtree isn't a valid destination (cycle).
  const moveExclude = useMemo(() => {
    if (!moveTarget || moveTarget.kind !== "folder") return undefined;
    const set = new Set<string>([moveTarget.id]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const f of folders) {
        if (f.parentId && set.has(f.parentId) && !set.has(f.id)) {
          set.add(f.id);
          changed = true;
        }
      }
    }
    return set;
  }, [moveTarget, folders]);

  const onPickMove = useCallback(
    (folderId: string | null) => {
      if (!moveTarget) return;
      if (moveTarget.kind === "doc") updateDocumentRemote(moveTarget.id, { folderId });
      else updateFolderRemote(moveTarget.id, { parentId: folderId });
      setMoveTarget(null);
    },
    [moveTarget],
  );

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

  // "Scan" — native edge-detection scanner (multi-page → one image per page).
  // Web has no native scanner, so fall back to the camera/file picker.
  const handleScan = useCallback(async () => {
    if (Platform.OS === "web") {
      handlePick(pickFromCamera);
      return;
    }
    try {
      const pages = await scanDocuments();
      if (pages.length === 0) return; // cancelled
      setUploading(true);
      for (const page of pages) {
        await uploadDocument(page, currentFolderId ?? undefined);
      }
    } catch {
      Alert.alert(t("documents.uploadError"));
    } finally {
      setUploading(false);
    }
  }, [currentFolderId, handlePick]);

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
        // Only show confirmed uploads. 'pending' rows are transient (an upload
        // in flight, or an orphan from a failed/abandoned one) — the FAB spinner
        // is the in-progress indicator, so pending rows never linger on screen.
        .filter((d) => (d.folderId ?? null) === currentFolderId && d.status === "ready")
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
                  icon="folder-move-outline"
                  size={18}
                  iconColor={C.textMuted}
                  onPress={() =>
                    setMoveTarget({ kind: "folder", id: f.id, currentParent: f.parentId ?? null })
                  }
                  testID={`folder-move-${f.name}`}
                  accessibilityLabel={t("documents.move")}
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

            {files.map((d) => (
              <View key={d.id} style={styles.row}>
                <Pressable
                  style={styles.rowMain}
                  onPress={() => handleView(d.id)}
                  testID={`doc-${d.name}`}
                  accessibilityRole="button"
                  accessibilityLabel={d.name}
                >
                  <View style={styles.iconWrap}>
                    <Ionicons name={fileIcon(d.contentType)} size={20} color={C.textSecondary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowName} numberOfLines={1}>
                      {d.name}
                    </Text>
                    <Text style={styles.rowMeta} numberOfLines={1}>
                      {formatSize(d.sizeBytes)}
                    </Text>
                  </View>
                </Pressable>
                <IconButton
                  icon="pencil-outline"
                  size={18}
                  iconColor={C.textMuted}
                  onPress={() => setRenameDoc(d)}
                  testID={`doc-rename-${d.name}`}
                  accessibilityLabel={t("documents.rename")}
                />
                <IconButton
                  icon="folder-move-outline"
                  size={18}
                  iconColor={C.textMuted}
                  onPress={() =>
                    setMoveTarget({ kind: "doc", id: d.id, currentParent: d.folderId ?? null })
                  }
                  testID={`doc-move-${d.name}`}
                  accessibilityLabel={t("documents.move")}
                />
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
              </View>
            ))}
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
        onCamera={handleScan}
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
      <RenameModal
        visible={!!renameDoc}
        onDismiss={() => setRenameDoc(null)}
        title={t("documents.renameDoc")}
        initialName={renameDoc?.name ?? ""}
        onSubmit={(name) => {
          if (renameDoc) updateDocumentRemote(renameDoc.id, { name });
        }}
      />

      <FolderPickerSheet
        visible={!!moveTarget}
        onDismiss={() => setMoveTarget(null)}
        title={moveTarget?.kind === "folder" ? t("documents.moveFolderTo") : t("documents.moveDocTo")}
        folders={folders}
        excludeIds={moveExclude}
        currentId={moveTarget?.currentParent ?? null}
        onPick={onPickMove}
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
