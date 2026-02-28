# WebSocket Protocol

## Connection

- **URL**: `ws://hostname:port/ws` (development) or `wss://hostname/ws` (production via Nginx)
- **Library**: `ws` (not Socket.io)
- **Authentication**: None required — all connections are accepted
- **Path**: `/ws` (configured in `server/routes.ts`)

## Server → Client Messages

### `new_event`

Broadcast when a new war event is created by any data fetcher (Oref alerts, RSS.app AI classification, etc.).

```json
{
  "type": "new_event",
  "event": {
    "id": "uuid-string",
    "type": "air_raid_alert",
    "title": "Red Alert — Tel Aviv",
    "description": "Missile threat. Sirens sounding in Tel Aviv.",
    "location": "Tel Aviv, Israel",
    "lat": 32.0853,
    "lng": 34.7818,
    "country": "Israel",
    "source": "Pikud HaOref",
    "timestamp": "2026-02-28T10:30:00.000Z",
    "threatLevel": "critical",
    "verified": true,
    "aiClassified": false
  }
}
```

The `event` object matches the `WarEvent` type from `shared/schema.ts`.

## Client → Server Messages

Currently none. The WebSocket is **unidirectional** (server push only).

## Connection Management

- Server tracks connected clients in a `Set<WebSocket>` (defined in `server/routes.ts`)
- Clients are automatically removed from the set on `close` event
- No heartbeat/ping-pong mechanism is implemented
- Connected client count is available via `/api/system-health` → `webSocket.connectedClients`

## Frontend Implementation

Located in `client/src/pages/dashboard.tsx`:

```typescript
// Connection setup
const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);

// Message handling
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === "new_event") {
    // Prepend event to React Query cache
    queryClient.setQueryData(["/api/events"], (old) => [data.event, ...(old || [])]);

    // Play audio alert for air raid events (if not muted)
    if (data.event.type === "air_raid_alert" && !isMuted) {
      audioRef.current?.play();
    }
  }
};
```

## Reconnection

The frontend tracks WebSocket connection status:
- `wsStatus` state: `"connected"` | `"disconnected"`
- HeaderBar displays a colored indicator: green dot = connected, red dot = disconnected
- On disconnect, data continues flowing via REST polling (React Query `refetchInterval`)
- Auto-reconnection is implemented with retry logic

## Audio Alerts

When a `new_event` message arrives with `type === "air_raid_alert"`:
1. The audio file `/Oref Impact.mp3` is played (unless muted)
2. Mute state is managed via `isMuted` / `onToggleMute` in the dashboard
3. The mute toggle is accessible in the HeaderBar

## Nginx WebSocket Configuration

For production, the Nginx config must include WebSocket upgrade directives:

```nginx
location / {
    proxy_pass http://127.0.0.1:5000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
}
```

This is already configured in `deploy/production/intelhq.io.conf`.
