# Architecture Overview

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18 + TypeScript, Tailwind CSS, Leaflet (react-leaflet v4.2.1) |
| Backend | Express.js, WebSocket (ws library) |
| Database | PostgreSQL via Drizzle ORM + pg.Pool (max 20 connections) |
| Build | Vite (frontend), esbuild (backend via `script/build.ts`) |
| State Management | TanStack React Query v5 |
| Routing | wouter (lightweight client-side router) |
| i18n | i18next with browser language detection |
| UI Components | shadcn/ui (Radix UI primitives) |

## System Diagram

```
┌──────────────────────────────────────────────────────────┐
│                        CLIENT                            │
│  React 18 App (Vite dev server)                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────┐  │
│  │ Dashboard │ │ WarMap   │ │ EventFeed│ │ LiveMedia  │  │
│  │ (layout) │ │ (Leaflet)│ │          │ │ Panel(2×2) │  │
│  └────┬─────┘ └──────────┘ └──────────┘ └────────────┘  │
│       │                                                  │
│  React Query (polling 8-30s)  +  WebSocket (real-time)   │
└───────┼──────────────────────────┼───────────────────────┘
        │ HTTP REST                │ WS
┌───────┼──────────────────────────┼───────────────────────┐
│       ▼                          ▼          SERVER       │
│  ┌─────────────┐          ┌──────────────┐               │
│  │ Express API │          │ WebSocket    │               │
│  │ /api/*      │          │ Server /ws   │               │
│  │ rate-limit  │          └──────┬───────┘               │
│  └──────┬──────┘                 │                       │
│         │                        │                       │
│         ▼                        │                       │
│  ┌─────────────────┐             │                       │
│  │ IStorage        │◄────────────┘                       │
│  │ (DatabaseStorage)│                                    │
│  └──────┬──────────┘                                     │
│         │              ┌────────────────────────┐        │
│         │              │ Data Fetcher (7 sources)│       │
│         │              │ - oref-alerts (5s)      │       │
│         │              │ - rss-app-feeds (60s)   │       │
│         │              │ - ai-summary (120s)     │       │
│         │              │ - sentiment (120s)      │       │
│         │              │ - marine-traffic (300s) │       │
│         │              │ - adsb-exchange (60s)   │       │
│         │              │ - sentinel-hub (3600s)  │       │
│         │              └───────┬────────────────┘        │
│         │                      │                         │
│         ▼                      ▼                         │
│  ┌─────────────────────────────────────┐                 │
│  │     PostgreSQL (self-hosted)        │                 │
│  │  war_events | news_items | alerts   │                 │
│  │  ai_summaries | data_source_status  │                 │
│  │  satellite_images                   │                 │
│  └─────────────────────────────────────┘                 │
└──────────────────────────────────────────────────────────┘

External Services:
┌──────────────────────┐  ┌────────────────────┐
│ Tailscale VPN Proxy  │  │ OpenAI GPT-4o-mini │
│ 100.81.32.3:3080     │  │ AI Summary +       │
│ Oref alert API relay │  │ Sentiment +        │
│ (Israeli IP)         │  │ Classification     │
└──────────────────────┘  └────────────────────┘
┌──────────────────────┐  ┌────────────────────┐
│ RSS.app Premium API  │  │ Sentinel Hub       │
│ Telegram/OSINT feeds │  │ Satellite imagery  │
│ Webhook push + poll  │  │ (WMS + Catalog)    │
└──────────────────────┘  └────────────────────┘
```

## Data Flow

1. **Startup**: Server starts Express, registers API routes, initializes WebSocket server, and calls `startDataFetcher()`.
2. **Background Fetchers**: 7 data sources run at configured intervals:
   - `oref-alerts` (5s): Polls Pikud HaOref API via Tailscale VPN proxy for real-time alerts
   - `rss-app-feeds` (60s): Fetches Telegram/OSINT feeds via RSS.app API; AI-classifies items into war events
   - `ai-summary-refresh` (120s): GPT-4o-mini generates structured situation assessment from recent events
   - `sentiment-analysis` (120s): GPT-4o-mini scores unrated news headlines (-1 to +1)
   - `marine-traffic` (300s): Tracks naval vessels in conflict zones (needs API key)
   - `adsb-exchange` (60s): Tracks military aircraft over conflict zones (needs API key)
   - `sentinel-hub` (3600s): Fetches satellite imagery for strike locations (needs API key)
3. **REST API**: Frontend polls `/api/events`, `/api/news`, `/api/alerts`, `/api/statistics`, `/api/ai-summary`, `/api/news/sentiment`, `/api/satellite-images` at intervals of 8-60 seconds via React Query.
4. **WebSocket**: When any data fetcher creates a new war event, it triggers `onNewEvent` callback that broadcasts `{ type: "new_event", event }` to all connected WS clients.
5. **Storage Layer**: All API routes read from `DatabaseStorage` (pg.Pool). Auto-cleanup: max 500 events, 500 news, 200 alerts, 50 summaries.
6. **Health Tracking**: Each data source run is tracked in-memory (`sourceHealthMap`), queryable via `/api/system-health`.

## Key Design Decisions

- **All data stored in PostgreSQL**: All real-time data from external sources is persisted locally. The app serves from its own DB rather than proxying to external APIs on every request. Row pruning keeps tables bounded.
- **Pluggable data sources**: The `DataSourceConfig` interface in `data-fetcher.ts` allows adding new real data sources without modifying existing code.
- **Single-port architecture**: Vite dev server and Express run on the same port. Vite proxies `/api/*` and `/ws` to Express. Do NOT modify `server/vite.ts` or `vite.config.ts`.
- **react-leaflet pinned to v4.2.1**: Version 5 requires React 19. Must stay on v4 until React is upgraded.

## File Structure

```
client/src/
  App.tsx                 - Root component, routing, RTL direction
  main.tsx                - Entry point, imports i18n
  index.css               - Global styles, theme variables, animations
  components/
    war-map.tsx            - Leaflet map with event/alert markers
    stats-panel.tsx        - Defense statistics with animated counters
    event-feed.tsx         - Scrollable event timeline
    news-ticker.tsx        - Breaking news horizontal scroll
    news-feed.tsx          - News articles list
    ai-summary.tsx         - AI situation analysis
    alerts-panel.tsx       - Pikud HaOref alerts
    header-bar.tsx         - Top bar with clocks and status
    language-switcher.tsx  - EN/HE/AR/FA language selector
    live-media-panel.tsx   - TV channels + live cameras
    keyboard-shortcuts.tsx - Keyboard shortcut handler (F11, M, Escape)
    ui/                    - shadcn/ui component library
  lib/
    i18n.ts                - i18next configuration
    queryClient.ts         - React Query client + apiRequest helper
    utils.ts               - cn() utility for Tailwind classes
  locales/
    en.json, he.json, ar.json, fa.json
  pages/
    dashboard.tsx          - Main dashboard layout + data fetching
    health.tsx             - System health monitoring page
    not-found.tsx          - 404 page

server/
  index.ts                 - Server entry point
  routes.ts                - API routes + WebSocket setup
  storage.ts               - IStorage interface + DatabaseStorage
  db.ts                    - Drizzle ORM + pg.Pool connection
  seed.ts                  - Initial seed data
  data-fetcher.ts          - Background data polling system
  vite.ts                  - Vite dev server integration (DO NOT EDIT)
  static.ts                - Static file serving

shared/
  schema.ts                - Drizzle tables + Zod schemas + TypeScript types

proxy-server/
  index.js                 - Standalone proxy for Israeli sources
  setup.sh                 - Deployment script for proxy server

deploy/
  production/
    iran-panel-production.service  - systemd unit file
    intelhq.io.conf               - Nginx reverse proxy config
  staging/                         - Staging environment configs
  scripts/
    setup-server.sh               - Initial server provisioning
    setup-production.sh            - Production deployment script

.env.example                       - Template for all environment variables
.github/agents/                    - AI agent persona files (Omega, Alpha, Beta, Gamma, Delta)
```
