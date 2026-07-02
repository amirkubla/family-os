import { Hono } from "hono";
import { documentsRepo } from "../repos/documentsRepo.js";
import { documentsConfigured, deleteObject } from "../lib/documentsStorage.js";

/**
 * System (non-family) document maintenance. Mounted at /v1/documents, OUTSIDE
 * the family JWT guard — auth'd by the shared scheduler secret instead.
 */
export const documentsMaintenanceRoutes = new Hono();

function verifySharedSecret(c: {
  req: { header: (n: string) => string | undefined };
}): boolean {
  const expected = process.env.SCHEDULER_SECRET;
  if (!expected) return true; // dev / not configured
  return c.req.header("X-Scheduler-Secret") === expected;
}

const DEFAULT_TTL_MIN = 60;

// POST /v1/documents/admin/cleanup-pending   { olderThanMinutes? }
//
// Sweeps abandoned/interrupted uploads: 'pending' rows older than the TTL
// (default 60 min — a real upload confirms in seconds) plus any partial GCS
// object. Called on a schedule (Cloud Scheduler). Shared-secret auth.
documentsMaintenanceRoutes.post("/admin/cleanup-pending", async (c) => {
  if (!verifySharedSecret(c)) return c.json({ error: "Unauthorized" }, 401);

  const body = await c.req.json().catch(() => ({}));
  const minutes =
    typeof body?.olderThanMinutes === "number" && body.olderThanMinutes >= 0
      ? body.olderThanMinutes
      : DEFAULT_TTL_MIN;
  const cutoff = new Date(Date.now() - minutes * 60 * 1000);

  const stale = await documentsRepo.listStalePending(cutoff);
  let deleted = 0;
  for (const doc of stale) {
    if (documentsConfigured() && doc.gcsObject) {
      await deleteObject(doc.gcsObject); // best-effort (ignoreNotFound)
    }
    await documentsRepo.delete(doc.id, doc.familyId);
    deleted += 1;
  }
  return c.json({ ok: true, scanned: stale.length, deleted, olderThanMinutes: minutes });
});
