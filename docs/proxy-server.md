# Proxy Server

The proxy server is a standalone Node.js HTTP server designed to be deployed on an Israeli IP address. It forwards requests to geo-restricted Israeli data sources (like Pikud HaOref alerts API) on behalf of the main application.

## Location

`proxy-server/index.js` - Single-file Express-less HTTP server (uses only Node.js built-in `http` module).

## Features

- **Request forwarding** via `/proxy?url=<encoded-url>` endpoint
- **Bearer token authentication** (optional, via `PROXY_AUTH_TOKEN` env var)
- **Browser-like headers**: Adds `User-Agent` (Chrome on Windows) and `Accept-Language: he-IL,he` headers to appear as a regular Israeli browser
- **CORS support**: Sets `Access-Control-Allow-Origin: *` on all responses
- **Health check** at `/health` endpoint

## Endpoints

### GET /proxy?url=`<encoded-url>`

Forwards the request to the specified URL and returns the response.

**Headers**:
- `Authorization: Bearer <token>` (required if `PROXY_AUTH_TOKEN` is set)

**Response**: The proxied content with original status code and content-type.

### GET /health

Returns server status and local IP address.

```json
{
  "status": "ok",
  "ip": "195.20.17.179",
  "timestamp": "2026-02-28T10:30:00.000Z"
}
```

## Deployment

### Prerequisites

- A server with an Israeli IP address (e.g., `195.20.17.179`)
- Node.js installed on the server

### Setup Script

`proxy-server/setup.sh` automates deployment. It:
1. Installs Node.js if not present
2. Copies `index.js` to the server
3. Sets up a systemd service for auto-restart
4. Configures the auth token

### Manual Deployment

```bash
# On the proxy server
scp proxy-server/index.js user@195.20.17.179:/opt/war-panel-proxy/
ssh user@195.20.17.179

# Set environment variables
export PROXY_AUTH_TOKEN="your-secret-token"
export PORT=3128

# Run
node /opt/war-panel-proxy/index.js
```

### Replit Configuration

Set these environment variables in Replit:
- `PROXY_BASE_URL` = `http://195.20.17.179:3128`
- `PROXY_AUTH_TOKEN` = Same token as on the proxy server

## Usage in Code

The `fetchViaProxy()` helper in `server/data-fetcher.ts` handles proxy routing:

```typescript
import { fetchViaProxy } from "./data-fetcher";

// Automatically routes through proxy if PROXY_BASE_URL is set
const response = await fetchViaProxy("https://www.oref.org.il/WarningMessages/alert/alerts.json");
const alerts = await response.json();
```

If `PROXY_BASE_URL` is not set, the function falls back to a direct `fetch()`.

## Security Considerations

- The proxy does NOT sanitize or validate the target URL. In production, add an allowlist of permitted domains.
- Bearer token should be a strong random string (32+ characters).
- Consider rate limiting to prevent abuse.
- The proxy runs on HTTP. If exposed to the public internet, consider adding HTTPS via a reverse proxy (nginx/caddy).

## Current Status

The proxy server infrastructure is built and ready but **not currently active**. No data source in `data-fetcher.ts` currently uses `fetchViaProxy()`. It is intended for future integration with real Israeli data feeds.
