/**
 * seed.ts — Seed one family + 2 kids
 *
 * Usage:  npm run db:seed
 *
 * Idempotent-ish: always inserts new rows (no upsert).
 * Re-run only on a fresh DB or expect duplicates.
 */

import { db } from "../db/client.js";
import { families, kids } from "../db/schema.js";

async function main() {
  console.log("🌱  Seeding database…\n");

  // -- Family ---------------------------------------------------------------
  const [family] = await db
    .insert(families)
    .values({ name: "Koblyansky Family" })
    .returning();

  console.log(`  Family : ${family.name}  (${family.id})`);

  // -- Kids -----------------------------------------------------------------
  const [lily] = await db
    .insert(kids)
    .values({ familyId: family.id, name: "Lily", color: "#FF6B6B", emoji: "🌸" })
    .returning();

  const [max] = await db
    .insert(kids)
    .values({ familyId: family.id, name: "Max", color: "#4ECDC4", emoji: "🚀" })
    .returning();

  console.log(`  Kid    : ${lily.name}  (${lily.id})  color=${lily.color}`);
  console.log(`  Kid    : ${max.name}   (${max.id})  color=${max.color}`);

  console.log("\n✅  Seed complete.");
  console.log(
    "\n💡  Save the family ID for later use:\n" +
      `    FAMILY_ID=${family.id}`,
  );
}

main().catch((err) => {
  console.error("❌  Seed failed:", err);
  process.exit(1);
});
