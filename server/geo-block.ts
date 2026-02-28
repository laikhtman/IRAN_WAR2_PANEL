import type { Request, Response, NextFunction } from "express";
import { getSetting } from "./admin-settings";
import { db } from "./db";
import { blockedCountries } from "@shared/schema";

// ─── In-memory cache of blocked country codes ────────────────────
let blockedSet = new Set<string>();
let cacheLoadedAt = 0;
const CACHE_TTL_MS = 30000; // refresh from DB every 30s

async function refreshBlockedCountries(): Promise<void> {
  try {
    const rows = await db.select().from(blockedCountries);
    blockedSet = new Set(rows.map(r => r.countryCode.toUpperCase()));
    cacheLoadedAt = Date.now();
  } catch (err: any) {
    console.error("[geo-block] Failed to refresh blocked countries:", err.message);
  }
}

export function getBlockedCountriesSet(): Set<string> {
  return blockedSet;
}

export async function initGeoBlock(): Promise<void> {
  await refreshBlockedCountries();
}

export function geoBlockMiddleware(req: Request, res: Response, next: NextFunction) {
  // Skip if blocking is disabled
  if (!getSetting<boolean>("country_blocking_enabled")) {
    return next();
  }

  // Always allow admin routes
  if (req.path.startsWith("/api/__admin")) {
    return next();
  }

  // Refresh cache periodically (non-blocking)
  if (Date.now() - cacheLoadedAt > CACHE_TTL_MS) {
    refreshBlockedCountries().catch(() => {});
  }

  // Detect country from various headers (Cloudflare, Vercel, custom)
  const country = (
    (req.headers["cf-ipcountry"] as string) ||
    (req.headers["x-vercel-ip-country"] as string) ||
    (req.headers["x-country-code"] as string) ||
    ""
  ).toUpperCase();

  if (!country || country === "XX" || country === "T1") {
    // Unknown country — allow through (don't block Tor/unknown)
    return next();
  }

  const mode = getSetting<string>("country_blocking_mode"); // "block" or "allow"
  const isInList = blockedSet.has(country);
  const shouldBlock = (mode === "block" && isInList) || (mode === "allow" && !isInList);

  if (shouldBlock) {
    const message = getSetting<string>("country_blocking_message") || "Access restricted in your region";
    res.status(403);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(renderBlockPage(message));
    return;
  }

  next();
}

function renderBlockPage(message: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex, nofollow" />
  <title>Access Restricted</title>
  <style>
    body {
      margin: 0; display: flex; justify-content: center; align-items: center;
      min-height: 100vh; background: #0a0e14; color: #e2e8f0;
      font-family: system-ui, -apple-system, sans-serif;
    }
    .box {
      text-align: center; padding: 2rem; max-width: 480px;
    }
    h1 { font-size: 1.5rem; margin-bottom: 1rem; color: #f87171; }
    p { font-size: 1rem; line-height: 1.6; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="box">
    <h1>🚫 Access Restricted</h1>
    <p>${escapeHtml(message)}</p>
  </div>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
