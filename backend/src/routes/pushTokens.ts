import { Hono } from "hono";
import { pushTokensRepo } from "../repos/pushTokensRepo.js";

export const pushTokenRoutes = new Hono();

// GET /v1/family/:familyId/push-tokens — list tokens for a family
pushTokenRoutes.get("/", async (c) => {
  const familyId = c.req.param("familyId")!;
  const tokens = await pushTokensRepo.listByFamily(familyId);
  return c.json(tokens);
});

// POST /v1/family/:familyId/push-tokens — register a push token
pushTokenRoutes.post("/", async (c) => {
  const familyId = c.req.param("familyId")!;
  const { token } = await c.req.json();
  if (!token || typeof token !== "string") {
    return c.json({ error: "token is required" }, 400);
  }
  const row = await pushTokensRepo.register(familyId, token);
  return c.json(row, 201);
});

// DELETE /v1/family/:familyId/push-tokens — unregister a push token
pushTokenRoutes.delete("/", async (c) => {
  const { token } = await c.req.json();
  if (!token || typeof token !== "string") {
    return c.json({ error: "token is required" }, 400);
  }
  await pushTokensRepo.deleteByToken(token);
  return c.json({ deleted: true });
});
