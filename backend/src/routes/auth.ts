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
  const { username, password, inviteCode } = await c.req.json<{
    username: string;
    password: string;
    inviteCode?: string;
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

    // Try to link user to an unlinked family member, or create a new one
    const members = await db
      .select()
      .from(familyMembers)
      .where(eq(familyMembers.familyId, familyId));

    const unlinkedMember = members.find((m) => m.isActive && !m.userId);
    if (unlinkedMember) {
      // Link the first unlinked active member to this user
      await db
        .update(familyMembers)
        .set({ userId: user.id })
        .where(eq(familyMembers.id, unlinkedMember.id));
    } else {
      // Create a new family member for this user
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
  const [family] = await db
    .insert(families)
    .values({ name: trimmedUsername })
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
