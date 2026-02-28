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
  "ip": "100.81.32.3",
  "timestamp": "2026-02-28T10:30:00.000Z"
}
```

## Deployment

### Prerequisites

- A server with an Israeli IP address (e.g., accessible via `100.81.32.3` on Tailscale)
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
scp proxy-server/index.js user@proxy-server:/opt/war-panel-proxy/
ssh user@proxy-server

# Set environment variables
export PROXY_AUTH_TOKEN="your-secret-token"
export PORT=3080

# Run
node /opt/war-panel-proxy/index.js
```

### Configuration

Set these environment variables on your server:
- `PROXY_BASE_URL` = `http://100.81.32.3:3080`
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

The proxy server is **active** and handles Pikud HaOref alert API requests:

- The `oref-alerts` data source in `data-fetcher.ts` polls every 5 seconds via `fetchViaProxy()`
- Proxy is accessible at `http://100.81.32.3:3080` via Tailscale VPN
- The proxy server runs on a VPS with an Israeli IP address
- Set `PROXY_BASE_URL=http://100.81.32.3:3080` in your `.env` to enable

## Tailscale VPN Setup

The proxy is accessed via Tailscale (zero-config mesh VPN) rather than exposing the proxy port to the public internet.

### Setup Steps

1. **Install Tailscale** on both the proxy server (Israeli VPS) and the main application server:
   ```bash
   curl -fsSL https://tailscale.com/install.sh | sh
   tailscale up
   ```

2. **Join the same Tailnet**: Both machines must be on the same Tailscale account.

3. **Use the Tailscale IP** as `PROXY_BASE_URL`:
   ```bash
   # On the app server, check proxy's Tailscale IP:
   tailscale status
   # Use the 100.x.x.x address
   PROXY_BASE_URL=http://100.81.32.3:3080
   ```

4. **No firewall rules needed**: Tailscale handles NAT traversal and WireGuard encryption.

### Benefits
- No public port exposure (proxy hidden from internet scanners)
- Encrypted traffic between servers (WireGuard)
- Survives IP changes (Tailscale manages routing)
