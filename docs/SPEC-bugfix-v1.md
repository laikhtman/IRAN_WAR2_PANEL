# SPEC-BUGFIX-V1: War Panel Stabilization & Bug Remediation

**Date**: 2026-03-01
**Author**: Agent Omega (Lead Architect)
**Priority**: CRITICAL — Stability release before any new features
**Scope**: 8 bug categories, ~30 discrete tasks across 4 agents

---

## Executive Summary

A production audit of IntelHQ.io revealed systemic issues in three tiers:

1. **Data layer** — Fetchers require API keys/proxy that aren't configured in most deployments, producing zero data across all panels.
2. **Presentation layer** — Legend shows i18n keys instead of labels, video embeds use unreliable third-party wrappers, status indicators contradict each other.
3. **UX polish** — Time display unlabeled on narrow viewports, dropdown z-index conflicts, scroll architecture forces single-scroll for all panels.

This SPEC defines the exact changes, files affected, and agent assignments for each fix.

---

## Agent Boundary Rules

| Agent | Scope | May Edit |
|-------|-------|----------|
| **Alpha** (Backend) | Server, DB, data-fetcher, storage, routes | `server/**`, `shared/schema.ts`, `db/**` |
| **Beta** (Frontend) | React components, pages, CSS, i18n JSONs | `client/**` |
| **Gamma** (AI) | OpenAI integration, classification, summaries | `server/data-fetcher.ts` (AI functions only) |
| **Delta** (Infra) | Deployment, env, proxy, HTTPS, monitoring | `proxy-server/**`, `docker*`, env docs, `server/index.ts` (middleware only) |

---

## 1. VIDEO PLAYER ISSUES

### Root Cause
- Israeli TV channels use `livehdtv.com/embed/` — an unreliable third-party aggregator that returns 404 or "Error 153" when streams are unavailable or domains are blocked.
- YouTube embeds use `youtube.com/embed/<ID>` which works but IDs go stale when livestreams restart.
- The `sandbox` attribute on iframes restricts some player APIs.

### 1.1 Replace livehdtv.com embeds with direct YouTube livestream IDs
**Agent**: Beta
**Files**: `client/src/components/live-media-panel.tsx`
**Change**:
- Audit and replace all `livehdtv.com/embed/…` URLs with verified YouTube embed URLs for each channel:
  - **Kan 11**: Find current YouTube livestream ID from Kan's official channel (UCa1-N3CzLICPd6BwAY4WI_A)
  - **Channel 12**: YouTube channel ID UC3Lx0QcdkGRTFCnsvGJRMXg
  - **Channel 13**: YouTube channel ID UCDGSmruaSbIaJsR9Fm6V-tg
  - **Channel 14**: YouTube channel ID UCRd_3DhFAaRKxP5TJwPbqSQ
  - **i24NEWS**: YouTube channel ID UCMdGPato0IC5-MU5i_ZRXNQ
- Use `youtube-nocookie.com` domain for privacy compliance
- Format: `https://www.youtube-nocookie.com/embed/live_stream?channel=<CHANNEL_ID>&autoplay=1&mute=1`
- This format auto-resolves to the current live stream without hardcoding video IDs

### 1.2 Add iframe error detection and fallback UI
**Agent**: Beta
**Files**: `client/src/components/live-media-panel.tsx`
**Change**:
- Wrap each iframe in an error-boundary component
- Add an `onError` / `onLoad` detection mechanism:
  ```tsx
  const [loadState, setLoadState] = useState<'loading' | 'loaded' | 'error'>('loading');
  ```
- On error, display a styled fallback card:
  ```
  [Camera icon] Stream Unavailable
  "Kan 11 is currently offline or unavailable in your region"
  [Retry] button
  ```
- Add a 15-second timeout — if iframe hasn't fired `load` event, show fallback

### 1.3 Relax sandbox restrictions
**Agent**: Beta
**Files**: `client/src/components/live-media-panel.tsx`
**Change**:
- Current sandbox: `allow-scripts allow-same-origin allow-presentation allow-popups`
- Add: `allow-popups-without-user-activation` (needed for some player APIs)
- Note: `allow-same-origin` + `allow-scripts` together can be risky — but required for YouTube embeds

---

## 2. MAP & LEGEND PROBLEMS

### 2.1 Fix legend showing i18n keys instead of human-readable labels
**Agent**: Beta
**Files**: `client/src/components/war-map.tsx`, `client/src/locales/en.json`, `client/src/locales/he.json`, `client/src/locales/ar.json`, `client/src/locales/fa.json`

**Root Cause**: The map legend maps event type keys to i18n keys like `events.types.naval_movement`, but the locale files are missing entries for `naval_movement` and `aircraft_tracking`.

**Current locale (en.json) `events.types`**:
```json
"missile_launch": "MISSILE LAUNCH",
"missile_intercept": "INTERCEPTED",
"missile_hit": "IMPACT",
"drone_launch": "DRONE LAUNCH",
"drone_intercept": "DRONE INTERCEPT",
"air_raid_alert": "AIR RAID ALERT",
"ceasefire": "CEASEFIRE",
"military_operation": "MIL. OPERATION",
"explosion": "EXPLOSION",
"sirens": "SIRENS"
```

**Missing keys** (add to all 4 locale files):
```json
"naval_movement": "NAVAL MOVEMENT",
"aircraft_tracking": "AIRCRAFT TRACKING"
```

### 2.2 Fix legend overflow / CSS positioning
**Agent**: Beta
**Files**: `client/src/components/war-map.tsx`

**Changes**:
- Add `max-h-[calc(100%-80px)] overflow-y-auto` to the legend container div
- Add `pointer-events-auto` to allow scrolling (currently `pointer-events-none` on parent)
- Make legend collapsible: add a toggle button at top that collapses all entries, leaving only the "LEGEND" header clickable

### 2.3 Add base map layer switcher
**Agent**: Beta
**Files**: `client/src/components/war-map.tsx`

**Changes**:
- Add a 3-option base map selector (Dark / Terrain / Satellite) in the map toolbar area
- Tile URLs:
  - **Dark** (default): `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png`
  - **Terrain**: `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png` (current)
  - **Satellite**: `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}`
- Persist selection in `localStorage` key `war-panel-map-style`
- Remove the current "Satellite" toggle from the legend section (it's confusing context)
- Keep the satellite imagery overlay toggle separate (that's for Sentinel Hub imagery, not base map)

### 2.4 Unify CONNECTED / NO DATA status indicators
**Agent**: Beta
**Files**: `client/src/components/header-bar.tsx`

**Changes**:
- Current logic shows `wsStatus === "connected"` badge AND separate `isLiveFeed` indicator, which creates confusing "CONNECTED + NO DATA" state
- Change to a unified 4-state indicator:
  | State | Condition | Label | Color |
  |-------|-----------|-------|-------|
  | LIVE | connected + isDataFresh | "LIVE" | green |
  | CONNECTED | connected + !isDataFresh | "Connected — awaiting data" | yellow |
  | RECONNECTING | reconnecting | "Reconnecting…" | yellow/pulse |
  | OFFLINE | disconnected | "Offline" | red |
- Remove the separate `liveFeedIndicator` component; merge into `wsIndicator`

---

## 3. COMBAT STATISTICS & EVENT METRICS

### 3.1 Show explanatory state when counts are zero
**Agent**: Beta
**Files**: `client/src/components/stats-panel.tsx`

**Changes**:
- When all stat values are 0, show a contextual message instead of/below the grids:
  ```
  "No combat events reported in the last 24 hours.
   Statistics populate automatically when events are detected."
  ```
- For `interceptionRate`: when `totalMissilesLaunched === 0 && totalDronesLaunched === 0`, display "N/A" instead of "0%"

### 3.2 Ensure data fetcher fallback / demo mode
**Agent**: Alpha
**Files**: `server/data-fetcher.ts`, `server/routes.ts`

**Changes**:
- Add a new `/api/data-sources/status` public endpoint that returns the health status from `getDataSourceHealthStatus()` (already implemented but not exposed)
- This allows the frontend to show which data sources are configured and which are missing API keys

### 3.3 Add data source health indicator to dashboard
**Agent**: Beta
**Files**: `client/src/components/header-bar.tsx` (or new component)

**Changes**:
- Query `/api/data-sources/status` every 60s
- Show a small icon/badge indicating:
  - ✅ X/Y sources active
  - ⚠️ X sources not configured → click to expand list
- This replaces the confusing "NO DATA" with actionable information

### 3.4 Fix bySystem hardcoded percentages
**Agent**: Alpha
**Files**: `server/storage.ts` (lines ~140-148)

**Current (problematic)**:
```ts
bySystem: {
  "Iron Dome": Math.round(intercepted * 0.6),
  "Arrow-2": Math.round(intercepted * 0.1),
  // ... hardcoded percentages
}
```
**Change**: When `intercepted === 0`, return empty `bySystem: {}` instead of a list of "0"s. Only populate when there's real data. Alternatively, track actual system assignments from event metadata if available.

---

## 4. AI SITUATION ANALYSIS & ALERTS

### 4.1 AI summary grounding — prevent hallucination
**Agent**: Gamma
**Files**: `server/data-fetcher.ts` (function `refreshAISummary`)

**Changes**:
- The AI summary prompt MUST include actual event data as context:
  ```
  System: You are a military intelligence analyst. Produce a situation summary based ONLY on the provided events. Do not fabricate events that are not in the data.
  User: Here are the last 20 events: [JSON array of real events]
  ```
- When no events exist, the summary should say: "No significant events reported in the monitoring period."
- Add `sources` field to AISummary schema listing which events/news items informed the summary

### 4.2 Add disclaimer and timestamp to AI card
**Agent**: Beta
**Files**: `client/src/components/ai-summary.tsx`

**Changes**:
- Add a small italic disclaimer below the summary: *"AI-generated analysis based on available data. May contain inaccuracies."*
- Show "Generated from X events, Y news items" metadata
- The timestamp is already shown (`summary.lastUpdated`) — ensure it's formatted as relative time + absolute time on hover

### 4.3 Oref alerts synchronization
**Agent**: Alpha
**Files**: `server/data-fetcher.ts` (function `fetchOrefAlerts`)

**Changes**:
- Current code properly fetches from Oref API but requires `PROXY_BASE_URL` to be set
- Add a health log message at startup: `[oref-alerts] PROXY_BASE_URL is not set — Oref alerts will not be fetched`
- Add automatic alert expiration: alerts older than 30 minutes should be marked `active: false`
- Add deduplication: don't re-insert alerts for the same city within 5 minutes

### 4.4 Add AISummary schema extension
**Agent**: Alpha
**Files**: `shared/schema.ts`

**Changes**:
- Add optional fields to `aiSummarySchema`:
  ```ts
  sources: z.array(z.string()).optional(),      // event IDs used
  eventCount: z.number().optional(),             // how many events were analyzed
  newsCount: z.number().optional(),              // how many news items  
  disclaimer: z.string().optional(),             // "AI-generated..."
  ```
- Add corresponding columns to `aiSummaries` table schema (nullable)

---

## 5. NEWS FEED INCONSISTENCIES

### 5.1 Fix "News Feed: 0 items - Loading..." indicator
**Agent**: Beta
**Files**: `client/src/components/news-ticker.tsx`, `client/src/components/news-feed.tsx`

**Root Cause**: The `NewsTicker` receives an empty array on initial render before the API responds. It shows "0 items" until the query resolves.

**Changes**:
- In `NewsTicker`: when `news.length === 0`, show a loading/skeleton state instead of "0 items"
- In `NewsFeed`: the "Loading news feed…" text should only show when the query is in `isLoading` state, not just when `news.length === 0`
- Pass `isLoading` from the `useQuery` hook down to these components

### 5.2 Add language filter to news feed
**Agent**: Beta
**Files**: `client/src/components/news-feed.tsx`, `shared/schema.ts`

**Changes**:
- Add a `language` field to `newsItemSchema` (optional string)
- Add filter buttons above the news feed: "All | EN | HE | AR | FA"
- Store filter preference in localStorage
- When AI classification runs on news items, detect language and store it

### 5.3 Add search/date-range filters
**Agent**: Beta
**Files**: `client/src/components/news-feed.tsx`

**Changes**:
- Add a compact search input at the top of the news feed (client-side filter of loaded items)
- Add quick date filters: "1h | 6h | 24h | All"
- Filter operates on the existing `news` array (no new API endpoints needed)

---

## 6. UI/UX POLISH

### 6.1 Fix time display — label all timezones clearly
**Agent**: Beta
**Files**: `client/src/components/header-bar.tsx`

**Root Cause**: On narrow viewports (`isNarrow`), `compactClocks` renders three times separated by `/` with no labels — just colored text and title attributes (invisible on mobile).

**Changes**:
- In `compactClocks`, add tiny labels above or before each time:
  ```tsx
  <span className="text-[9px] text-muted-foreground mr-0.5">LCL</span>
  <span className="text-foreground">{localTimeStr}</span>
  <span className="text-[9px] text-muted-foreground ml-1 mr-0.5">ISR</span>
  <span className="text-cyan-400">{israelTime}</span>
  <span className="text-[9px] text-muted-foreground ml-1 mr-0.5">THR</span>
  <span className="text-red-400">{tehranTime}</span>
  ```

### 6.2 Add tooltip to sentiment/escalation indicator
**Agent**: Beta
**Files**: `client/src/components/header-bar.tsx`

**Changes**:
- Wrap `sentimentIndicator` in a Tooltip (from `@/components/ui/tooltip`)
- Tooltip content:
  ```
  Escalation Index: -0.77
  Based on sentiment analysis of {sampleSize} recent news items.
  Scale: -1.0 (de-escalating) to +1.0 (escalating)
  Last updated: {time}
  ```

### 6.3 Fix dropdown z-index and close-on-outside-click
**Agent**: Beta
**Files**: `client/src/components/live-media-panel.tsx`

**Changes**:
- The channel selector dropdown uses `z-50` but the map is `z-[1000]` — map wins
- Change dropdown to `z-[1100]` to appear above map
- Add a click-outside handler to close the dropdown:
  ```tsx
  useEffect(() => {
    if (!selectorOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (!dropdownRef.current?.contains(e.target as Node)) {
        setSelectorOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [selectorOpen]);
  ```

### 6.4 Pin map/stats, make feed scroll independently
**Agent**: Beta
**Files**: `client/src/pages/dashboard.tsx`

**Analysis**: The current desktop layout already uses `flex-1 flex flex-col min-h-0` with ScrollArea on the right sidebar, so the map IS pinned and the right sidebar scrolls independently. The reported issue may be about the overall page scrolling. 

**Changes**:
- Add `overflow-hidden` to the root `div.h-screen` to prevent body scroll
- Ensure the main column's `flex-col` children don't exceed viewport height
- The mobile layout already handles this with the tab system

### 6.5 Accessibility improvements
**Agent**: Beta
**Files**: Multiple client files

**Changes** (batch):
- Add `alt` text to all `<img>` tags (lion logo already has alt="War Panel")
- Add `aria-label` to icon-only buttons (mute, presentation, collapse)
- Add `role="tablist"` / `role="tab"` to the mobile tab bar
- Add `tabIndex` to interactive elements that aren't natively focusable
- Add skip-to-content link as first element in the page
- Ensure all color-coded indicators have non-color alternatives (icons, text labels)

---

## 7. BACKEND & DATA INTEGRATION

### 7.1 Expose data source health endpoint
**Agent**: Alpha
**Files**: `server/routes.ts`

**Changes**:
- Add route:
  ```ts
  app.get("/api/data-sources/status", async (_req, res) => {
    const status = getDataSourceHealthStatus();
    res.json(status);
  });
  ```
- This endpoint is already implemented in `data-fetcher.ts` but never exposed in routes

### 7.2 Add startup health logging
**Agent**: Alpha
**Files**: `server/data-fetcher.ts`

**Changes**:
- At the top of `startDataFetcher()`, log a summary:
  ```
  [data-fetcher] Startup health check:
    oref-alerts: NOT_CONFIGURED (missing PROXY_BASE_URL)
    rss-app-feeds: NOT_CONFIGURED (missing RSSAPP_API_KEY, RSSAPP_API_SECRET)
    ai-summary-refresh: OK
    ...
  ```
- This makes it immediately obvious in logs why data isn't flowing

### 7.3 Restore-on-startup from DB
**Agent**: Alpha
**Files**: `server/routes.ts`, `server/storage.ts`

**Status**: Already implemented — `storage.getEvents()` reads from PostgreSQL with `LIMIT 200`, so data persists across restarts. The issue is upstream (no data being fetched), not persistence.

### 7.4 Rate limit guards for paid APIs
**Agent**: Alpha
**Files**: `server/data-fetcher.ts`

**Changes**:
- Add per-source rate limit tracking:
  ```ts
  const rateLimits: Record<string, { maxPerHour: number; count: number; resetAt: number }> = {
    "adsb-exchange": { maxPerHour: 60, count: 0, resetAt: 0 },
    "marine-traffic": { maxPerHour: 12, count: 0, resetAt: 0 },
  };
  ```
- Check before each fetch; skip if limit exceeded
- Log when rate limits are hit

---

## 8. DEPLOYMENT & ENVIRONMENT

### 8.1 HTTPS / mixed content audit
**Agent**: Delta
**Files**: `client/src/components/live-media-panel.tsx`, `client/src/components/war-map.tsx`

**Changes**:
- Audit all hardcoded URLs for `http://` — replace with `https://`
- Current tile URL is already HTTPS (`https://{s}.tile.openstreetmap.org`)
- YouTube embeds are already HTTPS
- Oref alert URL is HTTPS (`https://www.oref.org.il/...`)
- Siren audio URL is HTTPS
- **Action**: Add CSP header `upgrade-insecure-requests` in `server/index.ts` security headers

### 8.2 Error logging
**Agent**: Delta
**Files**: `server/index.ts`, new file `server/logger.ts`

**Changes**:
- Create a simple structured logger that writes to console + optional file
- Add request/response logging middleware for API routes
- Log WebSocket connection/disconnection events with client count
- Add error boundaries in data-fetcher that log to the same system
- Expose recent logs at admin endpoint `/api/admin/logs`

### 8.3 User feedback mechanism
**Agent**: Beta + Delta
**Files**: New `client/src/components/feedback-dialog.tsx`, `server/routes.ts`

**Changes**:
- Add a small "Feedback" button (bottom-right corner of page)
- Opens a dialog with: textarea + optional email + submit
- `POST /api/feedback` stores in DB or sends to admin email
- Low priority — defer to Phase 2

---

## Implementation Priority Order

### Phase 1 — CRITICAL (Do First)
| # | Task | Agent | Est. Hours |
|---|------|-------|-----------|
| 2.1 | Fix missing i18n legend keys | Beta | 0.5h |
| 2.4 | Unify CONNECTED/NO DATA indicator | Beta | 1h |
| 3.1 | Explanatory state for zero stats | Beta | 1h |
| 3.2 | Expose `/api/data-sources/status` endpoint | Alpha | 0.5h |
| 3.4 | Fix bySystem empty when 0 interceptions | Alpha | 0.5h |
| 4.1 | Ground AI summary in real events | Gamma | 2h |
| 4.3 | Oref alerts expiration + dedup | Alpha | 1h |
| 5.1 | Fix "0 items" loading state | Beta | 1h |
| 7.1 | Expose data source health route | Alpha | 0.5h |
| 7.2 | Startup health logging | Alpha | 0.5h |

### Phase 2 — HIGH (Do Second)
| # | Task | Agent | Est. Hours |
|---|------|-------|-----------|
| 1.1 | Replace livehdtv.com embed URLs | Beta | 2h |
| 1.2 | Iframe error detection + fallback | Beta | 2h |
| 2.2 | Fix legend overflow CSS | Beta | 1h |
| 2.3 | Add base map layer switcher | Beta | 2h |
| 4.2 | AI disclaimer + metadata | Beta | 1h |
| 6.1 | Label compact clocks | Beta | 0.5h |
| 6.2 | Sentiment tooltip | Beta | 0.5h |
| 6.3 | Dropdown z-index + close-outside | Beta | 1h |
| 8.1 | HTTPS / CSP header | Delta | 0.5h |

### Phase 3 — MEDIUM (Polish)
| # | Task | Agent | Est. Hours |
|---|------|-------|-----------|
| 1.3 | Relax sandbox restrictions | Beta | 0.25h |
| 3.3 | Data source health badge in header | Beta | 2h |
| 4.4 | AI schema extension | Alpha | 1h |
| 5.2 | Language filter for news | Beta | 2h |
| 5.3 | Search/date-range filters | Beta | 2h |
| 6.4 | Pin map + overflow hidden | Beta | 0.5h |
| 6.5 | Accessibility pass | Beta | 3h |
| 7.4 | Rate limit guards | Alpha | 1h |
| 8.2 | Structured logging | Delta | 3h |
| 8.3 | Feedback dialog | Beta+Delta | 2h |

---

## Schema Changes Summary

### Locale files (all 4 languages)
Add to `events.types`:
```json
"naval_movement": "NAVAL MOVEMENT",
"aircraft_tracking": "AIRCRAFT TRACKING"
```

### `shared/schema.ts`
Add optional fields to `aiSummarySchema`:
```ts
sources: z.array(z.string()).optional(),
eventCount: z.number().optional(),
newsCount: z.number().optional(),
```

Add optional `language` to `newsItemSchema`:
```ts
language: z.string().optional(),
```

### Database (`db/schema.sql`)
```sql
ALTER TABLE ai_summaries ADD COLUMN sources jsonb;
ALTER TABLE ai_summaries ADD COLUMN event_count integer;
ALTER TABLE ai_summaries ADD COLUMN news_count integer;
ALTER TABLE news_items ADD COLUMN language varchar(10);
```

### New API Endpoints
| Method | Path | Handler |
|--------|------|---------|
| GET | `/api/data-sources/status` | Returns data source health array |

---

## Files Modified Per Agent

### Alpha (Backend)
- `server/routes.ts` — add `/api/data-sources/status`
- `server/storage.ts` — fix `bySystem` when 0 interceptions
- `server/data-fetcher.ts` — startup logging, alert expiration/dedup, rate limits
- `shared/schema.ts` — schema extensions
- `db/schema.sql` — ALTER TABLE statements

### Beta (Frontend)
- `client/src/components/live-media-panel.tsx` — embed URLs, error UI, z-index, close-outside
- `client/src/components/war-map.tsx` — legend i18n fix, overflow CSS, map layer switcher
- `client/src/components/stats-panel.tsx` — zero-state messaging
- `client/src/components/header-bar.tsx` — unified status, compact clock labels, sentiment tooltip
- `client/src/components/ai-summary.tsx` — disclaimer, metadata
- `client/src/components/news-feed.tsx` — loading state, language filter, search
- `client/src/components/news-ticker.tsx` — loading state
- `client/src/pages/dashboard.tsx` — overflow-hidden, pass isLoading
- `client/src/locales/en.json` — missing keys
- `client/src/locales/he.json` — missing keys
- `client/src/locales/ar.json` — missing keys
- `client/src/locales/fa.json` — missing keys

### Gamma (AI)
- `server/data-fetcher.ts` — `refreshAISummary()` grounding prompt with real events

### Delta (Infra)
- `server/index.ts` — CSP header
- `server/logger.ts` — new structured logger (Phase 3)
- Deployment docs update

---

*End of SPEC-BUGFIX-V1*
