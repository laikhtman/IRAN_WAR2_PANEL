# Database Setup

The War Panel uses PostgreSQL 15+ for data storage.

## Option A: Automated Setup (Linux/macOS)

```bash
chmod +x db/setup.sh
./db/setup.sh
```

This creates the database, user, and all tables. It prints a `DATABASE_URL` connection string to add to your `.env`.

### Custom database name/user:

```bash
DB_NAME=my_war_panel DB_USER=my_user ./db/setup.sh
```

## Option B: Manual SQL

```bash
# 1. Create database
psql -U postgres -c "CREATE DATABASE war_panel;"

# 2. Apply schema
psql -U postgres -d war_panel -f db/schema.sql
```

## Option C: Drizzle Push (recommended for dev)

Drizzle ORM can sync the schema automatically from `shared/schema.ts`:

```bash
# Set DATABASE_URL in .env first, then:
npm run db:push
```

This reads the Drizzle table definitions and creates/alters tables to match.

## Tables

| Table | Purpose | Pruned At |
|-------|---------|-----------|
| `war_events` | Battlefield events (launches, intercepts, alerts) | 500 rows |
| `news_items` | News feed entries from Telegram RSS / OSINT | 500 rows |
| `alerts` | Pikud HaOref real-time alerts with coordinates | 200 rows |
| `ai_summaries` | GPT-generated intelligence summaries | 50 rows |
| `data_source_status` | Pipeline health tracking | — |

## Indexes

All tables have indexes on `timestamp DESC` for efficient recent-first queries. Additional indexes exist on `war_events.type`, `war_events.country`, `news_items.breaking`, and `alerts.active`.

## Schema Changes

The source of truth for the schema is `shared/schema.ts` (Drizzle definitions). The SQL file `db/schema.sql` is kept in sync for manual deployments. If you modify the Drizzle schema, regenerate migrations with:

```bash
npx drizzle-kit generate
npx drizzle-kit push
```
