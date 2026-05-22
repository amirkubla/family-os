/**
 * auth/ApiAuthService.ts — Backend-backed auth service.
 *
 * Calls /v1/auth/* endpoints for register/login.
 * Stores JWT session in SecureStore (via storage.ts).
 */

import type { AuthService } from "./AuthService";
import type { AuthSession, RegisterInput, LoginInput } from "./types";
import { saveSession, loadSession, clearSession } from "./storage";
import { ApiError } from "@src/lib/api/http";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "";

// ---------------------------------------------------------------------------
// Helpers — direct fetch to avoid circular dependency with http.ts
// (http.ts reads the session to inject the token, so auth endpoints
//  must not go through the same http wrapper)
// ---------------------------------------------------------------------------

async function authPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new ApiError(res.status, data);
  }

  return data as T;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

class ApiAuthServiceImpl implements AuthService {
  async register(input: RegisterInput): Promise<AuthSession> {
    const { username, password, familyCode } = input;

    try {
      const body: Record<string, string> = { username, password };
      if (familyCode) body.inviteCode = familyCode;

      const session = await authPost<AuthSession>("/v1/auth/register", body);
      await saveSession(session);
      return session;
    } catch (err) {
      if (err instanceof ApiError) {
        const body = err.body as { error?: string } | undefined;
        if (body?.error === "USERNAME_TAKEN") throw new Error("USERNAME_TAKEN");
      }
      throw new Error("REGISTER_FAILED");
    }
  }

  async login(input: LoginInput): Promise<AuthSession> {
    const { username, password } = input;

    try {
      const session = await authPost<AuthSession>("/v1/auth/login", {
        username,
        password,
      });
      await saveSession(session);
      return session;
    } catch (err) {
      if (err instanceof ApiError) {
        const body = err.body as { error?: string } | undefined;
        if (body?.error === "USER_NOT_FOUND") throw new Error("USER_NOT_FOUND");
        if (body?.error === "WRONG_PASSWORD") throw new Error("WRONG_PASSWORD");
      }
      throw new Error("LOGIN_FAILED");
    }
  }

  async logout(): Promise<void> {
    await clearSession();
  }

  async getSession(): Promise<AuthSession | null> {
    return loadSession();
  }
}

/** Singleton instance. */
export const authService: AuthService = new ApiAuthServiceImpl();
