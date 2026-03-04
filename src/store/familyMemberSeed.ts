/**
 * familyMemberSeed.ts — Seeds default family members on first run.
 *
 * If the familyMembers array is empty, we add "אמא" and "אבא".
 */

import { useFamilyStore } from "./useFamilyStore";
import { addFamilyMemberRemote } from "@src/lib/sync/remoteCrud";
import { DEFAULT_FAMILY_MEMBERS } from "@src/models/familyMember";

export function seedFamilyMembersIfEmpty() {
  const { familyMembers } = useFamilyStore.getState();
  if (familyMembers.length > 0) return;

  for (const member of DEFAULT_FAMILY_MEMBERS) {
    addFamilyMemberRemote({
      name: member.name,
      role: member.role,
      avatarEmoji: member.avatarEmoji,
      color: member.color,
    });
  }
}
