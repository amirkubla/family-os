/**
 * auth/AuthService.ts — Interface for auth operations.
 *
 * Consumers depend on this interface only. The concrete implementation
 * (ApiAuthService) can be swapped without changing UI code.
 */

import type {
  AuthSession,
  RegisterInput,
  LoginInput,
  GoogleAuthInput,
  AppleAuthInput,
} from "./types";

export interface AuthService {
  register(input: RegisterInput): Promise<AuthSession>;
  login(input: LoginInput): Promise<AuthSession>;
  /**
   * Sign in / register with a Google ID token. Throws Error("NEEDS_FAMILY")
   * for a brand-new Google user with no family yet — the caller should collect
   * a family name or invite code and retry.
   */
  signInWithGoogle(input: GoogleAuthInput): Promise<AuthSession>;
  /**
   * Sign in / register with an Apple identity token. Throws Error("NEEDS_FAMILY")
   * for a brand-new Apple user with no family yet — same contract as Google.
   */
  signInWithApple(input: AppleAuthInput): Promise<AuthSession>;
  logout(): Promise<void>;
  getSession(): Promise<AuthSession | null>;
}
