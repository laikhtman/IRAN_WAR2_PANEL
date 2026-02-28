import { randomUUID } from "crypto";
import { storage } from "./storage";
import type { WarEvent, NewsItem, Alert, AISummary } from "@shared/schema";

interface DataSourceConfig {
  name: string;
  enabled: boolean;
  fetchIntervalMs: number;
  proxyRequired: boolean;
  fetchFn: () => Promise<void>;
}

const PROXY_BASE_URL = process.env.PROXY_BASE_URL || "";
const PROXY_AUTH_TOKEN = process.env.PROXY_AUTH_TOKEN || "";

export async function fetchViaProxy(url: string): Promise<Response> {
  if (PROXY_BASE_URL) {
    const proxyUrl = `${PROXY_BASE_URL}/proxy?url=${encodeURIComponent(url)}`;
    const headers: Record<string, string> = {};
    if (PROXY_AUTH_TOKEN) {
      headers["Authorization"] = `Bearer ${PROXY_AUTH_TOKEN}`;
    }
    return fetch(proxyUrl, { headers });
  }
  return fetch(url);
}

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

async function simulateEvents(): Promise<void> {
  const template = eventTemplates[Math.floor(Math.random() * eventTemplates.length)]();
  const newEvent: WarEvent = {
    ...template,
    id: randomUUID(),
    timestamp: new Date().toISOString(),
  };
  await storage.addEvent(newEvent);
  onNewEvent?.(newEvent);
}

async function refreshAISummary(): Promise<void> {
  const allAlerts = await storage.getAlerts();
  const activeCount = allAlerts.filter(a => a.active).length;
  const threat = activeCount > 2 ? "critical" : activeCount > 0 ? "high" : "medium";

  const allEvents = await storage.getEvents();
  const launched = allEvents.filter(e => e.type === "missile_launch").length;
  const intercepted = allEvents.filter(e => e.type === "missile_intercept").length;
  const rate = launched > 0 ? Math.round((intercepted / launched) * 100) : 0;

  const summary: AISummary = {
    summary: `Current situation assessment indicates a multi-front escalation with active missile and drone threats from Iran, Lebanon, Yemen, and Iraqi militias targeting Israeli territory. Israeli defense systems (Iron Dome, Arrow, David's Sling) are operating at high capacity with a ${rate}% missile interception rate. US CENTCOM forces are providing supplementary defense with THAAD and Patriot systems. ${activeCount} active alerts are currently in effect across Israeli territory. The primary threat axis remains Iranian ballistic missiles from the east, with secondary rocket threats from Lebanon in the north and Gaza in the southwest.`,
    threatAssessment: threat as AISummary["threatAssessment"],
    keyPoints: [
      "Multi-front engagement: Iran, Lebanon, Yemen, Iraq, and Gaza launching coordinated attacks",
      `Israeli air defense systems operating at ${rate}% missile interception rate across all platforms`,
      "US CENTCOM providing supplementary air defense with THAAD and Patriot deployments",
      `${activeCount} active Pikud HaOref alerts - sheltering instructions in effect for affected areas`,
      `${allEvents.length} total events tracked in the last 24 hours`,
      "UN Security Council monitoring situation",
    ],
    lastUpdated: new Date().toISOString(),
    recommendation: "Maintain maximum alert posture. All civilians in affected areas should remain in shelters until all-clear is given by Pikud HaOref. Monitor official channels for updated instructions. Avoid unnecessary travel in central and northern Israel.",
  };

  await storage.setAISummary(summary);
}

let onNewEvent: ((event: WarEvent) => void) | null = null;

export function setNewEventCallback(cb: (event: WarEvent) => void) {
  onNewEvent = cb;
}

const dataSources: DataSourceConfig[] = [
  {
    name: "simulated-events",
    enabled: true,
    fetchIntervalMs: 15000 + Math.random() * 15000,
    proxyRequired: false,
    fetchFn: simulateEvents,
  },
  {
    name: "ai-summary-refresh",
    enabled: true,
    fetchIntervalMs: 60000,
    proxyRequired: false,
    fetchFn: refreshAISummary,
  },
];

const intervals: ReturnType<typeof setInterval>[] = [];

export function startDataFetcher(): void {
  console.log("[data-fetcher] Starting background data fetcher...");

  for (const source of dataSources) {
    if (!source.enabled) {
      console.log(`[data-fetcher] Source "${source.name}" is disabled, skipping`);
      continue;
    }

    console.log(`[data-fetcher] Registering source "${source.name}" (interval: ${Math.round(source.fetchIntervalMs / 1000)}s)`);

    const run = async () => {
      try {
        await source.fetchFn();
      } catch (err: any) {
        console.error(`[data-fetcher] Error fetching "${source.name}":`, err.message);
      }
    };

    const interval = setInterval(run, source.fetchIntervalMs);
    intervals.push(interval);
  }

  console.log(`[data-fetcher] ${dataSources.filter(s => s.enabled).length} data sources active`);
}

export function stopDataFetcher(): void {
  intervals.forEach(clearInterval);
  intervals.length = 0;
  console.log("[data-fetcher] Stopped all data fetchers");
}
