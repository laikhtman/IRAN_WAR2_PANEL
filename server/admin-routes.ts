import type { Express, Request, Response } from "express";
import { db } from "./db";
import { eq, desc, sql, like, and, or, asc, count } from "drizzle-orm";
import {
  warEvents, newsItems, alerts, blockedCountries,
  agents, agentLogs,
} from "@shared/schema";
import type { Agent } from "@shared/schema";
import { requireAdmin, handleLogin, handleLogout, handleSessionCheck, isAdminEnabled } from "./admin-auth";
import { getAllSettings, setSetting, setSettingsBulk } from "./admin-settings";
import { getBlockedCountriesSet, initGeoBlock } from "./geo-block";
import { getDataSourceHealthStatus } from "./data-fetcher";
import { storage } from "./storage";
import { randomUUID } from "crypto";

export function registerAdminRoutes(app: Express): void {
  // If admin is not enabled, don't register any routes
  // (routes will still be checked at runtime via middleware)

  // ─── Auth (no requireAdmin) ────────────────────────────────────
  app.post("/api/__admin/login", handleLogin);
  app.post("/api/__admin/logout", handleLogout);
  app.get("/api/__admin/session", handleSessionCheck);

  // ─── All routes below require admin auth ───────────────────────
  app.use("/api/__admin", requireAdmin);

  // ─── Settings ──────────────────────────────────────────────────
  app.get("/api/__admin/settings", async (_req: Request, res: Response) => {
    res.json(getAllSettings());
  });

  app.put("/api/__admin/settings", async (req: Request, res: Response) => {
    const { key, value } = req.body || {};
    if (!key) return res.status(400).json({ error: "key is required" });
    await setSetting(key, value);
    res.json({ ok: true });
  });

  app.put("/api/__admin/settings/bulk", async (req: Request, res: Response) => {
    const { settings } = req.body || {};
    if (!Array.isArray(settings)) return res.status(400).json({ error: "settings array is required" });
    const updated = await setSettingsBulk(settings);
    res.json({ ok: true, updated });
  });

  // ─── Health ────────────────────────────────────────────────────
  app.get("/api/__admin/health", async (_req: Request, res: Response) => {
    try {
      let dbStatus: "ok" | "error" = "ok";
      let dbError = "";
      let dbCounts = { events: 0, news: 0, alerts: 0, satellite: 0 };
      try {
        const events = await storage.getEvents();
        const news = await storage.getNews();
        const alertsList = await storage.getAlerts();
        const satellite = await storage.getSatelliteImages();
        dbCounts = {
          events: events.length,
          news: news.length,
          alerts: alertsList.length,
          satellite: satellite.length,
        };
      } catch (err: any) {
        dbStatus = "error";
        dbError = err.message;
      }

      const envVars: Record<string, "configured" | "missing"> = {
        DATABASE_URL: process.env.DATABASE_URL ? "configured" : "missing",
        OPENAI_API_KEY: process.env.OPENAI_API_KEY ? "configured" : "missing",
        PROXY_BASE_URL: process.env.PROXY_BASE_URL ? "configured" : "missing",
        PROXY_AUTH_TOKEN: process.env.PROXY_AUTH_TOKEN ? "configured" : "missing",
        RSSAPP_API_KEY: process.env.RSSAPP_API_KEY ? "configured" : "missing",
        RSSAPP_API_SECRET: process.env.RSSAPP_API_SECRET ? "configured" : "missing",
        MARINETRAFFIC_API_KEY: process.env.MARINETRAFFIC_API_KEY ? "configured" : "missing",
        ADSBX_API_KEY: process.env.ADSBX_API_KEY ? "configured" : "missing",
        SENTINELHUB_CLIENT_ID: process.env.SENTINELHUB_CLIENT_ID ? "configured" : "missing",
        SENTINELHUB_CLIENT_SECRET: process.env.SENTINELHUB_CLIENT_SECRET ? "configured" : "missing",
        SENTINELHUB_INSTANCE_ID: process.env.SENTINELHUB_INSTANCE_ID ? "configured" : "missing",
        SENTINELHUB_API_KEY: process.env.SENTINELHUB_API_KEY ? "configured" : "missing",
        ADMIN_TOKEN: process.env.ADMIN_TOKEN ? "configured" : "missing",
      };

      const dataSources = getDataSourceHealthStatus();

      res.json({
        timestamp: new Date().toISOString(),
        database: { status: dbStatus, error: dbError, counts: dbCounts },
        envVars,
        dataSources,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ─── Country Blocking ──────────────────────────────────────────
  app.get("/api/__admin/countries/blocked", async (_req: Request, res: Response) => {
    const rows = await db.select().from(blockedCountries);
    res.json(rows);
  });

  app.post("/api/__admin/countries/blocked", async (req: Request, res: Response) => {
    const { code, name } = req.body || {};
    if (!code || !name) return res.status(400).json({ error: "code and name required" });
    await db.insert(blockedCountries).values({
      countryCode: code.toUpperCase(),
      countryName: name,
      blockedAt: new Date().toISOString(),
    }).onConflictDoNothing();
    await initGeoBlock(); // refresh cache
    res.json({ ok: true });
  });

  app.delete("/api/__admin/countries/blocked/:code", async (req: Request, res: Response) => {
    await db.delete(blockedCountries).where(eq(blockedCountries.countryCode, String(req.params.code).toUpperCase()));
    await initGeoBlock();
    res.json({ ok: true });
  });

  app.put("/api/__admin/countries/blocked/bulk", async (req: Request, res: Response) => {
    const { countries } = req.body || {};
    if (!Array.isArray(countries)) return res.status(400).json({ error: "countries array required" });
    for (const c of countries) {
      await db.insert(blockedCountries).values({
        countryCode: c.code.toUpperCase(),
        countryName: c.name,
        blockedAt: new Date().toISOString(),
      }).onConflictDoNothing();
    }
    await initGeoBlock();
    res.json({ ok: true, count: countries.length });
  });

  // ─── News Database ─────────────────────────────────────────────
  app.get("/api/__admin/news", async (req: Request, res: Response) => {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
    const offset = (page - 1) * limit;
    const search = (req.query.search as string) || "";
    const category = (req.query.category as string) || "";
    const sortField = (req.query.sort as string) || "timestamp";
    const order = (req.query.order as string) === "asc" ? "asc" : "desc";

    const conditions = [];
    if (search) {
      conditions.push(like(newsItems.title, `%${search}%`));
    }
    if (category) {
      conditions.push(eq(newsItems.category, category));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const orderColumn = sortField === "source" ? newsItems.source
      : sortField === "category" ? newsItems.category
      : newsItems.timestamp;
    const orderFn = order === "asc" ? asc(orderColumn) : desc(orderColumn);

    const [items, totalResult] = await Promise.all([
      db.select().from(newsItems).where(whereClause).orderBy(orderFn).limit(limit).offset(offset),
      db.select({ count: sql<number>`count(*)` }).from(newsItems).where(whereClause),
    ]);

    const total = Number(totalResult[0].count);
    res.json({ items, total, page, pages: Math.ceil(total / limit) });
  });

  app.get("/api/__admin/news/:id", async (req: Request, res: Response) => {
    const rows = await db.select().from(newsItems).where(eq(newsItems.id, String(req.params.id))).limit(1);
    if (rows.length === 0) return res.status(404).json({ error: "Not found" });
    res.json(rows[0]);
  });

  app.put("/api/__admin/news/:id", async (req: Request, res: Response) => {
    const updates = req.body || {};
    delete updates.id; // Don't allow ID change
    if (Object.keys(updates).length === 0) return res.status(400).json({ error: "No fields to update" });
    await db.update(newsItems).set(updates).where(eq(newsItems.id, String(req.params.id)));
    res.json({ ok: true });
  });

  app.delete("/api/__admin/news/:id", async (req: Request, res: Response) => {
    await db.delete(newsItems).where(eq(newsItems.id, String(req.params.id)));
    res.json({ ok: true });
  });

  app.delete("/api/__admin/news/bulk", async (req: Request, res: Response) => {
    const { ids } = req.body || {};
    if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: "ids array required" });
    let deleted = 0;
    for (const id of ids) {
      await db.delete(newsItems).where(eq(newsItems.id, id));
      deleted++;
    }
    res.json({ ok: true, deleted });
  });

  // ─── Events Database ───────────────────────────────────────────
  app.get("/api/__admin/events", async (req: Request, res: Response) => {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
    const offset = (page - 1) * limit;
    const search = (req.query.search as string) || "";
    const type = (req.query.type as string) || "";
    const country = (req.query.country as string) || "";
    const order = (req.query.order as string) === "asc" ? "asc" : "desc";

    const conditions = [];
    if (search) {
      conditions.push(or(
        like(warEvents.title, `%${search}%`),
        like(warEvents.description, `%${search}%`),
        like(warEvents.location, `%${search}%`),
      ));
    }
    if (type) conditions.push(eq(warEvents.type, type));
    if (country) conditions.push(eq(warEvents.country, country));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const orderFn = order === "asc" ? asc(warEvents.timestamp) : desc(warEvents.timestamp);

    const [items, totalResult] = await Promise.all([
      db.select().from(warEvents).where(whereClause).orderBy(orderFn).limit(limit).offset(offset),
      db.select({ count: sql<number>`count(*)` }).from(warEvents).where(whereClause),
    ]);

    const total = Number(totalResult[0].count);
    res.json({ items, total, page, pages: Math.ceil(total / limit) });
  });

  app.delete("/api/__admin/events/:id", async (req: Request, res: Response) => {
    await db.delete(warEvents).where(eq(warEvents.id, String(req.params.id)));
    res.json({ ok: true });
  });

  app.delete("/api/__admin/events/bulk", async (req: Request, res: Response) => {
    const { ids } = req.body || {};
    if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: "ids array required" });
    let deleted = 0;
    for (const id of ids) {
      await db.delete(warEvents).where(eq(warEvents.id, id));
      deleted++;
    }
    res.json({ ok: true, deleted });
  });

  // ─── Data Sources ──────────────────────────────────────────────
  app.get("/api/__admin/data-sources", async (_req: Request, res: Response) => {
    const sources = getDataSourceHealthStatus();
    res.json(sources);
  });

  // ─── Agents CRUD ───────────────────────────────────────────────
  app.get("/api/__admin/agents", async (_req: Request, res: Response) => {
    const rows = await db.select().from(agents).orderBy(desc(agents.updatedAt));
    res.json(rows);
  });

  app.post("/api/__admin/agents", async (req: Request, res: Response) => {
    const { name, type, description, enabled, scheduleCron, config } = req.body || {};
    if (!name || !type) return res.status(400).json({ error: "name and type are required" });
    const now = new Date().toISOString();
    const agent = {
      id: randomUUID(),
      name,
      type,
      description: description || null,
      enabled: enabled ?? true,
      scheduleCron: scheduleCron || null,
      config: config || {},
      lastRunAt: null,
      lastResult: null,
      createdAt: now,
      updatedAt: now,
    };
    await db.insert(agents).values(agent);
    res.json(agent);
  });

  app.get("/api/__admin/agents/stats", async (_req: Request, res: Response) => {
    const [totalRunsResult, totalTokensResult, successResult, totalForRate] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(agentLogs),
      db.select({ total: sql<number>`coalesce(sum(tokens_used), 0)` }).from(agentLogs),
      db.select({ count: sql<number>`count(*)` }).from(agentLogs).where(eq(agentLogs.status, "success")),
      db.select({ count: sql<number>`count(*)` }).from(agentLogs).where(
        or(eq(agentLogs.status, "success"), eq(agentLogs.status, "error"))
      ),
    ]);
    const totalRuns = Number(totalRunsResult[0].count);
    const totalTokens = Number(totalTokensResult[0].total);
    const successCount = Number(successResult[0].count);
    const completedCount = Number(totalForRate[0].count);
    const successRate = completedCount > 0 ? Math.round((successCount / completedCount) * 1000) / 10 : 0;
    res.json({ totalRuns, totalTokens, successRate });
  });

  app.get("/api/__admin/agents/:id", async (req: Request, res: Response) => {
    const rows = await db.select().from(agents).where(eq(agents.id, String(req.params.id))).limit(1);
    if (rows.length === 0) return res.status(404).json({ error: "Agent not found" });
    const recentLogs = await db.select().from(agentLogs)
      .where(eq(agentLogs.agentId, String(req.params.id)))
      .orderBy(desc(agentLogs.createdAt))
      .limit(10);
    res.json({ ...rows[0], recentLogs });
  });

  app.put("/api/__admin/agents/:id", async (req: Request, res: Response) => {
    const updates = req.body || {};
    delete updates.id;
    delete updates.createdAt;
    updates.updatedAt = new Date().toISOString();
    await db.update(agents).set(updates).where(eq(agents.id, String(req.params.id)));
    res.json({ ok: true });
  });

  app.delete("/api/__admin/agents/:id", async (req: Request, res: Response) => {
    await db.delete(agents).where(eq(agents.id, String(req.params.id)));
    res.json({ ok: true });
  });

  app.post("/api/__admin/agents/:id/run", async (req: Request, res: Response) => {
    // Manual trigger — we'll import the runner dynamically to avoid circular deps
    try {
      const { runAgent } = await import("./agent-runner");
      const logId = await runAgent(String(req.params.id));
      res.json({ ok: true, logId });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/__admin/agents/:id/logs", async (req: Request, res: Response) => {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const offset = (page - 1) * limit;

    const [logs, totalResult] = await Promise.all([
      db.select().from(agentLogs)
        .where(eq(agentLogs.agentId, String(req.params.id)))
        .orderBy(desc(agentLogs.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ count: sql<number>`count(*)` }).from(agentLogs)
        .where(eq(agentLogs.agentId, String(req.params.id))),
    ]);

    const total = Number(totalResult[0].count);
    res.json({ logs, total, page, pages: Math.ceil(total / limit) });
  });
}
