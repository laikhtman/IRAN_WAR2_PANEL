import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { WebSocketServer, WebSocket } from "ws";
import { startDataFetcher, setNewEventCallback, processRSSWebhook, getDataSourceHealthStatus } from "./data-fetcher";
import type { WarEvent } from "@shared/schema";
import { db } from "./db";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.get("/api/events", async (_req, res) => {
    const events = await storage.getEvents();
    res.json(events);
  });

  app.get("/api/statistics", async (_req, res) => {
    const stats = await storage.getStatistics();
    res.json(stats);
  });

  app.get("/api/news", async (_req, res) => {
    const news = await storage.getNews();
    res.json(news);
  });

  app.get("/api/alerts", async (_req, res) => {
    const alerts = await storage.getAlerts();
    res.json(alerts);
  });

  app.get("/api/ai-summary", async (_req, res) => {
    const summary = await storage.getAISummary();
    res.json(summary);
  });

  app.get("/api/health", async (_req, res) => {
    const seeded = await storage.isSeeded();
    res.json({
      status: "ok",
      database: seeded ? "populated" : "empty",
      timestamp: new Date().toISOString(),
    });
  });

  // ─── Comprehensive system health endpoint ────────────────────────────────
  app.get("/api/system-health", async (_req, res) => {
    try {
      // 1. Database connectivity
      let dbStatus: "ok" | "error" = "ok";
      let dbError = "";
      let dbCounts = { events: 0, news: 0, alerts: 0, satellite: 0 };
      try {
        const events = await storage.getEvents();
        const news = await storage.getNews();
        const alerts = await storage.getAlerts();
        const satellite = await storage.getSatelliteImages();
        dbCounts = {
          events: events.length,
          news: news.length,
          alerts: alerts.length,
          satellite: satellite.length,
        };
      } catch (err: any) {
        dbStatus = "error";
        dbError = err.message;
      }

      // 2. Environment variables / API keys
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
      };

      // 3. Data source fetcher status
      const dataSources = getDataSourceHealthStatus();

      // 4. WebSocket status
      const wsClients = clients.size;

      res.json({
        timestamp: new Date().toISOString(),
        database: { status: dbStatus, error: dbError, counts: dbCounts },
        envVars,
        dataSources,
        webSocket: { connectedClients: wsClients },
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/news/sentiment", async (_req, res) => {
    const sentiment = await storage.getNewsSentiment();
    res.json(sentiment);
  });

  app.get("/api/satellite-images", async (_req, res) => {
    const images = await storage.getSatelliteImages();
    res.json(images);
  });

  app.get("/api/satellite-images/:id/tile", async (req, res) => {
    try {
      const images = await storage.getSatelliteImages();
      const image = images.find(img => img.id === req.params.id);
      if (!image) {
        return res.status(404).json({ error: "Image not found" });
      }

      // Proxy the Sentinel Hub WMS tile to avoid exposing credentials
      // Determine auth: if URL already has AUTH_TOKEN param (API key mode), no extra header needed
      const headers: Record<string, string> = {};
      if (!image.imageUrl.includes("AUTH_TOKEN=")) {
        // OAuth mode — need Bearer token (use stored secret as fallback)
        const secret = process.env.SENTINELHUB_CLIENT_SECRET || "";
        if (secret && !secret.startsWith("PLAK")) {
          // TODO: ideally we'd get a fresh OAuth token here, but for the tile proxy
          // we rely on the token being embedded or use API key fallback
          headers["Authorization"] = `Bearer ${secret}`;
        }
      }
      const response = await fetch(image.imageUrl, { headers });

      if (!response.ok) {
        return res.status(502).json({ error: "Failed to fetch satellite tile" });
      }

      const buffer = await response.arrayBuffer();
      res.setHeader("Content-Type", "image/png");
      res.setHeader("Cache-Control", "public, max-age=3600");
      res.send(Buffer.from(buffer));
    } catch (err: any) {
      console.error("[satellite-tile] Error:", err.message);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // RSS.app webhook — receives instant push when new feed items arrive
  app.post("/api/webhooks/rss", async (req, res) => {
    try {
      const count = await processRSSWebhook(req.body);
      res.json({ ok: true, ingested: count });
    } catch (err: any) {
      console.error("[webhook/rss] Error:", err.message);
      res.status(500).json({ error: "Failed to process webhook" });
    }
  });

  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });
  const clients = new Set<WebSocket>();

  wss.on("connection", (ws) => {
    clients.add(ws);
    ws.on("close", () => {
      clients.delete(ws);
    });
  });

  const broadcast = (event: WarEvent) => {
    const message = JSON.stringify({ type: "new_event", event });
    clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  };

  // No seed data — production uses only live data from fetchers
  setNewEventCallback(broadcast);
  startDataFetcher();

  return httpServer;
}
