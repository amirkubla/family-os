/**
 * auth/ApiAuthService.ts — Backend-backed auth service.
 *
 * Calls /v1/auth/* endpoints for register/login.
 * Stores JWT session in SecureStore (via storage.ts).
 */

import type { AuthService } from "./AuthService";
import type {
  AuthSession,
  RegisterInput,
  LoginInput,
  GoogleAuthInput,
  AppleAuthInput,
} from "./types";
import { saveSession, loadSession, clearSession } from "./storage";
import { ApiError } from "@src/lib/api/http";
import { getApiBaseUrl } from "@src/lib/api/baseUrl";

const BASE_URL = getApiBaseUrl();

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
    const { username, password, familyName, familyCode, memberId } = input;

    try {
      const body: Record<string, string> = { username, password };
      if (familyName) body.familyName = familyName;
      if (familyCode) body.inviteCode = familyCode;
      if (memberId) body.memberId = memberId;

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

  async signInWithGoogle(input: GoogleAuthInput): Promise<AuthSession> {
    const { idToken, familyName, familyCode, memberId } = input;
    try {
      const body: Record<string, string> = { idToken };
      if (familyName) body.familyName = familyName;
      if (familyCode) body.inviteCode = familyCode;
      if (memberId) body.memberId = memberId;

      const session = await authPost<AuthSession>("/v1/auth/google", body);
      await saveSession(session);
      return session;
    } catch (err) {
      if (err instanceof ApiError) {
        const body = err.body as { error?: string } | undefined;
        // Brand-new Google user with no family yet — caller prompts + retries.
        if (err.status === 409 && body?.error === "NEEDS_FAMILY") {
          throw new Error("NEEDS_FAMILY");
        }
        if (body?.error === "INVALID_INVITE") throw new Error("INVALID_INVITE");
        if (body?.error === "INVALID_GOOGLE_TOKEN") throw new Error("INVALID_GOOGLE_TOKEN");
      }
      throw new Error("GOOGLE_SIGNIN_FAILED");
    }
  }

  async signInWithApple(input: AppleAuthInput): Promise<AuthSession> {
    const { identityToken, fullName, familyName, familyCode, memberId } = input;
    try {
      const body: Record<string, string> = { identityToken };
      if (fullName) body.fullName = fullName;
      if (familyName) body.familyName = familyName;
      if (familyCode) body.inviteCode = familyCode;
      if (memberId) body.memberId = memberId;

      const session = await authPost<AuthSession>("/v1/auth/apple", body);
      await saveSession(session);
      return session;
    } catch (err) {
      if (err instanceof ApiError) {
        const body = err.body as { error?: string } | undefined;
        // Brand-new Apple user with no family yet — caller prompts + retries.
        if (err.status === 409 && body?.error === "NEEDS_FAMILY") {
          throw new Error("NEEDS_FAMILY");
        }
        if (body?.error === "INVALID_INVITE") throw new Error("INVALID_INVITE");
        if (body?.error === "INVALID_APPLE_TOKEN") throw new Error("INVALID_APPLE_TOKEN");
      }
      throw new Error("APPLE_SIGNIN_FAILED");
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
