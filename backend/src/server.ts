/**
 * server.ts — Hono API entry-point
 *
 * Usage:  npm run dev          (tsx watch)
 *         PORT=4000 npm run dev (custom port)
 */

import "dotenv/config";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

import { familyRoutes } from "./routes/family.js";
import { groceryRoutes } from "./routes/grocery.js";
import { notesRoutes } from "./routes/notes.js";
import { choresRoutes } from "./routes/chores.js";
import { projectsRoutes } from "./routes/projects.js";
import { kidsRoutes } from "./routes/kids.js";
import { scheduleBlocksRoutes } from "./routes/scheduleBlocks.js";
import { familyMembersRoutes } from "./routes/familyMembers.js";

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

const app = new Hono();

// Middleware
app.use("*", cors());
app.use("*", logger());

// Health check
app.get("/", (c) => c.json({ status: "ok", service: "family-os-api" }));

// Routes
app.route("/v1/family", familyRoutes);
app.route("/v1/family/:familyId/grocery", groceryRoutes);
app.route("/v1/family/:familyId/notes", notesRoutes);
app.route("/v1/family/:familyId/chores", choresRoutes);
app.route("/v1/family/:familyId/projects", projectsRoutes);
app.route("/v1/family/:familyId/kids", kidsRoutes);
app.route("/v1/family/:familyId/schedule-blocks", scheduleBlocksRoutes);
app.route("/v1/family/:familyId/members", familyMembersRoutes);

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

const port = Number(process.env.PORT ?? 3000);

serve({ fetch: app.fetch, port }, () => {
  console.log(`\n🚀  Family OS API running on http://localhost:${port}\n`);
});
