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
    verified        BOOLEAN         NOT NULL DEFAULT FALSE,
    ai_classified   BOOLEAN         NOT NULL DEFAULT FALSE
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
    breaking        BOOLEAN         NOT NULL DEFAULT FALSE,
    sentiment       REAL,
    language        VARCHAR(10)                         -- detected language code (en, he, ar, fa)
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
    recommendation      TEXT            NOT NULL,
    sources             JSONB,                           -- string[] of event IDs used
    event_count         INTEGER,                         -- number of events analyzed
    news_count          INTEGER                          -- number of news items analyzed
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


-- ─── 6. Satellite Images ────────────────────────────────────────────────────
-- Sentinel Hub satellite imagery linked to war events.

CREATE TABLE IF NOT EXISTS satellite_images (
    id              VARCHAR         PRIMARY KEY,
    event_id        VARCHAR,
    image_url       TEXT            NOT NULL,
    bbox_west       REAL            NOT NULL,
    bbox_south      REAL            NOT NULL,
    bbox_east       REAL            NOT NULL,
    bbox_north      REAL            NOT NULL,
    captured_at     TEXT            NOT NULL,
    created_at      TEXT            NOT NULL DEFAULT (now()::text)
);


-- ─── 7. Admin Settings ──────────────────────────────────────────────────────
-- Key-value settings store for admin configuration.

CREATE TABLE IF NOT EXISTS admin_settings (
    key             VARCHAR(100)    PRIMARY KEY,
    value           JSONB           NOT NULL,
    updated_at      TEXT            NOT NULL DEFAULT (now()::text)
);


-- ─── 8. Admin Sessions ──────────────────────────────────────────────────────
-- Token-authenticated admin sessions with expiry.

CREATE TABLE IF NOT EXISTS admin_sessions (
    id              VARCHAR(64)     PRIMARY KEY,
    created_at      TEXT            NOT NULL,
    expires_at      TEXT            NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires ON admin_sessions (expires_at);


-- ─── 9. Blocked Countries ───────────────────────────────────────────────────
-- ISO 3166-1 alpha-2 country codes blocked from accessing the site.

CREATE TABLE IF NOT EXISTS blocked_countries (
    country_code    VARCHAR(2)      PRIMARY KEY,
    country_name    VARCHAR(100)    NOT NULL,
    blocked_at      TEXT            NOT NULL DEFAULT (now()::text)
);


-- ─── 10. Agents ─────────────────────────────────────────────────────────────
-- OpenClaw autonomous agent definitions.

CREATE TABLE IF NOT EXISTS agents (
    id              VARCHAR(36)     PRIMARY KEY,
    name            VARCHAR(200)    NOT NULL,
    type            VARCHAR(50)     NOT NULL,
    description     TEXT,
    enabled         BOOLEAN         NOT NULL DEFAULT TRUE,
    schedule_cron   VARCHAR(100),
    config          JSONB           NOT NULL DEFAULT '{}',
    last_run_at     TEXT,
    last_result     JSONB,
    created_at      TEXT            NOT NULL,
    updated_at      TEXT            NOT NULL
);


-- ─── 11. Agent Logs ─────────────────────────────────────────────────────────
-- Execution logs for OpenClaw agents.

CREATE TABLE IF NOT EXISTS agent_logs (
    id              SERIAL          PRIMARY KEY,
    agent_id        VARCHAR(36)     NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    started_at      TEXT            NOT NULL,
    finished_at     TEXT,
    status          VARCHAR(20)     NOT NULL DEFAULT 'running',
    input           JSONB,
    output          JSONB,
    tokens_used     INTEGER         DEFAULT 0,
    error           TEXT,
    created_at      TEXT            NOT NULL DEFAULT (now()::text)
);

CREATE INDEX IF NOT EXISTS idx_agent_logs_agent_id ON agent_logs (agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_logs_created_at ON agent_logs (created_at);


-- ─── 12. User Feedback ──────────────────────────────────────────────────────
-- User-submitted feedback from the dashboard.

CREATE TABLE IF NOT EXISTS feedback (
    id              SERIAL          PRIMARY KEY,
    message         TEXT            NOT NULL,
    email           VARCHAR(255),
    url             TEXT,
    user_agent      TEXT,
    created_at      TEXT            NOT NULL DEFAULT (now()::text)
);

CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON feedback (created_at DESC);


-- ─── Done ──────────────────────────────────────────────────────────────────
-- All tables created. The application uses Drizzle ORM which maps to these
-- exact table/column names. You can also use `npm run db:push` to let
-- Drizzle push the schema automatically.
