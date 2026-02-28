# Data Sources - Real vs. Mock

This document details every piece of data displayed in the dashboard, where it comes from, and whether it uses real or simulated data.

## Summary

| Data | Source | Status | File |
|------|--------|--------|------|
| War Events | Simulated (random templates) | **Mock** | `server/data-fetcher.ts` |
| Seed Events | Hardcoded initial data | **Mock** | `server/seed.ts` |
| News Items | Hardcoded seed data | **Mock** | `server/seed.ts` |
| Alerts (Oref) | Hardcoded seed data | **Mock** | `server/seed.ts` |
| AI Summary | Template-based generation from DB stats | **Mock** | `server/data-fetcher.ts` |
| Statistics | Computed from war_events table | **Derived** (from mock events) | `server/storage.ts` |
| TV Channels | Hardcoded YouTube embed URLs | **Real streams** (if YouTube links are valid) | `client/src/components/live-media-panel.tsx` |
| Live Cameras | Hardcoded YouTube embed URLs | **Real streams** (if YouTube links are valid) | `client/src/components/live-media-panel.tsx` |
| Proxy Server | Infrastructure ready, not connected | **Not active** | `server/data-fetcher.ts` |

## Detailed Breakdown

### War Events (MOCK)

**Current source**: `simulateEvents()` in `server/data-fetcher.ts`

Every 15-30 seconds, the background fetcher randomly picks one of 5 event templates and creates a new event with a randomized location offset:

| Template | Type | Origin | Location Variance |
|----------|------|--------|-------------------|
| Iranian missile | `missile_launch` | Isfahan, Iran | +/- 1 degree lat/lng |
| Iron Dome interception | `missile_intercept` | Southern Israel | +/- 0.5 degree |
| Red Alert northern Israel | `air_raid_alert` | Upper Galilee | +/- 0.3 degree |
| UAV swarm from Lebanon | `drone_launch` | South Lebanon | +/- 0.3 degree |
| Gaza rockets | `missile_launch` | Northern Gaza | +/- 0.1 degree |

Each event gets a UUID and current timestamp. Events are broadcast to WebSocket clients and persisted to PostgreSQL.

**To make real**: Replace `simulateEvents()` with a function that fetches from real intelligence APIs or OSINT feeds. The `fetchViaProxy()` helper is ready for geo-restricted Israeli sources.

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

### News Items (MOCK)

**Current source**: Seed data only. No background fetcher creates new news items.

**To make real**: Add a new `DataSourceConfig` entry in `data-fetcher.ts` that fetches from news APIs:
- RSS feeds from Israeli news sites (via proxy)
- Reuters/AP news APIs
- Telegram channel scrapers

### Alerts / Oref (MOCK)

**Current source**: Seed data only. No background fetcher creates new alerts.

**To make real**: Add a data source that polls the Pikud HaOref (Home Front Command) API:
- Real API: `https://www.oref.org.il/WarningMessages/alert/alerts.json`
- Requires Israeli IP (use proxy server)
- Returns JSON array of active alerts with area codes

### AI Summary (MOCK)

**Current source**: `refreshAISummary()` in `server/data-fetcher.ts`, runs every 60 seconds.

This is NOT powered by an actual LLM. It constructs a summary using string templates filled with computed values:
- Counts active alerts from DB
- Calculates interception rate from event ratios
- Sets threat level based on alert count (>2 = critical, >0 = high, else medium)
- Fills in a pre-written paragraph template with these numbers

**To make real**: Replace `refreshAISummary()` with a call to OpenAI/Anthropic API, passing current events and alerts as context.

### Statistics (DERIVED FROM MOCK)

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

Since the underlying events are simulated, statistics are derived from mock data.

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

The proxy server at `proxy-server/index.js` is built and ready but not currently connected to any data source. It is designed for:

1. Fetching from Israeli news APIs that require Israeli IPs
2. Bypassing CORS restrictions
3. Adding Hebrew-locale headers for proper content

**Usage in code**:
```typescript
// In data-fetcher.ts - the helper exists but no source calls it yet
const response = await fetchViaProxy("https://www.oref.org.il/...");
```

**Environment variables needed**:
- `PROXY_BASE_URL` = `http://195.20.17.179:3128` (or wherever deployed)
- `PROXY_AUTH_TOKEN` = Bearer token for authentication

## Roadmap: Connecting Real Data Sources

To replace mock data with real data, add entries to the `dataSources` array in `server/data-fetcher.ts`:

```typescript
{
  name: "oref-alerts",
  enabled: true,
  fetchIntervalMs: 5000,    // poll every 5 seconds
  proxyRequired: true,
  fetchFn: async () => {
    const res = await fetchViaProxy("https://www.oref.org.il/WarningMessages/alert/alerts.json");
    const data = await res.json();
    // Transform and save to storage
  },
}
```

Each source needs:
- `name`: Unique identifier
- `fetchIntervalMs`: How often to poll
- `proxyRequired`: Whether to route through the Israeli proxy
- `fetchFn`: Async function that fetches, transforms, and persists data
