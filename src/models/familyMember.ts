export type MemberRole = "parent" | "caregiver" | "other";

export interface FamilyMember {
  id: string;
  name: string;
  role: MemberRole;
  color?: string;
  avatarEmoji?: string;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

export const MEMBER_ROLES: MemberRole[] = ["parent", "caregiver", "other"];

/** Seed data — created on first run if familyMembers is empty. */
export const DEFAULT_FAMILY_MEMBERS: Omit<
  FamilyMember,
  "id" | "createdAt" | "updatedAt"
>[] = [
  { name: "אמא", role: "parent", avatarEmoji: "👩", color: "#FF6B6B", isActive: true },
  { name: "אבא", role: "parent", avatarEmoji: "👨", color: "#4ECDC4", isActive: true },
];
