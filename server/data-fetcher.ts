import { randomUUID } from "crypto";
import { storage } from "./storage";
import type { WarEvent, NewsItem, Alert, AISummary } from "@shared/schema";
import OpenAI from "openai";

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

// ─── City-to-coordinate lookup for Pikud HaOref alerts ────────────────────
const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  "תל אביב": { lat: 32.0853, lng: 34.7818 },
  "תל אביב - יפו": { lat: 32.0853, lng: 34.7818 },
  "ירושלים": { lat: 31.7683, lng: 35.2137 },
  "חיפה": { lat: 32.794, lng: 34.9896 },
  "באר שבע": { lat: 31.2518, lng: 34.7913 },
  "אשדוד": { lat: 31.8044, lng: 34.6553 },
  "אשקלון": { lat: 31.6688, lng: 34.5743 },
  "נתניה": { lat: 32.3215, lng: 34.8532 },
  "ראשון לציון": { lat: 31.9714, lng: 34.7925 },
  "פתח תקווה": { lat: 32.0867, lng: 34.8867 },
  "חולון": { lat: 32.0115, lng: 34.7788 },
  "בני ברק": { lat: 32.0834, lng: 34.8331 },
  "רמת גן": { lat: 32.0700, lng: 34.8236 },
  "הרצליה": { lat: 32.1629, lng: 34.7914 },
  "כפר סבא": { lat: 32.1751, lng: 34.9066 },
  "רעננה": { lat: 32.1840, lng: 34.8710 },
  "מודיעין": { lat: 31.8969, lng: 35.0104 },
  "רחובות": { lat: 31.8928, lng: 34.8113 },
  "לוד": { lat: 31.9516, lng: 34.8882 },
  "רמלה": { lat: 31.9279, lng: 34.8664 },
  "נהריה": { lat: 33.0057, lng: 35.0953 },
  "עכו": { lat: 32.9272, lng: 35.0764 },
  "קריית שמונה": { lat: 33.2085, lng: 35.5714 },
  "שדרות": { lat: 31.5246, lng: 34.5968 },
  "אילת": { lat: 29.5577, lng: 34.9519 },
  "טבריה": { lat: 32.7940, lng: 35.5300 },
  "צפת": { lat: 32.9658, lng: 35.4964 },
  "עפולה": { lat: 32.6100, lng: 35.2917 },
  "כרמיאל": { lat: 32.9148, lng: 35.2996 },
  "דימונה": { lat: 31.0680, lng: 35.0338 },
  "ערד": { lat: 31.2592, lng: 35.2151 },
  "מגדל העמק": { lat: 32.6779, lng: 35.2409 },
  "בית שאן": { lat: 32.5041, lng: 35.4964 },
  "גבעת שמואל": { lat: 32.0758, lng: 34.8490 },
  "הוד השרון": { lat: 32.1500, lng: 34.8900 },
  "יבנה": { lat: 31.8781, lng: 34.7383 },
  "קריית גת": { lat: 31.6100, lng: 34.7642 },
  "נצרת": { lat: 32.6997, lng: 35.3035 },
};
const DEFAULT_COORDS = { lat: 31.5, lng: 34.75 };

function getCityCoords(city: string): { lat: number; lng: number } {
  // Try exact match first, then try partial match
  if (CITY_COORDS[city]) return CITY_COORDS[city];
  for (const [key, coords] of Object.entries(CITY_COORDS)) {
    if (city.includes(key) || key.includes(city)) return coords;
  }
  return DEFAULT_COORDS;
}

// ─── 1. Pikud HaOref (Home Front Command) Alerts ──────────────────────────
async function fetchOrefAlerts(): Promise<void> {
  try {
    const response = await fetchViaProxy("https://www.oref.org.il/WarningMessages/alert/alerts.json");
    const text = await response.text();

    // Oref returns empty string or empty array when no alerts
    if (!text || text.trim() === "" || text.trim() === "[]") {
      return;
    }

    const data = JSON.parse(text);
    // Oref response: { id, cat, title, data: string[], desc } or array thereof
    const alertEntries = Array.isArray(data) ? data : [data];

    for (const entry of alertEntries) {
      const cities: string[] = entry.data || [];
      const threatTitle = entry.title || "Red Alert";

      const newAlerts: Alert[] = [];
      const newEvents: WarEvent[] = [];

      for (const city of cities) {
        const coords = getCityCoords(city);
        const alertId = randomUUID();
        const timestamp = new Date().toISOString();

        newAlerts.push({
          id: alertId,
          area: city,
          threat: threatTitle,
          timestamp,
          active: true,
          lat: coords.lat,
          lng: coords.lng,
        });

        const event: WarEvent = {
          id: randomUUID(),
          type: "air_raid_alert",
          title: `Red Alert — ${city}`,
          description: `${threatTitle}. Sirens sounding in ${city}. Residents instructed to enter shelters.`,
          location: `${city}, Israel`,
          lat: coords.lat,
          lng: coords.lng,
          country: "Israel",
          source: "Pikud HaOref",
          timestamp,
          threatLevel: "critical",
          verified: true,
        };
        newEvents.push(event);
      }

      if (newAlerts.length > 0) {
        await storage.addAlerts(newAlerts);
      }

      for (const event of newEvents) {
        await storage.addEvent(event);
        onNewEvent?.(event);
      }
    }
  } catch (err: any) {
    console.error("[oref-alerts] Error fetching Oref alerts:", err.message);
  }
}

// ─── 2. RSS.app OSINT Feed Pipeline ───────────────────────────────────────
// Uses RSS.app Premium API to fetch Telegram/OSINT feeds server-side.
// All items are cached in the local DB — zero RSS.app calls per end-user.

const RSSAPP_API_KEY = process.env.RSSAPP_API_KEY || "";
const RSSAPP_API_SECRET = process.env.RSSAPP_API_SECRET || "";
const RSSAPP_BASE = "https://api.rss.app/v1";
const seenGuids = new Set<string>();
const BREAKING_KEYWORDS = ["צבע אדום", "Explosion", "בלעדי", "BREAKING", "דחוף", "عاجل", "explosion", "breaking", "פיצוץ", "רקטה", "טיל"];

async function rssAppRequest(endpoint: string): Promise<any> {
  const res = await fetch(`${RSSAPP_BASE}${endpoint}`, {
    headers: {
      "Authorization": `Bearer ${RSSAPP_API_KEY}:${RSSAPP_API_SECRET}`,
      "Accept": "application/json",
    },
  });
  if (!res.ok) {
    throw new Error(`RSS.app API ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

async function fetchRSSAppFeeds(): Promise<void> {
  if (!RSSAPP_API_KEY || !RSSAPP_API_SECRET) {
    return; // Feature disabled if no API credentials
  }

  try {
    // 1. List all feeds configured in the RSS.app dashboard
    const feedsResponse = await rssAppRequest("/feeds");
    const feeds: Array<{ id: string; title: string; rss_feed_url?: string }> = feedsResponse.data || feedsResponse.feeds || [];

    if (feeds.length === 0) {
      console.log("[rss-app] No feeds found in RSS.app account");
      return;
    }

    let totalIngested = 0;

    for (const feed of feeds) {
      try {
        // 2. Fetch items for each feed
        const itemsResponse = await rssAppRequest(`/feeds/${feed.id}/items`);
        const items: Array<{
          id?: string;
          guid?: string;
          title?: string;
          content_text?: string;
          url?: string;
          date_published?: string;
          date_modified?: string;
        }> = itemsResponse.data || itemsResponse.items || [];

        const feedSource = feed.title || `Feed ${feed.id}`;
        const newItems: NewsItem[] = [];

        for (const item of items) {
          const guid = item.id || item.guid || item.url || item.title || "";
          if (!guid || seenGuids.has(guid)) continue;

          seenGuids.add(guid);
          // Cap in-memory dedup set at 1000
          if (seenGuids.size > 1000) {
            const first = seenGuids.values().next().value;
            if (first) seenGuids.delete(first);
          }

          const title = item.title || item.content_text?.slice(0, 200) || "Untitled";
          const isBreaking = BREAKING_KEYWORDS.some(kw =>
            title.toLowerCase().includes(kw.toLowerCase())
          );

          newItems.push({
            id: randomUUID(),
            title,
            source: feedSource,
            timestamp: item.date_published || item.date_modified || new Date().toISOString(),
            url: item.url,
            category: "telegram",
            breaking: isBreaking,
          });
        }

        if (newItems.length > 0) {
          await storage.addNews(newItems);
          totalIngested += newItems.length;
        }
      } catch (err: any) {
        console.error(`[rss-app] Error fetching items for feed "${feed.title}":`, err.message);
      }
    }

    if (totalIngested > 0) {
      console.log(`[rss-app] Ingested ${totalIngested} new items from ${feeds.length} feeds`);
    }
  } catch (err: any) {
    console.error("[rss-app] Error listing feeds:", err.message);
  }
}

// ─── RSS.app Webhook handler (instant push) ───────────────────────────────
export async function processRSSWebhook(body: any): Promise<number> {
  // RSS.app webhook payload may contain items directly or nested
  const items: Array<any> = body?.items || body?.data || (Array.isArray(body) ? body : [body]);
  const feedTitle = body?.feed?.title || body?.title || "RSS.app Webhook";

  const newItems: NewsItem[] = [];

  for (const item of items) {
    const guid = item.id || item.guid || item.url || item.link || item.title || "";
    if (!guid || seenGuids.has(guid)) continue;

    seenGuids.add(guid);
    if (seenGuids.size > 1000) {
      const first = seenGuids.values().next().value;
      if (first) seenGuids.delete(first);
    }

    const title = item.title || item.content_text?.slice(0, 200) || "Untitled";
    const isBreaking = BREAKING_KEYWORDS.some(kw =>
      title.toLowerCase().includes(kw.toLowerCase())
    );

    newItems.push({
      id: randomUUID(),
      title,
      source: feedTitle,
      timestamp: item.date_published || item.pubDate || item.isoDate || new Date().toISOString(),
      url: item.url || item.link,
      category: "telegram",
      breaking: isBreaking,
    });
  }

  if (newItems.length > 0) {
    await storage.addNews(newItems);
    console.log(`[webhook/rss] Ingested ${newItems.length} items from ${feedTitle}`);
  }

  return newItems.length;
}

// ─── 3. Real AI Summarization via GPT ──────────────────────────────────────
const openai = new OpenAI(); // Reads OPENAI_API_KEY from env; throws if missing

async function refreshAISummary(): Promise<void> {
  try {
    const recentEvents = (await storage.getEvents()).slice(0, 15);
    const recentNews = (await storage.getNews()).slice(0, 10);

    const systemPrompt = `You are a military intelligence analyst monitoring the Iran-Israel conflict. Given the following war events and news items, produce a JSON object with exactly these fields:
- "summary": string (2-3 paragraph situation assessment)
- "threatAssessment": one of "critical", "high", "medium", "low"
- "keyPoints": array of 4-6 short strings summarizing key developments
- "recommendation": string (actionable recommendation for civilians)

Respond ONLY with valid JSON. No markdown, no code fences.`;

    const userPrompt = `Recent War Events (last 15):
${JSON.stringify(recentEvents.map(e => ({ type: e.type, title: e.title, location: e.location, country: e.country, time: e.timestamp, threat: e.threatLevel })), null, 2)}

Recent News Items (last 10):
${JSON.stringify(recentNews.map(n => ({ title: n.title, source: n.source, time: n.timestamp, breaking: n.breaking })), null, 2)}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: 1500,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      console.error("[ai-summary] Empty response from OpenAI");
      return;
    }

    const parsed = JSON.parse(content);

    // Validate required fields
    if (!parsed.summary || !parsed.threatAssessment || !parsed.keyPoints || !parsed.recommendation) {
      console.error("[ai-summary] Missing required fields in GPT response");
      return;
    }

    const validThreats = ["critical", "high", "medium", "low"];
    if (!validThreats.includes(parsed.threatAssessment)) {
      parsed.threatAssessment = "medium";
    }

    const summary: AISummary = {
      summary: parsed.summary,
      threatAssessment: parsed.threatAssessment as AISummary["threatAssessment"],
      keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints : [],
      lastUpdated: new Date().toISOString(),
      recommendation: parsed.recommendation,
    };

    await storage.setAISummary(summary);
    console.log("[ai-summary] AI summary refreshed via GPT-4o-mini");
  } catch (err: any) {
    console.error("[ai-summary] Error refreshing AI summary:", err.message);
  }
}

let onNewEvent: ((event: WarEvent) => void) | null = null;

export function setNewEventCallback(cb: (event: WarEvent) => void) {
  onNewEvent = cb;
}

const dataSources: DataSourceConfig[] = [
  {
    name: "oref-alerts",
    enabled: true,
    fetchIntervalMs: 5000,
    proxyRequired: true,
    fetchFn: fetchOrefAlerts,
  },
  {
    name: "rss-app-feeds",
    enabled: true,
    fetchIntervalMs: 60000,
    proxyRequired: false,
    fetchFn: fetchRSSAppFeeds,
  },
  {
    name: "ai-summary-refresh",
    enabled: true,
    fetchIntervalMs: 120000,
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
