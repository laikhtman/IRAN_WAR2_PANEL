# Data Fetcher Internals

Technical reference for the background data fetching system in `server/data-fetcher.ts`.

## Architecture

The data fetcher is a lightweight job scheduler that runs background tasks at configurable intervals. It is started once when the server boots via `startDataFetcher()` and runs until the process exits.

```
startDataFetcher()
  └─ for each enabled DataSourceConfig:
       └─ setInterval(run, fetchIntervalMs)
            └─ run():
                 ├─ source.fetchFn()
                 ├─ recordSourceRun(name)        // on success
                 └─ recordSourceRun(name, error)  // on failure
```

## Interfaces

### DataSourceConfig

```typescript
interface DataSourceConfig {
  name: string;              // Unique identifier (e.g., "oref-alerts")
  enabled: boolean;          // Whether to start this source
  fetchIntervalMs: number;   // Polling interval in milliseconds
  proxyRequired: boolean;    // Whether source needs Israeli proxy
  fetchFn: () => Promise<void>;  // Async function that fetches + persists data
  requiredEnvVars?: string[];    // Env vars that must be set for this source
}
```

### SourceHealth

```typescript
interface SourceHealth {
  lastRunAt: string | null;      // ISO timestamp of last execution
  lastSuccessAt: string | null;  // ISO timestamp of last successful execution
  lastError: string | null;      // Error message from last failure (null if last run succeeded)
  runCount: number;              // Total number of executions
  errorCount: number;            // Total number of failed executions
}
```

## Health Tracking

### sourceHealthMap

In-memory `Map<string, SourceHealth>` tracking runtime health of each data source. Not persisted — resets on server restart.

### recordSourceRun(name, error?)

Called after every fetch execution:
- On success: updates `lastRunAt`, `lastSuccessAt`, increments `runCount`, clears `lastError`
- On failure: updates `lastRunAt`, sets `lastError`, increments both `runCount` and `errorCount`

### getDataSourceHealthStatus()

Exported function used by `/api/system-health`. For each source, combines:
- Static config (name, enabled, interval)
- Runtime health from `sourceHealthMap`
- Env var validation (checks `requiredEnvVars` against `process.env`)

Returns status per source:
- `ok` — last run succeeded and env vars are configured
- `error` — last run failed
- `not_configured` — required env vars are missing
- `no_data` — enabled but hasn't run yet

## Registered Data Sources

| Name | Interval | Proxy | Required Env Vars | Function |
|------|----------|-------|-------------------|----------|
| `oref-alerts` | 5s | Yes | `PROXY_BASE_URL` | `fetchOrefAlerts()` |
| `rss-app-feeds` | 60s | No | `RSSAPP_API_KEY`, `RSSAPP_API_SECRET` | `fetchRSSAppFeeds()` |
| `ai-summary-refresh` | 120s | No | `OPENAI_API_KEY` | `refreshAISummary()` |
| `sentiment-analysis` | 120s | No | `OPENAI_API_KEY` | `analyzeNewsSentiment()` |
| `marine-traffic` | 300s | No | `MARINETRAFFIC_API_KEY` | `fetchMarineTraffic()` |
| `adsb-exchange` | 60s | No | `ADSBX_API_KEY` | `fetchADSBExchange()` |
| `sentinel-hub` | 3600s | No | `SENTINELHUB_INSTANCE_ID` | `fetchSentinelImagery()` |

## Key Functions

### fetchViaProxy(url)

Routes HTTP requests through the Israeli proxy if `PROXY_BASE_URL` is set:
```
PROXY_BASE_URL set? → GET {PROXY_BASE_URL}/proxy?url={encoded_url} (with Bearer token)
Not set?           → Direct fetch(url)
```

### processRSSWebhook(body)

Exported for use in `routes.ts`. Handles instant push from RSS.app:
- Extracts items from multiple possible payload locations (feed.items, entries, articles, data, etc.)
- Deduplicates using `seenGuids` set
- Creates `NewsItem` objects and persists via `storage.addNews()`
- Returns count of ingested items

### classifyEvent(title, description)

AI event classification using GPT-4o-mini:
- 5-second timeout with AbortController
- Returns `{ type, threatLevel }` or `null` on failure
- Validates against allowed event types and threat levels
- Called during RSS feed processing for batches ≤5 items

## Lifecycle

```
Server Start
  └─ registerRoutes()
       ├─ setNewEventCallback(broadcast)  // Wire WS broadcast
       └─ startDataFetcher()              // Start all intervals
            └─ setInterval for each enabled source

Server Stop
  └─ stopDataFetcher()
       └─ clearInterval for all registered intervals
```
