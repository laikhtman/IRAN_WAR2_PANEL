import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { WebSocketServer, WebSocket } from "ws";
import { randomUUID } from "crypto";
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

  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  const clients = new Set<WebSocket>();

  wss.on("connection", (ws) => {
    clients.add(ws);

    ws.on("close", () => {
      clients.delete(ws);
    });
  });

  const eventTemplates: Array<() => Omit<WarEvent, "id" | "timestamp">> = [
    () => ({
      type: "missile_launch" as const,
      title: "New ballistic missile launch detected from Iran",
      description: "IRGC medium-range ballistic missile launch detected via satellite",
      location: "Isfahan, Iran",
      lat: 32.6546 + (Math.random() - 0.5) * 2,
      lng: 51.6680 + (Math.random() - 0.5) * 2,
      country: "Iran",
      source: "Satellite Detection",
      threatLevel: "critical" as const,
      verified: true,
    }),
    () => ({
      type: "missile_intercept" as const,
      title: "Iron Dome interception over southern Israel",
      description: "Iron Dome battery successfully intercepted incoming rocket",
      location: "Southern Israel",
      lat: 31.2 + Math.random() * 0.5,
      lng: 34.3 + Math.random() * 0.5,
      country: "Israel",
      source: "IDF Spokesperson",
      threatLevel: "high" as const,
      verified: true,
    }),
    () => ({
      type: "air_raid_alert" as const,
      title: "Red Alert activated - northern Israel",
      description: "Sirens sounding in northern communities",
      location: "Upper Galilee, Israel",
      lat: 33.0 + Math.random() * 0.3,
      lng: 35.3 + Math.random() * 0.5,
      country: "Israel",
      source: "Pikud HaOref",
      threatLevel: "critical" as const,
      verified: true,
    }),
    () => ({
      type: "drone_launch" as const,
      title: "UAV swarm launched from southern Lebanon",
      description: "Multiple UAVs detected launching toward northern Israel",
      location: "South Lebanon",
      lat: 33.2 + Math.random() * 0.3,
      lng: 35.2 + Math.random() * 0.3,
      country: "Lebanon",
      source: "UNIFIL",
      threatLevel: "high" as const,
      verified: true,
    }),
    () => ({
      type: "missile_launch" as const,
      title: "Rockets launched from Gaza Strip",
      description: "Multiple rocket launches detected from northern Gaza",
      location: "Northern Gaza",
      lat: 31.5 + Math.random() * 0.1,
      lng: 34.45 + Math.random() * 0.1,
      country: "Gaza",
      source: "IDF Spokesperson",
      threatLevel: "high" as const,
      verified: true,
    }),
  ];

  setInterval(() => {
    if (clients.size === 0) return;

    const template = eventTemplates[Math.floor(Math.random() * eventTemplates.length)]();
    const newEvent: WarEvent = {
      ...template,
      id: randomUUID(),
      timestamp: new Date().toISOString(),
    };

    storage.addEvent(newEvent);

    const message = JSON.stringify({ type: "new_event", event: newEvent });
    clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }, 15000 + Math.random() * 15000);

  return httpServer;
}
