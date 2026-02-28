# Operational Runbooks

Day-to-day operations, troubleshooting, and maintenance procedures.

## Service Management

### View Status
```bash
systemctl status iran-panel-production
```

### View Logs
```bash
# Follow live logs
journalctl -u iran-panel-production -f --no-pager

# Last 200 lines
journalctl -u iran-panel-production -n 200 --no-pager

# Logs since midnight
journalctl -u iran-panel-production --since today
```

### Restart Service
```bash
systemctl restart iran-panel-production
```

### Stop Service
```bash
systemctl stop iran-panel-production
```

## Database Operations

### Connect to Database
```bash
psql -U war_panel_user -d war_panel
```

### Backup Database
```bash
pg_dump -U war_panel_user war_panel > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Restore Database
```bash
psql -U war_panel_user war_panel < backup_20260228.sql
```

### Purge All Data (Clean Restart)
```bash
psql -U war_panel_user war_panel < purge.sql
```

The `purge.sql` script at the repo root truncates all tables. Use for a clean restart.

### Run Schema Migrations
```bash
cd /opt/iran-panel-production
npm run db:push
```

### Check Table Sizes
```sql
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname || '.' || tablename))
FROM pg_tables WHERE schemaname = 'public' ORDER BY pg_total_relation_size(schemaname || '.' || tablename) DESC;
```

## API Key Rotation

### General Process
1. Obtain the new API key from the provider
2. Edit `.env` on the production server:
   ```bash
   nano /opt/iran-panel-production/.env
   ```
3. Restart the service:
   ```bash
   systemctl restart iran-panel-production
   ```
4. Verify the key is working:
   ```bash
   curl -s http://localhost:5000/api/system-health | jq '.envVars'
   ```

### Provider-Specific Keys

| Key | Provider | Dashboard URL |
|-----|----------|--------------|
| `OPENAI_API_KEY` | OpenAI | https://platform.openai.com/api-keys |
| `RSSAPP_API_KEY` / `SECRET` | RSS.app | https://rss.app/dashboard |
| `PROXY_AUTH_TOKEN` | Self-managed | Set matching token on proxy server |
| `MARINETRAFFIC_API_KEY` | MarineTraffic | https://www.marinetraffic.com/en/ais-api-services |
| `ADSBX_API_KEY` | ADS-B Exchange | https://www.adsbexchange.com/data/ |
| `SENTINELHUB_*` | Sentinel Hub | https://apps.sentinel-hub.com/dashboard/ |

## Stream URL Updates

TV channel and camera stream URLs occasionally need updating when YouTube/embeds change.

### Process
1. Find the new embed URL (format: `youtube.com/embed/<VIDEO_ID>`)
2. Edit the stream arrays in two files:
   - `client/src/components/live-media-panel.tsx` — `tvChannels` or `liveCameras` array
   - `client/src/pages/health.tsx` — stream probe URLs (keep in sync)
3. Rebuild and deploy:
   ```bash
   cd /opt/iran-panel-production
   git pull origin main
   npm run build
   systemctl restart iran-panel-production
   ```

## SSL Certificate Renewal

### Cloudflare Origin Certificate
Cloudflare Origin certificates are valid for up to 15 years. No manual renewal needed unless revoked.

### Let's Encrypt (if used)
```bash
# Test renewal
certbot renew --dry-run

# Force renewal
certbot renew --nginx
systemctl reload nginx
```

Add to crontab for auto-renewal:
```bash
0 0 1 * * certbot renew --nginx --quiet && systemctl reload nginx
```

## Diagnosis Flowchart

When the site is not working, follow this sequence:

### 1. Site Unreachable
```bash
# Check Nginx
systemctl status nginx
nginx -t
journalctl -u nginx -n 50
```

### 2. 502 Bad Gateway
```bash
# Check if app is running
systemctl status iran-panel-production
# Check if port 5000 is listening
ss -tlnp | grep 5000
```

### 3. App Running but Errors
```bash
# Check application logs
journalctl -u iran-panel-production -n 200 --no-pager | tail -50
```

### 4. No Data Appearing
```bash
# Check data source health
curl -s http://localhost:5000/api/system-health | jq '.dataSources[] | {name, status, health}'
```

### 5. No Alerts (Oref)
```bash
# Check proxy connectivity
curl -s http://100.81.32.3:3080/health
# Check Tailscale
tailscale status
```

### 6. Database Issues
```bash
# Check PostgreSQL
systemctl status postgresql
# Check connectivity
psql -U war_panel_user -d war_panel -c "SELECT 1"
# Check table counts
psql -U war_panel_user -d war_panel -c "SELECT 'events', count(*) FROM war_events UNION ALL SELECT 'news', count(*) FROM news_items UNION ALL SELECT 'alerts', count(*) FROM alerts;"
```

### 7. High Memory / CPU
```bash
# Check process resources
ps aux | grep node
# Check system resources
htop
# Restart if needed
systemctl restart iran-panel-production
```

## Scaling Notes

- **PostgreSQL connections**: `pg.Pool` max is 20. Increase in `server/db.ts` if needed.
- **Node.js memory**: Default ~1.5GB. Increase with `NODE_OPTIONS=--max-old-space-size=4096` in `.env`.
- **Nginx workers**: Default `auto` (matches CPU cores). Usually sufficient.
- **WebSocket clients**: The `ws` library is efficient. Monitor with `/api/system-health` → `webSocket.connectedClients`.
