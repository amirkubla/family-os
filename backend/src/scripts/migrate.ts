/**
 * migrate.ts — Apply Drizzle migrations to the database
 *
 * Usage:  npm run db:migrate
 *
 * After applying schema migrations this script also installs a
 * `set_updated_at()` trigger on every table that has an updated_at column,
 * so the DB keeps the timestamp in sync automatically.
 */

import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("❌  DATABASE_URL is not set.");
    process.exit(1);
  }

  const sql = neon(process.env.DATABASE_URL);
  const db = drizzle(sql);

  console.log("⏳  Running migrations…");
  await migrate(db, { migrationsFolder: "./src/db/migrations" });
  console.log("✅  Migrations applied.");

  // -----------------------------------------------------------------------
  // Install updated_at trigger
  // -----------------------------------------------------------------------
  console.log("⏳  Installing updated_at trigger…");

  await sql`
    CREATE OR REPLACE FUNCTION set_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `;

  const tables = [
    "families",
    "family_members",
    "kids",
    "grocery_items",
    "notes",
    "chores",
    "projects",
    "schedule_blocks",
  ];

  for (const table of tables) {
    // Neon's tagged-template doesn't support dynamic identifiers,
    // so we use the callable overload: sql("query", params)
    await sql(`DROP TRIGGER IF EXISTS trg_updated_at ON ${table}`, []);
    await sql(
      `CREATE TRIGGER trg_updated_at
         BEFORE UPDATE ON ${table}
         FOR EACH ROW
         EXECUTE FUNCTION set_updated_at()`,
      [],
    );
  }

  console.log("✅  updated_at triggers installed.");
  console.log("🎉  Database is ready.");
}

main().catch((err) => {
  console.error("❌  Migration failed:", err);
  process.exit(1);
});
