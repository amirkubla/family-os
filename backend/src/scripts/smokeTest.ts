/**
 * smokeTest.ts — Quick end-to-end CRUD check against the live DB
 *
 * Usage:  npm run db:smoke
 *
 * Creates a test family, inserts one row in every table, reads, updates,
 * and deletes each row.  Cleans up after itself.
 */

import { db } from "../db/client.js";
import { families } from "../db/schema.js";
import { eq } from "drizzle-orm";
import {
  groceryRepo,
  notesRepo,
  choresRepo,
  projectsRepo,
  kidsRepo,
} from "../repos/index.js";

// ---------------------------------------------------------------------------

let passed = 0;
let failed = 0;

function assert(label: string, ok: boolean) {
  if (ok) {
    console.log(`  ✅  ${label}`);
    passed++;
  } else {
    console.error(`  ❌  ${label}`);
    failed++;
  }
}

// ---------------------------------------------------------------------------

async function main() {
  console.log("🔬  Smoke test — start\n");

  // -- Setup: create a throwaway family ------------------------------------
  const [family] = await db
    .insert(families)
    .values({ name: "__smoke_test__" })
    .returning();
  const fid = family.id;
  assert("family created", !!family.id);

  // -- Kids ----------------------------------------------------------------
  console.log("\n  ── kids ──");
  const kid = await kidsRepo.create({
    familyId: fid,
    name: "TestKid",
    color: "#000",
  });
  assert("kid.create", kid.name === "TestKid");

  const kidRead = await kidsRepo.getById(kid.id);
  assert("kid.getById", kidRead?.id === kid.id);

  const kidUpdated = await kidsRepo.update(kid.id, { color: "#FFF" });
  assert("kid.update", kidUpdated?.color === "#FFF");

  assert("kid.listByFamily", (await kidsRepo.listByFamily(fid)).length === 1);

  assert("kid.delete", await kidsRepo.delete(kid.id));

  // -- Grocery -------------------------------------------------------------
  console.log("\n  ── grocery ──");
  const grocery = await groceryRepo.create({
    familyId: fid,
    title: "Milk",
    category: "Dairy",
  });
  assert("grocery.create", grocery.title === "Milk");

  const groceryRead = await groceryRepo.getById(grocery.id);
  assert("grocery.getById", groceryRead?.id === grocery.id);

  const groceryUpdated = await groceryRepo.update(grocery.id, {
    isBought: true,
  });
  assert("grocery.update", groceryUpdated?.isBought === true);

  assert(
    "grocery.listByFamily",
    (await groceryRepo.listByFamily(fid)).length === 1,
  );

  assert("grocery.delete", await groceryRepo.delete(grocery.id));

  // -- Notes ---------------------------------------------------------------
  console.log("\n  ── notes ──");
  const note = await notesRepo.create({
    familyId: fid,
    body: "Test note body",
  });
  assert("note.create", note.body === "Test note body");

  const noteRead = await notesRepo.getById(note.id);
  assert("note.getById", noteRead?.id === note.id);

  const noteUpdated = await notesRepo.update(note.id, { pinned: true });
  assert("note.update", noteUpdated?.pinned === true);

  assert("note.listByFamily", (await notesRepo.listByFamily(fid)).length === 1);
  assert("note.listPinned", (await notesRepo.listPinned(fid)).length === 1);

  assert("note.delete", await notesRepo.delete(note.id));

  // -- Chores --------------------------------------------------------------
  console.log("\n  ── chores ──");
  const chore = await choresRepo.create({
    familyId: fid,
    title: "Clean room",
  });
  assert("chore.create", chore.title === "Clean room");

  const choreRead = await choresRepo.getById(chore.id);
  assert("chore.getById", choreRead?.id === chore.id);

  const choreUpdated = await choresRepo.update(chore.id, { done: true });
  assert("chore.update", choreUpdated?.done === true);

  assert(
    "chore.listByFamily",
    (await choresRepo.listByFamily(fid)).length === 1,
  );

  assert("chore.delete", await choresRepo.delete(chore.id));

  // -- Projects ------------------------------------------------------------
  console.log("\n  ── projects ──");
  const project = await projectsRepo.create({
    familyId: fid,
    title: "Build treehouse",
  });
  assert("project.create", project.title === "Build treehouse");

  const projectRead = await projectsRepo.getById(project.id);
  assert("project.getById", projectRead?.id === project.id);

  const projectUpdated = await projectsRepo.update(project.id, {
    status: "in_progress",
    progress: 50,
  });
  assert("project.update (status)", projectUpdated?.status === "in_progress");
  assert("project.update (progress)", projectUpdated?.progress === 50);

  assert(
    "project.listByFamily",
    (await projectsRepo.listByFamily(fid)).length === 1,
  );
  assert(
    "project.listByStatus",
    (await projectsRepo.listByStatus(fid, "in_progress")).length === 1,
  );

  assert("project.delete", await projectsRepo.delete(project.id));

  // -- Cleanup: remove throwaway family ------------------------------------
  await db.delete(families).where(eq(families.id, fid));

  // -- Summary -------------------------------------------------------------
  console.log(`\n${"─".repeat(48)}`);
  console.log(`  Passed: ${passed}   Failed: ${failed}`);
  console.log("─".repeat(48));

  if (failed > 0) {
    console.error("\n❌  Smoke test FAILED.");
    process.exit(1);
  }

  console.log("\n🎉  Smoke test PASSED — all repos working.\n");
}

main().catch((err) => {
  console.error("❌  Smoke test crashed:", err);
  process.exit(1);
});
