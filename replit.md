# War Panel - Intelligence Dashboard

## Overview
A real-time intelligence dashboard ("War Panel") for monitoring security events in the Middle East. Styled as a military command center with a dark, high-tech aesthetic.

## Architecture
- **Frontend**: React + TypeScript, Tailwind CSS, Leaflet for maps
- **Backend**: Express.js with WebSocket for real-time updates
- **Storage**: In-memory with seed data (no database - demo/monitoring app)

## Key Features
- Interactive world map focused on Middle East with event markers
- Real-time event feed (missile launches, interceptions, alerts)
- Statistics panel with animated counters (missiles, drones, interception rates)
- Breaking news ticker
- AI situation analysis summary
- Pikud HaOref (Israel Home Front Command) alert display
- WebSocket-based live updates with simulated events
- Defense system statistics (Iron Dome, Arrow, David's Sling, THAAD)
- **i18n**: Full internationalization with i18next (English, Hebrew, Arabic, Persian)
- **RTL Support**: Automatic RTL layout for Hebrew, Arabic, and Persian

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
  routes.ts           - API endpoints + WebSocket
  storage.ts          - In-memory storage with seed data
shared/
  schema.ts           - TypeScript types for all data models
```

## Theme
- Dark military command center aesthetic
- JetBrains Mono / Fira Code monospace fonts
- Cyan (#0ea5e9) primary accent
- Red for alerts/threats, green for interceptions
- Grid overlay background effect
- Glow effects on key elements

## API Endpoints
- GET /api/events - War events
- GET /api/statistics - Combat statistics
- GET /api/news - News items
- GET /api/alerts - Oref alerts
- GET /api/ai-summary - AI analysis
- WS /ws - Real-time event updates
