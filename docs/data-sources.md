# Data Sources

This document details every piece of data displayed in the dashboard, where it comes from, and its current status.

## Summary

| Data | Source | Status | File |
|------|--------|--------|------|
| War Events | Oref alerts + RSS.app AI-classified | **REAL** | `server/data-fetcher.ts` |
| News Items | RSS.app Premium API (Telegram/OSINT feeds) | **REAL** | `server/data-fetcher.ts` |
| Alerts (Oref) | Pikud HaOref API via Tailscale VPN proxy | **REAL** | `server/data-fetcher.ts` |
| AI Summary | GPT-4o-mini via OpenAI SDK | **REAL** | `server/data-fetcher.ts` |
| Sentiment | GPT-4o-mini sentiment analysis | **REAL** | `server/data-fetcher.ts` |
| AI Classification | GPT-4o-mini event classification | **REAL** | `server/data-fetcher.ts` |
| Statistics | Computed from war_events table | **Derived** | `server/storage.ts` |
| Satellite Imagery | Sentinel Hub WMS/Catalog API | **Configured** (needs API key) | `server/data-fetcher.ts` |
| Marine Traffic | MarineTraffic API | **Configured** (needs API key) | `server/data-fetcher.ts` |
| ADS-B Exchange | ADS-B Exchange API | **Configured** (needs API key) | `server/data-fetcher.ts` |
| TV Channels | Hardcoded embeds (YouTube / livehdtv.com) | **Real streams** | `live-media-panel.tsx` |
| Live Cameras | Hardcoded YouTube embeds | **Real streams** | `live-media-panel.tsx` |

## Detailed Breakdown

### War Events (REAL)

**Source**: War events come from two real-time sources in `server/data-fetcher.ts`:

1. **Oref alerts** (`fetchOrefAlerts()`, every 5s): Each Pikud HaOref alert creates a corresponding `air_raid_alert` war event with geolocated coordinates from the 38-city `CITY_COORDS` lookup table.

2. **RSS.app AI classification** (`fetchRSSAppFeeds()`, every 60s): RSS feed items are classified by GPT-4o-mini into war event types. For batches of ≤5 items, `classifyEvent()` extracts event type and threat level. These events have `aiClassified: true`.

Each event gets a UUID and current timestamp. Events are broadcast to WebSocket clients and persisted to PostgreSQL.

### Seed Data (MOCK)

**File**: `server/seed.ts`

Runs once on first startup (when DB is empty). Creates:

**15 seed events**:
- Ballistic missile from Iran (Shiraz)
- Arrow-3 interception over Jordan
- Drone swarm from Iraq
- Cruise missiles from Yemen
- Iron Dome interceptions (Gaza)
- Red Alert Tel Aviv
- Rockets from Lebanon
- David's Sling interception (Haifa)
- Explosion near Damascus
- US Navy drone shootdown (Red Sea)
- IDF ground operation (Rafah)
- Anti-ship missile (Strait of Hormuz)
- Sirens in Kiryat Shmona
- Rocket impact near Ashkelon
- Reconnaissance drone (Golan Heights)

**12 seed news items**:
- Sources attributed to: IDF Spokesperson, Reuters, Times of Israel, Al Jazeera, Kann News, Telegram, Channel 12, Ynet
- Categories: Military, Diplomacy, Defense, Civil Defense, Infrastructure, Aviation
- 4 marked as breaking news

**6 seed alerts**:
- 3 active: Tel Aviv, Kiryat Shmona, Sderot
- 3 inactive: Ashkelon, Haifa Bay, Eilat

All seed data is English-only. Translations happen at the UI level for labels and categories, but event titles/descriptions remain in English.

### News Items (REAL)

**Source**: `fetchRSSAppFeeds()` in `server/data-fetcher.ts`, polls every 60 seconds. Also receives instant push via webhook.

Uses RSS.app Premium API to fetch all configured Telegram/OSINT feeds:
1. Lists all feeds via `GET /v1/feeds`
2. Fetches items for each feed via `GET /v1/feeds/{id}/items`
3. Deduplicates using in-memory `seenGuids` set (max 1000 entries)
4. Detects breaking news via keyword matching (צבע אדום, BREAKING, عاجل, etc.)
5. For batches ≤5 items, runs AI classification to extract war events

**Webhook**: `POST /api/webhooks/rss` receives instant push from RSS.app when new items arrive.

**Requires**: `RSSAPP_API_KEY` and `RSSAPP_API_SECRET` env vars.

### Alerts / Oref (REAL)

**Source**: `fetchOrefAlerts()` in `server/data-fetcher.ts`, polls every 5 seconds.

Fetches from `https://www.oref.org.il/WarningMessages/alert/alerts.json` via Tailscale VPN proxy.
- Requires `PROXY_BASE_URL` env var pointing to the Tailscale proxy (e.g., `http://100.81.32.3:3080`)
- Uses 38-city coordinate lookup table (`CITY_COORDS`) to geolocate alerts on the map
- Each alert also creates a corresponding `air_raid_alert` war event
- War events are broadcast via WebSocket to all connected clients
- Returns empty when no active alerts (Oref returns empty string or `[]`)

### AI Summary (REAL)

**Source**: `refreshAISummary()` in `server/data-fetcher.ts`, runs every 120 seconds.

Uses OpenAI GPT-4o-mini with structured JSON output:
- Reads last 15 war events + last 10 news items from DB
- System prompt: military intelligence analyst persona
- Output: `{ summary, threatAssessment, keyPoints, recommendation }`
- `response_format: { type: "json_object" }` for reliable parsing
- Temperature: 0.3, max_tokens: 1500
- Requires `OPENAI_API_KEY` env var

### Statistics (DERIVED)

**Source**: `DatabaseStorage.getStatistics()` in `server/storage.ts`

Statistics are computed on every API call by aggregating `war_events`:
- Counts events by type (`missile_launch`, `missile_intercept`, etc.)
- Calculates interception rate: `(interceptions / launches) * 100`
- Groups by country
- Maps defense system from event descriptions via keyword matching:
  - "Iron Dome" -> `ironDome`
  - "Arrow" -> `arrowSystem`
  - "David's Sling" / "David" -> `davidsSling`
  - "THAAD" -> `thaad`

### Marine Traffic (CONFIGURED — needs API key)

**Source**: `fetchMarineTraffic()` in `server/data-fetcher.ts`, polls every 5 minutes.

Tracks naval vessels in the Red Sea and Eastern Mediterranean:
- Bounding box: lat 10-40, lng 25-55
- Filters for military vessel types (codes 35, 55) and strategic tankers (80, 81)
- Creates `naval_movement` war events (max 20 per cycle)
- Replaces old naval events each cycle (not additive)
- Requires `MARINETRAFFIC_API_KEY` env var

### ADS-B Exchange (CONFIGURED — needs API key)

**Source**: `fetchADSBExchange()` in `server/data-fetcher.ts`, polls every 60 seconds.

Tracks aircraft transponders over conflict zones:
- Centered on lat 32, lng 35, radius 500nm
- Filters: military aircraft (`mil=1`, F-* / C-* / KC-* type prefixes) or altitude ≥ 20,000 ft
- Bounding box: lat 25-40, lng 25-55
- Creates `aircraft_tracking` war events (max 50 per cycle)
- Replaces old aircraft events each cycle
- Requires `ADSBX_API_KEY` env var

### Sentinel Hub Satellite Imagery (CONFIGURED — needs API key)

**Source**: `fetchSentinelImagery()` in `server/data-fetcher.ts`, runs every 60 minutes.

Fetches Sentinel-2 L2A satellite imagery for recent strike locations:
- Scans last 24h of `missile_hit` and `explosion` events
- Builds 0.1° bounding box around each event
- Auth: prefers OAuth2 (client_credentials), falls back to legacy API key (PLAK...)
- With OAuth: uses Catalog API for precise imagery search (cloud cover <30%)
- Without OAuth: goes straight to WMS with date range
- Stores imagery URLs in `satellite_images` table
- Tiles proxied via `/api/satellite-images/:id/tile` to avoid exposing credentials
- Requires `SENTINELHUB_INSTANCE_ID` (minimum), optionally `SENTINELHUB_CLIENT_ID` + `SENTINELHUB_CLIENT_SECRET` for OAuth

### TV Channels (REAL STREAMS)

**Source**: Hardcoded in `live-media-panel.tsx`

YouTube embed URLs for 9 channels:

| Channel | Country | Language | Embed URL |
|---------|---------|----------|-----------|
| Kan 11 | Israel | Hebrew | `youtube.com/embed/uK4WsEaFcIo` |
| Channel 12 News | Israel | Hebrew | `youtube.com/embed/FBkXcnP6FkA` |
| Channel 13 News | Israel | Hebrew | `youtube.com/embed/cBHM6yCZ1KA` |
| Channel 14 Now | Israel | Hebrew | `youtube.com/embed/7q8jU_1sGBE` |
| i24NEWS English | Israel | English | `youtube.com/embed/sDGD3aniu5Q` |
| Al Jazeera English | Qatar | English | `youtube.com/embed/gCNeDWCI0vo` |
| Al Jazeera Arabic | Qatar | Arabic | `youtube.com/embed/bNyUyrR0PHo` |
| Al Arabiya | UAE | Arabic | `youtube.com/embed/1Mg-amhCaNQ` |
| Sky News Arabia | UAE | Arabic | `youtube.com/embed/K4er3PFKsSg` |

These are real YouTube live stream embeds. They may become unavailable if the stream IDs change. YouTube embed URLs are not permanent and need periodic updating.

### Live Cameras (REAL STREAMS)

**Source**: Hardcoded in `live-media-panel.tsx`

| Camera | Country | Embed URL |
|--------|---------|-----------|
| Jerusalem - Western Wall | Israel | `youtube.com/embed/PmXjtCZwWKc` |
| Tel Aviv Skyline & Beach | Israel | `youtube.com/embed/mDiZNPfdmaY` |
| Haifa Port | Israel | `youtube.com/embed/xTq-rHhoVBw` |
| Eilat Coral Reef Cam | Israel | `youtube.com/embed/OM1MFnSIcYQ` |
| Mecca Live | Saudi Arabia | `youtube.com/embed/DJQARG-V3vs` |
| Dubai Live Cam | UAE | `youtube.com/embed/IH5WCaHEaLs` |

Same caveats as TV channels: YouTube embed IDs may change over time.

## Proxy Server Infrastructure

The proxy server at `proxy-server/index.js` is **active** and used for Oref alert fetching. It runs on a VPS with an Israeli IP, accessed via Tailscale VPN.

**Usage in code**:
```typescript
// In data-fetcher.ts - used by fetchOrefAlerts() every 5 seconds
const response = await fetchViaProxy("https://www.oref.org.il/...");
```

**Environment variables needed**:
- `PROXY_BASE_URL` = `http://100.81.32.3:3080` (Tailscale VPN address)
- `PROXY_AUTH_TOKEN` = Bearer token for authentication

See `docs/proxy-server.md` for setup details.

## Adding New Data Sources

To add a new data source, register it in the `dataSources` array in `server/data-fetcher.ts`. See `docs/extending.md` for the full guide and `docs/data-fetcher-internals.md` for architecture details.
