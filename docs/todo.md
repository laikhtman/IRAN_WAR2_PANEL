# War Panel - Ideas & Tasks Backlog

A prioritized list of ideas to make the War Panel more powerful, viral, and useful.

**Complexity Levels**: 🟢 Low | 🟡 Medium | 🔴 High | ⚫ Very High
**Status**: ✅ Done | 🔧 Partially done | ❌ Cancelled | _(blank = not started)_
**Engagement Score**: 📊 1-10 — how much this feature drives daily active users, sharing, and return visits.

---

## Recently Completed (Feb 2026)

The following features have been implemented:

| Area | What was done |
|------|---------------|
| **Pikud HaOref API** | Real-time alerts via `fetchOrefAlerts()` with 38-city coordinate lookup, proxied through Tailscale VPN server |
| **Telegram/OSINT RSS** | RSS.app Premium API integration — all Telegram channels managed in RSS.app dashboard, server polls every 60 s + webhook endpoint for instant push |
| **AI Summarization** | GPT-4o-mini via OpenAI SDK, produces structured JSON summary every 120 s |
| **Audio Alerts** | Browser siren (Oref Impact.mp3) on `air_raid_alert` events, mute toggle in header |
| **Mobile Optimization** | `preferCanvas` on Leaflet, Vaul Drawer for sidebar panels, responsive layout |
| **Backend Resilience** | DB row pruning (war_events 500, news 500, alerts 200, summaries 50), `express-rate-limit` 100 req/IP/min |
| **Replit Removal** | All @replit packages and config files removed; project is fully self-hosted |
| **Database** | Switched from Neon serverless to standard `pg.Pool` (max 20 connections); full SQL schema in `db/schema.sql` |

---

## Real Data Integration

| # | Task | Complexity | Hours | 📊 | Notes |
|---|------|-----------|-------|---|-------|
| 1 | ✅ Connect to Pikud HaOref real-time alert API via Israeli proxy | 🟡 Medium | 6-10h | 10 | **DONE** — `fetchOrefAlerts()` polls every 5 s via Tailscale proxy, 38-city coord map |
| 2 | ✅ Integrate Red Alert Israel Telegram bot as secondary alert source | 🟢 Low | 0h | — | **DONE (via RSS.app)** — All Telegram channels already ingested through RSS.app. No direct Bot API needed |
| 3 | ✅ Add IDF Spokesperson Telegram channel for official military updates | 🟢 Low | 0h | — | **DONE (via RSS.app)** — Just add the channel in RSS.app dashboard. Pipeline already ingests it |
| 4 | Connect to Reuters/AP breaking news APIs for verified international coverage | 🟡 Medium | 6-10h | 7 | Paid API, straightforward REST integration; adds credibility layer |
| 5 | ❌ ~~Integrate OSINT Twitter/X accounts feed~~ | 🔴 High | — | — | **CANCELLED** — X API is prohibitively expensive ($100/mo+), heavily restricted, unstable. Not worth ROI |
| 6 | Pull satellite imagery from Sentinel Hub API for strike verification | 🔴 High | 20-30h | 8 | Complex API, image processing, geo-alignment on map. Huge "wow factor" |
| 7 | Connect to FlightRadar24 API to track military aviation activity | 🟡 Medium | 10-14h | 9 | Paid API — real-time aircraft on the map is extremely engaging |
| 8 | Integrate MarineTraffic API for naval movements in Red Sea / Eastern Mediterranean | 🟡 Medium | 10-14h | 7 | Paid API, vessel filtering, map layer. Niche but high value for analysts |
| 9 | Pull earthquake/seismology data (USGS API) to detect large explosions | 🟢 Low | 4-6h | 6 | Free public API, simple JSON, filter by region/magnitude. Clever UX differentiator |
| 10 | ❌ ~~Connect to Liveuamap API for crowdsourced conflict mapping~~ | 🟡 Medium | — | — | **CANCELLED** — No official public API; would require fragile scraping. Data overlaps with our own event feed |
| 11 | Integrate ACLED conflict event data for academic-grade analysis | 🟡 Medium | 8-12h | 5 | Free API with registration. Good for researchers but low real-time engagement |
| 12 | ✅ Add Kann News, Ynet, Walla RSS feeds for Hebrew breaking news | 🟢 Low | 0h | — | **DONE (via RSS.app)** — Just add to RSS.app dashboard; pipeline already ingests them |
| 13 | ✅ Add Al Jazeera and Al Arabiya RSS feeds for Arabic perspective | 🟢 Low | 0h | — | **DONE (via RSS.app)** — Just add to RSS.app dashboard; no code changes needed |
| 14 | Pull data from UN OCHA ReliefWeb API for humanitarian updates | 🟢 Low | 4-6h | 4 | Well-documented free API. Adds humanitarian angle |
| 15 | Connect to FIRMS (NASA Fire Information) satellite data for active fires | 🟡 Medium | 8-12h | 9 | Free API — fire dots on the map during strikes are extremely viral and visual |
| 16 | Integrate weather data (OpenWeatherMap) for operational conditions | 🟢 Low | 3-5h | 3 | Simple free API. Nice-to-have overlay, low engagement impact |
| 17 | Pull ADS-B Exchange data for aircraft transponders over conflict zones | 🟡 Medium | 12-16h | 8 | Real-time stream — combined with FlightRadar gives unmatched aviation layer |
| 18 | ❌ ~~Connect to Telegram channel monitoring for militia/group comms~~ | 🔴 High | — | — | **CANCELLED** — Requires Telegram *client* API (not bot), content moderation nightmare. RSS.app already covers Telegram channels |
| 19 | ❌ ~~Integrate Recorded Future / Flashpoint threat intel API~~ | 🟡 Medium | — | — | **CANCELLED** — $10K+/year enterprise pricing. Not viable for a public dashboard |
| 20 | ❌ ~~Build web scraper for Iranian state media (Fars News, IRNA)~~ | 🔴 High | — | — | **CANCELLED** — Anti-scraping measures, fragile. Add these as RSS.app feeds instead (Fars News has RSS) |

## AI & Analysis

| # | Task | Complexity | Hours | 📊 | Notes |
|---|------|-----------|-------|---|-------|
| 21 | ✅ Replace mock AI summary with real OpenAI API calls | 🟢 Low | 3-5h | 8 | **DONE** — GPT-4o-mini via OpenAI SDK, JSON response format, refreshes every 120 s |
| 22 | Add AI-powered event classification (auto-categorize incoming reports) | 🟡 Medium | 8-12h | 6 | Prompt engineering + classification pipeline. Better event sorting for users |
| 23 | ❌ ~~Build threat prediction ML model based on event patterns~~ | ⚫ Very High | — | — | **CANCELLED** — Requires massive historical dataset we don't have, months of ML work, dubious accuracy. Poor ROI |
| 24 | Add sentiment analysis on news feeds to gauge media tone shifts | 🟡 Medium | 10-14h | 6 | Use LLM API, aggregate scores. Interesting for media-watchers |
| 25 | Create an AI "what-if" scenario simulator | 🔴 High | 24-36h | 7 | Complex prompt engineering, scenario modeling. Very shareable on social media |
| 26 | Build automatic translation of event titles/descriptions using AI | 🟡 Medium | 8-12h | 8 | Batch translation, caching, 4 languages. Directly serves 4x the audience |
| 27 | Add AI-generated audio briefings (text-to-speech) | 🟡 Medium | 10-14h | 7 | TTS API, audio player UI. "Listen to your war briefing" — great for mobile/commute |
| 28 | ❌ ~~Create anomaly detection system for unusual event patterns~~ | 🔴 High | — | — | **CANCELLED** — Requires stable baseline data we don't have yet. Revisit after 6+ months of data collection |
| 29 | Add AI-powered source credibility scoring for unverified events | 🟡 Medium | 12-16h | 6 | Scoring model, UI indicators. Builds trust with audience |
| 30 | ❌ ~~Build timeline prediction showing probable next events~~ | 🔴 High | — | — | **CANCELLED** — Speculative predictions on military events are ethically risky and technically unreliable |
| 31 | Add natural language search across all events | 🟡 Medium | 10-16h | 8 | Embedding-based search or LLM parsing. High retention — users search for "their" city/event |
| 32 | Create AI-generated daily/weekly intelligence reports as PDF | 🟡 Medium | 12-18h | 7 | Shareable PDFs drive organic traffic back to the site |

## User Experience & Interface

| # | Task | Complexity | Hours | 📊 | Notes |
|---|------|-----------|-------|---|-------|
| 33 | ❌ ~~Add customizable drag-and-drop dashboard layout~~ | 🔴 High | — | — | **CANCELLED** — Massive complexity, requires user accounts. Default layout works. Revisit if user base justifies it |
| 34 | Build timeline/scrubber to replay events over past 24/48/72 hours | 🟡 Medium | 12-18h | 9 | Time-based query, playback controls. Extremely engaging — "watch the war unfold" |
| 35 | ❌ ~~Add split-screen mode to compare two time periods~~ | 🔴 High | — | — | **CANCELLED** — Niche analyst feature. Timeline scrubber (#34) covers 90% of this use case |
| 36 | Create full-screen "presentation mode" for briefing rooms | 🟢 Low | 4-6h | 6 | Fullscreen API, hide chrome. Great for newsrooms and military briefings |
| 37 | Add keyboard shortcuts for power users | 🟢 Low | 3-5h | 3 | Global key listener, help overlay. Low engagement for general audience |
| 38 | Build browser push notifications for critical alerts | 🟡 Medium | 8-12h | 10 | Service worker, Notification API. #1 retention driver — brings users BACK to the site |
| 39 | ✅ Add sound alerts (siren sounds) for critical-level events | 🟢 Low | 3-5h | 10 | **DONE** — Oref Impact.mp3 siren on `air_raid_alert` WS events, mute/unmute toggle |
| 40 | Create "focus mode" highlighting a single country/region | 🟡 Medium | 8-12h | 6 | Map zoom + filter. Useful for users who only care about one area |
| 41 | Add event clustering on the map for dense areas | 🟢 Low | 4-6h | 7 | Leaflet.markercluster — prevents visual chaos during mass events |
| 42 | Build a heatmap layer showing event density over time | 🟡 Medium | 8-12h | 8 | Leaflet.heat — visually stunning, very shareable screenshots |
| 43 | ❌ ~~Add 3D globe view option (Cesium or Three.js)~~ | ⚫ Very High | — | — | **CANCELLED** — 40-60h for a cosmetic feature. Leaflet 2D map is faster and more practical |
| 44 | Create picture-in-picture mode for live TV streams | 🟡 Medium | 6-10h | 7 | PiP API on video element. Users watch TV while browsing the map |
| 45 | ❌ ~~Add "compare countries" side-by-side statistics view~~ | 🟡 Medium | — | — | **CANCELLED** — This is a single-conflict dashboard, not a global comparison tool |
| 46 | Build distance/range calculator (missile range circles on map) | 🟡 Medium | 8-12h | 8 | Leaflet circle overlay + weapon presets. Viral — "Can Iran's missiles reach X?" |
| 47 | Add satellite imagery base layer toggle for the map | 🟢 Low | 2-4h | 7 | Mapbox/Esri satellite tiles. Quick win, makes map look professional |
| 48 | Create event detail modal with full context and related events | 🟡 Medium | 8-12h | 7 | Modal component, source links. Increases time-on-site per session |
| 49 | Add bookmarking system for saving important events | 🟡 Medium | 8-12h | 5 | LocalStorage, bookmark UI. Moderate retention for repeat visitors |
| 50 | ❌ ~~Build personal notes feature for analyst annotations~~ | 🟡 Medium | — | — | **CANCELLED** — Requires user accounts. Store notes locally if needed; not worth the DB complexity |

## Social & Viral Features

| # | Task | Complexity | Hours | 📊 | Notes |
|---|------|-----------|-------|---|-------|
| 51 | Add shareable event cards (image generation for social media) | 🟡 Medium | 10-16h | 10 | Canvas/SVG rendering, share buttons, Open Graph tags. #1 viral growth driver |
| 52 | Create public embed widget for other websites | 🟡 Medium | 12-18h | 9 | iframe embed — news sites embed our map, massive reach multiplier |
| 53 | Build "share this dashboard" with unique URL preserving view state | 🟡 Medium | 8-12h | 8 | URL query params for filters/view. "Look at this!" sharing |
| 54 | Add live visitor counter showing simultaneous watchers | 🟢 Low | 3-5h | 8 | WS connection count broadcast. Social proof — "12,847 watching now" |
| 55 | Create a Telegram bot that pushes alerts to subscribers | 🟡 Medium | 12-18h | 9 | Telegram Bot API — huge in Israel/MENA. Direct distribution channel |
| 56 | ❌ ~~Build a Discord bot integration~~ | 🟡 Medium | — | — | **CANCELLED** — Discord is not used by the target audience (Israeli/MENA). Telegram (#55) is far higher ROI |
| 57 | ❌ ~~Add WhatsApp alert subscription service~~ | 🔴 High | — | — | **CANCELLED** — WhatsApp Business API is expensive, requires Facebook approval, compliance burden. Telegram is sufficient |
| 58 | ❌ ~~Create Twitter/X bot that auto-posts critical events~~ | 🟡 Medium | — | — | **CANCELLED** — X API is $100/mo+, unreliable. Post manually or use free alternatives (Mastodon) |
| 59 | Build a public API for developers | 🟡 Medium | 12-18h | 6 | API key management, Swagger docs. Attracts developer community |
| 60 | Add user accounts with preferences, watchlists, subscriptions | 🔴 High | 24-36h | 7 | Auth system, settings UI. Foundation for premium features |
| 61 | ❌ ~~Create "situation room" for real-time multi-user collaboration~~ | ⚫ Very High | — | — | **CANCELLED** — Enormous scope (40-60h), requires user accounts, permissions, moderation. Build simpler features first |
| 62 | ❌ ~~Add comments/discussion threads on events~~ | 🟡 Medium | — | — | **CANCELLED** — Requires user accounts + moderation. Comment sections attract trolls. Use Telegram community instead |
| 63 | 🔧 Build mobile-optimized PWA with offline support | 🔴 High | 12-16h | 9 | **Partially done** — responsive Drawer, preferCanvas. Still needs SW + manifest |
| 64 | Create embeddable mini-widgets (alert ticker, stats counter) | 🟡 Medium | 10-16h | 8 | Micro-bundles for news sites to embed individual panels |
| 65 | Add QR codes on event cards for quick mobile sharing | 🟢 Low | 2-4h | 5 | QR code library. Minor but complements shareable cards (#51) |

## Data Visualization

| # | Task | Complexity | Hours | 📊 | Notes |
|---|------|-----------|-------|---|-------|
| 66 | Add interactive charts showing event trends over time | 🟡 Medium | 8-12h | 8 | Recharts time-series. Users love seeing "attacks this week vs last week" |
| 67 | ❌ ~~Build Sankey diagram showing attack origins to destinations~~ | 🔴 High | — | — | **CANCELLED** — D3 Sankey is complex and niche. Simple bar charts cover origin/destination data better |
| 68 | Create animated attack path visualization (missile/drone trajectories) | ⚫ Very High | 30-50h | 10 | Custom Leaflet animation. THE viral feature — animated missiles on a live map |
| 69 | ❌ ~~Add radar/polar chart for threat direction analysis~~ | 🟡 Medium | — | — | **CANCELLED** — Niche analyst feature. Heatmap (#42) and clustering (#41) provide better directional insight |
| 70 | Build calendar heatmap showing event intensity by day | 🟡 Medium | 8-12h | 7 | GitHub-style heatmap. Quick visual of escalation patterns |
| 71 | ❌ ~~Create network graph showing group/country/event relationships~~ | 🔴 High | — | — | **CANCELLED** — Requires entity extraction pipeline. Academic-grade tool, low general engagement |
| 72 | Add real-time big-number counter dashboard for TV broadcast | 🟢 Low | 4-6h | 8 | Large animated counters — "1,247 rockets today". Perfect for TV/streaming |
| 73 | ❌ ~~Build exportable auto-generated infographics~~ | 🔴 High | — | — | **CANCELLED** — Shareable event cards (#51) cover this better with less effort |
| 74 | Add a "war clock" showing duration since last major escalation | 🟢 Low | 2-4h | 7 | Timer component. Simple, emotional, shareable |
| 75 | Create defense system effectiveness comparison chart | 🟡 Medium | 10-14h | 8 | Iron Dome vs Arrow interception rates. Fascinating data, highly shareable |

## Operational Features

| # | Task | Complexity | Hours | 📊 | Notes |
|---|------|-----------|-------|---|-------|
| 76 | ❌ ~~Add multi-region support (Ukraine, South China Sea, etc.)~~ | ⚫ Very High | — | — | **CANCELLED** — Scope explosion. Stay focused on Iran/Israel conflict. Fork the repo for other regions later |
| 77 | Build historical archive with searchable event database | 🟡 Medium | 12-18h | 7 | Remove auto-prune, search/filter API, archive page. SEO gold |
| 78 | Create user-defined alert zones on the map with notifications | 🔴 High | 16-24h | 9 | Drawing tools + geofence. "Alert me when rockets hit within 50km of my home" |
| 79 | Add civilian shelter locations as map layer + distance indicators | 🟡 Medium | 10-16h | 9 | Life-saving feature. Massive engagement in Israel during escalations |
| 80 | ❌ ~~Build event verification workflow (community confirm/deny)~~ | 🔴 High | — | — | **CANCELLED** — Requires user accounts, voting, moderation. AI credibility scoring (#29) is simpler |
| 81 | ❌ ~~Add source reliability tracking over time~~ | 🔴 High | — | — | **CANCELLED** — Needs months of data. Revisit after AI credibility scoring (#29) is live |
| 82 | Create "quiet period" detector flagging unusual calm | 🟡 Medium | 8-12h | 6 | Baseline deviation detection. Interesting alert: "No events in 6h — unusual" |
| 83 | ❌ ~~Build multi-monitor mode~~ | 🔴 High | — | — | **CANCELLED** — Extremely niche. Fullscreen mode (#36) + browser window tiling covers this |
| 84 | Add CSV/JSON export for all data | 🟢 Low | 4-6h | 4 | Export buttons. Useful for researchers/journalists |
| 85 | Create RSS feed output for subscriber readers | 🟢 Low | 3-5h | 5 | RSS XML endpoint. Free distribution channel |
| 86 | Build email digest service (daily/weekly summaries) | 🟡 Medium | 12-18h | 7 | SendGrid/Resend + cron. Keeps users coming back weekly |
| 87 | Add dead man's switch alert for data interruption detection | 🟡 Medium | 6-10h | 3 | Internal monitoring. Important for reliability, no user-facing engagement |
| 88 | ❌ ~~Create changelog/audit trail showing data changes~~ | 🟡 Medium | — | — | **CANCELLED** — Internal dev tool, zero user engagement. Use git history instead |

## Technical Infrastructure

| # | Task | Complexity | Hours | 📊 | Notes |
|---|------|-----------|-------|---|-------|
| 89 | Add Redis caching layer for API responses | 🟡 Medium | 8-12h | 2 | Improves speed under load. Users feel it indirectly via faster pages |
| 90 | Implement CDN for static assets + service worker for offline | 🟡 Medium | 8-12h | 4 | CDN config + SW. Foundation for PWA (#63) |
| 91 | ❌ ~~Build load testing suite for 10,000+ concurrent users~~ | 🟡 Medium | — | — | **CANCELLED** — Premature optimization. Build this when traffic justifies it |
| 92 | ❌ ~~Add Prometheus metrics and Grafana dashboards~~ | 🟡 Medium | — | — | **CANCELLED** — Overkill for current scale. PM2 monitoring + simple health checks are sufficient |
| 93 | ✅ Implement rate limiting and DDoS protection | 🟢 Low | 4-6h | 2 | **DONE** — `express-rate-limit` 100 req/IP/min on `/api/*` routes |
| 94 | ❌ ~~Build redundant data fetcher on multiple servers~~ | 🔴 High | — | — | **CANCELLED** — Single Hetzner VPS is sufficient. Redundancy is premature at this stage |
| 95 | ❌ ~~Add database replication for read scaling~~ | 🔴 High | — | — | **CANCELLED** — pg.Pool with 20 connections handles current load. Revisit at 10K+ concurrent users |
| 96 | Implement event deduplication using fuzzy matching | 🟡 Medium | 10-16h | 5 | String similarity. Reduces duplicate noise in feeds — improves UX quality |
| 97 | ❌ ~~Build data pipeline normalizing events from multiple sources~~ | 🟡 Medium | — | — | **CANCELLED** — Current `data-fetcher.ts` + Zod validation already normalizes. Not worth a separate ETL |
| 98 | Add automated e2e tests verifying all data sources | 🟡 Medium | 10-14h | 2 | Playwright + CI. No user engagement, but prevents regressions |
| 99 | Create status page showing health of each data source | 🟡 Medium | 8-12h | 4 | Health endpoints + public page. Builds trust with power users |
| 100 | ❌ ~~Build configuration admin panel for sources~~ | 🔴 High | — | — | **CANCELLED** — RSS.app dashboard is already our feed config UI. Server env vars handle the rest |

## Monetization & Growth

| # | Task | Complexity | Hours | 📊 | Notes |
|---|------|-----------|-------|---|-------|
| 101 | Create free/premium tier with gated advanced features | 🔴 High | 24-36h | 6 | Stripe integration. Revenue path, but gates reduce casual engagement |
| 102 | ❌ ~~Build white-label version for defense companies~~ | ⚫ Very High | — | — | **CANCELLED** — 40-60h for multi-tenant theming. No customer demand yet. Build a great single product first |
| 103 | Add "sponsored by" section for defense industry advertisers | 🟢 Low | 4-6h | 3 | Ad placement component. Revenue with minimal effort |
| 104 | ❌ ~~Create API marketplace for paid data access~~ | 🔴 High | — | — | **CANCELLED** — Requires billing, metering, legal. Public API (#59) first, monetize later |
| 105 | Build partnership program with news outlet embeds | 🟡 Medium | 12-18h | 8 | Partner portal + analytics. News sites embed us = massive organic reach |
| 106 | Add breaking news notification service for journalists | 🟡 Medium | 10-16h | 7 | Priority alert queue. Journalists become power users and cite the site |
| 107 | Create educational content for SEO (missile defense explainers) | 🟡 Medium | 12-20h | 6 | Content pages + SEO. Drives long-tail Google traffic |
| 108 | ❌ ~~Build classroom/training mode for military academies~~ | 🔴 High | — | — | **CANCELLED** — Extremely niche, requires scenario builder, quiz system. No demand signal |
| 109 | Add "donate to shelters" widget for humanitarian organizations | 🟢 Low | 3-5h | 5 | Donation links. Positive PR, builds community goodwill |
| 110 | Create newsletter with weekly analysis driving traffic back | 🟡 Medium | 10-16h | 7 | Email service + content gen. Proven retention loop |

---

## Summary

| Status | Count |
|--------|-------|
| ✅ Done | 8 |
| 🔧 Partially done | 1 |
| ❌ Cancelled | 32 |
| **Remaining (active)** | **69** |

### Active Tasks by Engagement Score (Top 15)

| 📊 | # | Task | Complexity |
|---|---|------|-----------|
| 10 | 38 | Browser push notifications for critical alerts | 🟡 Medium |
| 10 | 51 | Shareable event cards for social media | 🟡 Medium |
| 10 | 68 | Animated attack path visualization (missile trajectories) | ⚫ Very High |
| 9 | 7 | FlightRadar24 military aviation tracking | 🟡 Medium |
| 9 | 15 | NASA FIRMS fire/explosion satellite data | 🟡 Medium |
| 9 | 34 | Timeline scrubber to replay events | 🟡 Medium |
| 9 | 52 | Public embed widget for news websites | 🟡 Medium |
| 9 | 55 | Telegram bot pushing alerts to subscribers | 🟡 Medium |
| 9 | 63 | PWA with offline support (finish) | 🔴 High |
| 9 | 78 | User-defined alert zones with notifications | 🔴 High |
| 9 | 79 | Civilian shelter locations on map | 🟡 Medium |
| 8 | 6 | Sentinel Hub satellite imagery for strike verification | 🔴 High |
| 8 | 17 | ADS-B Exchange aircraft transponder tracking | 🟡 Medium |
| 8 | 26 | AI auto-translation to 4 languages | 🟡 Medium |
| 8 | 31 | Natural language search across all events | 🟡 Medium |

### Active Tasks by Complexity

| Complexity | Active Count | Est. Hours |
|------------|-------------|------------|
| 🟢 Low | 13 | 42-68h |
| 🟡 Medium | 35 | 330-510h |
| 🔴 High | 5 | 88-138h |
| ⚫ Very High | 1 | 30-50h |
| **Total** | **54** | **490-766h** |

Estimated remaining effort: **490 to 766 developer hours** (roughly 3-5 months for a single developer, or 6-8 weeks for a team of 3).

> **Prioritization strategy**: Ship the 📊 10 and 📊 9 tasks first — they are the highest-impact features for user acquisition and retention. The 🟢 Low complexity items in that tier (push notifications, visitor counter, war clock) can be done in a single day each.
