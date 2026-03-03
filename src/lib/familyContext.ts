/**
 * familyContext.ts — Resolve the current family ID.
 *
 * Priority:
 *   1. EXPO_PUBLIC_FAMILY_ID env var
 *   2. AsyncStorage cache
 *   3. GET /v1/family → first result
 *
 * Once resolved, cached in memory + AsyncStorage.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { familyApi } from "./api/endpoints";

const STORAGE_KEY = "family-os-family-id";

let memoryCache: string | null = null;

export async function getFamilyId(): Promise<string> {
  // 1. Env var
  const envId = process.env.EXPO_PUBLIC_FAMILY_ID;
  if (envId) {
    memoryCache = envId;
    return envId;
  }

  // 2. Memory cache
  if (memoryCache) return memoryCache;

  // 3. AsyncStorage cache
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored) {
      memoryCache = stored;
      return stored;
    }
  } catch {
    // ignore storage errors
  }

  // 4. Fetch from API
  const families = await familyApi.list();
  if (families.length === 0) {
    throw new Error("No families found. Run the seed script first.");
  }

  const id = families[0].id;
  memoryCache = id;

  try {
    await AsyncStorage.setItem(STORAGE_KEY, id);
  } catch {
    // ignore storage errors
  }

  return id;
}

/** Clear cached family ID (useful for testing / switching families). */
export function clearFamilyCache() {
  memoryCache = null;
  AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
}
