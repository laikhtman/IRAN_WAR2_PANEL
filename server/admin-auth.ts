import { randomBytes } from "crypto";
import { db } from "./db";
import { adminSessions } from "@shared/schema";
import { eq, lt } from "drizzle-orm";
import type { Request, Response, NextFunction } from "express";

const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours
const COOKIE_NAME = "__admin_sid";
const LOGIN_RATE_LIMIT = new Map<string, { count: number; resetAt: number }>();
const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_WINDOW_MS = 60000; // 1 minute

/** Check if admin panel is enabled (ADMIN_TOKEN is set) */
export function isAdminEnabled(): boolean {
  return !!process.env.ADMIN_TOKEN;
}

/** Get the admin panel URL path */
export function getAdminPath(): string {
  return process.env.ADMIN_PATH || "panel-272d672e974546a7";
}

/** Middleware: require valid admin session */
export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!isAdminEnabled()) {
    return res.status(404).json({ error: "Not found" });
  }

  const sid = parseCookie(req, COOKIE_NAME);
  if (!sid) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const rows = await db.select().from(adminSessions).where(eq(adminSessions.id, sid)).limit(1);
    if (rows.length === 0) {
      return res.status(401).json({ error: "Session not found" });
    }

    const session = rows[0];
    if (new Date(session.expiresAt) < new Date()) {
      // Clean up expired session
      await db.delete(adminSessions).where(eq(adminSessions.id, sid));
      return res.status(401).json({ error: "Session expired" });
    }

    next();
  } catch (err: any) {
    console.error("[admin-auth] Session check error:", err.message);
    return res.status(500).json({ error: "Internal server error" });
  }
}

/** POST /api/__admin/login */
export async function handleLogin(req: Request, res: Response) {
  if (!isAdminEnabled()) {
    return res.status(404).json({ error: "Not found" });
  }

  // Rate limiting
  const ip = req.ip || "unknown";
  const now = Date.now();
  const rl = LOGIN_RATE_LIMIT.get(ip);
  if (rl) {
    if (now < rl.resetAt) {
      if (rl.count >= MAX_LOGIN_ATTEMPTS) {
        return res.status(429).json({ error: "Too many login attempts, try again later" });
      }
      rl.count++;
    } else {
      LOGIN_RATE_LIMIT.set(ip, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
    }
  } else {
    LOGIN_RATE_LIMIT.set(ip, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
  }

  const { token } = req.body || {};
  if (!token || token !== process.env.ADMIN_TOKEN) {
    return res.status(401).json({ error: "Invalid token" });
  }

  // Create session
  const sid = randomBytes(32).toString("hex");
  const createdAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS).toISOString();

  await db.insert(adminSessions).values({ id: sid, createdAt, expiresAt });

  // Clean up expired sessions
  await db.delete(adminSessions).where(lt(adminSessions.expiresAt, new Date().toISOString()));

  // Set cookie
  res.setHeader("Set-Cookie", buildCookie(sid, SESSION_DURATION_MS));
  res.json({ ok: true, expiresAt });
}

/** POST /api/__admin/logout */
export async function handleLogout(req: Request, res: Response) {
  const sid = parseCookie(req, COOKIE_NAME);
  if (sid) {
    await db.delete(adminSessions).where(eq(adminSessions.id, sid)).catch(() => {});
  }
  res.setHeader("Set-Cookie", buildCookie("", 0));
  res.json({ ok: true });
}

/** GET /api/__admin/session */
export async function handleSessionCheck(req: Request, res: Response) {
  if (!isAdminEnabled()) {
    return res.status(404).json({ error: "Not found" });
  }

  const sid = parseCookie(req, COOKIE_NAME);
  if (!sid) {
    return res.status(401).json({ error: "No session" });
  }

  try {
    const rows = await db.select().from(adminSessions).where(eq(adminSessions.id, sid)).limit(1);
    if (rows.length === 0 || new Date(rows[0].expiresAt) < new Date()) {
      return res.status(401).json({ error: "Session invalid or expired" });
    }
    res.json({ valid: true, expiresAt: rows[0].expiresAt });
  } catch {
    return res.status(500).json({ error: "Internal server error" });
  }
}

// ─── Helpers ─────────────────────────────────────────────────────

function parseCookie(req: Request, name: string): string | undefined {
  // Try cookie-parser first (if middleware is installed)
  if ((req as any).cookies && (req as any).cookies[name]) {
    return (req as any).cookies[name];
  }
  // Fallback: parse manually
  const header = req.headers.cookie || "";
  const match = header.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? match[1] : undefined;
}

function buildCookie(value: string, maxAgeMs: number): string {
  const parts = [
    `${COOKIE_NAME}=${value}`,
    `Path=/`,
    `HttpOnly`,
    `SameSite=Strict`,
    `Max-Age=${Math.floor(maxAgeMs / 1000)}`,
  ];
  if (process.env.NODE_ENV === "production") {
    parts.push("Secure");
  }
  return parts.join("; ");
}
