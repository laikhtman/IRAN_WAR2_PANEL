# Documentation Tasks — War Panel

A comprehensive checklist of documentation work needed to bring the project to a professional, production-grade standard. Covers developer onboarding, DevOps deployment, troubleshooting, and ongoing maintenance.

**Priority**: 🔴 Critical | 🟡 Important | 🟢 Nice-to-have
**Status**: ✅ Done | 🔧 In progress | _(blank = not started)_

---

## 1. Fix Outdated Existing Docs

These docs exist but contain stale or incorrect information.

| # | File | Task | Priority | Notes |
|---|------|------|----------|-------|
| 1.1 | `docs/README.md` | Update env vars table from 7 → 14 variables (sync with `.env.example`) | 🔴 | Missing `MARINETRAFFIC_API_KEY`, `ADSBX_API_KEY`, `SENTINELHUB_*` vars |
| 1.2 | `docs/README.md` | Add link to `/health` page, deploy scripts, `SPEC-batch-feb28.md`, and agent workflow docs | 🟡 | Currently not referenced |
| 1.3 | `docs/architecture.md` | Replace "Neon serverless" with standard `pg.Pool` throughout | 🔴 | Database was migrated |
| 1.4 | `docs/architecture.md` | Update system diagram — remove "simulated" label, add real Oref/RSS.app/OpenAI integrations | 🔴 | ASCII diagram is misleading |
| 1.5 | `docs/architecture.md` | Update file structure tree — add `health.tsx`, `keyboard-shortcuts.tsx`, `deploy/` dir, `.github/agents/`, `.env.example` | 🟡 | Multiple new files missing |
| 1.6 | `docs/architecture.md` | Document deployment infrastructure: Hetzner VPS, systemd, Nginx, Tailscale VPN proxy | 🔴 | Currently undocumented |
| 1.7 | `docs/architecture.md` | Add `express-rate-limit`, audio alerts, mobile optimization to architecture overview | 🟡 | |
| 1.8 | `docs/api.md` | Document rate limiting (100 req/IP/min) and error response format | 🔴 | Not mentioned at all |
| 1.9 | `docs/api.md` | Expand `/api/system-health` docs — document full `SystemHealth` response shape (DB status, env vars, data source health, WS clients) | 🟡 | Only shows minimal health JSON |
| 1.10 | `docs/api.md` | Add any new endpoints from SPEC implementation (Sentinel Hub, MarineTraffic, ADS-B) | 🟡 | If they exist |
| 1.11 | `docs/database.md` | Add `aiClassified` column on `war_events` if added per SPEC #22 | 🟡 | |
| 1.12 | `docs/database.md` | Add index documentation (currently only in `db/README.md`, not in `docs/database.md`) | 🟡 | Duplicated info gap |
| 1.13 | `docs/database.md` | Sync row pruning limits with actual values (`war_events` 500, `news_items` 500, `alerts` 200, `ai_summaries` 50) | 🟡 | Incomplete |
| 1.14 | `docs/data-sources.md` | Update **all** source statuses — Oref alerts, RSS.app, OpenAI AI summaries are now **REAL**, not MOCK | 🔴 | Major inaccuracy |
| 1.15 | `docs/data-sources.md` | Update TV channel embed URLs (Israeli channels now use `livehdtv.com`, not YouTube) | 🟡 | |
| 1.16 | `docs/data-sources.md` | Update live camera URLs (Jerusalem, Tel Aviv, Haifa, Mecca, Dubai) to current YouTube embeds | 🟡 | |
| 1.17 | `docs/data-sources.md` | Add RSS.app integration details: API key usage, webhook endpoint, feed management in RSS.app dashboard | 🔴 | Undocumented |
| 1.18 | `docs/data-sources.md` | Document Sentinel Hub, MarineTraffic, ADS-B data source configs (even if not yet active) | 🟡 | |
| 1.19 | `docs/frontend.md` | Add `KeyboardShortcuts` component, presentation/fullscreen mode, audio mute toggle, Vaul Drawer | 🟡 | Multiple missing features |
| 1.20 | `docs/frontend.md` | Document `HeaderBar` new props: `isMuted`, `onToggleMute`, `isPresentation`, `onTogglePresentation` | 🟡 | |
| 1.21 | `docs/frontend.md` | Document `/health` page and unified media selector (merged TV + cameras, max 4, 2×2 grid) | 🟡 | |
| 1.22 | `docs/frontend.md` | Document connection status hook and real-time WS reconnection logic | 🟡 | |
| 1.23 | `docs/proxy-server.md` | Update status — proxy IS active for Oref alerts, routed through Tailscale VPN | 🔴 | Says "not currently active" |
| 1.24 | `docs/proxy-server.md` | Update proxy IP to Tailscale address `100.81.32.3:3080` | 🔴 | Shows old IP |
| 1.25 | `docs/proxy-server.md` | Document Tailscale VPN setup steps | 🟡 | |
| 1.26 | `docs/i18n.md` | Add `media.channels.*` and `media.cameras.*` translation keys | 🟢 | |
| 1.27 | `docs/i18n.md` | Document fallback behavior when keys are missing | 🟢 | |
| 1.28 | `docs/extending.md` | Add guidance on adding background jobs / cron tasks | 🟡 | |
| 1.29 | `docs/extending.md` | Review "Files You Should NOT Edit" — `drizzle.config.ts` and `package.json` may need editing | 🟢 | |

---

## 2. New Docs — Developer Onboarding

New documentation files needed so any developer can contribute within hours of cloning.

| # | File to Create | Task | Priority | Notes |
|---|----------------|------|----------|-------|
| 2.1 | `CONTRIBUTING.md` | Write contributor guide: branching strategy, commit message convention, PR template, code style rules, linting, testing expectations | 🔴 | **Does not exist** |
| 2.2 | `docs/getting-started.md` | Write step-by-step local development setup: prerequisites, clone, `npm install`, DB setup, `.env.example` → `.env`, `npm run dev`, verify at `localhost:5000` | 🔴 | Currently scattered across README and db/README |
| 2.3 | `docs/getting-started.md` | Include "minimal" setup (just DB + OpenAI key) vs "full" setup (all integrations) | 🟡 | Lower barrier to entry |
| 2.4 | `docs/project-structure.md` | Create a file-by-file walkthrough of the codebase: what each directory and key file does, dependencies between them | 🟡 | `architecture.md` has a tree but no explanations |
| 2.5 | `docs/testing.md` | Document testing strategy: what to test, framework choice (Vitest + Playwright recommended), how to run tests | 🟡 | No `test` script exists yet |
| 2.6 | `docs/code-conventions.md` | Consolidate coding standards: TypeScript strict mode, Zod validation at boundaries, React Query patterns, logical properties for RTL, `preferCanvas` on Leaflet | 🟡 | Currently only in `.github/agents/RULES.md` |
| 2.7 | `docs/env-vars.md` | Comprehensive environment variable reference: each var, what it does, required vs optional, where to get API keys, example values | 🔴 | `.env.example` has inline comments but no deep reference |

---

## 3. New Docs — DevOps & Deployment

Documentation for the person deploying, monitoring, and maintaining the production system.

| # | File to Create | Task | Priority | Notes |
|---|----------------|------|----------|-------|
| 3.1 | `docs/deployment.md` | Write full deployment guide: Hetzner VPS setup, Node.js install, PostgreSQL install, systemd service, Nginx reverse proxy, SSL/TLS (Let's Encrypt), firewall rules | 🔴 | Deploy scripts exist in `deploy/` but no human-readable guide |
| 3.2 | `docs/deployment.md` | Document `deploy/scripts/setup-server.sh` and `setup-production.sh` — what they do, prerequisites, expected output | 🔴 | |
| 3.3 | `docs/deployment.md` | Document `deploy/production/iran-panel-production.service` (systemd) and `intelhq.io.conf` (Nginx) | 🟡 | |
| 3.4 | `docs/deployment.md` | Include staging vs production environment differences | 🟡 | `deploy/staging/` exists |
| 3.5 | `docs/deployment.md` | Document Tailscale VPN setup for the proxy server (required for Oref alert API from outside Israel) | 🔴 | Critical for alerts to work |
| 3.6 | `docs/runbooks.md` | **Service management**: restart, stop, view logs (`journalctl -u iran-panel-production`), check status | 🔴 | |
| 3.7 | `docs/runbooks.md` | **Database operations**: backup (`pg_dump`), restore (`pg_restore`), connect to psql, run migrations, purge stale data (`purge.sql`) | 🔴 | `purge.sql` exists at root but undocumented |
| 3.8 | `docs/runbooks.md` | **API key rotation**: where each key is used, how to rotate without downtime, restart sequence | 🟡 | |
| 3.9 | `docs/runbooks.md` | **Stream URL updates**: how to update TV channel / camera embed URLs (which files, which arrays, test procedure) | 🟡 | Currently requires code knowledge |
| 3.10 | `docs/runbooks.md` | **SSL certificate renewal**: Let's Encrypt certbot renewal, Nginx reload | 🟡 | |
| 3.11 | `docs/runbooks.md` | **Handling outages**: diagnosis flowchart — check systemd → check Nginx → check DB → check `/api/system-health` → check proxy → check API keys | 🔴 | |
| 3.12 | `docs/runbooks.md` | **Scaling**: when to increase `pg.Pool` max connections, Node.js memory limits, Nginx worker tuning | 🟢 | |
| 3.13 | `docs/monitoring.md` | Document the `/health` page: what each section shows, how to interpret status indicators | 🟡 | Health page exists but is undocumented |
| 3.14 | `docs/monitoring.md` | Document the `/api/system-health` JSON endpoint for external monitoring tools (UptimeRobot, Grafana, etc.) | 🟡 | |
| 3.15 | `docs/monitoring.md` | Suggest alerting setup: which health checks to monitor, recommended thresholds, notification channels | 🟢 | |
| 3.16 | `docs/backup-strategy.md` | PostgreSQL automated backup plan: cron schedule, retention policy, offsite storage, restore testing | 🟡 | No backup documented anywhere |

---

## 4. New Docs — System Reference

Detailed technical reference for the system internals.

| # | File to Create | Task | Priority | Notes |
|---|----------------|------|----------|-------|
| 4.1 | `CHANGELOG.md` | Create changelog with all features implemented to date, organized by date or version | 🟡 | Only "Recently Completed" in `docs/todo.md` exists |
| 4.2 | `docs/websocket.md` | Document WebSocket protocol: connection URL, message types (`event`, `alert`, `news`, `summary`, `stats`), reconnection strategy, heartbeat | 🔴 | Critical for any frontend developer |
| 4.3 | `docs/data-fetcher-internals.md` | Document the background data fetcher system: `DataSourceConfig` interface, `sourceHealthMap`, `recordSourceRun()`, polling intervals, error handling, retry logic | 🟡 | Complex system with no doc |
| 4.4 | `docs/security.md` | Document security measures: rate limiting, CORS policy, env var handling, proxy auth token, no default credentials, input validation via Zod | 🟡 | |
| 4.5 | `docs/security.md` | Document what data is stored (PII considerations), data retention via pruning, public vs private endpoints | 🟡 | |
| 4.6 | `docs/agent-workflow.md` | Document the AI agent development workflow: what each persona does (Omega/Alpha/Beta/Gamma/Delta), how to write a SPEC, how to invoke agents | 🟢 | `.github/agents/WORKFLOW.md` exists but not linked from main docs |

---

## 5. Housekeeping & Cleanup

Loose ends and meta-documentation tasks.

| # | Task | Priority | Notes |
|---|------|----------|-------|
| 5.1 | Remove or document `intelhq_nginx.txt` at repo root (appears to be a duplicate/draft Nginx config) | 🟢 | |
| 5.2 | Document `purge.sql` at repo root — what it does, when to use it | 🟡 | |
| 5.3 | Link `SPEC-batch-feb28.md` from `docs/README.md` index | 🟢 | Currently orphaned |
| 5.4 | Link agent workflow docs from `docs/README.md` index | 🟢 | |
| 5.5 | Add `test`, `lint`, `format` npm scripts to `package.json` and document them | 🟡 | No quality tooling |
| 5.6 | Add `deploy` npm script or document the deploy workflow | 🟡 | |
| 5.7 | Create `.github/PULL_REQUEST_TEMPLATE.md` with checklist (tests, docs updated, i18n keys added) | 🟢 | |
| 5.8 | Create `.github/ISSUE_TEMPLATE/` with bug report and feature request templates | 🟢 | |

---

## Priority Summary

| Priority | Count | Description |
|----------|-------|-------------|
| 🔴 Critical | 17 | Blocks developer onboarding or production operations |
| 🟡 Important | 26 | Significant quality gap, should be done before opening to contributors |
| 🟢 Nice-to-have | 10 | Polish items that improve DX but aren't blocking |
| **Total** | **53** | |

### Recommended Order of Execution

1. **Phase 1 — Unblock Production** (🔴 Critical)
   - `docs/deployment.md` (3.1–3.5) — DevOps can't deploy without this
   - `docs/runbooks.md` (3.6–3.11) — DevOps can't operate without this
   - Fix `docs/proxy-server.md` (1.23–1.24) — says proxy is inactive (wrong)
   - Fix `docs/data-sources.md` (1.14, 1.17) — says everything is MOCK (wrong)
   - Fix `docs/architecture.md` (1.3, 1.4, 1.6) — Neon references are wrong

2. **Phase 2 — Unblock Developers** (🔴 + 🟡)
   - `docs/getting-started.md` (2.1–2.3)
   - `CONTRIBUTING.md` (2.1)
   - `docs/env-vars.md` (2.7)
   - `docs/websocket.md` (4.2)
   - Fix `docs/api.md` (1.8–1.9) — rate limiting, error format
   - Fix `docs/README.md` (1.1–1.2) — env vars table, links

3. **Phase 3 — Complete Coverage** (🟡)
   - All remaining `docs/frontend.md` updates (1.19–1.22)
   - `docs/monitoring.md` (3.13–3.15)
   - `docs/data-fetcher-internals.md` (4.3)
   - `docs/security.md` (4.4–4.5)
   - `CHANGELOG.md` (4.1)
   - Remaining database/i18n/extending doc fixes

4. **Phase 4 — Polish** (🟢)
   - GitHub templates, agent workflow docs, housekeeping
