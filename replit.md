# War Panel - Intelligence Dashboard

## Overview
A real-time intelligence dashboard ("War Panel") for monitoring security events in the Middle East. Styled as a military command center with a dark, high-tech aesthetic.

## Architecture
- **Frontend**: React + TypeScript, Tailwind CSS, Leaflet for maps
- **Backend**: Express.js with WebSocket for real-time updates
- **Database**: PostgreSQL (Neon serverless) via Drizzle ORM
- **Data Strategy**: All data persisted in DB; background fetcher polls sources periodically; API serves from local DB for speed/resilience

## Key Features
- Interactive world map focused on Middle East with event markers
- Real-time event feed (missile launches, interceptions, alerts)
- Statistics panel with animated counters (missiles, drones, interception rates)
- Breaking news ticker
- AI situation analysis summary
- Pikud HaOref (Israel Home Front Command) alert display
- WebSocket-based live updates with simulated events
- Defense system statistics (Iron Dome, Arrow, David's Sling, THAAD)
- **Live Media**: 9 TV channels + 6 live cameras with modal video player
- **i18n**: Full internationalization with i18next (English, Hebrew, Arabic, Persian)
- **RTL Support**: Automatic RTL layout for Hebrew, Arabic, and Persian
- **Database-backed caching**: All data stored locally in PostgreSQL for high-traffic resilience
- **Background data fetcher**: Pluggable source adapters with configurable intervals

## Project Structure
```
client/src/
  components/
    war-map.tsx        - Leaflet map with event markers and alerts
    stats-panel.tsx    - Combat statistics with animated counters
    event-feed.tsx     - Scrollable live event timeline
    news-ticker.tsx    - Breaking news scrolling ticker
    news-feed.tsx      - News articles list
    ai-summary.tsx     - AI situation analysis panel
    alerts-panel.tsx   - Active Pikud HaOref alerts
    header-bar.tsx     - Top bar with clocks and status
    language-switcher.tsx - Language selector (EN/HE/AR/FA)
    live-media-panel.tsx - Live TV channels (9) and cameras (6) with modal player
  lib/
    i18n.ts            - i18next config with RTL support
  locales/
    en.json            - English translations
    he.json            - Hebrew translations
    ar.json            - Arabic translations
    fa.json            - Persian translations
  pages/
    dashboard.tsx      - Main dashboard layout
server/
  db.ts              - Drizzle ORM database connection (Neon serverless)
  routes.ts          - API endpoints + WebSocket broadcasting
  storage.ts         - DatabaseStorage class (PostgreSQL-backed IStorage)
  seed.ts            - Initial seed data for first run
  data-fetcher.ts    - Background data fetcher with pluggable sources
shared/
  schema.ts          - Drizzle tables + Zod schemas for all data models
```

## Database Tables
- `war_events` - Security events (missile launches, interceptions, etc.)
- `news_items` - News articles from various sources
- `alerts` - Pikud HaOref security alerts
- `ai_summaries` - AI situation analysis snapshots
- `data_source_status` - Tracking for external data source health

## Data Fetcher Architecture
- `server/data-fetcher.ts` manages background polling of data sources
- Each source has: name, interval, proxyRequired flag, fetchFn
- `PROXY_BASE_URL` env var configures Israeli proxy for geo-restricted sources
- `fetchViaProxy()` helper routes requests through proxy when configured
- `setNewEventCallback()` hooks into WebSocket broadcasting
- Currently active sources: simulated-events (15-30s), ai-summary-refresh (60s)

## Theme
- Dark military command center aesthetic
- JetBrains Mono / Fira Code monospace fonts
- Cyan (#0ea5e9) primary accent
- Red for alerts/threats, green for interceptions
- Grid overlay background effect
- Glow effects on key elements

## API Endpoints
- GET /api/events - War events (from DB)
- GET /api/statistics - Combat statistics (computed from DB)
- GET /api/news - News items (from DB)
- GET /api/alerts - Oref alerts (from DB)
- GET /api/ai-summary - AI analysis (from DB)
- GET /api/health - Health check + DB status
- WS /ws - Real-time event updates

## Environment Variables
- `DATABASE_URL` - PostgreSQL connection string (auto-provisioned)
- `PROXY_BASE_URL` - (optional) Israeli proxy server URL for geo-restricted data sources
- `SESSION_SECRET` - Session secret
