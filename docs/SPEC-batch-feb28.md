# SPEC: February 28 Implementation Batch

**Tasks**: #36, #37, #22, #24, #6, #8, #17
**Author**: Agent Omega (Lead Architect)
**Date**: 2026-02-28

---

## PART A: Frontend-Only (Tasks #36 & #37) — Agent Beta

These two tasks are **purely frontend**, zero backend changes. They modify `dashboard.tsx` and `header-bar.tsx`.

### Task #36 — Full-Screen Presentation Mode

**Goal**: A toggle button in the header that switches the dashboard into a fullscreen, chrome-free "briefing room" layout.

**Scope (Beta only)**:
1. Add a `Maximize2` / `Minimize2` icon button to [header-bar.tsx](../client/src/components/header-bar.tsx) (next to the mute button).
2. The button calls `document.documentElement.requestFullscreen()` or `document.exitFullscreen()`.
3. Track fullscreen state via a `useState<boolean>` + `fullscreenchange` event listener.
4. When in fullscreen mode, apply a CSS class `presentation-mode` to the dashboard root `<div>`:
   - Hide the `NewsTicker` bar.
   - Hide the `LiveMediaPanel`.
   - Expand the map to fill the remaining space.
   - Increase font sizes of `StatsPanel` numbers by 1.5x via a Tailwind class.
5. Show a subtle "ESC to exit" tooltip that fades after 3 seconds.

**Props change**:
```typescript
// header-bar.tsx
interface HeaderBarProps {
  isMuted?: boolean;
  onToggleMute?: () => void;
  isPresentation?: boolean;       // NEW
  onTogglePresentation?: () => void; // NEW
}
```

**No database changes. No API changes. No schema changes.**

---

### Task #37 — Keyboard Shortcuts

**Goal**: Global keyboard shortcuts for power users, with a `?` help overlay.

**Shortcuts to implement**:

| Key | Action |
|-----|--------|
| `F` | Toggle fullscreen / presentation mode (#36) |
| `M` | Toggle mute/unmute |
| `?` | Show/hide shortcuts help overlay |
| `Esc` | Close any open overlay / exit fullscreen |
| `1` | Scroll to / focus Events panel |
| `2` | Scroll to / focus AI Summary panel |
| `3` | Scroll to / focus Alerts panel |
| `4` | Scroll to / focus News panel |

**Implementation**:
1. Create a new component `client/src/components/keyboard-shortcuts.tsx`.
2. Use a top-level `useEffect` with `keydown` listener on `document`.
3. Ignore keystrokes when user is focused on an `<input>` or `<textarea>`.
4. The help overlay is a semi-transparent dark modal listing all shortcuts in a grid.
5. Wire the `F` and `M` shortcuts into the callbacks already exposed by `dashboard.tsx`.

**Props**: The component receives callbacks from `dashboard.tsx`:
```typescript
interface KeyboardShortcutsProps {
  onToggleMute: () => void;
  onTogglePresentation: () => void;
}
```

**No database changes. No API changes. No schema changes.**

---

## PART B: Backend AI Enhancement (Tasks #22 & #24) — Agent Alpha + Agent Gamma

These tasks modify `server/data-fetcher.ts` (the `refreshAISummary` function) and `shared/schema.ts`.

### Task #22 — AI Event Classification

**Goal**: When a new `WarEvent` is created from RSS/Oref data, use GPT-4o-mini to classify it into one of the existing `eventTypes` and assign a `threatLevel`, instead of using hardcoded heuristics.

**Schema change** — add `aiClassified` boolean to `warEvents` table (Optional; defaults to `false`):
```sql
ALTER TABLE war_events ADD COLUMN ai_classified BOOLEAN NOT NULL DEFAULT false;
```

**Drizzle schema change** in `shared/schema.ts`:
```typescript
// Add to warEvents table definition:
aiClassified: boolean("ai_classified").notNull().default(false),
```

**Zod schema change** — update `eventSchema`:
```typescript
// Add:
aiClassified: z.boolean().optional(),
```

**Backend logic** in `data-fetcher.ts`:
1. Create a new function `classifyEvent(rawTitle: string, rawDescription: string): Promise<{ type: string, threatLevel: string }>`.
2. Use GPT-4o-mini with `response_format: { type: "json_object" }`.
3. System prompt: _"You are a military intelligence classifier. Given a raw event report, return JSON with `type` (one of: missile_launch, missile_intercept, missile_hit, drone_launch, drone_intercept, air_raid_alert, ceasefire, military_operation, explosion, sirens) and `threatLevel` (one of: critical, high, medium, low). Respond ONLY with valid JSON."_
4. Apply a **5-second timeout** via `AbortController`. If it times out, fall back to the current heuristic (keyword matching).
5. Only call this for RSS-sourced events (not Oref events which are already correctly typed).
6. Set `aiClassified: true` on events that were classified by GPT.

**Rate control**: Batch classify — accumulate up to 5 events, send them in a single prompt as an array, parse array response. This prevents API spam.

---

### Task #24 — Sentiment Analysis on News Feeds

**Goal**: Add a per-item sentiment score to news items and an aggregate "media tone" indicator.

**Schema change** — add `sentiment` column to `news_items`:
```sql
ALTER TABLE news_items ADD COLUMN sentiment REAL;
```

**Drizzle schema change** in `shared/schema.ts`:
```typescript
// Add to newsItems table:
sentiment: real("sentiment"),  // -1.0 (very negative) to +1.0 (very positive)
```

**Zod schema change** — update `newsItemSchema`:
```typescript
sentiment: z.number().min(-1).max(1).optional(),
```

**New API endpoint** in `routes.ts`:
```
GET /api/news/sentiment
Response: { average: number, trend: "escalating" | "stable" | "de-escalating", sampleSize: number }
```

**Backend logic** in `data-fetcher.ts`:
1. Create `analyzeNewsSentiment(titles: string[]): Promise<number[]>`.
2. Send up to 20 recent news titles to GPT-4o-mini in a single call.
3. System prompt: _"Rate each headline on a scale from -1.0 (extremely negative / alarming) to +1.0 (positive / peaceful). Return a JSON array of numbers in the same order."_
4. Run this every 120 seconds ALONGSIDE the AI summary refresh (bundle into the same interval).
5. Store the sentiment value back into the `news_items` row.

**Frontend** (Agent Beta):
1. Add a small `SentimentIndicator` badge in the `HeaderBar` showing the aggregate tone (e.g., "Media Tone: Escalating 🔴" or "Media Tone: Stable 🟡").
2. Optionally show per-item sentiment dots in the `NewsFeed` component.

---

## PART C: External Data Sources (Tasks #8, #17, #6) — Agent Alpha

These tasks add new data fetchers in `server/data-fetcher.ts` and new map layers in the frontend.

### Task #8 — MarineTraffic API (Naval Movements)

**Goal**: Show naval vessel positions in the Red Sea and Eastern Mediterranean on the map.

**New env vars**:
```
MARINETRAFFIC_API_KEY=<api-key>
```

**No schema changes** — naval positions are stored as `war_events` with `type: "naval_movement"`.

**Schema update** — add event type:
```typescript
// In shared/schema.ts, add to eventTypes:
"naval_movement",
```

**Backend** (`data-fetcher.ts`):
1. Create `fetchMarineTraffic(): Promise<void>`.
2. API endpoint: `https://services.marinetraffic.com/api/exportvessel/v:8/{API_KEY}/timespan:10/msgtype:simple/protocol:json`
3. Filter for vessels in bounding box: lat 10-40, lng 25-55 (Red Sea + Eastern Med).
4. Filter for vessel types: military (type codes 35, 55) or tankers in conflict zones.
5. Map each vessel to a `WarEvent`:
   - `type`: `"naval_movement"`
   - `threatLevel`: `"low"` (default) or `"medium"` (if military vessel)
   - `country`: by flag code lookup
   - `source`: `"MarineTraffic"`
6. Fetch interval: **300 seconds** (5 min) — MarineTraffic API credits are expensive.
7. Wrap in try/catch, respect rate limits.

**Frontend** (Agent Beta):
1. Add to `eventColors` in `war-map.tsx`: `naval_movement: "#0ea5e9"` (sky blue).
2. Add to the legend.
3. Use a smaller `CircleMarker` radius (5) so ships don't dominate the map.

---

### Task #17 — ADS-B Exchange Aircraft Tracking

**Goal**: Show aircraft transponder positions over conflict zones.

**New env vars**:
```
ADSBX_API_KEY=<api-key>
```

**Schema update** — add event type:
```typescript
// In shared/schema.ts, add to eventTypes:
"aircraft_tracking",
```

**Backend** (`data-fetcher.ts`):
1. Create `fetchADSBExchange(): Promise<void>`.
2. API endpoint: `https://adsbexchange.com/api/aircraft/json/lat/32/lon/35/dist/500/`
3. Headers: `{ "api-auth": ADSBX_API_KEY }`.
4. Filter results:
   - Military aircraft (ICAO type designators starting with specific codes, or `mil` flag if available).
   - Aircraft above FL200 (20,000 ft) in the conflict bounding box.
5. Map to `WarEvent`:
   - `type`: `"aircraft_tracking"`
   - `title`: `"Aircraft ${callsign} — ${type} at FL${altitude}"`
   - `threatLevel`: `"low"` (surveillance) or `"medium"` (military transport/fighter)
   - `source`: `"ADS-B Exchange"`
6. Fetch interval: **60 seconds**.
7. **Pruning**: Only store the latest 50 aircraft positions. Delete older aircraft_tracking events before inserting new batch.

**Frontend** (Agent Beta):
1. Add to `eventColors`: `aircraft_tracking: "#a78bfa"` (violet).
2. Add to legend.
3. Use a triangle/diamond marker shape via custom CSS or a small radius (4) CircleMarker.

---

### Task #6 — Sentinel Hub Satellite Imagery

**Goal**: Pull recent satellite imagery tiles for known strike locations and show them as a toggleable map overlay.

**New env vars**:
```
SENTINELHUB_CLIENT_ID=<client-id>
SENTINELHUB_CLIENT_SECRET=<client-secret>
```

**Schema changes** — new table `satellite_images`:
```sql
CREATE TABLE satellite_images (
  id VARCHAR PRIMARY KEY,
  event_id VARCHAR REFERENCES war_events(id),
  image_url TEXT NOT NULL,
  bbox_west REAL NOT NULL,
  bbox_south REAL NOT NULL,
  bbox_east REAL NOT NULL,
  bbox_north REAL NOT NULL,
  captured_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (now())
);
```

**Drizzle schema** in `shared/schema.ts`:
```typescript
export const satelliteImages = pgTable("satellite_images", {
  id: varchar("id").primaryKey(),
  eventId: varchar("event_id"),
  imageUrl: text("image_url").notNull(),
  bboxWest: real("bbox_west").notNull(),
  bboxSouth: real("bbox_south").notNull(),
  bboxEast: real("bbox_east").notNull(),
  bboxNorth: real("bbox_north").notNull(),
  capturedAt: text("captured_at").notNull(),
  createdAt: text("created_at").notNull(),
});
```

**New API endpoints** in `routes.ts`:
```
GET /api/satellite-images
Response: SatelliteImage[]

GET /api/satellite-images/:id/tile
Response: Proxied image blob (to avoid exposing Sentinel Hub credentials to the browser)
```

**Backend** (`data-fetcher.ts`):
1. Create `fetchSentinelImagery(): Promise<void>`.
2. Authenticate via OAuth2: POST `https://services.sentinel-hub.com/oauth/token` with client credentials.
3. For each recent `missile_hit` or `explosion` event (last 24h), request a Sentinel-2 L2A true-color image:
   - WMS endpoint: `https://services.sentinel-hub.com/ogc/wms/{INSTANCE_ID}`
   - Bounding box: 0.05° around the event lat/lng.
   - Time range: last 5 days (cloud-free imagery).
4. Store the image URL + bbox in `satellite_images`.
5. Fetch interval: **3600 seconds** (1 hour) — satellite data doesn't change frequently.
6. Prune to max 50 images.

**Frontend** (Agent Beta):
1. New component `client/src/components/satellite-layer.tsx`.
2. Use Leaflet `ImageOverlay` to render satellite tiles over the map at the stored bbox.
3. Add a toggle button in the map legend: "🛰 Satellite" on/off.
4. Only show satellite overlays when zoomed in (zoom > 8) to avoid visual clutter.

---

## PART D: New Event Types Summary

After all tasks, `eventTypes` in `shared/schema.ts` should be:
```typescript
export const eventTypes = [
  "missile_launch",
  "missile_intercept",
  "missile_hit",
  "drone_launch",
  "drone_intercept",
  "air_raid_alert",
  "ceasefire",
  "military_operation",
  "explosion",
  "sirens",
  "naval_movement",      // NEW — Task #8
  "aircraft_tracking",   // NEW — Task #17
] as const;
```

---

## PART E: Environment Variables Required

Add these to `.env.example`:
```
# Task #8: MarineTraffic
MARINETRAFFIC_API_KEY=

# Task #17: ADS-B Exchange
ADSBX_API_KEY=

# Task #6: Sentinel Hub
SENTINELHUB_CLIENT_ID=
SENTINELHUB_CLIENT_SECRET=
```

---

## Delegation Checklist

### Phase 1: Schema + Quick Frontend Wins (No API keys needed)
1. **Agent Alpha** → Update `shared/schema.ts`: add `aiClassified` to `warEvents`, `sentiment` to `newsItems`, add `naval_movement` and `aircraft_tracking` to `eventTypes`, add `satelliteImages` table.
2. **Agent Alpha** → Update `db/schema.sql` with matching SQL.
3. **Agent Beta** → Implement Task #36 (Presentation Mode) + Task #37 (Keyboard Shortcuts). These are 100% frontend.

### Phase 2: AI Features (Needs OPENAI_API_KEY — already configured)
4. **Agent Gamma + Alpha** → Implement Task #22 (AI Event Classification) in `data-fetcher.ts`.
5. **Agent Gamma + Alpha** → Implement Task #24 (Sentiment Analysis) in `data-fetcher.ts` + new `/api/news/sentiment` route.
6. **Agent Beta** → Add `SentimentIndicator` to `header-bar.tsx`.

### Phase 3: External Data Sources (Needs new API keys)
7. **Agent Alpha** → Implement Task #8 (MarineTraffic fetcher) in `data-fetcher.ts`.
8. **Agent Alpha** → Implement Task #17 (ADS-B Exchange fetcher) in `data-fetcher.ts`.
9. **Agent Alpha** → Implement Task #6 (Sentinel Hub fetcher + image proxy route) in `data-fetcher.ts` + `routes.ts`.
10. **Agent Beta** → Update `war-map.tsx` with new event colors, legend entries, and satellite overlay toggle.

### Phase 4: Deploy
11. **Agent Delta** → Update `.env` on Hetzner VPS with new API keys. Restart PM2. Verify WebSocket + new data sources in production.
