/**
 * pickFamilyPhoto — let the user pick a family photo from their library and
 * return it as a data: URI (base64) so it can be stored in the customizations
 * JSONB and synced/displayed everywhere without a separate upload pipeline.
 *
 * A 16:9 crop at moderate quality keeps the encoded blob reasonably small
 * (it's a decorative banner, not a full-res gallery image).
 */

import { Platform } from "react-native";
import * as ImagePicker from "expo-image-picker";

export async function pickFamilyPhoto(): Promise<string | null> {
  // Skip the permission prompt on web — it defers past the click gesture,
  // which the browser then blocks (mirrors src/lib/documents/capture.ts).
  if (Platform.OS !== "web") {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return null;
  }
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsEditing: true,
    aspect: [16, 9],
    quality: 0.5,
    base64: true,
  });
  if (res.canceled || !res.assets?.length) return null;
  const a = res.assets[0];
  if (a.base64) {
    const mime = a.mimeType && a.mimeType.startsWith("image/") ? a.mimeType : "image/jpeg";
    return `data:${mime};base64,${a.base64}`;
  }
  // Web frequently hands back a data: URI directly (no separate base64).
  if (a.uri && a.uri.startsWith("data:")) return a.uri;
  return null;
}
