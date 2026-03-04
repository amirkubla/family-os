/**
 * server.ts — Hono API entry-point
 *
 * Usage:  npm run dev          (tsx watch)
 *         PORT=4000 npm run dev (custom port)
 */

import "dotenv/config";
import { existsSync } from "node:fs";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
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
import { familyEventsRoutes } from "./routes/familyEvents.js";

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

const app = new Hono();

// Middleware
app.use("*", cors());
app.use("*", logger());

// Global error handler — return JSON instead of plain text
app.onError((err, c) => {
  console.error("[API ERROR]", c.req.method, c.req.path, err.message);
  return c.json({ error: err.message }, 500);
});

// Health check (Cloud Run uses this)
app.get("/healthz", (c) => c.json({ status: "ok", service: "family-os-api" }));

// Routes
app.route("/v1/family", familyRoutes);
app.route("/v1/family/:familyId/grocery", groceryRoutes);
app.route("/v1/family/:familyId/notes", notesRoutes);
app.route("/v1/family/:familyId/chores", choresRoutes);
app.route("/v1/family/:familyId/projects", projectsRoutes);
app.route("/v1/family/:familyId/kids", kidsRoutes);
app.route("/v1/family/:familyId/schedule-blocks", scheduleBlocksRoutes);
app.route("/v1/family/:familyId/members", familyMembersRoutes);
app.route("/v1/family/:familyId/family-events", familyEventsRoutes);

// ---------------------------------------------------------------------------
// Static web app (only when /public exists — i.e. Docker production image)
// ---------------------------------------------------------------------------

const WEB_ROOT = "./public";

if (existsSync(WEB_ROOT)) {
  // Serve static assets (JS bundles, images, fonts, etc.)
  app.use("/*", serveStatic({ root: WEB_ROOT }));

  // SPA fallback — any non-API, non-file request gets index.html
  app.get("*", serveStatic({ root: WEB_ROOT, path: "index.html" }));

  console.log("📦  Serving static web app from /public");
}

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

const port = Number(process.env.PORT ?? 3000);

serve({ fetch: app.fetch, port }, () => {
  console.log(`\n🚀  Family OS API running on http://localhost:${port}\n`);
});
