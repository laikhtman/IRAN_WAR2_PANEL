# Environment Variables

Complete reference for all environment variables used by the War Panel.

## Quick Reference

| Variable | Required | Used By | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | **Yes** | Core | PostgreSQL connection string |
| `OPENAI_API_KEY` | **Yes** | AI Summary, Sentiment, Classification | OpenAI API key for GPT-4o-mini |
| `PORT` | No | Core | Server port (default: `5000`) |
| `RSSAPP_API_KEY` | No | RSS.app feeds | RSS.app Premium API key |
| `RSSAPP_API_SECRET` | No | RSS.app feeds | RSS.app Premium API secret |
| `PROXY_BASE_URL` | No | Oref alerts | Tailscale VPN proxy base URL |
| `PROXY_AUTH_TOKEN` | No | Oref alerts | Bearer token for proxy authentication |
| `MARINETRAFFIC_API_KEY` | No | Marine Traffic | MarineTraffic API key |
| `ADSBX_API_KEY` | No | ADS-B Exchange | ADS-B Exchange API key |
| `SENTINELHUB_INSTANCE_ID` | No | Sentinel Hub | Sentinel Hub instance ID |
| `SENTINELHUB_API_KEY` | No | Sentinel Hub | Legacy API key (PLAK...) |
| `SENTINELHUB_CLIENT_ID` | No | Sentinel Hub | OAuth2 client ID |
| `SENTINELHUB_CLIENT_SECRET` | No | Sentinel Hub | OAuth2 client secret |

## Detailed Reference

### DATABASE_URL (Required)

PostgreSQL connection string.

```
# Local development
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/war_panel

# Production
DATABASE_URL=postgresql://war_panel_user:strongpassword@localhost:5432/war_panel
```

Used by: `server/db.ts` via `pg.Pool` (max 20 connections).

### OPENAI_API_KEY (Required)

OpenAI API key for GPT-4o-mini. Powers three features:
1. **AI Summary** (`refreshAISummary`) — situation assessment every 120s
2. **Sentiment Analysis** (`analyzeNewsSentiment`) — news headline scoring every 120s
3. **Event Classification** (`classifyEvent`) — classifies RSS items into war event types

**Get it**: https://platform.openai.com/api-keys

**Estimated cost**: ~$1/day ($32/month) at default intervals.

### PORT (Optional)

Server listening port. Default: `5000`.

### RSSAPP_API_KEY / RSSAPP_API_SECRET

RSS.app Premium API credentials. Used to fetch all configured Telegram/OSINT feeds.

- Server polls all feeds every 60 seconds
- Also receives instant push via webhook at `POST /api/webhooks/rss`
- Feeds are managed in the RSS.app dashboard (no code changes needed to add/remove feeds)

**Get it**: https://rss.app/dashboard → API section

### PROXY_BASE_URL / PROXY_AUTH_TOKEN

Proxy server for Pikud HaOref alert API (geo-restricted to Israeli IPs).

```
PROXY_BASE_URL=http://100.81.32.3:3080
PROXY_AUTH_TOKEN=your-secret-bearer-token
```

The proxy runs on a VPS with an Israeli IP, accessed via Tailscale VPN. See `docs/proxy-server.md`.

### MARINETRAFFIC_API_KEY

MarineTraffic vessel tracking API key. Tracks naval movements in the Red Sea and Eastern Mediterranean.

**Get it**: https://www.marinetraffic.com/en/ais-api-services

### ADSBX_API_KEY

ADS-B Exchange aircraft tracking API key. Tracks military and high-altitude aircraft over conflict zones.

**Get it**: https://www.adsbexchange.com/data/

### SENTINELHUB_INSTANCE_ID

Sentinel Hub instance ID for WMS requests. Required for satellite imagery.

**Get it**: https://apps.sentinel-hub.com/dashboard/ → Configuration Utility → New Instance

### SENTINELHUB_API_KEY

Legacy Sentinel Hub API key (starts with `PLAK`). Used for WMS requests when OAuth is not configured.

### SENTINELHUB_CLIENT_ID / SENTINELHUB_CLIENT_SECRET

OAuth2 credentials for Sentinel Hub. Enables the Catalog API for better imagery search (precise date filtering, cloud cover filtering).

**Get it**: https://apps.sentinel-hub.com/dashboard/ → User Settings → OAuth clients → Create new

## Setup Profiles

### Minimal (Dashboard + AI only)

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/war_panel
OPENAI_API_KEY=sk-your-key
```

Features: AI summaries, sentiment analysis, computed statistics. No real-time alerts or news.

### Standard (+ Alerts + News)

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/war_panel
OPENAI_API_KEY=sk-your-key
RSSAPP_API_KEY=your-key
RSSAPP_API_SECRET=your-secret
PROXY_BASE_URL=http://100.81.32.3:3080
PROXY_AUTH_TOKEN=your-token
```

Features: Everything above + real-time Oref alerts + Telegram/OSINT news feeds.

### Full (All integrations)

All 13 variables configured. Adds marine traffic, aircraft tracking, and satellite imagery.

## Data Source → Env Var Mapping

| Data Source | Required Env Vars |
|-------------|-------------------|
| `oref-alerts` | `PROXY_BASE_URL` |
| `rss-app-feeds` | `RSSAPP_API_KEY`, `RSSAPP_API_SECRET` |
| `ai-summary-refresh` | `OPENAI_API_KEY` |
| `sentiment-analysis` | `OPENAI_API_KEY` |
| `marine-traffic` | `MARINETRAFFIC_API_KEY` |
| `adsb-exchange` | `ADSBX_API_KEY` |
| `sentinel-hub` | `SENTINELHUB_INSTANCE_ID` |
