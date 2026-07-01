/**
 * view.ts — open a document for viewing. Fetches a short-TTL signed GET URL,
 * then opens it: a new tab on web, the in-app browser on native. PDFs and
 * images render directly in the browser.
 */

import { Platform } from "react-native";
import * as WebBrowser from "expo-web-browser";

import { documentsApi } from "@src/lib/api/endpoints";
import { getFamilyId } from "@src/lib/familyContext";

export async function openDocument(id: string): Promise<void> {
  const fid = await getFamilyId();
  const { url } = await documentsApi.downloadUrl(fid, id);
  if (Platform.OS === "web") {
    window.open(url, "_blank", "noopener,noreferrer");
  } else {
    await WebBrowser.openBrowserAsync(url);
  }
}
