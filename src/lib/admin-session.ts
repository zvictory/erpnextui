// Server-only module — in-memory session store for superuser admin

import crypto from "crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "stable-admin-session";
const SESSION_TTL = 24 * 60 * 60 * 1000; // 24 hours

interface Session {
  id: string;
  createdAt: number;
  expiresAt: number;
}

// In-memory session store (doesn't survive server restart — acceptable for single superuser)
const sessions = new Map<string, Session>();

// Rate limiting for login attempts
const loginAttempts = new Map<string, { count: number; lockedUntil: number }>();
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

export function checkRateLimit(ip: string): { allowed: boolean; retryAfterMs?: number } {
  const record = loginAttempts.get(ip);
  if (!record) return { allowed: true };

  if (record.lockedUntil > Date.now()) {
    return { allowed: false, retryAfterMs: record.lockedUntil - Date.now() };
  }

  // Lockout expired — reset
  if (record.lockedUntil <= Date.now() && record.count >= MAX_ATTEMPTS) {
    loginAttempts.delete(ip);
    return { allowed: true };
  }

  return { allowed: true };
}

export function recordFailedAttempt(ip: string): void {
  const record = loginAttempts.get(ip) ?? { count: 0, lockedUntil: 0 };
  record.count += 1;
  if (record.count >= MAX_ATTEMPTS) {
    record.lockedUntil = Date.now() + LOCKOUT_MS;
  }
  loginAttempts.set(ip, record);
}

export function clearAttempts(ip: string): void {
  loginAttempts.delete(ip);
}

export function createSession(): string {
  // Clean up expired sessions periodically
  const now = Date.now();
  for (const [id, session] of sessions) {
    if (session.expiresAt <= now) sessions.delete(id);
  }

  const id = crypto.randomBytes(32).toString("hex");
  sessions.set(id, {
    id,
    createdAt: now,
    expiresAt: now + SESSION_TTL,
  });
  return id;
}

export function validateSession(sessionId: string): boolean {
  const session = sessions.get(sessionId);
  if (!session) return false;
  if (session.expiresAt <= Date.now()) {
    sessions.delete(sessionId);
    return false;
  }
  return true;
}

export function destroySession(sessionId: string): void {
  sessions.delete(sessionId);
}

export async function setSessionCookie(sessionId: string): Promise<void> {
  const jar = await cookies();
  jar.set(COOKIE_NAME, sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL / 1000,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}

export async function getSessionIdFromCookie(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(COOKIE_NAME)?.value ?? null;
}
