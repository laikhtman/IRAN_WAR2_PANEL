-- ============================================================================
-- Iran War Panel — Full Database Schema
-- PostgreSQL 15+
-- 
-- Usage:
--   psql -U postgres -d war_panel -f db/schema.sql
--
-- Or via environment variable:
--   psql "$DATABASE_URL" -f db/schema.sql
-- ============================================================================

-- ─── 1. War Events ─────────────────────────────────────────────────────────
-- Tracks all battlefield events: launches, intercepts, hits, alerts, etc.

CREATE TABLE IF NOT EXISTS war_events (
    id              VARCHAR         PRIMARY KEY,
    type            VARCHAR(50)     NOT NULL,           -- missile_launch, missile_intercept, missile_hit, drone_launch, drone_intercept, air_raid_alert, ceasefire, military_operation, explosion, sirens
    title           TEXT            NOT NULL,
    description     TEXT            NOT NULL,
    location        TEXT            NOT NULL,
    lat             REAL            NOT NULL,
    lng             REAL            NOT NULL,
    country         VARCHAR(100)    NOT NULL,
    source          VARCHAR(200)    NOT NULL,
    timestamp       TEXT            NOT NULL,           -- ISO 8601 string
    threat_level    VARCHAR(20)     NOT NULL,           -- critical, high, medium, low
    verified        BOOLEAN         NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_war_events_timestamp ON war_events (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_war_events_type ON war_events (type);
CREATE INDEX IF NOT EXISTS idx_war_events_country ON war_events (country);


-- ─── 2. News Items ─────────────────────────────────────────────────────────
-- News feed entries from Telegram RSS, OSINT channels, etc.

CREATE TABLE IF NOT EXISTS news_items (
    id              VARCHAR         PRIMARY KEY,
    title           TEXT            NOT NULL,
    source          VARCHAR(200)    NOT NULL,
    timestamp       TEXT            NOT NULL,           -- ISO 8601 string
    url             TEXT,                               -- nullable, link to original
    category        VARCHAR(100)    NOT NULL,
    breaking        BOOLEAN         NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_news_items_timestamp ON news_items (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_news_items_breaking ON news_items (breaking) WHERE breaking = TRUE;


-- ─── 3. Alerts ─────────────────────────────────────────────────────────────
-- Pikud HaOref (Home Front Command) alerts with geographic coordinates.

CREATE TABLE IF NOT EXISTS alerts (
    id              VARCHAR         PRIMARY KEY,
    area            TEXT            NOT NULL,
    threat          TEXT            NOT NULL,
    timestamp       TEXT            NOT NULL,           -- ISO 8601 string
    active          BOOLEAN         NOT NULL DEFAULT TRUE,
    lat             REAL            NOT NULL,
    lng             REAL            NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_alerts_timestamp ON alerts (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_active ON alerts (active) WHERE active = TRUE;


-- ─── 4. AI Summaries ───────────────────────────────────────────────────────
-- GPT-generated intelligence summaries, kept as an append-only log.

CREATE TABLE IF NOT EXISTS ai_summaries (
    id                  SERIAL          PRIMARY KEY,
    summary             TEXT            NOT NULL,
    threat_assessment   VARCHAR(20)     NOT NULL,       -- critical, high, medium, low
    key_points          JSONB           NOT NULL,       -- string[] stored as JSON array
    last_updated        TEXT            NOT NULL,       -- ISO 8601 string
    recommendation      TEXT            NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ai_summaries_id_desc ON ai_summaries (id DESC);


-- ─── 5. Data Source Status ─────────────────────────────────────────────────
-- Operational status of each data-fetching pipeline.

CREATE TABLE IF NOT EXISTS data_source_status (
    id                      VARCHAR         PRIMARY KEY,
    name                    VARCHAR(100)    NOT NULL,
    last_fetched_at         TEXT,
    last_success_at         TEXT,
    last_error              TEXT,
    enabled                 BOOLEAN         NOT NULL DEFAULT TRUE,
    fetch_interval_seconds  SERIAL          NOT NULL
);


-- ─── Done ──────────────────────────────────────────────────────────────────
-- All tables created. The application uses Drizzle ORM which maps to these
-- exact table/column names. You can also use `npm run db:push` to let
-- Drizzle push the schema automatically.
