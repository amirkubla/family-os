/**
 * capture.ts — pick a document to upload: camera, photo library, or a file.
 *
 * Each returns a normalized PickedFile (or null if the user cancels / denies
 * permission). The upload flow (upload.ts) takes it from there.
 */

import { Platform } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";

export interface PickedFile {
  uri: string;
  name: string;
  contentType: string;
  size?: number;
}

/** Content types the backend accepts (mirrors documents route ALLOWED_TYPES). */
export const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/heic",
  "image/heif",
  "image/webp",
];

const nameFromUri = (uri: string, fallback: string): string => {
  const last = uri.split("?")[0].split("/").pop();
  return last && last.includes(".") ? decodeURIComponent(last) : fallback;
};

const imageType = (uri: string, mime?: string | null): string => {
  if (mime && mime.startsWith("image/")) return mime;
  const ext = uri.split("?")[0].split(".").pop()?.toLowerCase();
  if (ext === "png") return "image/png";
  if (ext === "heic" || ext === "heif") return `image/${ext}`;
  if (ext === "webp") return "image/webp";
  return "image/jpeg";
};

export async function pickFromCamera(): Promise<PickedFile | null> {
  // Skip the permission request on web — it defers the launch past the click
  // gesture, which the browser then blocks. Native still asks.
  if (Platform.OS !== "web") {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return null;
  }
  const res = await ImagePicker.launchCameraAsync({ quality: 0.8 });
  if (res.canceled || !res.assets?.length) return null;
  const a = res.assets[0];
  return {
    uri: a.uri,
    name: a.fileName ?? nameFromUri(a.uri, `scan-${Date.now()}.jpg`),
    contentType: imageType(a.uri, a.mimeType),
    size: a.fileSize,
  };
}

export async function pickFromLibrary(): Promise<PickedFile | null> {
  if (Platform.OS !== "web") {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return null;
  }
  const res = await ImagePicker.launchImageLibraryAsync({ quality: 0.85, mediaTypes: ["images"] });
  if (res.canceled || !res.assets?.length) return null;
  const a = res.assets[0];
  return {
    uri: a.uri,
    name: a.fileName ?? nameFromUri(a.uri, `image-${Date.now()}.jpg`),
    contentType: imageType(a.uri, a.mimeType),
    size: a.fileSize,
  };
}

export async function pickDocument(): Promise<PickedFile | null> {
  const res = await DocumentPicker.getDocumentAsync({
    type: ALLOWED_TYPES,
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (res.canceled || !res.assets?.length) return null;
  const a = res.assets[0];
  const contentType =
    a.mimeType && ALLOWED_TYPES.includes(a.mimeType) ? a.mimeType : "application/pdf";
  return {
    uri: a.uri,
    name: a.name ?? nameFromUri(a.uri, `document-${Date.now()}`),
    contentType,
    size: a.size ?? undefined,
  };
}
