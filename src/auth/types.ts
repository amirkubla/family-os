/**
 * auth/types.ts — Data models for the auth layer.
 *
 * Kept backend-agnostic so the auth service can be swapped
 * without touching consumers.
 */

export type AuthUser = {
  id: string;
  username: string;
  familyId: string;
  createdAt: number;
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
