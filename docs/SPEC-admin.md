# SPEC: Admin Panel

> **Status:** Draft  
> **Created:** 2025-01-XX  
> **Admin Path:** `/panel-272d672e974546a7` (override via `ADMIN_PATH` env var)

---

## 1. Overview

A hidden, token-protected admin panel that provides full configuration of the War Panel application — health monitoring, country blocking, rate limiting, Google Analytics, news database management, data-source control, and autonomous OpenClaw agent orchestration.

### User Requirements (verbatim)

1. Configure everything relevant in the app
2. Move the health page into the admin panel (close from public)
3. Unique random directory name for the admin path
4. Restrict specific countries from entering the website
5. Set rate limits
6. Set Google Analytics for all app pages
7. See the database of news
8. Manage agents that will work on managing the website (OpenClaw agents)

---

## 2. Architecture Decisions

### 2.1 Admin Path (Security through Obscurity + Token Auth)

| Decision | Detail |
|---|---|
| Default path | `/panel-272d672e974546a7` |
| Override | `ADMIN_PATH` env var (e.g. `ADMIN_PATH=my-secret-panel-123`) |
| API prefix | `/api/__admin/` (always fixed, protected by token middleware) |
| Client route | `/${ADMIN_PATH}` and `/${ADMIN_PATH}/*` |
| Why separate API prefix? | API routes are registered at server startup and cannot change. The obscured path only applies to the HTML/SPA routes. The API is secured by the `ADMIN_TOKEN` header, not by path obscurity. |

### 2.2 Authentication

| Decision | Detail |
|---|---|
| Method | Env-var token (`ADMIN_TOKEN`) — admin enters it in a login form |
| Session | Server-side session stored in DB (`admin_sessions` table) with 24h expiry |
| Cookie | `__admin_sid` HttpOnly, Secure, SameSite=Strict |
| Middleware | `requireAdmin(req, res, next)` — checks cookie → validates session in DB |
| Login endpoint | `POST /api/__admin/login` with `{ token: string }` |
| Logout endpoint | `POST /api/__admin/logout` |
| Session check | `GET /api/__admin/session` → 200 or 401 |
| If `ADMIN_TOKEN` not set | Admin panel is completely disabled (404) |

### 2.3 Data Storage

New settings stored in a `admin_settings` key-value table so the admin can persist configuration without redeploying. Changes are loaded into memory at startup and cache-invalidated on write.

---

## 3. Database Changes

### 3.1 New Tables

```sql
-- Key-value settings store
CREATE TABLE IF NOT EXISTS admin_settings (
  key VARCHAR(100) PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (NOW()::TEXT)
);

-- Admin sessions
CREATE TABLE IF NOT EXISTS admin_sessions (
  id VARCHAR(64) PRIMARY KEY,           -- crypto.randomBytes(32).toString('hex')
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

-- Country blocking list
CREATE TABLE IF NOT EXISTS blocked_countries (
  country_code VARCHAR(2) PRIMARY KEY,  -- ISO 3166-1 alpha-2
  country_name VARCHAR(100) NOT NULL,
  blocked_at TEXT NOT NULL DEFAULT (NOW()::TEXT)
);

-- OpenClaw agent definitions
CREATE TABLE IF NOT EXISTS agents (
  id VARCHAR(36) PRIMARY KEY,           -- UUID
  name VARCHAR(200) NOT NULL,
  type VARCHAR(50) NOT NULL,            -- 'content_moderator' | 'news_curator' | 'alert_manager' | 'seo_optimizer' | 'custom'
  description TEXT,
  enabled BOOLEAN NOT NULL DEFAULT true,
  schedule_cron VARCHAR(100),           -- cron expression, e.g., '*/5 * * * *'
  config JSONB NOT NULL DEFAULT '{}',   -- agent-specific config (model, prompt, parameters)
  last_run_at TEXT,
  last_result JSONB,                    -- { success: boolean, output: string, error?: string }
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Agent execution logs
CREATE TABLE IF NOT EXISTS agent_logs (
  id SERIAL PRIMARY KEY,
  agent_id VARCHAR(36) NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'running',  -- 'running' | 'success' | 'error' | 'cancelled'
  input JSONB,
  output JSONB,
  tokens_used INTEGER DEFAULT 0,
  error TEXT,
  created_at TEXT NOT NULL DEFAULT (NOW()::TEXT)
);

CREATE INDEX idx_agent_logs_agent_id ON agent_logs(agent_id);
CREATE INDEX idx_agent_logs_created_at ON agent_logs(created_at);
CREATE INDEX idx_admin_sessions_expires ON admin_sessions(expires_at);
```

### 3.2 Drizzle Schema Additions (`shared/schema.ts`)

New Drizzle table definitions for all 5 tables above + Zod insert schemas + TypeScript types.

### 3.3 Pre-seeded Settings Keys

| Key | Default Value | Description |
|---|---|---|
| `rate_limit_window_ms` | `60000` | Rate limit window in ms |
| `rate_limit_max_requests` | `100` | Max requests per window |
| `ga_measurement_id` | `""` | Google Analytics 4 measurement ID |
| `ga_enabled` | `false` | Whether GA script is injected |
| `country_blocking_enabled` | `false` | Whether geo-blocking middleware is active |
| `country_blocking_mode` | `"block"` | `"block"` or `"allow"` (blocklist vs allowlist) |
| `country_blocking_message` | `"Access restricted in your region"` | Custom block page message |
| `data_sources_config` | `{}` | Overrides for data source intervals/enabled |
| `maintenance_mode` | `false` | Show maintenance page to public |
| `maintenance_message` | `"We'll be back shortly"` | Maintenance page text |

---

## 4. API Contract

All admin routes are under `/api/__admin/` and require `requireAdmin` middleware (except `/login` and `/session`).

### 4.1 Auth

| Method | Path | Body | Response |
|---|---|---|---|
| `POST` | `/api/__admin/login` | `{ token: string }` | `{ ok: true, expiresAt: string }` or `401` |
| `POST` | `/api/__admin/logout` | — | `{ ok: true }` |
| `GET` | `/api/__admin/session` | — | `{ valid: true, expiresAt: string }` or `401` |

### 4.2 Settings

| Method | Path | Body | Response |
|---|---|---|---|
| `GET` | `/api/__admin/settings` | — | `Record<string, any>` (all key-value pairs) |
| `PUT` | `/api/__admin/settings` | `{ key: string, value: any }` | `{ ok: true }` |
| `PUT` | `/api/__admin/settings/bulk` | `{ settings: { key: string, value: any }[] }` | `{ ok: true, updated: number }` |

### 4.3 Health (Moved from public)

| Method | Path | Response |
|---|---|---|
| `GET` | `/api/__admin/health` | Same as current `/api/system-health` response |
| `GET` | `/api/__admin/health/db` | DB connection test + table counts |
| `GET` | `/api/__admin/health/sources` | Data source health array |
| `GET` | `/api/__admin/health/ws` | WebSocket client count |

### 4.4 Country Blocking

| Method | Path | Body | Response |
|---|---|---|---|
| `GET` | `/api/__admin/countries/blocked` | — | `BlockedCountry[]` |
| `POST` | `/api/__admin/countries/blocked` | `{ code: string, name: string }` | `{ ok: true }` |
| `DELETE` | `/api/__admin/countries/blocked/:code` | — | `{ ok: true }` |
| `PUT` | `/api/__admin/countries/blocked/bulk` | `{ countries: { code: string, name: string }[] }` | `{ ok: true, count: number }` |

### 4.5 Rate Limiting

Configured via the Settings API (`rate_limit_window_ms`, `rate_limit_max_requests`). The server reads these values and hot-reloads the Express rate limiter without a restart.

### 4.6 Google Analytics

Configured via Settings API (`ga_measurement_id`, `ga_enabled`). The `server/static.ts` HTML injection reads these at serve-time and injects the GA4 script tag + gtag.js into every HTML response.

### 4.7 News Database

| Method | Path | Query Params | Body | Response |
|---|---|---|---|---|
| `GET` | `/api/__admin/news` | `?page=1&limit=50&search=&category=&sort=timestamp&order=desc` | — | `{ items: NewsItem[], total: number, page: number, pages: number }` |
| `GET` | `/api/__admin/news/:id` | — | — | `NewsItem` |
| `PUT` | `/api/__admin/news/:id` | — | `Partial<NewsItem>` | `{ ok: true }` |
| `DELETE` | `/api/__admin/news/:id` | — | — | `{ ok: true }` |
| `DELETE` | `/api/__admin/news/bulk` | — | `{ ids: string[] }` | `{ ok: true, deleted: number }` |

### 4.8 Events Database

| Method | Path | Query Params | Body | Response |
|---|---|---|---|---|
| `GET` | `/api/__admin/events` | `?page=1&limit=50&search=&type=&country=&sort=timestamp&order=desc` | — | `{ items: WarEvent[], total: number, page: number, pages: number }` |
| `DELETE` | `/api/__admin/events/:id` | — | — | `{ ok: true }` |
| `DELETE` | `/api/__admin/events/bulk` | — | `{ ids: string[] }` | `{ ok: true, deleted: number }` |

### 4.9 Data Sources

| Method | Path | Body | Response |
|---|---|---|---|
| `GET` | `/api/__admin/data-sources` | — | `DataSourceConfig[]` with runtime health |
| `PUT` | `/api/__admin/data-sources/:name` | `{ enabled?: boolean, fetchIntervalMs?: number }` | `{ ok: true }` |
| `POST` | `/api/__admin/data-sources/:name/trigger` | — | `{ ok: true, message: string }` (manual fetch) |

### 4.10 OpenClaw Agents

| Method | Path | Body | Response |
|---|---|---|---|
| `GET` | `/api/__admin/agents` | — | `Agent[]` |
| `POST` | `/api/__admin/agents` | `CreateAgent` | `Agent` |
| `GET` | `/api/__admin/agents/:id` | — | `Agent` with recent logs |
| `PUT` | `/api/__admin/agents/:id` | `Partial<Agent>` | `{ ok: true }` |
| `DELETE` | `/api/__admin/agents/:id` | — | `{ ok: true }` |
| `POST` | `/api/__admin/agents/:id/run` | — | `{ ok: true, logId: number }` (manual trigger) |
| `POST` | `/api/__admin/agents/:id/stop` | — | `{ ok: true }` |
| `GET` | `/api/__admin/agents/:id/logs` | `?page=1&limit=20` | `{ logs: AgentLog[], total: number }` |
| `GET` | `/api/__admin/agents/stats` | — | `{ totalRuns: number, totalTokens: number, successRate: number }` |

---

## 5. Client-Side UI

### 5.1 Page Structure

```
/${ADMIN_PATH}                    → Admin Login (if not authenticated) or Admin Dashboard
/${ADMIN_PATH}/health             → Health & Monitoring tab
/${ADMIN_PATH}/settings           → App Settings tab (rate limits, GA, country blocking, maintenance)
/${ADMIN_PATH}/news               → News Database browser
/${ADMIN_PATH}/events             → Events Database browser
/${ADMIN_PATH}/data-sources       → Data Source manager
/${ADMIN_PATH}/agents             → OpenClaw Agent manager
/${ADMIN_PATH}/agents/:id         → Agent detail + logs
```

### 5.2 Component Tree

```
AdminLayout
├── AdminSidebar
│   ├── Logo + "Admin Panel" heading
│   ├── NavLink: Dashboard/Health
│   ├── NavLink: Settings
│   ├── NavLink: News DB
│   ├── NavLink: Events DB
│   ├── NavLink: Data Sources
│   ├── NavLink: Agents
│   └── Logout button
├── AdminHeader
│   ├── Current section title
│   └── Quick status indicators (DB, WS clients, uptime)
└── <Outlet /> (tab content)

AdminLogin
├── War Panel logo
├── Token input field
├── "Enter Admin" button
└── Error message area

HealthTab (moved from /health page)
├── SystemStatusCard (DB, API, WS)
├── DataSourceStatusTable
├── EnvVarsStatusTable
├── DatabaseCountsCard
└── Auto-refresh toggle (5s interval)

SettingsTab
├── Section: Rate Limiting
│   ├── Number input: Window (ms)
│   ├── Number input: Max requests
│   └── Save button
├── Section: Google Analytics
│   ├── Toggle: Enabled
│   ├── Text input: GA4 Measurement ID
│   └── Save button
├── Section: Country Blocking
│   ├── Toggle: Enabled
│   ├── Radio: Block mode / Allow mode
│   ├── CountrySelector (multi-select with search, ISO flags)
│   ├── Current blocked list with remove buttons
│   └── Text input: Custom block message
├── Section: Maintenance Mode
│   ├── Toggle: Enabled
│   ├── Textarea: Custom message
│   └── Save button
└── Section: SEO Config
    ├── Link to shared/seo-config.ts
    └── Note: "Edit seo-config.ts and redeploy for SEO changes"

NewsTab
├── SearchBar + CategoryFilter + SortDropdown
├── DataTable (paginated, 50/page)
│   ├── Columns: ID, Title, Source, Category, Sentiment, Breaking, Timestamp
│   ├── Row actions: View, Edit, Delete
│   └── Bulk select + Bulk delete
├── EditNewsDialog (modal)
│   ├── Title, Source, URL, Category fields
│   ├── Breaking toggle
│   └── Sentiment slider (-1 to 1)
└── Pagination controls

EventsTab
├── SearchBar + TypeFilter + CountryFilter + ThreatFilter
├── DataTable (paginated, 50/page)
│   ├── Columns: ID, Type, Title, Location, Country, Threat, Verified, Timestamp
│   ├── Row actions: View on map, Delete
│   └── Bulk select + Bulk delete
└── Pagination controls

DataSourcesTab
├── SourceCard × 7 (one per data source)
│   ├── Name, enabled toggle
│   ├── Fetch interval input (seconds)
│   ├── Last success time, last error
│   ├── Required env vars status
│   └── "Trigger Now" button
└── Global: "Restart All Fetchers" button

AgentsTab
├── StatsBar (total runs, tokens used, success rate)
├── AgentCard[] or AgentTable
│   ├── Name, type badge, status indicator
│   ├── Last run time, next scheduled run
│   ├── Enable/disable toggle
│   └── Actions: Run Now, Edit, View Logs, Delete
├── CreateAgentDialog
│   ├── Name, Type (dropdown), Description
│   ├── Schedule (cron expression with helper)
│   ├── Config JSON editor
│   └── Model selector (gpt-4o-mini, gpt-4o, etc.)
└── AgentDetailPage (/:id)
    ├── Agent config editor
    ├── LogsTable (paginated)
    │   ├── Columns: Started, Duration, Status, Tokens, Output preview
    │   └── Expand row for full input/output
    └── "Run Now" / "Stop" buttons
```

### 5.3 Admin Panel Styling

- Dark theme only (consistent with existing app dark mode)
- Sidebar navigation (collapsible on mobile)
- Uses existing Shadcn UI components: `Card`, `Table`, `Dialog`, `Tabs`, `Switch`, `Input`, `Select`, `Badge`, `Button`, `ScrollArea`, `Skeleton`
- New components: `DataTable` (reusable with pagination/sort/filter), `CountrySelector`, `CronHelper`, `JsonEditor`

---

## 6. Server-Side Middleware

### 6.1 Admin Auth Middleware (`server/admin-auth.ts`)

```typescript
// Pseudocode
export function requireAdmin(req, res, next) {
  if (!process.env.ADMIN_TOKEN) return res.status(404).json({ error: "Not found" });
  
  const sid = req.cookies?.['__admin_sid'];
  if (!sid) return res.status(401).json({ error: "Unauthorized" });
  
  const session = await db.select().from(adminSessions).where(eq(id, sid)).limit(1);
  if (!session || new Date(session.expires_at) < new Date()) {
    return res.status(401).json({ error: "Session expired" });
  }
  
  next();
}
```

### 6.2 Country Blocking Middleware (`server/geo-block.ts`)

```typescript
// Pseudocode — runs BEFORE all routes
export function geoBlockMiddleware(req, res, next) {
  if (!settingsCache.country_blocking_enabled) return next();
  
  // 1. Check Cloudflare header (preferred — zero latency)
  const country = req.headers['cf-ipcountry'] as string;
  // 2. Fallback: check X-Vercel-IP-Country or custom header
  // 3. Last resort: skip (don't block if we can't determine country)
  
  if (!country) return next();
  
  const blocked = blockedCountriesCache.has(country.toUpperCase());
  const mode = settingsCache.country_blocking_mode; // 'block' or 'allow'
  
  const shouldBlock = (mode === 'block' && blocked) || (mode === 'allow' && !blocked);
  
  if (shouldBlock) {
    // Skip admin panel routes (admin can always access)
    if (req.path.startsWith('/api/__admin')) return next();
    
    res.status(403);
    res.setHeader('Content-Type', 'text/html');
    res.send(renderBlockPage(settingsCache.country_blocking_message));
    return;
  }
  
  next();
}
```

### 6.3 Google Analytics Injection (`server/static.ts` update)

The existing HTML injection in `static.ts` will be extended to inject the GA4 script when `ga_enabled` is true and `ga_measurement_id` is non-empty:

```html
<!-- Injected before </head> -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_ID');
</script>
```

### 6.4 Dynamic Rate Limiting

Replace the hardcoded `rateLimit({ windowMs: 60000, max: 100 })` with a factory that reads from the settings cache:

```typescript
// On settings change, recreate the limiter
let currentLimiter = createLimiter(settingsCache.rate_limit_window_ms, settingsCache.rate_limit_max_requests);

function refreshLimiter() {
  currentLimiter = createLimiter(settingsCache.rate_limit_window_ms, settingsCache.rate_limit_max_requests);
}
```

---

## 7. OpenClaw Agent System

### 7.1 Agent Types

| Type | Description | Default Prompt Template |
|---|---|---|
| `content_moderator` | Reviews incoming news/events for accuracy, removes duplicates or spam | "Review the latest N news items for relevance and accuracy..." |
| `news_curator` | Curates and categorizes news, sets breaking flag, identifies key stories | "Analyze these news items and identify the top 5 most significant..." |
| `alert_manager` | Monitors alerts pattern, deactivates stale alerts, escalates critical ones | "Review active alerts and determine which should be deactivated..." |
| `seo_optimizer` | Analyzes content for SEO relevance, suggests description updates | "Review the current site description and suggest improvements..." |
| `custom` | User-defined prompt and behavior — full flexibility | User provides complete prompt |

### 7.2 Agent Execution Flow

```
1. Scheduler checks cron schedule → triggers agent
2. Agent reads its `config.prompt` template
3. Agent queries relevant data (news, events, alerts) based on type
4. Agent sends prompt + data to OpenAI (model from config, default gpt-4o-mini)
5. Agent parses structured response (JSON mode)
6. Agent executes actions (update DB, toggle alerts, etc.)
7. Agent logs execution result to agent_logs table
8. Admin can view logs in UI
```

### 7.3 Agent Config Schema

```typescript
interface AgentConfig {
  model: string;              // 'gpt-4o-mini' | 'gpt-4o' | 'gpt-4-turbo'
  temperature: number;        // 0.0 - 2.0
  maxTokens: number;          // max response tokens
  systemPrompt: string;       // system message
  userPromptTemplate: string; // template with {{variables}}
  dataQuery: {                // what data to fetch before running
    type: 'news' | 'events' | 'alerts' | 'all';
    limit: number;
    timeWindowMinutes: number;
  };
  actions: string[];          // allowed actions: 'update_news', 'delete_events', 'toggle_alerts', 'log_only'
  retryOnError: boolean;
  maxRetries: number;
}
```

### 7.4 Agent Runner (`server/agent-runner.ts`)

New file that:
- Loads agent config from DB
- Fetches relevant data based on `dataQuery`
- Constructs prompt from template + data
- Calls OpenAI with structured output (JSON mode)
- Parses response and executes allowed actions
- Logs everything to `agent_logs`
- Handles errors gracefully with retry logic

### 7.5 Agent Scheduler (`server/agent-scheduler.ts`)

New file that:
- On server start, loads all enabled agents with cron schedules
- Uses `node-cron` (or similar) to schedule execution
- On agent config change (via admin API), reschedules
- Provides `runAgentNow(agentId)` for manual triggers
- Provides `stopAgent(agentId)` to cancel current execution

---

## 8. Migration Plan for Health Page

### What moves:
- `/health` client route → removed from `App.tsx`
- `/api/system-health` → moved behind admin auth as `/api/__admin/health`
- `/api/health` → **kept as public** (lightweight "ok" check for uptime monitors like UptimeRobot)
- `client/src/pages/health.tsx` → refactored into `client/src/pages/admin/health-tab.tsx`

### What stays public:
- `GET /api/health` → `{ status: "ok", timestamp: "..." }` (minimal, no sensitive data)

---

## 9. File Changes Summary

### New Files (Server — Agent Alpha)

| File | Purpose |
|---|---|
| `server/admin-auth.ts` | `requireAdmin` middleware, login/logout/session handlers |
| `server/admin-routes.ts` | All `/api/__admin/*` route handlers |
| `server/admin-settings.ts` | Settings cache manager (load from DB, hot reload) |
| `server/geo-block.ts` | Country blocking middleware |
| `server/agent-runner.ts` | OpenClaw agent execution engine |
| `server/agent-scheduler.ts` | Cron-based agent scheduling |

### New Files (Client — Agent Beta)

| File | Purpose |
|---|---|
| `client/src/pages/admin/index.tsx` | Admin layout with sidebar + routing |
| `client/src/pages/admin/login.tsx` | Admin login page |
| `client/src/pages/admin/health-tab.tsx` | System health dashboard (moved from /health) |
| `client/src/pages/admin/settings-tab.tsx` | Rate limits, GA, country blocking, maintenance |
| `client/src/pages/admin/news-tab.tsx` | News database CRUD |
| `client/src/pages/admin/events-tab.tsx` | Events database browser |
| `client/src/pages/admin/data-sources-tab.tsx` | Data source control panel |
| `client/src/pages/admin/agents-tab.tsx` | Agent list + create/edit |
| `client/src/pages/admin/agent-detail.tsx` | Single agent config + logs |
| `client/src/components/admin/data-table.tsx` | Reusable paginated/sortable table |
| `client/src/components/admin/country-selector.tsx` | ISO country multi-select |
| `client/src/components/admin/json-editor.tsx` | JSON config editor |
| `client/src/components/admin/cron-helper.tsx` | Cron expression builder |
| `client/src/hooks/use-admin-auth.ts` | Auth state hook (check session, redirect) |
| `client/src/lib/admin-api.ts` | Admin API client (fetch with cookie) |

### Modified Files (Server — Agent Alpha)

| File | Change |
|---|---|
| `shared/schema.ts` | Add 5 new table definitions + Zod schemas + types |
| `db/schema.sql` | Add 5 new CREATE TABLE statements + indexes |
| `server/storage.ts` | Add admin CRUD methods to IStorage + DatabaseStorage |
| `server/routes.ts` | Remove `/api/system-health` (moved to admin), strip health data from `/api/health` |
| `server/index.ts` | Add cookie-parser, mount admin routes, add geo-block middleware, dynamic rate limiter |
| `server/static.ts` | Add GA4 script injection from settings cache |
| `server/data-fetcher.ts` | Export `triggerFetchNow(sourceName)` + `updateSourceConfig()` for admin control |

### Modified Files (Client — Agent Beta)

| File | Change |
|---|---|
| `client/src/App.tsx` | Add admin route (`/${ADMIN_PATH}/*`), remove `/health` route |
| `client/src/pages/health.tsx` | Delete (content moves to `admin/health-tab.tsx`) |

### New Dependencies

| Package | Purpose |
|---|---|
| `cookie-parser` + `@types/cookie-parser` | Parse admin session cookies |
| `node-cron` + `@types/node-cron` | Agent scheduling |

---

## 10. Implementation Phases

### Phase A: Foundation (Agent Alpha — Backend)

| # | Task | Files |
|---|---|---|
| A1 | Add 5 new tables to `shared/schema.ts` (Drizzle definitions + Zod + types) | `shared/schema.ts` |
| A2 | Add 5 new CREATE TABLE + indexes to `db/schema.sql` | `db/schema.sql` |
| A3 | Create `server/admin-settings.ts` — loadSettings(), getSettingsCached(), setSetting(), onSettingChange() | `server/admin-settings.ts` |
| A4 | Create `server/admin-auth.ts` — login, logout, session check, requireAdmin middleware | `server/admin-auth.ts` |
| A5 | Create `server/geo-block.ts` — country blocking middleware with CF-IPCountry header | `server/geo-block.ts` |
| A6 | Install `cookie-parser`, add to `server/index.ts` middleware stack, add geo-block middleware | `server/index.ts` |
| A7 | Create `server/admin-routes.ts` — all admin API endpoints (settings, health, countries, news CRUD, events CRUD, data sources) | `server/admin-routes.ts` |
| A8 | Update `server/routes.ts` — strip `/api/system-health` to admin only, simplify `/api/health` | `server/routes.ts` |
| A9 | Update `server/storage.ts` — add admin CRUD methods (paginated news/events, settings, sessions, countries, agents, agent logs) | `server/storage.ts` |
| A10 | Update `server/static.ts` — inject GA4 script from settings cache | `server/static.ts` |
| A11 | Update `server/index.ts` — replace hardcoded rate limiter with dynamic settings-based limiter | `server/index.ts` |
| A12 | Update `server/data-fetcher.ts` — export `triggerFetchNow()` + `updateSourceConfig()` | `server/data-fetcher.ts` |

### Phase B: Agent System (Agent Gamma — AI)

| # | Task | Files |
|---|---|---|
| B1 | Create `server/agent-runner.ts` — loadAgent, buildPrompt, callOpenAI, parseActions, executeActions, logResult | `server/agent-runner.ts` |
| B2 | Create `server/agent-scheduler.ts` — start/stop scheduler, cron integration, manual trigger | `server/agent-scheduler.ts` |
| B3 | Add agent routes to `server/admin-routes.ts` — CRUD + run/stop + logs | `server/admin-routes.ts` |
| B4 | Wire scheduler into `server/routes.ts` — start on app boot, stop on shutdown | `server/routes.ts` |

### Phase C: Admin UI — Foundation (Agent Beta — Frontend)

| # | Task | Files |
|---|---|---|
| C1 | Create `client/src/lib/admin-api.ts` — typed fetch wrapper for all admin endpoints | `client/src/lib/admin-api.ts` |
| C2 | Create `client/src/hooks/use-admin-auth.ts` — session state, login/logout, redirect | `client/src/hooks/use-admin-auth.ts` |
| C3 | Create `client/src/pages/admin/login.tsx` — dark themed login form | `client/src/pages/admin/login.tsx` |
| C4 | Create `client/src/pages/admin/index.tsx` — AdminLayout with sidebar nav + nested routes | `client/src/pages/admin/index.tsx` |
| C5 | Update `client/src/App.tsx` — add `/${ADMIN_PATH}/*` route, remove `/health` | `client/src/App.tsx` |
| C6 | Create `client/src/components/admin/data-table.tsx` — reusable paginated/sortable/filterable table | `client/src/components/admin/data-table.tsx` |

### Phase D: Admin UI — Tabs (Agent Beta — Frontend)

| # | Task | Files |
|---|---|---|
| D1 | Create `client/src/pages/admin/health-tab.tsx` — migrate from health.tsx, add auto-refresh | `client/src/pages/admin/health-tab.tsx` |
| D2 | Create `client/src/pages/admin/settings-tab.tsx` — rate limits, GA, country blocking, maintenance | `client/src/pages/admin/settings-tab.tsx` |
| D3 | Create `client/src/components/admin/country-selector.tsx` — ISO 3166-1 multi-select | `client/src/components/admin/country-selector.tsx` |
| D4 | Create `client/src/pages/admin/news-tab.tsx` — paginated news table + edit/delete | `client/src/pages/admin/news-tab.tsx` |
| D5 | Create `client/src/pages/admin/events-tab.tsx` — paginated events table + delete | `client/src/pages/admin/events-tab.tsx` |
| D6 | Create `client/src/pages/admin/data-sources-tab.tsx` — source cards with controls | `client/src/pages/admin/data-sources-tab.tsx` |
| D7 | Create `client/src/pages/admin/agents-tab.tsx` — agent list + create dialog | `client/src/pages/admin/agents-tab.tsx` |
| D8 | Create `client/src/pages/admin/agent-detail.tsx` — agent editor + logs table | `client/src/pages/admin/agent-detail.tsx` |
| D9 | Create `client/src/components/admin/json-editor.tsx` — JSON editor for agent config | `client/src/components/admin/json-editor.tsx` |
| D10 | Create `client/src/components/admin/cron-helper.tsx` — cron expression builder UI | `client/src/components/admin/cron-helper.tsx` |
| D11 | Delete `client/src/pages/health.tsx` | cleanup |

### Phase E: Infrastructure (Agent Delta)

| # | Task | Files |
|---|---|---|
| E1 | Install `cookie-parser` + `@types/cookie-parser` + `node-cron` + `@types/node-cron` | `package.json` |
| E2 | Run DB migration (execute new CREATE TABLE statements) | `db/schema.sql` |
| E3 | Seed default admin_settings values | migration script |
| E4 | Add `ADMIN_TOKEN` and `ADMIN_PATH` to `.env.example` and docs | `docs/` |
| E5 | Full TypeScript build validation (`tsc --noEmit`) | — |
| E6 | Git commit and push | — |

---

## 11. Task Execution Checklist

### Step 1: Agent Delta (Infrastructure)
> "Install cookie-parser, @types/cookie-parser, node-cron, @types/node-cron. Run the 5 new CREATE TABLE statements from SPEC-admin.md §3.1 against the database."

### Step 2: Agent Alpha (Backend — Phase A)
> "Implement Phase A (tasks A1–A12) from docs/SPEC-admin.md. Add the 5 new Drizzle table definitions to shared/schema.ts, create server/admin-settings.ts, server/admin-auth.ts, server/geo-block.ts, server/admin-routes.ts. Update server/index.ts, server/routes.ts, server/storage.ts, server/static.ts, server/data-fetcher.ts per the SPEC. Do NOT touch any client/ files."

### Step 3: Agent Gamma (AI — Phase B)
> "Implement Phase B (tasks B1–B4) from docs/SPEC-admin.md. Create server/agent-runner.ts and server/agent-scheduler.ts. Add agent CRUD + run/stop/logs routes to server/admin-routes.ts. Wire the scheduler start/stop into server/routes.ts. Do NOT touch any client/ files."

### Step 4: Agent Beta (Frontend — Phases C+D)
> "Implement Phases C and D (tasks C1–C6, D1–D11) from docs/SPEC-admin.md. Create all admin UI pages, components, hooks, and the admin API client. Update App.tsx to add the admin route and remove /health. Delete pages/health.tsx. Do NOT touch any server/ files."

### Step 5: Agent Delta (Verification)
> "Run `tsc --noEmit` to verify zero errors. Seed the default admin_settings rows. Update docs/architecture.md with the new admin panel section. Commit and push all changes."

---

## 12. Security Considerations

| Concern | Mitigation |
|---|---|
| Admin path discovery | Random hex path + not in sitemap/robots.txt + NOINDEX_PATHS |
| Brute-force token | Rate limit login endpoint (5 attempts/min), exponential backoff |
| Session hijacking | HttpOnly + Secure + SameSite=Strict cookie, 24h expiry |
| XSS in admin | CSP headers, React auto-escaping, no `dangerouslySetInnerHTML` |
| CSRF | SameSite cookie + verify Origin header on mutations |
| Agent prompt injection | Agents have whitelisted action set — cannot execute arbitrary code |
| Country blocking bypass | Only relies on CF-IPCountry (Cloudflare header) — accurate unless user uses VPN (acceptable) |
| Settings tampering | All settings mutations go through admin auth middleware |

---

## 13. Environment Variables (New)

| Variable | Required | Default | Description |
|---|---|---|---|
| `ADMIN_TOKEN` | Yes (to enable panel) | — | Secret token for admin authentication |
| `ADMIN_PATH` | No | `panel-272d672e974546a7` | URL path for admin panel SPA |
