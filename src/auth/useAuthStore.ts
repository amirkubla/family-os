/**
 * auth/useAuthStore.ts — Zustand store for auth state.
 *
 * Manages session lifecycle: bootstrap → login/register → logout.
 * Does NOT use persist middleware — session lives in SecureStore via
 * the auth service; this store is the in-memory projection.
 */

import { create } from "zustand";
import type { AuthSession, RegisterInput, LoginInput } from "./types";
import { authService } from "./ApiAuthService";
import { useFamilyStore } from "@src/store/useFamilyStore";
import {
  clearFamilyCache,
  registerAuthFamilyIdGetter,
} from "@src/lib/familyContext";
import { getApiBaseUrl } from "@src/lib/api/baseUrl";

export type AuthStatus = "booting" | "loggedOut" | "loggedIn";

interface AuthState {
  session: AuthSession | null;
  status: AuthStatus;
  error: string | undefined;

  /** Load session from SecureStore — call once at app start. */
  bootstrap: () => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  login: (input: LoginInput) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  status: "booting",
  error: undefined,

  bootstrap: async () => {
    try {
      const session = await authService.getSession();
      if (session) {
        // Validate the JWT is still valid by hitting /v1/auth/me.
        // Only invalidate on a definitive 401/403 — NOT on network errors
        // (so the app still works offline with cached data).
        try {
          const BASE_URL = getApiBaseUrl();
          const res = await fetch(`${BASE_URL}/v1/auth/me`, {
            headers: { Authorization: `Bearer ${session.token}` },
          });
          if (res.status === 401 || res.status === 403) {
            console.warn("[auth] Token expired or invalid, logging out");
            await authService.logout();
            resetFamilyData();
            set({ session: null, status: "loggedOut", error: undefined });
            return;
          }
        } catch {
          // Network error / timeout → keep session, let sync handle it later
          console.warn("[auth] Could not validate token (offline?), keeping session");
        }
        set({ session, status: "loggedIn", error: undefined });
      } else {
        set({ session: null, status: "loggedOut", error: undefined });
      }
    } catch {
      set({ session: null, status: "loggedOut", error: undefined });
    }
  },

  register: async (input) => {
    set({ error: undefined });
    try {
      const session = await authService.register(input);
      set({ session, status: "loggedIn", error: undefined });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "REGISTER_FAILED";
      set({ error: msg });
      throw err;
    }
  },

  login: async (input) => {
    set({ error: undefined });
    try {
      const session = await authService.login(input);
      set({ session, status: "loggedIn", error: undefined });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "LOGIN_FAILED";
      set({ error: msg });
      throw err;
    }
  },

  logout: async () => {
    await authService.logout();
    // Clear family data so next login starts fresh
    resetFamilyData();
    set({ session: null, status: "loggedOut", error: undefined });
  },
}));

// Register auth family ID getter to break the require cycle.
// familyContext needs to read the auth session but can't import this file directly.
registerAuthFamilyIdGetter(
  () => useAuthStore.getState().session?.user.familyId ?? null,
);

/** Clear all family data from the local store + family context cache. */
function resetFamilyData() {
  const store = useFamilyStore.getState();
  store.setFamilyName("");
  store.setGrocery([]);
  store.setNotes([]);
  store.setChores([]);
  store.setProjects([]);
  store.setKids([]);
  store.setScheduleBlocks([]);
  store.setFamilyMembers([]);
  store.setFamilyEvents([]);
  store.setOnboardingComplete(false);
  clearFamilyCache();
}
