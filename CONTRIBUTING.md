# Contributing to War Panel

Thank you for your interest in contributing! This guide will help you get started.

## Getting the Code

```bash
git clone https://github.com/laikhtman/IRAN_WAR2_PANEL.git
cd IRAN_WAR2_PANEL
npm install
```

## Development Setup

See [docs/getting-started.md](docs/getting-started.md) for detailed setup instructions.

Quick start:
```bash
cp .env.example .env
# Edit .env: set DATABASE_URL and OPENAI_API_KEY at minimum
npm run db:push
npm run dev
```

## Branch Naming

- `feature/description` — new features
- `fix/description` — bug fixes
- `docs/description` — documentation changes
- `chore/description` — build, config, dependency changes

## Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add NASA FIRMS thermal anomaly tracking
fix: correct timezone offset in header clocks
docs: update API reference with new endpoints
chore: upgrade React Query to v5.x
```

## Pull Request Process

1. Create a feature branch from `main`
2. Make your changes
3. Ensure the build passes: `npm run build`
4. Update documentation if your change affects:
   - API endpoints → `docs/api.md`
   - Database schema → `docs/database.md` and `shared/schema.ts`
   - UI components → `docs/frontend.md`
   - Environment variables → `docs/env-vars.md` and `.env.example`
   - Translation keys → all 4 locale files (`en.json`, `he.json`, `ar.json`, `fa.json`)
5. Submit a PR with a clear description

## Code Style

See [docs/code-conventions.md](docs/code-conventions.md) for complete coding standards. Key rules:

- TypeScript strict mode — no `any`
- Tailwind CSS with logical properties for RTL support (`ps-4` not `pl-4`)
- React Query v5 for all server state
- shadcn/ui for UI components
- All user-facing strings translated in 4 languages

## Project Structure

```
client/src/     — React frontend (Vite)
server/         — Express backend
shared/         — Shared types and schemas (Drizzle + Zod)
deploy/         — Deployment configs (systemd, Nginx)
docs/           — Documentation
proxy-server/   — Israeli IP proxy for geo-restricted APIs
```

## Agent-Based Development

For complex features, we use an AI agent workflow. See [.github/agents/WORKFLOW.md](.github/agents/WORKFLOW.md) for details.

## Questions?

Open an issue on GitHub or check the [documentation index](docs/README.md).
