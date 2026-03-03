import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema.js";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is not set. Copy .env.example → .env and fill in your Neon connection string.",
  );
}

const sql = neon(process.env.DATABASE_URL);

/** Drizzle ORM instance — import this wherever you need DB access. */
export const db = drizzle(sql, { schema });
