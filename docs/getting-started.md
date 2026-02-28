# Getting Started

Step-by-step guide to set up the War Panel for local development.

## Prerequisites

- **Node.js 20+** (LTS recommended)
- **PostgreSQL 15+** (local install or Docker)
- **npm 9+** (comes with Node.js)
- **Git**

## Setup

### 1. Clone the Repository

```bash
git clone https://github.com/laikhtman/IRAN_WAR2_PANEL.git
cd IRAN_WAR2_PANEL
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and set at minimum:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/war_panel
OPENAI_API_KEY=sk-your-openai-api-key
```

See [env-vars.md](./env-vars.md) for the complete variable reference.

### 4. Create the Database

**Option A: Local PostgreSQL**
```bash
createdb war_panel
```

**Option B: Docker**
```bash
docker run -d --name war-panel-db \
  -e POSTGRES_DB=war_panel \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 \
  postgres:15
```

### 5. Push Schema

```bash
npm run db:push
```

This creates all tables defined in `shared/schema.ts`.

### 6. Start Development Server

```bash
npm run dev
```

Open http://localhost:5000 in your browser.

## Setup Profiles

| Profile | Env Vars Needed | What Works |
|---------|----------------|------------|
| **Minimal** | `DATABASE_URL`, `OPENAI_API_KEY` | AI summaries, sentiment analysis, computed statistics |
| **+ Real Alerts** | + `PROXY_BASE_URL`, `PROXY_AUTH_TOKEN` | Above + real-time Pikud HaOref alerts |
| **+ News Feeds** | + `RSSAPP_API_KEY`, `RSSAPP_API_SECRET` | Above + Telegram/OSINT news via RSS.app |
| **Full** | All 13 variables | Above + marine traffic, aircraft tracking, satellite imagery |

With just the minimal setup, the dashboard will show AI-generated summaries but no real-time events or news until additional integrations are configured.

## Available Scripts

| Script | Command | Description |
|--------|---------|-------------|
| Development | `npm run dev` | Starts Vite dev server + Express on port 5000 |
| Build | `npm run build` | Builds frontend (Vite) + backend (esbuild) for production |
| Production | `npm start` | Runs the built application (`node dist/index.cjs`) |
| Type Check | `npm run check` | TypeScript type checking |
| DB Push | `npm run db:push` | Pushes schema changes to PostgreSQL |

## Verify Setup

1. **Dashboard loads**: http://localhost:5000 shows the dark command center UI
2. **Health check**: http://localhost:5000/health shows system status
3. **API works**: http://localhost:5000/api/health returns `{ "status": "ok" }`
4. **WebSocket connects**: Green dot in the header bar indicates WS connection

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `ECONNREFUSED` on startup | PostgreSQL not running. Start it: `pg_ctl start` or `docker start war-panel-db` |
| `relation "war_events" does not exist` | Schema not pushed. Run `npm run db:push` |
| No data appearing | Check `/health` page — verify env vars are configured and data sources show "ok" |
| WebSocket disconnected (red dot) | Normal during initial load. Check console for proxy errors if it persists |
| Build fails with type errors | Run `npm run check` to see all TypeScript errors |
