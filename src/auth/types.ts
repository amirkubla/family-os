/**
 * auth/types.ts — Data models for the auth layer.
 *
 * Kept backend-agnostic so the auth service can be swapped
 * without touching consumers.
 */

export type AuthUser = {
  id: string;
  /** Null for social-login (Google/Apple) users who have no username. */
  username: string | null;
  familyId: string;
  createdAt: number;
};

export type GoogleAuthInput = {
  idToken: string;
  /** New-family creation (first sign-in). */
  familyName?: string;
  /** Join an existing family via invite (first sign-in). */
  familyCode?: string;
  /** Member to claim when joining via invite. */
  memberId?: string;
};

export type AppleAuthInput = {
  identityToken: string;
  /** Apple returns the name ONLY on first authorization — forward it then. */
  fullName?: string;
  /** New-family creation (first sign-in). */
  familyName?: string;
  /** Join an existing family via invite (first sign-in). */
  familyCode?: string;
  /** Member to claim when joining via invite. */
  memberId?: string;
};

export type AuthSession = {
  /** Opaque token string (dummy for now, JWT later). */
  token: string;
  user: AuthUser;
  issuedAt: number;
};

export type RegisterInput = {
  username: string;
  password: string;
  /** Family surname for new families (ignored when joining via invite). */
  familyName?: string;
  /** Optional code to join an existing family. */
  familyCode?: string;
  /** Optional family member ID to link this user to. */
  memberId?: string;
};

export type LoginInput = {
  username: string;
  password: string;
};
