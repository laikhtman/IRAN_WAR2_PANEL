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

## Quick Start

```bash
npm install
npm run dev
```

The app runs on a single port with Vite dev server proxying API requests to Express.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string (auto-provisioned on Replit) |
| `SESSION_SECRET` | Yes | Express session secret |
| `PROXY_BASE_URL` | No | Israeli proxy server URL (e.g., `http://195.20.17.179:3128`) |
| `PROXY_AUTH_TOKEN` | No | Bearer token for proxy server authentication |
