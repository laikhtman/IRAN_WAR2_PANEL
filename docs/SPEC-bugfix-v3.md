# SPEC-bugfix-v3 — Data Flow, Map Tiles, and Scroll Fixes

**Status:** READY  
**Priority:** CRITICAL  
**Created:** 2025-01-XX  
**Prerequisite:** SPEC-bugfix-v2 merged (PR #3, commit 42b32df)

---

## Bug Report (User)

> "The app is full of bugs: map in default (dark) doesn't show until I change type to terrain. Also the numbers on the dashboard are all null. No marks on the map. Scrolling of the news feed doesn't work. Oref alerts don't work. Live events feed doesn't work."

---

## Root Cause Analysis

### 1. Dashboard numbers all zero / no map markers / empty event feed / empty alerts (Bugs 2, 3, 5, 6)

**Root Cause: Empty database — no data flowing in.**

The seed data gate in `server/routes.ts` (line ~277) requires `ENABLE_SEED_DATA=true` env var, which is NOT set by default. Without it, the database starts empty. Meanwhile, ALL 7 data fetchers require external API keys that are also not configured:

| Source | Required Env Vars | Status |
|--------|------------------|--------|
| `oref-alerts` | `PROXY_BASE_URL` | Missing → no alerts fetched |
| `rss-app-feeds` | `RSSAPP_API_KEY`, `RSSAPP_API_SECRET` | Missing → no news fetched |
| `ai-summary-refresh` | `OPENAI_API_KEY` | Missing → no AI summary |
| `sentiment-analysis` | `OPENAI_API_KEY` | Missing → no sentiment |
| `marine-traffic` | `MARINETRAFFIC_API_KEY` | Missing → no naval data |
| `adsb-exchange` | `ADSBX_API_KEY` | Missing → no aircraft data |
| `sentinel-hub` | `SENTINELHUB_INSTANCE_ID` | Missing → no satellite images |

**Result:** `getStatistics()` returns all 0s, `getEvents()` returns `[]`, `getAlerts()` returns `[]`, `getNews()` returns `[]`. The UI displays animated counters at 0 and empty-state messages.

Additionally, `startDataFetcher()` only registers `setInterval` — it does NOT run an immediate first fetch. So even when env vars ARE configured, data won't appear until the first interval fires (5s–3600s depending on source).

### 2. Dark map tiles blank (Bug 1)

**Root Cause: CartoCDN `{r}` retina suffix + missing TileLayer configuration.**

The dark tile URL in `war-map.tsx` (line 95):
```
https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png
```

Issues:
- `{r}` is Leaflet's retina placeholder — replaced with `@2x` on retina displays, empty on non-retina. While Leaflet supports this natively, some CartoCDN edge servers reject `@2x` tile requests or serve corrupt tiles.
- **No `subdomains` prop** is passed to `TileLayer`. Leaflet defaults to `["a", "b", "c"]`, but explicit configuration is more reliable.
- **No `tileSize`/`zoomOffset`** for retina detection — on high-DPI screens this can cause misaligned or missing tiles.
- **No error event handler** — tile load failures are silently swallowed.
- **Why terrain works:** OSM tiles (`{s}.tile.openstreetmap.org`) are served by highly reliable CDN infrastructure with no retina suffix, so they always load.

### 3. News feed scrolling broken (Bug 4)

**Root Cause: Nested `ScrollArea` components in desktop sidebar.**

The right sidebar wraps all content in an outer `<ScrollArea className="flex-1">`. Inside, each panel component (NewsFeed, EventFeed, AlertsPanel) has its OWN inner `<ScrollArea className="flex-1">`. This creates nested virtual scroll containers:

```
ScrollArea (sidebar)           ← outer scroll
  └─ div.flex.flex-col
      ├─ EventFeed
      │   └─ ScrollArea        ← inner scroll (conflict!)
      ├─ AlertsPanel
      │   └─ ScrollArea        ← inner scroll (conflict!)
      └─ NewsFeed
          └─ ScrollArea        ← inner scroll (conflict!)
```

The inner `ScrollArea` with `flex-1` cannot compute proper height because its ancestors (`<div className="p-3">`) have no explicit height. The content overflows invisibly, and the inner scrollbar never activates.

---

## Fix Plan

### Phase 1: CRITICAL — Auto-Seed + Immediate Fetch

#### Task 1.1 — Auto-seed when no data sources are configured
**File:** `server/routes.ts` (line ~277)  
**Agent:** Alpha (Backend)

Replace the `ENABLE_SEED_DATA` gate with smart auto-detection: seed the database when EITHER `ENABLE_SEED_DATA=true` is set OR no external data source env vars are configured.

```typescript
// BEFORE (current):
if (process.env.ENABLE_SEED_DATA === "true") {
  const { seedIfEmpty } = await import("./seed");
  await seedIfEmpty();
}

// AFTER:
const hasAnyDataSource = [
  "PROXY_BASE_URL", "RSSAPP_API_KEY", "OPENAI_API_KEY",
  "MARINETRAFFIC_API_KEY", "ADSBX_API_KEY", "SENTINELHUB_INSTANCE_ID"
].some(key => !!process.env[key]);

if (process.env.ENABLE_SEED_DATA === "true" || !hasAnyDataSource) {
  const { seedIfEmpty } = await import("./seed");
  await seedIfEmpty();
  if (!hasAnyDataSource) {
    console.log("[seed] No external data sources configured — using seed data for demo mode");
  }
}
```

#### Task 1.2 — Run immediate first fetch on startup
**File:** `server/data-fetcher.ts` → `startDataFetcher()` (line ~1037)  
**Agent:** Alpha (Backend)

After registering each interval, immediately invoke the fetch function so data appears within seconds of startup instead of waiting for the first interval.

```typescript
// AFTER registering interval:
// Run an initial fetch immediately (don't block startup)
run().catch(() => {});

const interval = setInterval(run, source.fetchIntervalMs);
intervals.push(interval);
```

#### Task 1.3 — Add Oref direct-fetch headers
**File:** `server/data-fetcher.ts` → `fetchOrefAlerts()` (line ~175)  
**Agent:** Alpha (Backend)

When `PROXY_BASE_URL` is not configured, add browser-like headers to the direct Oref API fetch to improve compatibility:

```typescript
// In fetchViaProxy fallback path:
return fetch(url, {
  headers: {
    "Referer": "https://www.oref.org.il/",
    "X-Requested-With": "XMLHttpRequest",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  },
});
```

Also update the `oref-alerts` data source config to remove the hard `requiredEnvVars` dependency on `PROXY_BASE_URL` — mark the proxy as optional so the source always attempts to fetch:

```typescript
// In dataSources config:
{
  name: "oref-alerts",
  enabled: true,
  fetchIntervalMs: 5000,
  proxyRequired: false,  // Changed: proxy is preferred but not required
  fetchFn: fetchOrefAlerts,
  requiredEnvVars: [],    // Changed: no hard requirement — will try direct fetch
},
```

---

### Phase 2: HIGH — Map Dark Tiles Fix

#### Task 2.1 — Fix CartoCDN dark tile URL and add fallback
**File:** `client/src/components/war-map.tsx` (lines 93–107)  
**Agent:** Beta (Frontend)

**A. Fix the tile URL** — remove `{r}` retina suffix and use explicit `@2x` tile URL option:

```typescript
const TILE_LAYERS: Record<string, { url: string; label: string; attribution: string }> = {
  dark: {
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
    label: "Dark",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
  },
  terrain: {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    label: "Terrain",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  },
  satellite: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    label: "Satellite",
    attribution: '&copy; Esri',
  },
};
```

**B. Add `subdomains` and error handling** to the TileLayer component:

```tsx
<TileLayer
  key={mapStyle}
  url={TILE_LAYERS[mapStyle]?.url || TILE_LAYERS.dark.url}
  attribution={TILE_LAYERS[mapStyle]?.attribution}
  subdomains="abcd"
  maxZoom={19}
  eventHandlers={{
    tileerror: (e) => {
      console.warn("[map] Tile load error:", e);
    },
  }}
/>
```

Remove the mobile-only `detectRetina` spread — it's no longer needed without `{r}`.

**C. Re-enable attribution** on the MapContainer:

```tsx
<MapContainer
  ...
  attributionControl={true}  // Changed from false
>
```

Or keep it off and add a manual attribution div in the map corner for cleaner styling.

---

### Phase 3: HIGH — Nested Scroll Fix

#### Task 3.1 — Remove nested ScrollArea from panel components
**Files:** `client/src/components/event-feed.tsx`, `client/src/components/alerts-panel.tsx`, `client/src/components/news-feed.tsx`  
**Agent:** Beta (Frontend)

The panel components should NOT own their own scroll containers. The parent layout (desktop sidebar `ScrollArea` or mobile tab `ScrollArea`) handles scrolling.

**Strategy:** Replace `<ScrollArea className="flex-1">` with a plain `<div>` in each component. The outer sidebar ScrollArea will handle all scrolling.

**EventFeed** (line ~73):
```tsx
// BEFORE:
<ScrollArea className="flex-1" aria-live="polite">
  <div className="space-y-1.5 pr-2">
    ...
  </div>
</ScrollArea>

// AFTER:
<div aria-live="polite">
  <div className="space-y-1.5">
    ...
  </div>
</div>
```

**AlertsPanel** (line ~36):
```tsx
// BEFORE:
<ScrollArea className="flex-1">
  <div className="space-y-1.5 pr-1" aria-live="assertive">
    ...
  </div>
</ScrollArea>

// AFTER:
<div aria-live="assertive">
  <div className="space-y-1.5">
    ...
  </div>
</div>
```

**NewsFeed** (line ~185):
```tsx
// BEFORE:
<ScrollArea className="flex-1">
  <div className="space-y-1.5 pr-1">
    ...
  </div>
</ScrollArea>

// AFTER:
<div>
  <div className="space-y-1.5">
    ...
  </div>
</div>
```

Also update the root wrapper `<div className="flex flex-col h-full">` in each component to just `<div>` since flex-col + h-full was needed to make ScrollArea expand but is no longer needed.

> **Note:** These components are already wrapped in `<ScrollArea>` by their parent in both mobile and desktop layouts. Removing the inner ScrollArea does NOT break mobile — mobile tabs wrap content in `<ScrollArea className="flex-1">` in `dashboard.tsx`.

---

### Phase 4: MEDIUM — Seed Data Refresh Timestamps

#### Task 4.1 — Use relative timestamps in seed data
**File:** `server/seed.ts`  
**Agent:** Alpha (Backend)

The seed data already uses `minutesAgo()` helper, which is good. However, when `seedIfEmpty()` runs, it only seeds if the DB is empty. If the app has been running for hours, the seed data timestamps become stale (e.g., "45 minutes ago" becomes "3 hours ago").

Add a periodic refresh: if seed data is older than 2 hours and no real data has arrived, re-seed with fresh timestamps.

```typescript
export async function refreshSeedIfStale(): Promise<void> {
  // Only refresh if:
  // 1. Database has seed data (small event count)
  // 2. Most recent event is older than 2 hours
  const events = await storage.getEvents();
  if (events.length === 0 || events.length > 30) return; // Empty or has real data
  
  const newest = new Date(events[0].timestamp).getTime();
  const twoHoursAgo = Date.now() - 2 * 3600_000;
  
  if (newest < twoHoursAgo) {
    console.log("[seed] Seed data is stale, refreshing...");
    // Clear old seed data and re-seed
    // (implementation: delete all events, news, alerts, then call seedIfEmpty logic)
  }
}
```

---

## Testing Checklist

- [ ] App starts with empty env → auto-seeds → dashboard shows numbers, map has markers, events feed populated, news populated, alerts shown
- [ ] Dark map tiles load on first render (no need to switch to terrain)
- [ ] Terrain and satellite tile layers still work
- [ ] Right sidebar scrolls smoothly through all panels (EventFeed → AISummary → Alerts → News)
- [ ] News feed content is scrollable within the sidebar scroll
- [ ] Mobile tabs still work — each tab scrolls independently
- [ ] When `ENABLE_SEED_DATA=false` is explicitly set AND data source env vars exist, seed data is NOT loaded
- [ ] Oref alerts attempted even without PROXY_BASE_URL
- [ ] TypeScript compiles cleanly: `npx tsc --noEmit`

---

## Files Changed

| File | Phase | Agent | Change |
|------|-------|-------|--------|
| `server/routes.ts` | 1 | Alpha | Smart auto-seed logic |
| `server/data-fetcher.ts` | 1 | Alpha | Immediate first fetch + Oref headers + config fix |
| `client/src/components/war-map.tsx` | 2 | Beta | Fix dark tile URL, add attribution, error handling |
| `client/src/components/event-feed.tsx` | 3 | Beta | Remove nested ScrollArea |
| `client/src/components/alerts-panel.tsx` | 3 | Beta | Remove nested ScrollArea |
| `client/src/components/news-feed.tsx` | 3 | Beta | Remove nested ScrollArea |
| `server/seed.ts` | 4 | Alpha | Stale seed refresh (optional) |

---

## API Contract Changes

**None.** All existing API routes (`/api/events`, `/api/statistics`, `/api/news`, `/api/alerts`) are unchanged. The fix ensures they return populated data instead of empty arrays/zero stats.

## Database Changes

**None.** Existing schema is sufficient.
