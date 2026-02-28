# Backup Strategy

## Automated Backups

Add to root's crontab on the production server:

```bash
crontab -e
```

```cron
# Daily backup at 3:00 AM UTC
0 3 * * * pg_dump -U war_panel_user war_panel | gzip > /opt/backups/war_panel_$(date +\%Y\%m\%d).sql.gz

# Weekly full backup (Sundays at 2:00 AM)
0 2 * * 0 pg_dump -U war_panel_user -Fc war_panel > /opt/backups/war_panel_full_$(date +\%Y\%m\%d).dump

# Clean backups older than 30 days
0 4 * * * find /opt/backups/ -name "war_panel_*" -mtime +30 -delete
```

Setup the backup directory:
```bash
mkdir -p /opt/backups
chown postgres:postgres /opt/backups
```

## Manual Backup

```bash
# SQL dump (human-readable)
pg_dump -U war_panel_user war_panel > backup.sql

# Custom format (compressed, supports selective restore)
pg_dump -U war_panel_user -Fc war_panel > backup.dump
```

## Restore

```bash
# From SQL dump
psql -U war_panel_user war_panel < backup.sql

# From custom format
pg_restore -U war_panel_user -d war_panel backup.dump
```

## Data Retention Note

The application auto-prunes to keep tables bounded:
- `war_events`: max 500 rows
- `news_items`: max 500 rows
- `alerts`: max 200 rows
- `ai_summaries`: max 50 rows

Backups capture a point-in-time snapshot, but older data may already be pruned by the time the backup runs. For long-term data archival, consider a separate ETL pipeline.

## Offsite Backup (Recommended)

Sync backups to cloud storage:

```bash
# rsync to another server
rsync -avz /opt/backups/ user@backup-server:/backups/war-panel/

# Or sync to S3-compatible storage
aws s3 sync /opt/backups/ s3://your-bucket/war-panel-backups/ --storage-class STANDARD_IA
```
