# Security

Security measures and considerations for the War Panel.

## Access Control

The dashboard is **intentionally public** — no authentication is required to view it. All API endpoints are read-only (GET), except for the RSS webhook (POST).

## Rate Limiting

All API endpoints are protected by `express-rate-limit`:
- **Limit**: 100 requests per IP per minute
- **Response on exceed**: HTTP 429 with `{ "error": "Too many requests, please try again later." }`
- Configured in `server/index.ts`

## Network Security

### Nginx
- SSL/TLS termination (TLS 1.2+)
- Security headers:
  - `X-Frame-Options: SAMEORIGIN`
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`
- Gzip compression (no sensitive data compressed)

### Proxy Server
- Bearer token authentication (`PROXY_AUTH_TOKEN`)
- Accessible only via Tailscale VPN (not exposed to public internet)
- No URL allowlist (recommended to add one for production hardening)

### Firewall
- UFW configured to allow only ports 22 (SSH), 80 (HTTP), 443 (HTTPS)
- PostgreSQL port (5432) not exposed externally

## Environment Variables

- `.env` file is **excluded from Git** (in `.gitignore`)
- Env vars are never logged to console
- Stored in `/opt/iran-panel-production/.env` on the production server
- API keys are checked via `/api/system-health` (configured/missing status only — values are never exposed)

## Input Validation

- All database inserts validated via **Zod schemas** (defined in `shared/schema.ts`)
- RSS webhook accepts flexible payloads but sanitizes all fields before persistence
- Event types and threat levels validated against enum allowlists

## Data Handling

### What's Stored
- War events (type, location, title, description, coordinates, source, threat level)
- News headlines and sources (no article bodies)
- Alert areas and threat descriptions
- AI-generated summaries
- Satellite image metadata (URLs, bounding boxes)

### PII
- **No personally identifiable information** is collected or stored
- No user accounts, sessions, or cookies
- No tracking or analytics

### Data Retention
Auto-pruning keeps tables bounded:
- War events: max 500 rows
- News items: max 500 rows
- Alerts: max 200 rows
- AI summaries: max 50 rows

### Public Endpoints
All `/api/*` endpoints are public read-only:
- `GET /api/events`, `/api/news`, `/api/alerts`, `/api/statistics`, `/api/ai-summary`
- `GET /api/health`, `/api/system-health`
- `GET /api/news/sentiment`, `/api/satellite-images`
- `POST /api/webhooks/rss` — accepts POST (RSS.app push notifications)

## Recommendations for Hardening

1. **Proxy URL allowlist**: Add domain restrictions to `proxy-server/index.js` (currently forwards any URL)
2. **Webhook authentication**: Validate RSS.app webhook signatures if available
3. **HTTPS-only API**: Redirect all HTTP to HTTPS at Nginx level
4. **Content Security Policy**: Add CSP header to restrict iframe sources
5. **Database user permissions**: Use least-privilege PostgreSQL role (currently using `war_panel_user` with full DB access)
