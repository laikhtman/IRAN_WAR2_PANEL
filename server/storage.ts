import { db } from "./db";
import { eq, desc, sql, lt, and } from "drizzle-orm";
import { warEvents, newsItems, alerts, aiSummaries, satelliteImages } from "@shared/schema";
import type { WarEvent, Statistics, NewsItem, Alert, AISummary, SatelliteImage } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getEvents(): Promise<WarEvent[]>;
  addEvent(event: WarEvent): Promise<WarEvent>;
  addEvents(events: WarEvent[]): Promise<void>;
  getStatistics(): Promise<Statistics>;
  getNews(): Promise<NewsItem[]>;
  addNews(items: NewsItem[]): Promise<void>;
  getAlerts(): Promise<Alert[]>;
  addAlerts(alertList: Alert[]): Promise<void>;
  updateAlert(id: string, active: boolean): Promise<void>;
  expireAlertsBefore(cutoffIso: string): Promise<void>;
  getAISummary(): Promise<AISummary>;
  setAISummary(summary: AISummary): Promise<void>;
  isSeeded(): Promise<boolean>;
  updateNewsSentiment(newsId: string, score: number): Promise<void>;
  getNewsSentiment(): Promise<{ average: number; trend: string; sampleSize: number }>;
  deleteEventsByType(type: string): Promise<void>;
  addSatelliteImages(images: Array<{ id: string; eventId: string; imageUrl: string; bboxWest: number; bboxSouth: number; bboxEast: number; bboxNorth: number; capturedAt: string; createdAt: string }>): Promise<void>;
  getSatelliteImages(): Promise<SatelliteImage[]>;
}

export class DatabaseStorage implements IStorage {
  async getEvents(): Promise<WarEvent[]> {
    const rows = await db.select().from(warEvents).orderBy(desc(warEvents.timestamp)).limit(200);
    return rows.map(r => ({
      id: r.id,
      type: r.type as WarEvent["type"],
      title: r.title,
      description: r.description,
      location: r.location,
      lat: r.lat,
      lng: r.lng,
      country: r.country,
      source: r.source,
      timestamp: r.timestamp,
      threatLevel: r.threatLevel as WarEvent["threatLevel"],
      verified: r.verified,
      aiClassified: r.aiClassified,
    }));
  }

  async addEvent(event: WarEvent): Promise<WarEvent> {
    await db.insert(warEvents).values({
      id: event.id,
      type: event.type,
      title: event.title,
      description: event.description,
      location: event.location,
      lat: event.lat,
      lng: event.lng,
      country: event.country,
      source: event.source,
      timestamp: event.timestamp,
      threatLevel: event.threatLevel,
      verified: event.verified,
      aiClassified: event.aiClassified ?? false,
    }).onConflictDoNothing();

    const oldCount = await db.select({ count: sql<number>`count(*)` }).from(warEvents);
    if (oldCount[0].count > 500) {
      const excess = Number(oldCount[0].count) - 500;
      await db.execute(sql`DELETE FROM war_events WHERE id IN (SELECT id FROM war_events ORDER BY timestamp ASC LIMIT ${excess})`);
    }

    return event;
  }

  async addEvents(events: WarEvent[]): Promise<void> {
    if (events.length === 0) return;
    const values = events.map(e => ({
      id: e.id,
      type: e.type,
      title: e.title,
      description: e.description,
      location: e.location,
      lat: e.lat,
      lng: e.lng,
      country: e.country,
      source: e.source,
      timestamp: e.timestamp,
      threatLevel: e.threatLevel,
      verified: e.verified,
      aiClassified: e.aiClassified ?? false,
    }));
    await db.insert(warEvents).values(values).onConflictDoNothing();
  }

  async getStatistics(): Promise<Statistics> {
    const allEvents = await this.getEvents();

    const launched = allEvents.filter(e => e.type === "missile_launch").length;
    const intercepted = allEvents.filter(e => e.type === "missile_intercept").length;
    const hits = allEvents.filter(e => e.type === "missile_hit").length;
    const dronesLaunched = allEvents.filter(e => e.type === "drone_launch").length;
    const dronesIntercepted = allEvents.filter(e => e.type === "drone_intercept").length;

    const byCountry: Record<string, { launched: number; intercepted: number; hits: number }> = {};
    allEvents.forEach(e => {
      if (!byCountry[e.country]) {
        byCountry[e.country] = { launched: 0, intercepted: 0, hits: 0 };
      }
      if (e.type === "missile_launch" || e.type === "drone_launch") byCountry[e.country].launched++;
      if (e.type === "missile_intercept" || e.type === "drone_intercept") byCountry[e.country].intercepted++;
      if (e.type === "missile_hit") byCountry[e.country].hits++;
    });

    const filteredByCountry: Record<string, { launched: number; intercepted: number; hits: number }> = {};
    for (const [k, v] of Object.entries(byCountry)) {
      if (v.launched > 0 || v.intercepted > 0 || v.hits > 0) {
        filteredByCountry[k] = v;
      }
    }

    const totalAttempts = launched + dronesLaunched;
    const totalDefended = intercepted + dronesIntercepted;
    const rate = totalAttempts > 0 ? Math.round((totalDefended / totalAttempts) * 1000) / 10 : 0;

    const activeAlertCount = await db.select({ count: sql<number>`count(*)` })
      .from(alerts).where(eq(alerts.active, true));

    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 3600000).toISOString();
    const recent = allEvents.filter(e => e.timestamp > yesterday);

    return {
      totalMissilesLaunched: launched,
      totalIntercepted: intercepted,
      totalHits: hits,
      totalDronesLaunched: dronesLaunched,
      totalDronesIntercepted: dronesIntercepted,
      interceptionRate: rate,
      byCountry: filteredByCountry,
      bySystem: intercepted > 0 ? {
        "Iron Dome": Math.round(intercepted * 0.6),
        "Arrow-2": Math.round(intercepted * 0.1),
        "Arrow-3": Math.round(intercepted * 0.07),
        "David's Sling": Math.round(intercepted * 0.14),
        "THAAD (US)": Math.round(intercepted * 0.04),
        "Patriot (US)": Math.round(intercepted * 0.05),
      } : {},
      activeAlerts: Number(activeAlertCount[0].count),
      last24hEvents: recent.length,
    };
  }

  async getNews(): Promise<NewsItem[]> {
    const rows = await db.select().from(newsItems).orderBy(desc(newsItems.timestamp)).limit(100);
    return rows.map(r => ({
      id: r.id,
      title: r.title,
      source: r.source,
      timestamp: r.timestamp,
      url: r.url ?? undefined,
      category: r.category,
      breaking: r.breaking,
      sentiment: r.sentiment ?? undefined,
    }));
  }

  async addNews(items: NewsItem[]): Promise<void> {
    if (items.length === 0) return;
    const values = items.map(n => ({
      id: n.id,
      title: n.title,
      source: n.source,
      timestamp: n.timestamp,
      url: n.url ?? null,
      category: n.category,
      breaking: n.breaking,
      sentiment: n.sentiment ?? null,
    }));
    await db.insert(newsItems).values(values).onConflictDoNothing();

    // Prune news_items to max 500 rows
    const newsCount = await db.select({ count: sql<number>`count(*)` }).from(newsItems);
    if (newsCount[0].count > 500) {
      const excess = Number(newsCount[0].count) - 500;
      await db.execute(sql`DELETE FROM news_items WHERE id IN (SELECT id FROM news_items ORDER BY timestamp ASC LIMIT ${excess})`);
    }
  }

  async getAlerts(): Promise<Alert[]> {
    const rows = await db.select().from(alerts).orderBy(desc(alerts.timestamp)).limit(50);
    return rows.map(r => ({
      id: r.id,
      area: r.area,
      threat: r.threat,
      timestamp: r.timestamp,
      active: r.active,
      lat: r.lat,
      lng: r.lng,
    }));
  }

  async addAlerts(alertList: Alert[]): Promise<void> {
    if (alertList.length === 0) return;
    const values = alertList.map(a => ({
      id: a.id,
      area: a.area,
      threat: a.threat,
      timestamp: a.timestamp,
      active: a.active,
      lat: a.lat,
      lng: a.lng,
    }));
    await db.insert(alerts).values(values).onConflictDoNothing();

    // Prune alerts to max 200 rows
    const alertCount = await db.select({ count: sql<number>`count(*)` }).from(alerts);
    if (alertCount[0].count > 200) {
      const excess = Number(alertCount[0].count) - 200;
      await db.execute(sql`DELETE FROM alerts WHERE id IN (SELECT id FROM alerts ORDER BY timestamp ASC LIMIT ${excess})`);
    }
  }

  async updateAlert(id: string, active: boolean): Promise<void> {
    await db.update(alerts).set({ active }).where(eq(alerts.id, id));
  }

  async expireAlertsBefore(cutoffIso: string): Promise<void> {
    await db.update(alerts)
      .set({ active: false })
      .where(and(eq(alerts.active, true), lt(alerts.timestamp, cutoffIso)));
  }

  async getAISummary(): Promise<AISummary> {
    const rows = await db.select().from(aiSummaries).orderBy(desc(aiSummaries.id)).limit(1);
    if (rows.length === 0) {
      return this.generateAISummary();
    }
    const r = rows[0];
    return {
      summary: r.summary,
      threatAssessment: r.threatAssessment as AISummary["threatAssessment"],
      keyPoints: r.keyPoints,
      lastUpdated: r.lastUpdated,
      recommendation: r.recommendation,
    };
  }

  async setAISummary(summary: AISummary): Promise<void> {
    await db.insert(aiSummaries).values({
      summary: summary.summary,
      threatAssessment: summary.threatAssessment,
      keyPoints: summary.keyPoints,
      lastUpdated: summary.lastUpdated,
      recommendation: summary.recommendation,
    });

    // Prune ai_summaries to max 50 rows
    const summaryCount = await db.select({ count: sql<number>`count(*)` }).from(aiSummaries);
    if (summaryCount[0].count > 50) {
      const excess = Number(summaryCount[0].count) - 50;
      await db.execute(sql`DELETE FROM ai_summaries WHERE id IN (SELECT id FROM ai_summaries ORDER BY id ASC LIMIT ${excess})`);
    }
  }

  private async generateAISummary(): Promise<AISummary> {
    const activeAlertCount = await db.select({ count: sql<number>`count(*)` })
      .from(alerts).where(eq(alerts.active, true));
    const count = Number(activeAlertCount[0].count);
    const threat = count > 2 ? "critical" : count > 0 ? "high" : "medium";

    const summary: AISummary = {
      summary: `Current situation assessment indicates a multi-front escalation with active missile and drone threats from Iran, Lebanon, Yemen, and Iraqi militias targeting Israeli territory. Israeli defense systems (Iron Dome, Arrow, David's Sling) are operating at high capacity. US CENTCOM forces are providing supplementary defense with THAAD and Patriot systems. ${count} active alerts are currently in effect across Israeli territory.`,
      threatAssessment: threat as AISummary["threatAssessment"],
      keyPoints: [
        "Multi-front engagement: Iran, Lebanon, Yemen, Iraq, and Gaza launching coordinated attacks",
        "Israeli air defense systems operating across all platforms",
        "US CENTCOM providing supplementary air defense with THAAD and Patriot deployments",
        `${count} active Pikud HaOref alerts - sheltering instructions in effect for affected areas`,
        "Regional airspace restrictions in effect",
        "UN Security Council monitoring situation",
      ],
      lastUpdated: new Date().toISOString(),
      recommendation: "Maintain maximum alert posture. All civilians in affected areas should remain in shelters until all-clear is given by Pikud HaOref. Monitor official channels for updated instructions.",
    };

    await this.setAISummary(summary);
    return summary;
  }

  async updateNewsSentiment(newsId: string, score: number): Promise<void> {
    await db.update(newsItems).set({ sentiment: score }).where(eq(newsItems.id, newsId));
  }

  async getNewsSentiment(): Promise<{ average: number; trend: string; sampleSize: number }> {
    const rows = await db.select({ sentiment: newsItems.sentiment, timestamp: newsItems.timestamp })
      .from(newsItems)
      .where(sql`sentiment IS NOT NULL`)
      .orderBy(desc(newsItems.timestamp))
      .limit(50);

    if (rows.length === 0) {
      return { average: 0, trend: "stable", sampleSize: 0 };
    }

    const scores = rows.map(r => r.sentiment!);
    const average = scores.reduce((a, b) => a + b, 0) / scores.length;

    // Trend: compare most recent 10 vs older items
    const recent = scores.slice(0, Math.min(10, scores.length));
    const older = scores.slice(10);
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const olderAvg = older.length > 0 ? older.reduce((a, b) => a + b, 0) / older.length : recentAvg;
    const diff = recentAvg - olderAvg;

    let trend: string;
    if (diff < -0.15) trend = "escalating";
    else if (diff > 0.15) trend = "de-escalating";
    else trend = "stable";

    return {
      average: Math.round(average * 100) / 100,
      trend,
      sampleSize: rows.length,
    };
  }

  async deleteEventsByType(type: string): Promise<void> {
    await db.delete(warEvents).where(eq(warEvents.type, type));
  }

  async addSatelliteImages(images: Array<{ id: string; eventId: string; imageUrl: string; bboxWest: number; bboxSouth: number; bboxEast: number; bboxNorth: number; capturedAt: string; createdAt: string }>): Promise<void> {
    if (images.length === 0) return;
    await db.insert(satelliteImages).values(images).onConflictDoNothing();

    // Prune to max 50 images
    const imgCount = await db.select({ count: sql<number>`count(*)` }).from(satelliteImages);
    if (imgCount[0].count > 50) {
      const excess = Number(imgCount[0].count) - 50;
      await db.execute(sql`DELETE FROM satellite_images WHERE id IN (SELECT id FROM satellite_images ORDER BY created_at ASC LIMIT ${excess})`);
    }
  }

  async getSatelliteImages(): Promise<SatelliteImage[]> {
    const rows = await db.select().from(satelliteImages).orderBy(desc(sql`created_at`)).limit(50);
    return rows.map(r => ({
      id: r.id,
      eventId: r.eventId ?? undefined,
      imageUrl: r.imageUrl,
      bboxWest: r.bboxWest,
      bboxSouth: r.bboxSouth,
      bboxEast: r.bboxEast,
      bboxNorth: r.bboxNorth,
      capturedAt: r.capturedAt,
      createdAt: r.createdAt,
    }));
  }

  async isSeeded(): Promise<boolean> {
    const result = await db.select({ count: sql<number>`count(*)` }).from(warEvents);
    return Number(result[0].count) > 0;
  }
}

export const storage = new DatabaseStorage();
