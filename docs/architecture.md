# Architecture Overview

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18 + TypeScript, Tailwind CSS, Leaflet (react-leaflet v4.2.1) |
| Backend | Express.js, WebSocket (ws library) |
| Database | PostgreSQL (Neon serverless) via Drizzle ORM |
| Build | Vite (frontend), esbuild (backend via `script/build.ts`) |
| State Management | TanStack React Query v5 |
| Routing | wouter (lightweight client-side router) |
| i18n | i18next with browser language detection |
| UI Components | shadcn/ui (Radix UI primitives) |

## System Diagram

```
┌──────────────────────────────────────────────────────────┐
│                        CLIENT                            │
│  React App (Vite dev server)                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────┐  │
│  │ Dashboard │ │ WarMap   │ │ EventFeed│ │ LiveMedia  │  │
│  │ (layout) │ │ (Leaflet)│ │          │ │ Panel      │  │
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
│  └──────┬──────┘          └──────┬───────┘               │
│         │                        │                       │
│         ▼                        │                       │
│  ┌─────────────────┐             │                       │
│  │ IStorage        │◄────────────┘                       │
│  │ (DatabaseStorage)│                                    │
│  └──────┬──────────┘                                     │
│         │              ┌────────────────┐                │
│         │              │ Data Fetcher   │                │
│         │              │ (background)   │                │
│         │              │ - simulated    │                │
│         │              │ - AI refresh   │                │
│         │              └───────┬────────┘                │
│         │                      │                         │
│         ▼                      ▼                         │
│  ┌─────────────────────────────────────┐                 │
│  │         PostgreSQL (Neon)           │                 │
│  │  war_events | news_items | alerts   │                 │
│  │  ai_summaries | data_source_status  │                 │
│  └─────────────────────────────────────┘                 │
└──────────────────────────────────────────────────────────┘

Optional:
┌────────────────────────┐
│ Israeli Proxy Server   │
│ (195.20.17.179:3128)   │
│ Forwards requests to   │
│ geo-restricted sources │
└────────────────────────┘
```

## Data Flow

1. **Startup**: Server calls `seedIfEmpty()` which populates the DB with initial demo data if empty.
2. **Background Fetcher**: `startDataFetcher()` launches periodic tasks that generate simulated events (every 15-30s) and refresh the AI summary (every 60s).
3. **REST API**: Frontend polls `/api/events`, `/api/news`, `/api/alerts`, `/api/statistics`, `/api/ai-summary` at intervals of 8-30 seconds via React Query.
4. **WebSocket**: When the data fetcher creates a new event, it triggers a callback that broadcasts `{ type: "new_event", event }` to all connected WS clients. The frontend prepends this to the event list instantly.
5. **Storage Layer**: All API routes read from `DatabaseStorage`, which queries PostgreSQL. The storage layer also handles auto-cleanup (max 500 events).

## Key Design Decisions

- **All data stored in PostgreSQL**: Even simulated data is persisted. This ensures the app can handle high traffic by serving from a local DB rather than fetching from external sources on every request.
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
    ui/                    - shadcn/ui component library
  lib/
    i18n.ts                - i18next configuration
    queryClient.ts         - React Query client + apiRequest helper
    utils.ts               - cn() utility for Tailwind classes
  locales/
    en.json, he.json, ar.json, fa.json
  pages/
    dashboard.tsx          - Main dashboard layout + data fetching
    not-found.tsx          - 404 page

server/
  index.ts                 - Server entry point
  routes.ts                - API routes + WebSocket setup
  storage.ts               - IStorage interface + DatabaseStorage
  db.ts                    - Drizzle ORM + Neon connection
  seed.ts                  - Initial seed data
  data-fetcher.ts          - Background data polling system
  vite.ts                  - Vite dev server integration (DO NOT EDIT)
  static.ts                - Static file serving

shared/
  schema.ts                - Drizzle tables + Zod schemas + TypeScript types

proxy-server/
  index.js                 - Standalone proxy for Israeli sources
  setup.sh                 - Deployment script for proxy server
```
