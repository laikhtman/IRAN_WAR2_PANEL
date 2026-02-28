# Monitoring & Health Checks

## Health Page (Browser)

The War Panel includes a built-in health dashboard at `/health` (accessible via the HeartPulse icon in the header bar).

### Sections

1. **Overview Cards**: Quick status of DB, API keys, data sources, WebSocket clients
2. **Database**: Row counts per table (war_events, news_items, alerts, satellite_images)
3. **Environment Variables**: Grid showing which of the 12 env vars are configured vs missing
4. **Data Source Fetchers**: Per-source status with run count, error count, last run time, last error
5. **TV Channel Streams**: Iframe-based availability probes for 9 channels (6-second timeout)
6. **Camera Streams**: Same probe approach for 5 live cameras

Auto-refreshes every 15 seconds.

## Health API Endpoint

### GET /api/health

Lightweight health check for uptime monitors:

```bash
curl -s https://intelhq.io/api/health
```

```json
{
  "status": "ok",
  "database": "populated",
  "timestamp": "2026-02-28T10:30:00.000Z"
}
```

### GET /api/system-health

Comprehensive health data for detailed monitoring:

```bash
curl -s https://intelhq.io/api/system-health | jq
```

Returns: database status + table row counts, env var configuration, data source health (per-source), WebSocket client count.

## External Monitoring Setup

### UptimeRobot (Recommended)

1. Create a new HTTP(s) monitor
2. URL: `https://intelhq.io/api/health`
3. Monitoring interval: 60 seconds
4. Alert if: response is not 200 OK
5. Alert contacts: email, Telegram, Slack, etc.

### Advanced: Data Source Monitoring

For monitoring individual data sources:

```bash
# Check if any data source has errors
curl -s https://intelhq.io/api/system-health | jq '[.dataSources[] | select(.status == "error")] | length'
# Returns 0 if all healthy
```

### Grafana / Prometheus (Optional)

Create a custom exporter that scrapes `/api/system-health` and exposes:
- `war_panel_db_status` (gauge: 1=ok, 0=error)
- `war_panel_datasource_status{name="oref-alerts"}` (gauge)
- `war_panel_datasource_error_count{name="oref-alerts"}` (counter)
- `war_panel_ws_clients` (gauge)

## Alert Thresholds

| Metric | Warning | Critical |
|--------|---------|----------|
| Data source error rate | >30% errors in last hour | >50% errors |
| Database connection | — | Failed |
| WebSocket clients | — | 0 for >5 minutes |
| Response time | >2s | >5s |
| Disk usage | >80% | >90% |
