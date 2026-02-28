# AI Agent Development Workflow

The War Panel uses a structured AI agent workflow for implementing complex features. This prevents hallucination and code conflicts by giving each agent a strict domain.

## Overview

The workflow follows 5 steps with 5 specialized agent personas:

| Agent | Role | Domain | Files |
|-------|------|--------|-------|
| **Omega** | Lead Architect & Technical PM | Architecture, API contracts, task delegation | `docs/SPEC-*.md` |
| **Alpha** | Backend Engineer | Express routes, data fetchers, storage, DB | `server/`, `shared/` |
| **Beta** | Frontend Engineer | React components, pages, styling, i18n | `client/` |
| **Gamma** | AI/ML Engineer | OpenAI integration, prompts, classification | AI sections of `server/data-fetcher.ts` |
| **Delta** | DevOps Engineer | Deployment, Nginx, systemd, monitoring | `deploy/`, `docs/`, config files |

## Workflow Steps

### Step 1: Blueprint (Omega)
- State the feature goal to Omega
- Omega produces a `SPEC.md` with database schema, API routes, and UI components
- The SPEC includes exact task assignments per agent

### Step 2: Backend (Alpha + Gamma)
- Alpha implements backend changes per the SPEC
- Gamma handles AI/ML components (prompts, models, classification)
- Verify backend works (check logs, DB inserts) before touching UI

### Step 3: Frontend (Beta)
- Beta implements UI changes per the SPEC
- Backend must be complete before Beta starts

### Step 4: Infrastructure (Delta)
- Delta updates deployment configs if new env vars, ports, or dependencies were added

### Step 5: Commit & Verify
- Review all changes across `server/`, `client/`, and `shared/`
- Run `npm run build`
- Test locally, then deploy

## Agent Persona Files

Located in `.github/agents/`:
- `omega-lead.md` — Architect rules and delegation patterns
- `alpha-backend.md` — Backend coding rules
- `beta-frontend.md` — Frontend coding rules
- `gamma-ai.md` — AI/ML integration rules
- `delta-devops.md` — Infrastructure rules

## Global Rules

All agents follow the rules in `.github/agents/RULES.md`:
- TypeScript strict mode
- Drizzle ORM (never raw SQL)
- React Query v5 (no other state managers)
- Tailwind CSS with logical properties
- shadcn/ui components
- `preferCanvas: true` on Leaflet maps

## Example SPECs

- `docs/SPEC-batch-feb28.md` — Implementation spec for tasks #36, #37, #22, #24, #6, #8, #17
- `docs/SPEC-docs-delegation.md` — Documentation overhaul delegation plan
