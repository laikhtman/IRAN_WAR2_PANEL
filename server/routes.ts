import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { WebSocketServer, WebSocket } from "ws";
import { startDataFetcher, setNewEventCallback, processRSSWebhook, getDataSourceHealthStatus } from "./data-fetcher";
import { getRecentLogs, wsConnect, wsDisconnect } from "./logger";
import type { WarEvent } from "@shared/schema";
import { BASE_URL, ROBOTS_DISALLOW, SUPPORTED_LANGS, RSS } from "@shared/seo-config";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // ─── SEO routes ──────────────────────────────────────────────────────
  app.get("/robots.txt", (_req, res) => {
    const lines = [
      "User-agent: *",
      "Allow: /",
      ...ROBOTS_DISALLOW.map(p => `Disallow: ${p}`),
      "",
      `Sitemap: ${BASE_URL}/sitemap.xml`,
    ];
    res.setHeader("Content-Type", "text/plain");
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.send(lines.join("\n"));
  });

  app.get("/sitemap.xml", (_req, res) => {
    const pages = ["/"];
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n`;
    xml += `        xmlns:xhtml="http://www.w3.org/1999/xhtml">\n`;
    for (const page of pages) {
      xml += `  <url>\n`;
      xml += `    <loc>${BASE_URL}${page}</loc>\n`;
      for (const lang of SUPPORTED_LANGS) {
        xml += `    <xhtml:link rel="alternate" hreflang="${lang}" href="${BASE_URL}${page}${page.includes("?") ? "&" : "?"}hl=${lang}" />\n`;
      }
      xml += `    <xhtml:link rel="alternate" hreflang="x-default" href="${BASE_URL}${page}" />\n`;
      xml += `    <changefreq>always</changefreq>\n`;
      xml += `    <priority>1.0</priority>\n`;
      xml += `  </url>\n`;
    }
    xml += `</urlset>`;
    res.setHeader("Content-Type", "application/xml");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.send(xml);
  });

  app.get("/feed.xml", async (_req, res) => {
    try {
      const events = await storage.getEvents();
      const items = events.slice(0, RSS.maxItems);
      let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
      xml += `<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n`;
      xml += `  <channel>\n`;
      xml += `    <title>${escapeXml(RSS.title)}</title>\n`;
      xml += `    <link>${BASE_URL}</link>\n`;
      xml += `    <description>${escapeXml(RSS.description)}</description>\n`;
      xml += `    <language>${RSS.language}</language>\n`;
      xml += `    <atom:link href="${BASE_URL}${RSS.path}" rel="self" type="application/rss+xml" />\n`;
      xml += `    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>\n`;
      for (const event of items) {
        xml += `    <item>\n`;
        xml += `      <title>${escapeXml(event.type.toUpperCase().replace(/_/g, " "))} — ${escapeXml(event.location)}</title>\n`;
        xml += `      <description>${escapeXml(event.description || "")}</description>\n`;
        xml += `      <pubDate>${new Date(event.timestamp).toUTCString()}</pubDate>\n`;
        xml += `      <guid isPermaLink="false">event-${event.id}</guid>\n`;
        xml += `    </item>\n`;
      }
      xml += `  </channel>\n`;
      xml += `</rss>`;
      res.setHeader("Content-Type", "application/rss+xml; charset=utf-8");
      res.setHeader("Cache-Control", "public, max-age=300");
      res.send(xml);
    } catch (err: any) {
      res.status(500).send("<!-- RSS feed generation failed -->");
    }
  });

  // ─── API routes ──────────────────────────────────────────────────────
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
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
    });
  });

  app.get("/api/data-sources/status", async (_req, res) => {
    try {
      const status = getDataSourceHealthStatus();
      res.json(status);
    } catch (err: any) {
      res.status(500).json({ error: "Failed to retrieve data source status" });
    }
  });

  app.get("/api/admin/logs", (req, res) => {
    const level = req.query.level as string | undefined;
    const source = req.query.source as string | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;
    const logs = getRecentLogs({
      level: level as any,
      source,
      limit: Math.min(limit, 500),
    });
    res.json(logs);
  });

  app.post("/api/feedback", async (req, res) => {
    try {
      const { message, email, url, userAgent, timestamp } = req.body || {};
      if (!message || typeof message !== "string" || message.trim().length === 0) {
        return res.status(400).json({ error: "Message is required" });
      }
      if (message.length > 2000) {
        return res.status(400).json({ error: "Message too long" });
      }
      await storage.submitFeedback({
        message: message.trim(),
        email: email || null,
        url: url || null,
        userAgent: userAgent || null,
        createdAt: timestamp || new Date().toISOString(),
      });
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to save feedback" });
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
  // RSS.app may send various content types, so we handle them all gracefully
  app.post("/api/webhooks/rss", async (req, res) => {
    try {
      let body = req.body;

      // If body is empty/undefined (e.g. content-type not application/json),
      // try to parse from rawBody or read as text
      if (!body || (typeof body === "object" && Object.keys(body).length === 0)) {
        const raw = (req as any).rawBody;
        if (raw) {
          try {
            body = JSON.parse(raw.toString());
          } catch {
            console.warn("[webhook/rss] Could not parse rawBody as JSON, using as-is");
            body = { raw: raw.toString() };
          }
        }
      }

      // If body is a string (e.g. text/plain), try to parse as JSON
      if (typeof body === "string") {
        try {
          body = JSON.parse(body);
        } catch {
          console.warn("[webhook/rss] Body is string but not valid JSON");
          body = { raw: body };
        }
      }

      console.log("[webhook/rss] Received payload type:", typeof body, "keys:", body ? Object.keys(body) : "null");
      // Dump full payload to file for debugging
      const fs = await import("fs");
      fs.writeFileSync("/tmp/rss_webhook_payload.json", JSON.stringify(body, null, 2));
      console.log("[webhook/rss] Full payload dumped to /tmp/rss_webhook_payload.json");
      const count = await processRSSWebhook(body);
      res.json({ ok: true, ingested: count });
    } catch (err: any) {
      console.error("[webhook/rss] Error:", err.message);
      console.error("[webhook/rss] Stack:", err.stack);
      res.status(500).json({ error: "Failed to process webhook" });
    }
  });

  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });
  const clients = new Set<WebSocket>();

  wss.on("connection", (ws, req) => {
    clients.add(ws);
    wsConnect(clients.size, req.socket.remoteAddress);
    ws.on("close", () => {
      clients.delete(ws);
      wsDisconnect(clients.size, req.socket.remoteAddress);
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

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
