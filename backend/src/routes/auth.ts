/**
 * routes/auth.ts — Registration, login, and session validation.
 *
 * POST /register  — Create user + family, return JWT
 * POST /login     — Verify password, return JWT
 * GET  /me        — Return current user from JWT (session validation)
 */

import { Hono } from "hono";
import { sign } from "hono/jwt";
import bcrypt from "bcryptjs";
import { OAuth2Client } from "google-auth-library";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { families, familyMembers } from "../db/schema.js";
import { usersRepo } from "../repos/usersRepo.js";
import { invitesRepo } from "../repos/invitesRepo.js";
import { jwtAuth } from "../middleware/auth.js";

const SALT_ROUNDS = 10;
const TOKEN_EXPIRY_SECONDS = 30 * 24 * 60 * 60; // 30 days

export const authRoutes = new Hono();

// ---------------------------------------------------------------------------
// POST /register
// ---------------------------------------------------------------------------

authRoutes.post("/register", async (c) => {
  const { username, password, familyName, inviteCode, memberId } = await c.req.json<{
    username: string;
    password: string;
    familyName?: string;
    inviteCode?: string;
    memberId?: string;
  }>();

  // Validation
  if (!username || typeof username !== "string" || username.trim().length < 2) {
    return c.json({ error: "Username must be at least 2 characters" }, 400);
  }
  if (!password || typeof password !== "string" || password.length < 4) {
    return c.json({ error: "Password must be at least 4 characters" }, 400);
  }

  const trimmedUsername = username.trim();

  // Check uniqueness
  const existing = await usersRepo.getByUsername(trimmedUsername);
  if (existing) {
    return c.json({ error: "USERNAME_TAKEN" }, 409);
  }

  let familyId: string;

  if (inviteCode) {
    // ── Join existing family via invite code ──
    const invite = await invitesRepo.getValidByCode(inviteCode);
    if (!invite) {
      return c.json({ error: "INVALID_INVITE" }, 400);
    }
    familyId = invite.familyId;

    // Hash password and create user
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await usersRepo.create({
      username: trimmedUsername,
      passwordHash,
      familyId,
    });

    // Mark invite as used
    await invitesRepo.markUsed(invite.id, user.id);

    // Link user to the chosen family member, or create a new one
    if (memberId) {
      // Verify the member belongs to this family and is unlinked
      const [member] = await db
        .select()
        .from(familyMembers)
        .where(eq(familyMembers.id, memberId));

      if (member && member.familyId === familyId && !member.userId) {
        await db
          .update(familyMembers)
          .set({ userId: user.id })
          .where(eq(familyMembers.id, memberId));
      } else {
        // Chosen member invalid — create a new one
        await db.insert(familyMembers).values({
          familyId,
          userId: user.id,
          displayName: trimmedUsername,
          role: "parent",
          isActive: true,
        });
      }
    } else {
      // No member chosen — create a new family member
      await db.insert(familyMembers).values({
        familyId,
        userId: user.id,
        displayName: trimmedUsername,
        role: "parent",
        isActive: true,
      });
    }

    // Sign JWT
    const secret = process.env.JWT_SECRET!;
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      sub: user.id,
      familyId: user.familyId,
      username: user.username,
      iat: now,
      exp: now + TOKEN_EXPIRY_SECONDS,
    };
    const token = await sign(payload, secret);

    return c.json(
      {
        token,
        user: {
          id: user.id,
          username: user.username,
          familyId: user.familyId,
          createdAt: new Date(user.createdAt).getTime(),
        },
        issuedAt: now * 1000,
      },
      201,
    );
  }

  // ── Create new family (default flow) ──
  const displayName = familyName?.trim() || trimmedUsername;
  const [family] = await db
    .insert(families)
    .values({ name: displayName })
    .returning();
  familyId = family.id;

  // Hash password and create user
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await usersRepo.create({
    username: trimmedUsername,
    passwordHash,
    familyId,
  });

  // Sign JWT
  const secret = process.env.JWT_SECRET!;
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    sub: user.id,
    familyId: user.familyId,
    username: user.username,
    iat: now,
    exp: now + TOKEN_EXPIRY_SECONDS,
  };
  const token = await sign(payload, secret);

  return c.json(
    {
      token,
      user: {
        id: user.id,
        username: user.username,
        familyId: user.familyId,
        createdAt: new Date(user.createdAt).getTime(),
      },
      issuedAt: now * 1000,
    },
    201,
  );
});

// ---------------------------------------------------------------------------
// POST /login
// ---------------------------------------------------------------------------

authRoutes.post("/login", async (c) => {
  const { username, password } = await c.req.json<{
    username: string;
    password: string;
  }>();

  if (!username || !password) {
    return c.json({ error: "Username and password are required" }, 400);
  }

  const user = await usersRepo.getByUsername(username.trim());
  if (!user) {
    return c.json({ error: "USER_NOT_FOUND" }, 401);
  }

  // Social-login accounts have no password.
  if (!user.passwordHash) {
    return c.json({ error: "USE_SOCIAL_LOGIN" }, 401);
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return c.json({ error: "WRONG_PASSWORD" }, 401);
  }

  const secret = process.env.JWT_SECRET!;
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    sub: user.id,
    familyId: user.familyId,
    username: user.username,
    iat: now,
    exp: now + TOKEN_EXPIRY_SECONDS,
  };
  const token = await sign(payload, secret);

  return c.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      familyId: user.familyId,
      createdAt: new Date(user.createdAt).getTime(),
    },
    issuedAt: now * 1000,
  });
});

// ---------------------------------------------------------------------------
// POST /google — sign in / register with a Google ID token
// ---------------------------------------------------------------------------
//
// First-time users have no family yet, so the client must also send either a
// `familyName` (create new family → onboarding) or an `inviteCode` (join).
// If neither is provided for a brand-new Google user, we return 409
// NEEDS_FAMILY so the client can prompt and retry.

const googleClient = new OAuth2Client();

/** Allowed audiences = our Google OAuth client IDs (web/iOS/Android), CSV env. */
function googleAudiences(): string[] {
  return (process.env.GOOGLE_CLIENT_IDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Build the standard auth response (JWT + user) for any authenticated user. */
async function issueSession(user: {
  id: string;
  username: string | null;
  familyId: string;
  createdAt: Date | number;
}) {
  const secret = process.env.JWT_SECRET!;
  const now = Math.floor(Date.now() / 1000);
  const token = await sign(
    {
      sub: user.id,
      familyId: user.familyId,
      username: user.username ?? null,
      iat: now,
      exp: now + TOKEN_EXPIRY_SECONDS,
    },
    secret,
  );
  return {
    token,
    user: {
      id: user.id,
      username: user.username ?? null,
      familyId: user.familyId,
      createdAt: new Date(user.createdAt).getTime(),
    },
    issuedAt: now * 1000,
  };
}

/**
 * Claim the chosen unlinked member for a joining user, or create a fresh
 * member if no valid one was picked. Shared by the Google + Apple join paths.
 */
async function linkOrCreateMember(
  familyId: string,
  userId: string,
  displayName: string,
  memberId?: string,
) {
  if (memberId) {
    const [member] = await db
      .select()
      .from(familyMembers)
      .where(eq(familyMembers.id, memberId));
    if (member && member.familyId === familyId && !member.userId) {
      await db
        .update(familyMembers)
        .set({ userId })
        .where(eq(familyMembers.id, memberId));
      return;
    }
  }
  await db
    .insert(familyMembers)
    .values({ familyId, userId, displayName, role: "parent", isActive: true });
}

authRoutes.post("/google", async (c) => {
  const { idToken, familyName, inviteCode, memberId } = await c.req.json<{
    idToken?: string;
    familyName?: string;
    inviteCode?: string;
    memberId?: string;
  }>();

  if (!idToken) return c.json({ error: "Missing idToken" }, 400);

  const audiences = googleAudiences();
  if (audiences.length === 0) {
    return c.json({ error: "GOOGLE_NOT_CONFIGURED" }, 500);
  }

  // Verify the Google ID token (signature, expiry, audience) via Google's keys.
  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({ idToken, audience: audiences });
    payload = ticket.getPayload();
  } catch {
    return c.json({ error: "INVALID_GOOGLE_TOKEN" }, 401);
  }
  if (!payload?.sub || !payload.email || !payload.email_verified) {
    return c.json({ error: "INVALID_GOOGLE_TOKEN" }, 401);
  }

  const googleSub = payload.sub;
  const email = payload.email;
  const displayName = payload.name?.trim() || email.split("@")[0] || "חבר";

  // ── Returning Google user → sign in ──
  const existing = await usersRepo.getByGoogleSub(googleSub);
  if (existing) {
    return c.json(await issueSession(existing));
  }

  // ── New Google user → join via invite ──
  if (inviteCode) {
    const invite = await invitesRepo.getValidByCode(inviteCode);
    if (!invite) return c.json({ error: "INVALID_INVITE" }, 400);
    const familyId = invite.familyId;

    const user = await usersRepo.create({ googleSub, email, familyId });
    await invitesRepo.markUsed(invite.id, user.id);
    await linkOrCreateMember(familyId, user.id, displayName, memberId);

    return c.json(await issueSession(user), 201);
  }

  // ── New Google user → create a new family (onboarding creates the member) ──
  if (familyName && familyName.trim()) {
    const [family] = await db
      .insert(families)
      .values({ name: familyName.trim() })
      .returning();
    const user = await usersRepo.create({ googleSub, email, familyId: family.id });
    return c.json(await issueSession(user), 201);
  }

  // First Google sign-in with no family context — client must prompt + retry.
  return c.json({ error: "NEEDS_FAMILY" }, 409);
});

// ---------------------------------------------------------------------------
// POST /apple — sign in / register with an Apple identity token
// ---------------------------------------------------------------------------
//
// Mirrors /google. Apple's identity token is a JWT signed with Apple's keys;
// we verify it against Apple's JWKS (issuer + audience = our app's client IDs,
// i.e. the iOS bundle ID). Apple returns the user's name ONLY on the first
// authorization, so the client forwards `fullName` then; afterwards we fall
// back to the email's local part. Brand-new users with no family yet get a
// 409 NEEDS_FAMILY, exactly like Google.

const APPLE_JWKS = createRemoteJWKSet(
  new URL("https://appleid.apple.com/auth/keys"),
);

/** Allowed audiences = our Apple client IDs (iOS bundle ID, +Services ID for web). */
function appleAudiences(): string[] {
  return (process.env.APPLE_CLIENT_IDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

authRoutes.post("/apple", async (c) => {
  const { identityToken, fullName, familyName, inviteCode, memberId } =
    await c.req.json<{
      identityToken?: string;
      fullName?: string;
      familyName?: string;
      inviteCode?: string;
      memberId?: string;
    }>();

  if (!identityToken) return c.json({ error: "Missing identityToken" }, 400);

  const audiences = appleAudiences();
  if (audiences.length === 0) {
    return c.json({ error: "APPLE_NOT_CONFIGURED" }, 500);
  }

  // Verify the Apple identity token (signature, issuer, audience, expiry).
  let payload;
  try {
    const result = await jwtVerify(identityToken, APPLE_JWKS, {
      issuer: "https://appleid.apple.com",
      audience: audiences,
    });
    payload = result.payload;
  } catch {
    return c.json({ error: "INVALID_APPLE_TOKEN" }, 401);
  }
  if (!payload?.sub) {
    return c.json({ error: "INVALID_APPLE_TOKEN" }, 401);
  }

  const appleSub = payload.sub;
  const email = typeof payload.email === "string" ? payload.email : undefined;
  const displayName =
    fullName?.trim() || (email ? email.split("@")[0] : "") || "חבר";

  // ── Returning Apple user → sign in ──
  const existing = await usersRepo.getByAppleSub(appleSub);
  if (existing) {
    return c.json(await issueSession(existing));
  }

  // ── New Apple user → join via invite ──
  if (inviteCode) {
    const invite = await invitesRepo.getValidByCode(inviteCode);
    if (!invite) return c.json({ error: "INVALID_INVITE" }, 400);
    const familyId = invite.familyId;

    const user = await usersRepo.create({ appleSub, email, familyId });
    await invitesRepo.markUsed(invite.id, user.id);
    await linkOrCreateMember(familyId, user.id, displayName, memberId);

    return c.json(await issueSession(user), 201);
  }

  // ── New Apple user → create a new family (onboarding creates the member) ──
  if (familyName && familyName.trim()) {
    const [family] = await db
      .insert(families)
      .values({ name: familyName.trim() })
      .returning();
    const user = await usersRepo.create({ appleSub, email, familyId: family.id });
    return c.json(await issueSession(user), 201);
  }

  // First Apple sign-in with no family context — client must prompt + retry.
  return c.json({ error: "NEEDS_FAMILY" }, 409);
});

// ---------------------------------------------------------------------------
// GET /me — validate session / return current user
// ---------------------------------------------------------------------------

authRoutes.get("/me", jwtAuth, async (c) => {
  const jwt = c.get("user");
  const user = await usersRepo.getById(jwt.sub);
  if (!user) {
    return c.json({ error: "User not found" }, 404);
  }
  return c.json({
    id: user.id,
    username: user.username,
    familyId: user.familyId,
    createdAt: new Date(user.createdAt).getTime(),
  });
});
