/**
 * middleware/serviceToken.ts — Service-to-service auth.
 *
 * Authenticates calls from internal services (currently the Telegram-bot
 * Assistant) using a shared bearer token rather than a per-user JWT.
 *
 * The token comes from process.env.SERVICE_TOKEN. If unset, every request
 * to a protected route is rejected with 503 (the feature is not configured).
 *
 * Threat model: the SERVICE_TOKEN is a shared symmetric secret. Anyone who
 * has it can write to any family. Treat it like JWT_SECRET — store only in
 * Cloud Run env vars, never in code or git. To rotate: change the env var
 * here, then update the caller (family-ai-assistant Cloud Run env).
 */

import { createMiddleware } from "hono/factory";

export const serviceTokenAuth = createMiddleware(async (c, next) => {
  const expected = process.env.SERVICE_TOKEN;
  if (!expected) {
    return c.json(
      { error: "Service-to-service auth is not configured" },
      503,
    );
  }
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ error: "Missing Authorization header" }, 401);
  }
  const token = authHeader.slice(7);
  if (token !== expected) {
    return c.json({ error: "Invalid service token" }, 401);
  }
  await next();
});
