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
  /** Required env vars for this source to function */
  requiredEnvVars?: string[];
}

// ─── Runtime health tracking per data source ─────────────────────
interface SourceHealth {
  lastRunAt: string | null;
  lastSuccessAt: string | null;
  lastError: string | null;
  runCount: number;
  errorCount: number;
}

const sourceHealthMap = new Map<string, SourceHealth>();

function recordSourceRun(name: string, error?: string) {
  const existing = sourceHealthMap.get(name) || {
    lastRunAt: null,
    lastSuccessAt: null,
    lastError: null,
    runCount: 0,
    errorCount: 0,
  };
  existing.lastRunAt = new Date().toISOString();
  existing.runCount++;
  if (error) {
    existing.lastError = error;
    existing.errorCount++;
  } else {
    existing.lastSuccessAt = new Date().toISOString();
    existing.lastError = null;
  }
  sourceHealthMap.set(name, existing);
}

export function getDataSourceHealthStatus() {
  return dataSources.map((src) => {
    const health = sourceHealthMap.get(src.name);
    // Check if required env vars are set
    const missingEnvVars = (src.requiredEnvVars || []).filter(
      (v) => !process.env[v]
    );
    const envConfigured = missingEnvVars.length === 0;
    let status: "ok" | "error" | "not_configured" | "no_data";
    if (!envConfigured) {
      status = "not_configured";
    } else if (!health || health.runCount === 0) {
      status = "no_data";
    } else if (health.lastError && !health.lastSuccessAt) {
      status = "error";
    } else if (health.lastError && health.lastSuccessAt) {
      // Has succeeded before but last run errored
      status = "error";
    } else {
      status = "ok";
    }
    return {
      name: src.name,
      enabled: src.enabled,
      fetchIntervalMs: src.fetchIntervalMs,
      status,
      missingEnvVars,
      health: health || null,
    };
  });
}

const PROXY_BASE_URL = process.env.PROXY_BASE_URL || "";
const PROXY_AUTH_TOKEN = process.env.PROXY_AUTH_TOKEN || "";
const MARINETRAFFIC_API_KEY = process.env.MARINETRAFFIC_API_KEY || "";
const ADSBX_API_KEY = process.env.ADSBX_API_KEY || "";
const SENTINELHUB_CLIENT_ID = process.env.SENTINELHUB_CLIENT_ID || "";
const SENTINELHUB_CLIENT_SECRET = process.env.SENTINELHUB_CLIENT_SECRET || "";
const SENTINELHUB_INSTANCE_ID = process.env.SENTINELHUB_INSTANCE_ID || "";
const SENTINELHUB_API_KEY = process.env.SENTINELHUB_API_KEY || "";
let sentinelHubToken: string | null = null;
let sentinelHubTokenExpiry = 0;

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

// ─── AI Event Classification (Task #22) ────────────────────────────────────
async function classifyEvent(rawTitle: string, rawDescription: string): Promise<{ type: string; threatLevel: string } | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a military intelligence classifier. Given a raw event report, return JSON with:
- "type": one of: missile_launch, missile_intercept, missile_hit, drone_launch, drone_intercept, air_raid_alert, ceasefire, military_operation, explosion, sirens, naval_movement, aircraft_tracking
- "threatLevel": one of: critical, high, medium, low
Respond ONLY with valid JSON.`,
        },
        { role: "user", content: `Title: ${rawTitle}\nDescription: ${rawDescription}` },
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
      max_tokens: 100,
    }, { signal: controller.signal });

    clearTimeout(timeout);
    const content = response.choices[0]?.message?.content;
    if (!content) return null;

    const parsed = JSON.parse(content);
    const validTypes = ["missile_launch", "missile_intercept", "missile_hit", "drone_launch", "drone_intercept", "air_raid_alert", "ceasefire", "military_operation", "explosion", "sirens", "naval_movement", "aircraft_tracking"];
    const validThreats = ["critical", "high", "medium", "low"];

    if (!validTypes.includes(parsed.type) || !validThreats.includes(parsed.threatLevel)) {
      return null;
    }

    return { type: parsed.type, threatLevel: parsed.threatLevel };
  } catch (err: any) {
    if (err.name === "AbortError") {
      console.warn("[ai-classify] Timeout — falling back to heuristic");
    } else {
      console.error("[ai-classify] Error:", err.message);
    }
    return null;
  }
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

        // ─── AI Classification: try to extract war events from news items ───
        if (newItems.length > 0 && newItems.length <= 5) {
          try {
            for (const item of newItems) {
              const classification = await classifyEvent(item.title, item.title);
              if (classification) {
                const event: WarEvent = {
                  id: randomUUID(),
                  type: classification.type as WarEvent["type"],
                  title: item.title,
                  description: item.title,
                  location: "Unknown",
                  lat: 31.5 + (Math.random() - 0.5) * 2,
                  lng: 34.75 + (Math.random() - 0.5) * 2,
                  country: "Unknown",
                  source: item.source,
                  timestamp: item.timestamp,
                  threatLevel: classification.threatLevel as WarEvent["threatLevel"],
                  verified: false,
                  aiClassified: true,
                };
                await storage.addEvent(event);
                onNewEvent?.(event);
                console.log(`[ai-classify] Classified "${item.title}" as ${classification.type}/${classification.threatLevel}`);
              }
            }
          } catch (err: any) {
            console.error("[ai-classify] Batch classification error:", err.message);
          }
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
  // RSS.app webhook payload format: { id, type: "feed_update", feed: { title, items_new: [...], items_changed: [...] } }
  // Extract items from all known locations — RSS.app uses "items_new" + "items_changed"
  const feedItemsNew: Array<any> = body?.feed?.items_new || [];
  const feedItemsChanged: Array<any> = body?.feed?.items_changed || [];
  const items: Array<any> =
    feedItemsNew.length > 0 || feedItemsChanged.length > 0
      ? [...feedItemsNew, ...feedItemsChanged]
      : body?.feed?.items ||
      body?.feed?.entries ||
      body?.items ||
      body?.entries ||
      body?.data ||
      (Array.isArray(body) ? body : []);

  const feedTitle = body?.feed?.title || body?.title || body?.feed?.name || "RSS.app Webhook";

  console.log(`[webhook/rss] Feed: "${feedTitle}", items found: ${items.length}`);

  if (items.length === 0) {
    console.log("[webhook/rss] No items in payload, skipping");
    return 0;
  }

  const newItems: NewsItem[] = [];

  for (const item of items) {
    try {
      const guid = item.id || item.guid || item.url || item.link || item.title || "";
      if (!guid || seenGuids.has(guid)) continue;

      seenGuids.add(guid);
      if (seenGuids.size > 1000) {
        const first = seenGuids.values().next().value;
        if (first) seenGuids.delete(first);
      }

      const title = item.title || item.content_text?.slice(0, 200) || item.description?.slice(0, 200) || "Untitled";
      const isBreaking = BREAKING_KEYWORDS.some(kw =>
        title.toLowerCase().includes(kw.toLowerCase())
      );

      newItems.push({
        id: randomUUID(),
        title,
        source: feedTitle,
        timestamp: item.date_published || item.pubDate || item.isoDate || item.created || new Date().toISOString(),
        url: item.url || item.link,
        category: "telegram",
        breaking: isBreaking,
      });
    } catch (itemErr: any) {
      console.error(`[webhook/rss] Error processing item:`, itemErr.message);
    }
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

// ─── Sentiment Analysis (Task #24) ─────────────────────────────────────────
async function analyzeNewsSentiment(): Promise<void> {
  try {
    const recentNews = (await storage.getNews()).slice(0, 20);
    if (recentNews.length === 0) return;

    // Only analyze items that don't have sentiment yet
    const unscored = recentNews.filter(n => n.sentiment === undefined || n.sentiment === null);
    if (unscored.length === 0) return;

    const titles = unscored.map(n => n.title);

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "Rate each headline on a scale from -1.0 (extremely negative / alarming) to +1.0 (positive / peaceful). Return a JSON object with a single key \"scores\" containing an array of numbers in the same order as the input headlines. Respond ONLY with valid JSON.",
        },
        {
          role: "user",
          content: JSON.stringify(titles),
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
      max_tokens: 500,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return;

    const parsed = JSON.parse(content);
    const scores: number[] = parsed.scores || parsed;

    if (!Array.isArray(scores) || scores.length !== unscored.length) {
      console.warn("[sentiment] Score count mismatch, skipping");
      return;
    }

    // Update each news item with its sentiment score
    for (let i = 0; i < unscored.length; i++) {
      const score = Math.max(-1, Math.min(1, scores[i]));
      await storage.updateNewsSentiment(unscored[i].id, score);
    }

    console.log(`[sentiment] Scored ${unscored.length} news items`);
  } catch (err: any) {
    console.error("[sentiment] Error analyzing sentiment:", err.message);
  }
}

// ─── 4. MarineTraffic Naval Movement Tracking ──────────────────────────────
async function fetchMarineTraffic(): Promise<void> {
  if (!MARINETRAFFIC_API_KEY) return;

  try {
    const url = `https://services.marinetraffic.com/api/exportvessel/v:8/${MARINETRAFFIC_API_KEY}/timespan:10/msgtype:simple/protocol:json`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`MarineTraffic API ${response.status}: ${await response.text()}`);
    }

    const vessels: Array<any> = await response.json();

    // Filter for bounding box: lat 10-40, lng 25-55 (Red Sea + Eastern Med)
    const filtered = vessels.filter((v: any) => {
      const lat = parseFloat(v.LAT || v.lat || 0);
      const lng = parseFloat(v.LON || v.lon || v.lng || 0);
      return lat >= 10 && lat <= 40 && lng >= 25 && lng <= 55;
    });

    // Filter for military (type codes 35, 55) or tankers in conflict zones
    const militaryTypes = ["35", "55"];
    const relevantVessels = filtered.filter((v: any) => {
      const shipType = String(v.SHIP_TYPE || v.ship_type || "");
      return militaryTypes.includes(shipType) || shipType === "80" || shipType === "81";
    });

    const events: WarEvent[] = relevantVessels.slice(0, 20).map((v: any) => {
      const lat = parseFloat(v.LAT || v.lat || 31.5);
      const lng = parseFloat(v.LON || v.lon || v.lng || 34.75);
      const shipName = v.SHIPNAME || v.shipname || "Unknown Vessel";
      const flag = v.FLAG || v.flag || "Unknown";
      const shipType = String(v.SHIP_TYPE || v.ship_type || "");
      const isMilitary = militaryTypes.includes(shipType);

      return {
        id: `mt-${v.MMSI || v.mmsi || randomUUID()}`,
        type: "naval_movement" as WarEvent["type"],
        title: `Naval: ${shipName} (${flag})`,
        description: `${isMilitary ? "Military" : "Strategic"} vessel ${shipName} flagged ${flag} detected in conflict zone`,
        location: `${lat.toFixed(2)}°N, ${lng.toFixed(2)}°E`,
        lat,
        lng,
        country: flag,
        source: "MarineTraffic",
        timestamp: new Date().toISOString(),
        threatLevel: (isMilitary ? "medium" : "low") as WarEvent["threatLevel"],
        verified: false,
        aiClassified: false,
      };
    });

    if (events.length > 0) {
      // Delete old naval_movement events before inserting fresh batch
      await storage.deleteEventsByType("naval_movement");
      await storage.addEvents(events);
      console.log(`[marine-traffic] Tracked ${events.length} vessels in conflict zone`);
    }
  } catch (err: any) {
    console.error("[marine-traffic] Error:", err.message);
  }
}

// ─── 5. ADS-B Exchange Aircraft Tracking ───────────────────────────────────
async function fetchADSBExchange(): Promise<void> {
  if (!ADSBX_API_KEY) return;

  try {
    const url = "https://adsbexchange.com/api/aircraft/json/lat/32/lon/35/dist/500/";
    const response = await fetch(url, {
      headers: { "api-auth": ADSBX_API_KEY },
    });
    if (!response.ok) {
      throw new Error(`ADS-B Exchange API ${response.status}: ${await response.text()}`);
    }

    const data = await response.json();
    const aircraft: Array<any> = data.ac || data.aircraft || [];

    // Filter: military or high-altitude aircraft in conflict bounding box
    const filtered = aircraft.filter((ac: any) => {
      const lat = parseFloat(ac.lat || 0);
      const lon = parseFloat(ac.lon || 0);
      const alt = parseInt(ac.alt_baro || ac.alt || "0", 10);
      const isMilitary = ac.mil === 1 || ac.mil === "1" || ac.type?.startsWith("F-") || ac.type?.startsWith("C-") || ac.type?.startsWith("KC-");
      const inBBox = lat >= 25 && lat <= 40 && lon >= 25 && lon <= 55;
      return inBBox && (isMilitary || alt >= 20000);
    });

    const events: WarEvent[] = filtered.slice(0, 50).map((ac: any) => {
      const lat = parseFloat(ac.lat || 32);
      const lon = parseFloat(ac.lon || 35);
      const callsign = (ac.flight || ac.call || ac.hex || "UNKNOWN").trim();
      const altFl = Math.round(parseInt(ac.alt_baro || ac.alt || "0", 10) / 100);
      const acType = ac.t || ac.type || "Unknown";
      const isMilitary = ac.mil === 1 || ac.mil === "1";

      return {
        id: `adsb-${ac.hex || randomUUID()}`,
        type: "aircraft_tracking" as WarEvent["type"],
        title: `Aircraft ${callsign} — ${acType} at FL${altFl}`,
        description: `${isMilitary ? "Military" : "Surveillance"} aircraft ${callsign} (${acType}) at FL${altFl} over conflict zone`,
        location: `${lat.toFixed(2)}°N, ${lon.toFixed(2)}°E`,
        lat,
        lng: lon,
        country: ac.reg_country || "Unknown",
        source: "ADS-B Exchange",
        timestamp: new Date().toISOString(),
        threatLevel: (isMilitary ? "medium" : "low") as WarEvent["threatLevel"],
        verified: false,
        aiClassified: false,
      };
    });

    if (events.length > 0) {
      // Delete old aircraft_tracking events before inserting fresh batch
      await storage.deleteEventsByType("aircraft_tracking");
      await storage.addEvents(events);
      console.log(`[adsb] Tracked ${events.length} aircraft in conflict zone`);
    }
  } catch (err: any) {
    console.error("[adsb] Error:", err.message);
  }
}

// ─── 6. Sentinel Hub Satellite Imagery ─────────────────────────────────────
// Auth: prefers OAuth2 (client_credentials) if configured, falls back to legacy API key (PLAK...)
type SentinelAuth = { type: "oauth"; token: string } | { type: "apikey"; key: string };

async function getSentinelHubAuth(): Promise<SentinelAuth | null> {
  // 1. Try OAuth2 if both client ID + secret are set (not the API key)
  if (SENTINELHUB_CLIENT_ID && SENTINELHUB_CLIENT_SECRET && !SENTINELHUB_CLIENT_SECRET.startsWith("PLAK")) {
    if (sentinelHubToken && Date.now() < sentinelHubTokenExpiry) {
      return { type: "oauth", token: sentinelHubToken };
    }

    try {
      const response = await fetch("https://services.sentinel-hub.com/oauth/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "client_credentials",
          client_id: SENTINELHUB_CLIENT_ID,
          client_secret: SENTINELHUB_CLIENT_SECRET,
        }),
      });

      if (!response.ok) {
        throw new Error(`Sentinel Hub OAuth ${response.status}`);
      }

      const data = await response.json();
      sentinelHubToken = data.access_token;
      sentinelHubTokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
      return { type: "oauth", token: sentinelHubToken! };
    } catch (err: any) {
      console.error("[sentinel-hub] OAuth error:", err.message);
      // Fall through to API key
    }
  }

  // 2. Fall back to legacy API key
  if (SENTINELHUB_API_KEY) {
    return { type: "apikey", key: SENTINELHUB_API_KEY };
  }

  // 3. Also accept PLAK key stored in CLIENT_SECRET as fallback
  if (SENTINELHUB_CLIENT_SECRET && SENTINELHUB_CLIENT_SECRET.startsWith("PLAK")) {
    return { type: "apikey", key: SENTINELHUB_CLIENT_SECRET };
  }

  return null;
}

/** Build auth headers for Sentinel Hub requests */
function sentinelAuthHeaders(auth: SentinelAuth): Record<string, string> {
  if (auth.type === "oauth") {
    return { "Authorization": `Bearer ${auth.token}` };
  }
  // Legacy API key — no auth header needed for WMS (key goes in URL)
  // For Catalog API, use the Bearer token style that some endpoints accept
  return {};
}

async function fetchSentinelImagery(): Promise<void> {
  const auth = await getSentinelHubAuth();
  if (!auth) return;
  if (!SENTINELHUB_INSTANCE_ID) {
    console.warn("[sentinel-hub] SENTINELHUB_INSTANCE_ID not set, skipping");
    return;
  }

  try {
    // Get recent missile_hit and explosion events (last 24h)
    const allEvents = await storage.getEvents();
    const now = Date.now();
    const dayAgo = now - 24 * 3600000;

    const strikeEvents = allEvents.filter(e =>
      (e.type === "missile_hit" || e.type === "explosion") &&
      new Date(e.timestamp).getTime() > dayAgo
    ).slice(0, 10); // Max 10 per cycle

    if (strikeEvents.length === 0) return;

    const images: Array<{
      id: string;
      eventId: string;
      imageUrl: string;
      bboxWest: number;
      bboxSouth: number;
      bboxEast: number;
      bboxNorth: number;
      capturedAt: string;
      createdAt: string;
    }> = [];

    for (const event of strikeEvents) {
      try {
        // 0.05° bounding box around event
        const bbox = {
          west: event.lng - 0.05,
          south: event.lat - 0.05,
          east: event.lng + 0.05,
          north: event.lat + 0.05,
        };

        const toDate = new Date().toISOString().split("T")[0];
        const fromDate = new Date(now - 5 * 24 * 3600000).toISOString().split("T")[0];

        // Sentinel-2 L2A Catalog search for available imagery
        let capturedAt = new Date().toISOString();

        if (auth.type === "oauth") {
          // OAuth path: use Catalog API for precise imagery search
          const catalogUrl = "https://services.sentinel-hub.com/api/v1/catalog/1.0.0/search";
          const catalogResponse = await fetch(catalogUrl, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${auth.token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              datetime: `${fromDate}T00:00:00Z/${toDate}T23:59:59Z`,
              collections: ["sentinel-2-l2a"],
              bbox: [bbox.west, bbox.south, bbox.east, bbox.north],
              limit: 1,
              filter: "eo:cloud_cover < 30",
            }),
          });

          if (!catalogResponse.ok) continue;

          const catalogData = await catalogResponse.json();
          const features = catalogData.features || [];
          if (features.length === 0) continue;

          capturedAt = features[0].properties?.datetime || capturedAt;
        }
        // API key path: skip catalog (requires OAuth), go straight to WMS

        // Build WMS URL for true-color image
        // API key auth: append to URL; OAuth: tile proxy adds Bearer header
        const apiKeyParam = auth.type === "apikey" ? `&AUTH_TOKEN=${auth.key}` : "";
        const wmsUrl = `https://services.sentinel-hub.com/ogc/wms/${SENTINELHUB_INSTANCE_ID}?SERVICE=WMS&REQUEST=GetMap&LAYERS=TRUE-COLOR-S2L2A&BBOX=${bbox.south},${bbox.west},${bbox.north},${bbox.east}&CRS=EPSG:4326&WIDTH=512&HEIGHT=512&FORMAT=image/png&TIME=${fromDate}/${toDate}${apiKeyParam}`;

        images.push({
          id: `sat-${event.id}`,
          eventId: event.id,
          imageUrl: wmsUrl,
          bboxWest: bbox.west,
          bboxSouth: bbox.south,
          bboxEast: bbox.east,
          bboxNorth: bbox.north,
          capturedAt,
          createdAt: new Date().toISOString(),
        });
      } catch (err: any) {
        console.error(`[sentinel-hub] Error fetching imagery for event ${event.id}:`, err.message);
      }
    }

    if (images.length > 0) {
      await storage.addSatelliteImages(images);
      console.log(`[sentinel-hub] Stored ${images.length} satellite images`);
    }
  } catch (err: any) {
    console.error("[sentinel-hub] Error:", err.message);
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
    requiredEnvVars: ["PROXY_BASE_URL"],
  },
  {
    name: "rss-app-feeds",
    enabled: true,
    fetchIntervalMs: 60000,
    proxyRequired: false,
    fetchFn: fetchRSSAppFeeds,
    requiredEnvVars: ["RSSAPP_API_KEY", "RSSAPP_API_SECRET"],
  },
  {
    name: "ai-summary-refresh",
    enabled: true,
    fetchIntervalMs: 120000,
    proxyRequired: false,
    fetchFn: refreshAISummary,
    requiredEnvVars: ["OPENAI_API_KEY"],
  },
  {
    name: "sentiment-analysis",
    enabled: true,
    fetchIntervalMs: 120000,
    proxyRequired: false,
    fetchFn: analyzeNewsSentiment,
    requiredEnvVars: ["OPENAI_API_KEY"],
  },
  {
    name: "marine-traffic",
    enabled: true,
    fetchIntervalMs: 300000, // 5 minutes
    proxyRequired: false,
    fetchFn: fetchMarineTraffic,
    requiredEnvVars: ["MARINETRAFFIC_API_KEY"],
  },
  {
    name: "adsb-exchange",
    enabled: true,
    fetchIntervalMs: 60000, // 1 minute
    proxyRequired: false,
    fetchFn: fetchADSBExchange,
    requiredEnvVars: ["ADSBX_API_KEY"],
  },
  {
    name: "sentinel-hub",
    enabled: true,
    fetchIntervalMs: 3600000, // 1 hour
    proxyRequired: false,
    fetchFn: fetchSentinelImagery,
    requiredEnvVars: ["SENTINELHUB_INSTANCE_ID"],
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
        recordSourceRun(source.name);
      } catch (err: any) {
        recordSourceRun(source.name, err.message);
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
