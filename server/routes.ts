import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { WebSocketServer, WebSocket } from "ws";
import { seedIfEmpty } from "./seed";
import { startDataFetcher, setNewEventCallback, processRSSWebhook } from "./data-fetcher";
import type { WarEvent } from "@shared/schema";

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

  app.get("/api/news/sentiment", async (_req, res) => {
    const sentiment = await storage.getNewsSentiment();
    res.json(sentiment);
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

  await seedIfEmpty();

  setNewEventCallback(broadcast);
  startDataFetcher();

  return httpServer;
}
