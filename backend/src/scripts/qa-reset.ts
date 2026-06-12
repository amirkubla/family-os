/**
 * qa-reset.ts — Reset the QA test account to baseline state.
 *
 * For each QA_USERNAME account:
 *  - Deletes family members whose name is "QA Member" (added by qa flows)
 *  - Ensures the account has at least one claimed family member so onboarding
 *    is skipped on next login (check in _layout.tsx: hasClaimed = member.userId === user.id)
 *
 * Usage: npm run qa:reset
 * Env:   QA_USERNAME  (default: "כהן")  — the test account's username
 *        QA_ALL=1     — reset BOTH כהן and qatest in one pass
 */

import { db } from "../db/client.js";
import { users, familyMembers, groceryItems, chores, notes, projects, familyEvents } from "../db/schema.js";
import { eq, and, like } from "drizzle-orm";

const QA_MEMBER_NAME = "QA Member";

async function resetAccount(username: string) {
  console.log(`🔄  Resetting QA account: ${username}`);

  const [user] = await db
    .select({ id: users.id, familyId: users.familyId })
    .from(users)
    .where(eq(users.username, username))
    .limit(1);

  if (!user) {
    console.error(`  ❌  User "${username}" not found.`);
    return;
  }

  const { id: userId, familyId } = user;
  console.log(`  Family ID: ${familyId}`);

  // Remove any "QA Member" left by a previous flow run
  const deleted = await db
    .delete(familyMembers)
    .where(
      and(
        eq(familyMembers.familyId, familyId),
        eq(familyMembers.displayName, QA_MEMBER_NAME),
      ),
    )
    .returning({ displayName: familyMembers.displayName });

  if (deleted.length > 0) {
    console.log(`  Removed ${deleted.length} QA member(s): ${deleted.map((r) => r.displayName).join(", ")}`);
  } else {
    console.log("  No QA members to clean up.");
  }

  // Delete QA test data for all 4 data types
  const deletedGrocery = await db
    .delete(groceryItems)
    .where(and(eq(groceryItems.familyId, familyId), like(groceryItems.title, "QA %")))
    .returning({ title: groceryItems.title });
  if (deletedGrocery.length > 0) console.log(`  Removed ${deletedGrocery.length} QA grocery item(s).`);

  const deletedChores = await db
    .delete(chores)
    .where(and(eq(chores.familyId, familyId), like(chores.title, "QA %")))
    .returning({ title: chores.title });
  if (deletedChores.length > 0) console.log(`  Removed ${deletedChores.length} QA chore(s).`);

  const deletedNotes = await db
    .delete(notes)
    .where(and(eq(notes.familyId, familyId), like(notes.title, "QA %")))
    .returning({ title: notes.title });
  if (deletedNotes.length > 0) console.log(`  Removed ${deletedNotes.length} QA note(s).`);

  const deletedProjects = await db
    .delete(projects)
    .where(and(eq(projects.familyId, familyId), like(projects.title, "QA %")))
    .returning({ title: projects.title });
  if (deletedProjects.length > 0) console.log(`  Removed ${deletedProjects.length} QA project(s).`);

  const deletedEvents = await db
    .delete(familyEvents)
    .where(and(eq(familyEvents.familyId, familyId), like(familyEvents.title, "QA %")))
    .returning({ title: familyEvents.title });
  if (deletedEvents.length > 0) console.log(`  Removed ${deletedEvents.length} QA event(s).`);

  // Ensure the user has a claimed member so _layout.tsx skips onboarding.
  // "Claimed" = a familyMember row where userId = this user's id.
  const [claimed] = await db
    .select({ id: familyMembers.id })
    .from(familyMembers)
    .where(eq(familyMembers.userId, userId))
    .limit(1);

  if (!claimed) {
    // Create a baseline member and link it to this user
    await db.insert(familyMembers).values({
      familyId,
      displayName: username,
      role: "parent",
      userId,
      isActive: true,
    });
    console.log(`  Created baseline member for ${username} (onboarding bypass).`);
  } else {
    console.log("  Baseline member already claimed — onboarding will be skipped.");
  }

  console.log(`  ✅  ${username} reset complete.\n`);
}

async function main() {
  const usernames =
    process.env.QA_ALL === "1"
      ? ["כהן", "qatest"]
      : [process.env.QA_USERNAME ?? "כהן"];

  for (const u of usernames) {
    await resetAccount(u);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("❌  qa-reset failed:", err);
  process.exit(1);
});
