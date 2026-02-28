# SPEC: Documentation Overhaul — Agent Delegation Plan

**Date**: 2026-02-28
**Author**: Agent Omega (Lead Architect)
**Source**: `todo_documentation.md` (53 tasks)

---

## Overview

All 53 documentation tasks from `todo_documentation.md` are delegated below to the four specialized agents. Each agent receives a scoped, self-contained assignment. **All four agents can run simultaneously** — there are zero cross-dependencies between their work.

### Ownership Summary

| Agent | Domain | Task IDs | File Count |
|-------|--------|----------|------------|
| **Alpha** (Backend) | API, DB, data-fetcher, WebSocket, storage, env vars | 1.8–1.13, 1.14–1.18, 1.28, 2.5, 2.7, 4.2, 4.3, 5.5 | 6 files to create/edit |
| **Beta** (Frontend) | UI components, i18n, health page, media panel docs | 1.19–1.22, 1.26–1.27, 2.6 | 3 files to edit |
| **Gamma** (AI) | AI summary pipeline, sentiment analysis, OpenAI integration docs | (subset of 4.3) | 1 file to create |
| **Delta** (DevOps) | Architecture, deployment, runbooks, monitoring, security, CONTRIBUTING, housekeeping | 1.1–1.7, 1.23–1.25, 1.29, 2.1–2.4, 3.1–3.16, 4.1, 4.4–4.6, 5.1–5.4, 5.6–5.8 | 10+ files to create/edit |

---

## Agent Alpha — Backend Documentation

### Scope
Alpha owns all `server/` documentation: API reference, database schema, data sources, env vars, WebSocket protocol, data-fetcher internals.

### Files to Edit
- `docs/api.md`
- `docs/database.md`
- `docs/data-sources.md`
- `docs/extending.md`

### Files to Create
- `docs/websocket.md`
- `docs/env-vars.md`
- `docs/data-fetcher-internals.md`

### Exact Tasks

#### 1. Fix `docs/api.md` (tasks 1.8–1.10)

1. **Add rate limiting section** after the REST Endpoints header:
   ```markdown
   ## Rate Limiting
   All API endpoints are rate-limited to **100 requests per IP per minute** via `express-rate-limit`.
   Exceeding the limit returns HTTP 429 with body: `{ "error": "Too many requests, please try again later." }`
   ```

2. **Add error response format section**:
   ```markdown
   ## Error Responses
   All endpoints return errors as JSON:
   - `500`: `{ "error": "Internal server error" }` (or detailed message in dev mode)
   - `429`: `{ "error": "Too many requests, please try again later." }`
   - `404`: Express default HTML page (API routes never return 404 as JSON)
   ```

3. **Expand `/api/system-health` documentation** — replace the minimal health response with the full `SystemHealth` shape:
   ```json
   {
     "database": {
       "connected": true,
       "tables": {
         "war_events": 142,
         "news_items": 87,
         "alerts": 23,
         "ai_summaries": 5,
         "data_source_status": 7
       }
     },
     "envVars": [
       { "name": "DATABASE_URL", "configured": true },
       { "name": "OPENAI_API_KEY", "configured": true },
       ...
     ],
     "dataSources": [
       {
         "name": "oref-alerts",
         "enabled": true,
         "fetchIntervalMs": 5000,
         "status": "ok",
         "missingEnvVars": [],
         "health": {
           "lastRunAt": "2026-02-28T10:30:00Z",
           "lastSuccessAt": "2026-02-28T10:30:00Z",
           "lastError": null,
           "runCount": 1420,
           "errorCount": 3
         }
       }
     ],
     "websocket": { "connectedClients": 12 }
   }
   ```

4. **Add RSS webhook endpoint**:
   ```markdown
   ### POST /api/rss-webhook
   Receives push notifications from RSS.app when new feed items arrive.
   Body: RSS.app webhook JSON payload.
   Response: `{ "ok": true, "ingested": <count> }`
   ```

#### 2. Fix `docs/database.md` (tasks 1.11–1.13)

1. Add `aiClassified` column to the `war_events` table definition:
   ```
   | ai_classified | boolean | NOT NULL DEFAULT false | Whether the event was classified by AI sentiment analysis |
   ```

2. Add `sentiment` column to the `news_items` table definition:
   ```
   | sentiment | real | NULL | AI sentiment score (-1.0 to 1.0) |
   ```

3. Add index documentation (sync with `db/README.md`):
   ```markdown
   ## Indexes
   - `idx_events_timestamp` on `war_events(timestamp DESC)` — speeds up latest-first queries
   - `idx_news_timestamp` on `news_items(timestamp DESC)`
   - `idx_alerts_timestamp` on `alerts(timestamp DESC)`
   - `idx_alerts_active` on `alerts(active)` — filters active alerts
   ```

4. Sync row pruning limits: `war_events` 500, `news_items` 500, `alerts` 200, `ai_summaries` 50.

#### 3. Fix `docs/data-sources.md` (tasks 1.14–1.18)

This file is **majorly outdated**. The summary table at the top must be replaced entirely:

| Data | Source | Status | File |
|------|--------|--------|------|
| War Events | Oref alerts + RSS.app + AI-classified | **REAL** | `server/data-fetcher.ts` |
| News Items | RSS.app Premium API (Telegram/OSINT feeds) | **REAL** | `server/data-fetcher.ts` |
| Alerts (Oref) | Pikud HaOref API via Tailscale VPN proxy | **REAL** | `server/data-fetcher.ts` |
| AI Summary | GPT-4o-mini via OpenAI SDK | **REAL** | `server/data-fetcher.ts` |
| Sentiment | GPT-4o-mini sentiment analysis | **REAL** | `server/data-fetcher.ts` |
| Statistics | Computed from war_events table | **Derived** | `server/storage.ts` |
| Marine Traffic | MarineTraffic API | **Not configured** | `server/data-fetcher.ts` |
| ADS-B Exchange | ADS-B Exchange API | **Not configured** | `server/data-fetcher.ts` |
| Sentinel Hub | Sentinel Hub imagery API | **Not configured** | `server/data-fetcher.ts` |
| TV Channels | Hardcoded embeds (YouTube / livehdtv.com) | **Real streams** | `live-media-panel.tsx` |
| Live Cameras | Hardcoded YouTube embeds | **Real streams** | `live-media-panel.tsx` |

Key changes:
- Remove all "MOCK" labels for Oref, RSS.app, AI summary — these are REAL
- Document RSS.app integration: API key/secret in env vars, server polls every 60s, webhook at `POST /api/rss-webhook`
- Document Oref alert flow: polls every 5s via Tailscale VPN proxy (`PROXY_BASE_URL`), 38-city coordinate lookup
- Document AI summary: GPT-4o-mini, structured JSON output, refreshes every 120s
- Add Marine Traffic, ADS-B Exchange, Sentinel Hub entries (enabled but not configured)
- Update TV channel URLs — Israeli channels now use `livehdtv.com` embeds, not YouTube
- Update camera URLs: Jerusalem `ITAlerjV8Ro`, Tel Aviv `CXP_uPkf_sY`, Haifa `nNegFX3ys5Q`, Mecca `-t-yKcXSrhM`, Dubai Marina `MfIpyflPbHQ`
- Update proxy section: proxy IS active, used for Oref alerts

#### 4. Fix `docs/extending.md` (task 1.28)

Add a new section "Adding Background Jobs":
```markdown
## Adding a Background Job / Data Source

1. Write your async fetch function in `server/data-fetcher.ts`
2. Add a `DataSourceConfig` entry to the `dataSources` array:
   ```typescript
   {
     name: "my-new-source",
     enabled: true,
     fetchIntervalMs: 60000,
     proxyRequired: false,
     fetchFn: myFetchFunction,
     requiredEnvVars: ["MY_API_KEY"],
   }
   ```
3. Health tracking is automatic — `recordSourceRun()` wraps every call
4. The source appears on `/health` page and `/api/system-health` automatically
5. Add required env vars to `.env.example` with descriptive comments
```

#### 5. Create `docs/websocket.md` (task 4.2)

New file documenting the WebSocket protocol:

```markdown
# WebSocket Protocol

## Connection
- URL: `ws://hostname:port/ws` (dev) or `wss://hostname/ws` (production via Nginx)
- No authentication required
- Server uses `ws` library (not Socket.io)

## Server → Client Messages

### new_event
Broadcast when a new war event is created by any data fetcher.
```json
{ "type": "new_event", "event": { <WarEvent object> } }
```

## Client → Server Messages
Currently none. The WebSocket is unidirectional (server push only).

## Connection Management
- Server tracks clients in a `Set<WebSocket>`
- Clients are removed on `close` event
- No heartbeat/ping-pong implemented
- Client count available via `/api/system-health` → `websocket.connectedClients`

## Frontend Implementation
- Located in `client/src/pages/dashboard.tsx`
- Reconnection: currently NOT automatic (data continues via REST polling)
- On `new_event`: prepends event to React Query cache via `queryClient.setQueryData`
```

#### 6. Create `docs/env-vars.md` (task 2.7)

New file — comprehensive environment variable reference:

| Variable | Required | Data Source | Description | How to Get |
|----------|----------|-------------|-------------|------------|
| `DATABASE_URL` | **Yes** | Core | PostgreSQL connection string | Local: `postgresql://postgres:postgres@localhost:5432/war_panel` |
| `OPENAI_API_KEY` | **Yes** | AI Summary + Sentiment | OpenAI API key (GPT-4o-mini) | https://platform.openai.com/api-keys |
| `RSSAPP_API_KEY` | Optional | RSS.app feeds | RSS.app Premium API key | https://rss.app/dashboard |
| `RSSAPP_API_SECRET` | Optional | RSS.app feeds | RSS.app API secret | Same dashboard |
| `PROXY_BASE_URL` | Optional | Oref alerts | Tailscale VPN proxy URL (e.g. `http://100.81.32.3:3080`) | Deploy proxy-server on Israeli IP |
| `PROXY_AUTH_TOKEN` | Optional | Oref alerts | Bearer token for proxy auth | Set on proxy server |
| `MARINETRAFFIC_API_KEY` | Optional | Marine Traffic | MarineTraffic API key | https://www.marinetraffic.com/en/ais-api-services |
| `ADSBX_API_KEY` | Optional | ADS-B Exchange | ADS-B Exchange API key | https://www.adsbexchange.com/data/ |
| `SENTINELHUB_INSTANCE_ID` | Optional | Sentinel Hub | Legacy instance ID | https://apps.sentinel-hub.com/dashboard/ |
| `SENTINELHUB_API_KEY` | Optional | Sentinel Hub | Legacy API key (PLAK...) | Same dashboard |
| `SENTINELHUB_CLIENT_ID` | Optional | Sentinel Hub | OAuth2 client ID | Same dashboard, create OAuth client |
| `SENTINELHUB_CLIENT_SECRET` | Optional | Sentinel Hub | OAuth2 client secret | Same dashboard |
| `PORT` | Optional | Core | Server port (default: 5000) | — |

Include sections:
- "Minimal Setup" (DATABASE_URL + OPENAI_API_KEY only)
- "Full Integration" (all vars)
- "Which env vars does each data source need?" (cross-reference with `dataSources` array)

#### 7. Create `docs/data-fetcher-internals.md` (task 4.3)

Document:
- `DataSourceConfig` interface (name, enabled, fetchIntervalMs, proxyRequired, fetchFn, requiredEnvVars)
- `SourceHealth` interface (lastRunAt, lastSuccessAt, lastError, runCount, errorCount)
- `sourceHealthMap` — in-memory Map tracking runtime health
- `recordSourceRun(name, error?)` — called after every fetch
- `getDataSourceHealthStatus()` — exported to routes.ts for `/api/system-health`
- `fetchViaProxy(url)` — routes through PROXY_BASE_URL if set, else direct fetch
- `startDataFetcher()` — registers all enabled sources with setInterval
- `stopDataFetcher()` — clears all intervals
- 7 current data sources with their intervals:
  - `oref-alerts` (5s), `rss-app-feeds` (60s), `ai-summary-refresh` (120s), `sentiment-analysis` (120s), `marine-traffic` (300s), `adsb-exchange` (60s), `sentinel-hub` (3600s)

#### 8. Add npm scripts docs (task 5.5)

Add to `docs/extending.md` or `docs/getting-started.md` (whichever Delta creates):
- Recommend adding `"test": "vitest"`, `"lint": "eslint ."`, `"format": "prettier --write ."`

---

## Agent Beta — Frontend Documentation

### Scope
Beta owns all `client/` documentation: component updates, i18n, UI features, code conventions.

### Files to Edit
- `docs/frontend.md`
- `docs/i18n.md`

### Files to Create
- `docs/code-conventions.md`

### Exact Tasks

#### 1. Fix `docs/frontend.md` (tasks 1.19–1.22)

1. **Add KeyboardShortcuts component section**:
   ```markdown
   ### KeyboardShortcuts (`components/keyboard-shortcuts.tsx`)
   Global keyboard shortcut handler. Renders no visible UI.
   - `F` or `F11`: Toggle fullscreen / presentation mode
   - `M`: Toggle audio mute
   - `Escape`: Exit presentation mode
   ```

2. **Add presentation/fullscreen mode docs**:
   ```markdown
   ### Presentation Mode
   Triggered by the fullscreen button in HeaderBar or keyboard shortcut `F`.
   Hides the header bar and sidebar, expanding the map to full viewport.
   State: `isPresentation` boolean in `dashboard.tsx`.
   ```

3. **Add audio alert / mute toggle docs**:
   ```markdown
   ### Audio Alerts
   When an event of type `air_raid_alert` arrives via WebSocket, the browser plays `/Oref Impact.mp3`.
   Mute toggle in HeaderBar: `isMuted` state, persisted in component state.
   ```

4. **Update HeaderBar props**:
   ```markdown
   Props: `isMuted: boolean`, `onToggleMute: () => void`, `isPresentation: boolean`, `onTogglePresentation: () => void`
   New icons in header:
   - HeartPulse → links to `/health` page
   - Volume2/VolumeX → mute toggle
   - Maximize/Minimize → presentation mode toggle
   ```

5. **Add LiveMediaPanel unified selector docs**:
   ```markdown
   ### LiveMediaPanel (`components/live-media-panel.tsx`)
   Unified media selector merging TV channels + live cameras into a single dropdown.
   - Max 4 selections shown in a 2×2 grid
   - Dropdown grouped by "TV Channels" (blue headers) and "Live Cameras" (purple headers)
   - Default selection: Kan 11, Al Jazeera English, Jerusalem Skyline, Tel Aviv camera
   - 9 TV channels + 5 live cameras available
   ```

6. **Add Health page docs**:
   ```markdown
   ### Health Page (`pages/health.tsx`)
   Route: `/health`. System status dashboard showing:
   - Overview cards: DB status, API keys configured (X/12), data sources (X/7), WS clients
   - Database section: row counts per table
   - Environment variables: grid showing configured/missing for each of 12 vars
   - Data source fetchers: health stats (run count, error count, last run, last error)
   - TV channel stream probes: iframe-based availability check (6s timeout)
   - Camera stream probes: same iframe approach
   Auto-refreshes every 15s via React Query.
   ```

7. **Document Vaul Drawer for mobile**:
   ```markdown
   ### Mobile Layout
   On screens < 768px, sidebar panels (Stats, AI Summary, Alerts, News) render inside a Vaul Drawer
   instead of a fixed right column. The drawer can be swiped up from the bottom.
   ```

8. **Document connection status hook**:
   ```markdown
   ### Connection Status
   `useWebSocket` hook in `dashboard.tsx` tracks WS connection state.
   HeaderBar shows a colored dot: green = connected, red = disconnected.
   On disconnect, data continues flowing via REST polling (React Query refetchInterval).
   ```

#### 2. Fix `docs/i18n.md` (tasks 1.26–1.27)

1. Add media translation keys to the key structure table:
   ```markdown
   | `media.channels.*` | TV channel names | `media.channels.kan11` |
   | `media.cameras.*` | Camera names | `media.cameras.jerusalem` |
   | `media.selectUpTo4` | Selection limit text | "Select up to 4 sources" |
   ```

2. Add fallback behavior section:
   ```markdown
   ## Fallback Behavior
   When a translation key is missing:
   1. Falls back to the default language (English)
   2. If also missing in English, displays the raw key string (e.g. `media.cameras.foo`)
   3. i18next is configured with `fallbackLng: 'en'` in `client/src/lib/i18n.ts`
   ```

#### 3. Create `docs/code-conventions.md` (task 2.6)

New file consolidating coding standards from `.github/agents/RULES.md` into a human-developer-friendly format:

```markdown
# Code Conventions

## TypeScript
- Strict mode enabled (`strict: true` in tsconfig)
- Use Zod schemas for all API boundary validation
- Prefer `type` imports: `import type { Foo } from "..."`
- No `any` — use `unknown` + type narrowing

## React
- React Query v5 for server state (no Redux, no Zustand)
- Query keys match API paths: `["/api/events"]`
- `refetchInterval` for polling, WebSocket for push
- `preferCanvas: true` on all Leaflet maps (performance)

## CSS / Styling
- Tailwind CSS utility classes only — no custom CSS files (except `index.css` for globals)
- Use logical properties for RTL: `ps-4` not `pl-4`, `ms-2` not `ml-2`
- shadcn/ui for all base components — do not install alternative UI libraries

## File Organization
- Components in `client/src/components/`
- Pages in `client/src/pages/`
- Shared types and schemas in `shared/schema.ts`
- Server routes in `server/routes.ts`
- Background jobs in `server/data-fetcher.ts`

## Database
- Drizzle ORM for all queries
- Never use raw SQL in application code
- Schema changes: edit `shared/schema.ts` → `npm run db:push`
- Always add Zod insert schemas alongside table definitions
```

---

## Agent Gamma — AI Documentation

### Scope
Gamma owns documentation of the AI/ML pipeline: OpenAI integration, prompt engineering, summary generation, sentiment analysis.

### Files to Create
- `docs/ai-pipeline.md`

### Exact Tasks

#### 1. Create `docs/ai-pipeline.md`

New file documenting the AI components:

```markdown
# AI Pipeline

## Overview
The War Panel uses OpenAI GPT-4o-mini for two automated analysis tasks:
1. **Situation Summary** — generates structured JSON assessment every 120 seconds
2. **Sentiment Analysis** — classifies news items with sentiment scores every 120 seconds

Both are implemented as data sources in `server/data-fetcher.ts` and require `OPENAI_API_KEY`.

## AI Summary (`refreshAISummary`)
- **Model**: `gpt-4o-mini`
- **Trigger**: Every 120s via data fetcher
- **Input**: Last 20 war events + last 10 news items + last 10 active alerts from DB
- **Output**: Structured JSON matching `AISummary` schema:
  - `summary`: Free-text situation paragraph
  - `threatAssessment`: "critical" | "high" | "medium" | "low"
  - `keyPoints`: string[] of 3–5 bullet points
  - `recommendation`: Actionable recommendation text
  - `lastUpdated`: ISO timestamp
- **Prompt template**: System prompt instructs GPT to act as a military intelligence analyst; user prompt includes raw event/news/alert data
- **Error handling**: On failure, logs error, health system records it; stale summary remains visible in UI
- **Token usage**: ~500-800 tokens per call (~$0.001/call)

## Sentiment Analysis (`analyzeNewsSentiment`)
- **Model**: `gpt-4o-mini`
- **Trigger**: Every 120s via data fetcher
- **Input**: Recent news items where `sentiment IS NULL`
- **Output**: Sentiment score (-1.0 to 1.0) written to `news_items.sentiment` column
  - -1.0 = very negative, 0 = neutral, 1.0 = very positive
- **Batch processing**: Processes up to 10 unscored items per run
- **Event classification**: Also sets `war_events.aiClassified = true` for processed events

## Cost Estimation
At 120s intervals:
- ~720 summary calls/day × $0.001 = ~$0.72/day
- ~720 sentiment calls/day × $0.0005 = ~$0.36/day
- **Total: ~$1.08/day** ($32/month)

## Configuration
- Set `OPENAI_API_KEY` in `.env`
- Both sources auto-start with the data fetcher
- To disable: set `enabled: false` in the `dataSources` array for `ai-summary-refresh` and `sentiment-analysis`
```

Read `server/data-fetcher.ts` lines 100–400 to extract the exact prompt templates and include them (abbreviated) in the doc.

---

## Agent Delta — DevOps & Infrastructure Documentation

### Scope
Delta owns architecture overview, deployment, operations, monitoring, security, CONTRIBUTING, and all housekeeping.

### Files to Edit
- `docs/README.md`
- `docs/architecture.md`
- `docs/proxy-server.md`
- `docs/extending.md`

### Files to Create
- `CONTRIBUTING.md`
- `docs/getting-started.md`
- `docs/deployment.md`
- `docs/runbooks.md`
- `docs/monitoring.md`
- `docs/security.md`
- `docs/agent-workflow.md`
- `docs/backup-strategy.md`
- `docs/project-structure.md`
- `CHANGELOG.md`
- `.github/PULL_REQUEST_TEMPLATE.md`
- `.github/ISSUE_TEMPLATE/bug_report.md`
- `.github/ISSUE_TEMPLATE/feature_request.md`

### Exact Tasks

#### 1. Fix `docs/README.md` (tasks 1.1–1.2)

1. **Replace env vars table** — sync with `.env.example` (14 vars). The current table shows only 7.
2. **Add links** to: `/health` page, `docs/deployment.md`, `docs/runbooks.md`, `docs/SPEC-batch-feb28.md`, `.github/agents/WORKFLOW.md`

#### 2. Fix `docs/architecture.md` (tasks 1.3–1.7)

1. **Search & replace** "Neon serverless" → "PostgreSQL via standard `pg.Pool` (max 20 connections)"
2. **Replace `db.ts` description**: remove Neon references, state it uses `pg.Pool` with `DATABASE_URL`
3. **Update system diagram**:
   - Replace "simulated" in Data Fetcher box with: `oref-alerts, rss-app, openai, sentinel-hub, marine-traffic, adsb-exchange`
   - Replace "PostgreSQL (Neon)" with "PostgreSQL (self-hosted)"
   - Replace proxy IP `195.20.17.179:3128` with `100.81.32.3:3080 (Tailscale VPN)`
   - Add "Connected and active" label on proxy
4. **Update file structure**: add `pages/health.tsx`, `components/keyboard-shortcuts.tsx`, `deploy/` tree, `.github/agents/` tree, `.env.example`
5. **Add architecture notes**: `express-rate-limit` (100 req/IP/min), audio alerts (Oref Impact.mp3), mobile optimization (Vaul Drawer, preferCanvas), Hetzner VPS + systemd + Nginx

#### 3. Fix `docs/proxy-server.md` (tasks 1.23–1.25)

1. **Replace "Current Status" section** at the bottom — delete "not currently active" paragraph, replace with:
   ```markdown
   ## Current Status
   The proxy server is **active** and routes Oref alert API requests via a Tailscale VPN tunnel.
   - Proxy runs on a VPS with Israeli IP accessible via Tailscale at `100.81.32.3:3080`
   - `oref-alerts` data source polls every 5s through this proxy
   - `PROXY_BASE_URL=http://100.81.32.3:3080` must be set in `.env`
   ```
2. **Update all IP references** from `195.20.17.179:3128` to `100.81.32.3:3080`
3. **Add Tailscale VPN section**:
   ```markdown
   ## Tailscale VPN Setup
   The proxy is accessed via Tailscale (zero-config VPN) rather than exposing the proxy port publicly.
   1. Install Tailscale on both the proxy server and the main VPS
   2. Join both to the same Tailnet
   3. Use the Tailscale IP (e.g. `100.81.32.3`) as `PROXY_BASE_URL`
   4. No firewall rules needed — Tailscale handles NAT traversal
   ```

#### 4. Fix `docs/extending.md` (task 1.29)

Review "Files You Should NOT Edit" list. If `drizzle.config.ts` and `package.json` are listed as "do not edit", add a footnote: "These may need editing when adding new dependencies or modifying the Drizzle schema output directory."

#### 5. Create `CONTRIBUTING.md` (task 2.1)

Root-level file. Include:
- How to fork and clone
- Branch naming: `feature/xxx`, `fix/xxx`, `docs/xxx`
- Commit message format: `feat:`, `fix:`, `docs:`, `chore:`
- PR requirements: description, screenshots for UI changes, testing steps
- Code style: refer to `docs/code-conventions.md`
- i18n: all user-facing strings must have EN/HE/AR/FA translations
- No direct pushes to `main`

#### 6. Create `docs/getting-started.md` (tasks 2.2–2.3)

Step-by-step local development guide:

```markdown
# Getting Started

## Prerequisites
- Node.js 20+
- PostgreSQL 15+ (local or Docker)
- npm 9+

## Quick Start
1. Clone: `git clone https://github.com/laikhtman/IRAN_WAR2_PANEL.git`
2. Install: `npm install`
3. Copy env: `cp .env.example .env`
4. Edit `.env`: set `DATABASE_URL` and `OPENAI_API_KEY` (minimum required)
5. Create DB: `createdb war_panel` or use Docker
6. Push schema: `npm run db:push`
7. Start: `npm run dev`
8. Open: http://localhost:5000

## Minimal vs Full Setup
| Setup | Env Vars Needed | Features |
|-------|----------------|----------|
| Minimal | DATABASE_URL, OPENAI_API_KEY | AI summaries, computed stats, manual events |
| + Alerts | + PROXY_BASE_URL, PROXY_AUTH_TOKEN | Real-time Oref alerts |
| + News | + RSSAPP_API_KEY, RSSAPP_API_SECRET | Telegram/OSINT news feeds |
| Full | All 14 vars | Marine traffic, aircraft, satellite imagery |
```

#### 7. Create `docs/deployment.md` (tasks 3.1–3.5)

Full production deployment guide. Read `deploy/scripts/setup-server.sh` and `deploy/scripts/setup-production.sh` to extract the exact steps. Document:

1. Hetzner VPS provisioning (Ubuntu 22.04, 2 vCPU, 4GB RAM recommended)
2. Node.js 20 installation (NodeSource PPA)
3. PostgreSQL 15 installation and `war_panel` database creation
4. Clone repo, `npm install`, `npm run build`
5. `.env` configuration (production DATABASE_URL with strong password)
6. systemd service: `deploy/production/iran-panel-production.service`
   - ExecStart, WorkingDirectory, EnvironmentFile
   - `systemctl enable/start/status`
7. Nginx reverse proxy: `deploy/production/intelhq.io.conf`
   - SSL with Let's Encrypt (`certbot --nginx`)
   - WebSocket upgrade directives
   - Proxy pass to `localhost:5000`
8. Firewall: `ufw allow 22,80,443/tcp`
9. Tailscale VPN for proxy connection

#### 8. Create `docs/runbooks.md` (tasks 3.6–3.12)

Operational runbooks:

```markdown
# Operational Runbooks

## Service Management
- View status: `systemctl status iran-panel-production`
- View logs: `journalctl -u iran-panel-production -f --no-pager -n 100`
- Restart: `systemctl restart iran-panel-production`
- Stop: `systemctl stop iran-panel-production`

## Database Operations
- Connect: `psql -U war_panel_user -d war_panel`
- Backup: `pg_dump -U war_panel_user war_panel > backup_$(date +%Y%m%d).sql`
- Restore: `psql -U war_panel_user war_panel < backup_20260228.sql`
- Purge stale data: `psql -U war_panel_user war_panel < purge.sql`
- Run migrations: `npm run db:push`

## API Key Rotation
1. Update the key in `.env` (or `/etc/war-panel/.env`)
2. Restart: `systemctl restart iran-panel-production`
3. Verify: check `/api/system-health` → envVars section shows `configured: true`

## Stream URL Updates
1. Find new YouTube embed URL (format: `youtube.com/embed/<VIDEO_ID>`)
2. Edit `client/src/components/live-media-panel.tsx` — update the URL in the relevant array entry
3. Edit `client/src/pages/health.tsx` — update the corresponding stream probe URL
4. Build: `npm run build`
5. Restart: `systemctl restart iran-panel-production`

## SSL Certificate Renewal
- Auto-renewal: `certbot renew` (should be in crontab)
- Manual: `certbot renew --nginx && systemctl reload nginx`

## Diagnosis Flowchart
1. Site unreachable? → Check Nginx: `systemctl status nginx`
2. 502 Bad Gateway? → Check app: `systemctl status iran-panel-production`
3. App running but errors? → Check logs: `journalctl -u iran-panel-production -n 200`
4. No data appearing? → Check `/api/system-health` for data source errors
5. No alerts? → Check proxy: `curl http://100.81.32.3:3080/health`
6. DB errors? → Check PostgreSQL: `systemctl status postgresql`
```

#### 9. Create `docs/monitoring.md` (tasks 3.13–3.15)

Document:
- The `/health` route (frontend page) — what each section means
- The `/api/system-health` endpoint — JSON shape, how to poll externally
- Suggested UptimeRobot/Grafana setup: poll `/api/health` every 60s, alert on non-200
- Key thresholds: >50% data source error rate, DB disconnected, 0 WebSocket clients

#### 10. Create `docs/security.md` (tasks 4.4–4.5)

Document:
- Rate limiting: 100 req/IP/min
- CORS: permissive (same-origin in production)
- Env var handling: never logged, .env excluded from git
- Proxy auth: Bearer token
- Input validation: Zod schemas on all DB inserts
- No authentication on dashboard (intentionally public)
- Data retention: auto-pruning, no PII stored
- Public endpoints: all `/api/*` are public read-only; `/api/rss-webhook` accepts POST

#### 11. Create `docs/agent-workflow.md` (task 4.6)

Document the AI agent development workflow:
- Reference `.github/agents/WORKFLOW.md` for the 5-step process
- List personas: Omega (architect), Alpha (backend), Beta (frontend), Gamma (AI), Delta (devops)
- Explain SPEC-driven development: Omega writes SPEC → agents implement → PR
- Link to `.github/agents/RULES.md` for global code rules

#### 12. Create `CHANGELOG.md` (task 4.1)

```markdown
# Changelog

## 2026-02-28
### Added
- System health page (`/health`) with DB, env var, data source, and stream monitoring
- Unified media selector (TV + cameras in single dropdown, max 4, 2×2 grid)
- Keyboard shortcuts (F=fullscreen, M=mute, Esc=exit)
- Presentation mode (fullscreen dashboard)
- AI sentiment analysis on news items
- `aiClassified` column on war_events
- `sentiment` column on news_items

### Changed
- Camera URLs updated: Jerusalem, Tel Aviv, Haifa, Mecca, Dubai Marina
- Media panel: merged TV/camera tabs into unified selector
- Selection limit raised from 3 to 4

### Fixed
- Media selector UX: selecting TV channels no longer blocks camera selection

## 2026-02-XX (Earlier)
### Added
- Pikud HaOref real-time alerts via Tailscale VPN proxy
- RSS.app Premium API for Telegram/OSINT news feeds
- GPT-4o-mini AI situation summaries
- Audio siren alerts for air raid events
- Mobile optimization with Vaul Drawer
- express-rate-limit (100 req/IP/min)
- Database migration from Neon to standard pg.Pool
- Seed data removal (production uses only real data)
- Tehran time clock in header
- Hebrew/Arabic/Farsi i18n
```

#### 13. Create `docs/backup-strategy.md` (task 3.16)

```markdown
# Backup Strategy

## Automated Backups
Add to crontab on the production server:
```bash
# Daily backup at 3:00 AM
0 3 * * * pg_dump -U war_panel_user war_panel | gzip > /opt/backups/war_panel_$(date +\%Y\%m\%d).sql.gz
# Keep 30 days of backups
0 4 * * * find /opt/backups/ -name "*.sql.gz" -mtime +30 -delete
```

## Manual Backup
`pg_dump -U war_panel_user war_panel > backup.sql`

## Restore
`psql -U war_panel_user war_panel < backup.sql`

## Note on Data Retention
The app auto-prunes to keep tables small (500 events, 500 news, 200 alerts, 50 summaries).
Backups capture point-in-time snapshots but old data may already be pruned.
```

#### 14. Housekeeping (tasks 5.1–5.4, 5.6–5.8)

- **5.1**: Delete `intelhq_nginx.txt` from root (duplicate of `deploy/production/intelhq.io.conf`) or add a comment at top explaining it's a local draft
- **5.2**: Add a header comment to `purge.sql`: `-- Purges all data from war_panel tables. Use for a clean restart.`
- **5.3**: Add to `docs/README.md` links section: `- [Implementation Spec (Feb 28)](SPEC-batch-feb28.md)`
- **5.4**: Add to `docs/README.md` links section: `- [Agent Workflow](.github/agents/WORKFLOW.md)`
- **5.6**: Document deploy workflow in `docs/deployment.md` (covered in task 3.1)
- **5.7**: Create `.github/PULL_REQUEST_TEMPLATE.md`
- **5.8**: Create `.github/ISSUE_TEMPLATE/bug_report.md` and `feature_request.md`

---

## Execution Instructions

All four agents can be invoked **simultaneously** with no cross-dependencies. Each agent works only in their scoped files.

### Boundary Rules
| Agent | Can Edit | Cannot Touch |
|-------|----------|-------------|
| Alpha | `docs/api.md`, `docs/database.md`, `docs/data-sources.md`, `docs/extending.md`, new files in `docs/` | `client/`, `deploy/`, `CONTRIBUTING.md`, `CHANGELOG.md` |
| Beta | `docs/frontend.md`, `docs/i18n.md`, new files in `docs/` | `server/`, `deploy/`, `CONTRIBUTING.md`, `CHANGELOG.md` |
| Gamma | New files in `docs/` only | Everything else |
| Delta | `docs/README.md`, `docs/architecture.md`, `docs/proxy-server.md`, `docs/extending.md`, root files, `deploy/`, `.github/` | `server/`, `client/`, `shared/` |

### Conflict: `docs/extending.md`
Both Alpha (task 1.28 — background jobs) and Delta (task 1.29 — "do not edit" review) touch this file. **Alpha adds a new section; Delta edits an existing section.** These are non-overlapping changes.

---

## Invocation Prompts

Copy-paste the prompt below into each agent's chat:

### For Alpha:
> You are Agent Alpha (Backend). Execute all tasks assigned to you in `docs/SPEC-docs-delegation.md` under "Agent Alpha — Backend Documentation". Read the SPEC file first, then read the current content of each file you need to edit. Create new files where specified. Do NOT edit any files outside your scope. Reference `server/routes.ts`, `server/data-fetcher.ts`, `server/storage.ts`, `shared/schema.ts`, and `.env.example` for accurate technical details.

### For Beta:
> You are Agent Beta (Frontend). Execute all tasks assigned to you in `docs/SPEC-docs-delegation.md` under "Agent Beta — Frontend Documentation". Read the SPEC file first, then read the current content of each file you need to edit. Create new files where specified. Do NOT edit any files outside your scope. Reference `client/src/components/live-media-panel.tsx`, `client/src/pages/health.tsx`, `client/src/pages/dashboard.tsx`, `client/src/components/header-bar.tsx`, and locale files for accurate details.

### For Gamma:
> You are Agent Gamma (AI). Execute all tasks assigned to you in `docs/SPEC-docs-delegation.md` under "Agent Gamma — AI Documentation". Read the SPEC file first. Create `docs/ai-pipeline.md`. Read `server/data-fetcher.ts` (especially `refreshAISummary` and `analyzeNewsSentiment` functions) to extract exact prompt templates, model parameters, and token counts. Do NOT edit any existing files.

### For Delta:
> You are Agent Delta (DevOps). Execute all tasks assigned to you in `docs/SPEC-docs-delegation.md` under "Agent Delta — DevOps & Infrastructure Documentation". Read the SPEC file first, then read every file you need to edit. Also read `deploy/scripts/setup-server.sh`, `deploy/scripts/setup-production.sh`, `deploy/production/iran-panel-production.service`, `deploy/production/intelhq.io.conf`, `purge.sql`, and `.github/agents/WORKFLOW.md` for accurate details. Create all new files specified. Do NOT edit any `server/` or `client/` source code files.
