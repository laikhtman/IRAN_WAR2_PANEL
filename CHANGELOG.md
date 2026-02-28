# Changelog

All notable changes to the War Panel project.

## 2026-02-28

### Added
- System health page (`/health`) with comprehensive status monitoring
  - Database connectivity and row counts
  - Environment variable configuration check
  - Data source fetcher health (run/error counts, last run time)
  - TV channel and camera stream availability probes
- Unified media selector (TV channels + cameras in single dropdown)
  - Max 4 simultaneous streams in 2×2 grid layout
  - Grouped dropdown with "TV Channels" and "Live Cameras" sections
- Keyboard shortcuts: `F`/`F11` (fullscreen), `M` (mute), `Escape` (exit)
- Presentation mode (fullscreen map, hides all panels)
- AI sentiment analysis on news headlines (GPT-4o-mini, -1.0 to +1.0)
- AI event classification from RSS feed items (GPT-4o-mini)
- `aiClassified` column on `war_events` table
- `sentiment` column on `news_items` table
- `satellite_images` table for Sentinel Hub imagery
- Sentinel Hub satellite imagery fetcher (WMS + Catalog API)
- MarineTraffic naval vessel tracking data source
- ADS-B Exchange aircraft tracking data source
- Health tracking system for all data sources (`sourceHealthMap`)
- `/api/system-health` comprehensive health endpoint
- `/api/news/sentiment` endpoint
- `/api/satellite-images` and `/api/satellite-images/:id/tile` endpoints
- Sentiment trend indicator in header bar

### Changed
- Camera URLs updated: Jerusalem (`ITAlerjV8Ro`), Tel Aviv (`CXP_uPkf_sY`), Haifa (`nNegFX3ys5Q`), Mecca (`-t-yKcXSrhM`), Dubai Marina (`MfIpyflPbHQ`)
- Media panel: merged TV/camera tabs into unified selector
- Selection limit raised from 3 to 4 with 2×2 grid
- Flags added to country indicators

### Fixed
- Media selector UX: selecting TV channels no longer blocks camera selection

## 2026-02-XX (Phase 1–3 Implementation)

### Added
- Pikud HaOref real-time alerts via Tailscale VPN proxy (5-second polling, 38-city coordinate lookup)
- RSS.app Premium API integration for Telegram/OSINT news feeds (60-second polling + webhook push)
- GPT-4o-mini AI situation summaries (structured JSON output, 120-second refresh)
- Audio siren alerts for `air_raid_alert` events (`/Oref Impact.mp3`)
- Mobile optimization with Vaul Drawer for sidebar panels
- `express-rate-limit` (100 requests/IP/minute)
- Tehran time clock in header bar
- Hebrew, Arabic, and Persian (Farsi) translations
- Real WebSocket connection status indicator in header
- Database row pruning (500 events, 500 news, 200 alerts, 50 summaries)

### Changed
- Database migrated from Neon serverless to standard `pg.Pool` (max 20 connections)
- Seed data removed — production uses only real data from fetchers
- All `@replit` packages and config files removed (fully self-hosted)

### Infrastructure
- Hetzner VPS deployment with systemd service and Nginx reverse proxy
- Tailscale VPN for proxy server connectivity
- Cloudflare SSL/CDN
- Automated deployment scripts (`deploy/scripts/`)
