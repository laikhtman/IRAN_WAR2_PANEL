# API Reference

All API routes are defined in `server/routes.ts`. The server runs on the same port as Vite dev server.

## REST Endpoints

## Rate Limiting

All API endpoints are rate-limited to **100 requests per IP per minute** via `express-rate-limit`. Exceeding the limit returns:

- **HTTP 429**: `{ "error": "Too many requests, please try again later." }`

## Error Responses

All endpoints may return these error responses:

| Status | Body | When |
|--------|------|------|
| `429` | `{ "error": "Too many requests, please try again later." }` | Rate limit exceeded |
| `500` | `{ "error": "Internal server error" }` | Unhandled server error |

Successful responses always return JSON with HTTP 200.

### GET /api/events

Returns recent war events, ordered by timestamp (newest first). Maximum 200 events.

**Response**: `WarEvent[]`

```json
[
  {
    "id": "uuid-string",
    "type": "missile_launch",
    "title": "Ballistic missile launched from southern Iran",
    "description": "Medium-range ballistic missile detected...",
    "location": "Shiraz, Iran",
    "lat": 29.5918,
    "lng": 52.5836,
    "country": "Iran",
    "source": "Satellite Detection",
    "timestamp": "2026-02-28T10:30:00.000Z",
    "threatLevel": "critical",
    "verified": true
  }
]
```

### GET /api/statistics

Returns computed defense statistics (aggregated from war events).

**Response**: `Statistics`

```json
{
  "totalLaunches": 45,
  "totalInterceptions": 38,
  "totalHits": 7,
  "interceptionRate": 84.4,
  "activeAlerts": 3,
  "totalDrones": 12,
  "droneInterceptions": 9,
  "byCountry": {
    "Iran": { "launches": 15, "interceptions": 12 },
    "Lebanon": { "launches": 10, "interceptions": 8 }
  },
  "bySystem": {
    "ironDome": 20,
    "arrowSystem": 8,
    "davidsSling": 6,
    "thaad": 4
  }
}
```

### GET /api/news

Returns recent news items, ordered by timestamp. Maximum 100 items.

**Response**: `NewsItem[]`

```json
[
  {
    "id": "uuid-string",
    "title": "IDF confirms interception of multiple ballistic missiles",
    "source": "IDF Spokesperson",
    "timestamp": "2026-02-28T10:30:00.000Z",
    "url": null,
    "category": "Military",
    "breaking": true
  }
]
```

### GET /api/alerts

Returns Pikud HaOref alerts, ordered by timestamp. Maximum 50 alerts.

**Response**: `Alert[]`

```json
[
  {
    "id": "uuid-string",
    "area": "Tel Aviv - Gush Dan",
    "threat": "Missile threat - enter shelters immediately",
    "timestamp": "2026-02-28T10:30:00.000Z",
    "active": true,
    "lat": 32.0853,
    "lng": 34.7818
  }
]
```

### GET /api/ai-summary

Returns the latest AI situation analysis. If none exists, generates one automatically.

**Response**: `AISummary`

```json
{
  "summary": "Current situation assessment indicates...",
  "threatAssessment": "critical",
  "keyPoints": [
    "Multi-front engagement: Iran, Lebanon, Yemen, Iraq, and Gaza",
    "Israeli air defense systems operating at 84% interception rate"
  ],
  "lastUpdated": "2026-02-28T10:30:00.000Z",
  "recommendation": "Maintain maximum alert posture..."
}
```

### GET /api/health

Basic health check.

**Response**:

```json
{
  "status": "ok",
  "database": "populated",
  "timestamp": "2026-02-28T10:30:00.000Z"
}
```

### GET /api/system-health

Comprehensive system health check. Returns status of database, environment variables, data source fetchers, and WebSocket connections.

**Response**: `SystemHealth`

```json
{
  "timestamp": "2026-02-28T10:30:00.000Z",
  "database": {
    "status": "ok",
    "error": "",
    "counts": {
      "events": 142,
      "news": 87,
      "alerts": 23,
      "satellite": 2
    }
  },
  "envVars": {
    "DATABASE_URL": "configured",
    "OPENAI_API_KEY": "configured",
    "PROXY_BASE_URL": "configured",
    "PROXY_AUTH_TOKEN": "configured",
    "RSSAPP_API_KEY": "configured",
    "RSSAPP_API_SECRET": "configured",
    "MARINETRAFFIC_API_KEY": "missing",
    "ADSBX_API_KEY": "missing",
    "SENTINELHUB_CLIENT_ID": "missing",
    "SENTINELHUB_CLIENT_SECRET": "missing",
    "SENTINELHUB_INSTANCE_ID": "missing",
    "SENTINELHUB_API_KEY": "missing"
  },
  "dataSources": [
    {
      "name": "oref-alerts",
      "enabled": true,
      "fetchIntervalMs": 5000,
      "status": "ok",
      "missingEnvVars": [],
      "health": {
        "lastRunAt": "2026-02-28T10:30:00.000Z",
        "lastSuccessAt": "2026-02-28T10:30:00.000Z",
        "lastError": null,
        "runCount": 1420,
        "errorCount": 3
      }
    }
  ],
  "webSocket": {
    "connectedClients": 12
  }
}
```

Data source `status` values:
- `ok` — running successfully
- `error` — last run failed (check `health.lastError`)
- `not_configured` — required env vars missing
- `no_data` — enabled but hasn't run yet

### GET /api/news/sentiment

Returns aggregated sentiment data for recent news items.

**Response**: `SentimentResponse`

```json
{
  "average": -0.42,
  "trend": "escalating",
  "sampleSize": 15
}
```

### GET /api/satellite-images

Returns satellite imagery metadata for recent strike locations.

**Response**: `SatelliteImage[]`

```json
[
  {
    "id": "sat-uuid",
    "eventId": "event-uuid",
    "imageUrl": "https://services.sentinel-hub.com/ogc/wms/...",
    "bboxWest": 34.75,
    "bboxSouth": 31.45,
    "bboxEast": 34.85,
    "bboxNorth": 31.55,
    "capturedAt": "2026-02-28T08:00:00.000Z",
    "createdAt": "2026-02-28T10:30:00.000Z"
  }
]
```

### GET /api/satellite-images/:id/tile

Proxies the actual satellite image tile from Sentinel Hub. Returns `image/png` binary data. Cached for 1 hour. Returns 404 if image ID not found, 502 if upstream fetch fails.

### POST /api/webhooks/rss

Receives push notifications from RSS.app when new feed items arrive. Handles various content types (JSON, text, rawBody).

**Request Body**: RSS.app webhook JSON payload (flexible schema)

**Response**:

```json
{ "ok": true, "ingested": 3 }
```

## WebSocket

### Endpoint: /ws

The server creates a WebSocket server attached to the HTTP server. Clients receive real-time updates when new events are generated by the background data fetcher.

**Connection**: `ws://hostname:port/ws` (or `wss://` in production)

**Server-to-Client Messages**:

```json
{
  "type": "new_event",
  "event": {
    "id": "uuid-string",
    "type": "missile_launch",
    "title": "...",
    ...
  }
}
```

**Client Implementation** (from `dashboard.tsx`):

```typescript
const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === "new_event") {
    // Prepend to events list
  }
};
```

**Reconnection**: The frontend implements automatic reconnection with exponential backoff. If the WS connection drops, data continues flowing via REST polling (React Query refetchInterval).

## Frontend Polling Intervals

| Endpoint | Interval | React Query Key |
|----------|----------|-----------------|
| `/api/events` | 10,000ms | `["/api/events"]` |
| `/api/statistics` | 8,000ms | `["/api/statistics"]` |
| `/api/news` | 15,000ms | `["/api/news"]` |
| `/api/alerts` | 8,000ms | `["/api/alerts"]` |
| `/api/ai-summary` | 30,000ms | `["/api/ai-summary"]` |
| `/api/news/sentiment` | 30,000ms | `["/api/news/sentiment"]` |
| `/api/satellite-images` | 60,000ms | `["/api/satellite-images"]` |
| `/api/system-health` | 15,000ms | `["/api/system-health"]` |
