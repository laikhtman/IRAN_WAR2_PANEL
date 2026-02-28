# War Panel - Developer Documentation

A real-time intelligence dashboard for monitoring Middle East security events, styled as a dark military command center.

## Documentation Index

| Document | Description |
|----------|-------------|
| [Architecture Overview](./architecture.md) | System architecture, tech stack, and how all layers connect |
| [Database Schema](./database.md) | All tables, columns, types, and relationships |
| [API Reference](./api.md) | REST endpoints and WebSocket protocol |
| [Frontend Guide](./frontend.md) | Components, layout, state management, and styling |
| [Data Sources](./data-sources.md) | Where each piece of data comes from, what's real vs. mock |
| [Internationalization](./i18n.md) | i18n setup, adding languages, RTL support |
| [Proxy Server](./proxy-server.md) | Israeli proxy server setup and usage |
| [Extending the App](./extending.md) | How to add new data sources, components, and features |
| [Getting Started](./getting-started.md) | Local development setup guide |
| [Deployment Guide](./deployment.md) | Production deployment on Hetzner VPS |
| [Operational Runbooks](./runbooks.md) | Day-to-day operations, troubleshooting, backups |
| [Monitoring & Health](./monitoring.md) | System health page and external monitoring |
| [Environment Variables](./env-vars.md) | Complete env var reference with setup profiles |
| [WebSocket Protocol](./websocket.md) | Real-time communication protocol |
| [AI Pipeline](./ai-pipeline.md) | GPT-4o-mini integration details |
| [Security](./security.md) | Security measures and considerations |
| [Code Conventions](./code-conventions.md) | Coding standards for contributors |
| [Agent Workflow](./../.github/agents/WORKFLOW.md) | AI agent development process |

## Quick Start

```bash
npm install
npm run dev
```

The app runs on a single port with Vite dev server proxying API requests to Express.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `OPENAI_API_KEY` | Yes | OpenAI API key for GPT-4o-mini AI summarization |
| `PORT` | No | Server port (default: 5000) |
| `RSSAPP_API_KEY` | No | RSS.app Premium API key for Telegram/OSINT feeds |
| `RSSAPP_API_SECRET` | No | RSS.app Premium API secret |
| `PROXY_BASE_URL` | No | Tailscale VPN proxy URL for Oref alerts (e.g., `http://100.81.32.3:3080`) |
| `PROXY_AUTH_TOKEN` | No | Bearer token for proxy server authentication |
| `MARINETRAFFIC_API_KEY` | No | MarineTraffic vessel tracking API key |
| `ADSBX_API_KEY` | No | ADS-B Exchange aircraft tracking API key |
| `SENTINELHUB_INSTANCE_ID` | No | Sentinel Hub instance ID for satellite imagery |
| `SENTINELHUB_API_KEY` | No | Sentinel Hub legacy API key (PLAK...) |
| `SENTINELHUB_CLIENT_ID` | No | Sentinel Hub OAuth2 client ID |
| `SENTINELHUB_CLIENT_SECRET` | No | Sentinel Hub OAuth2 client secret |
