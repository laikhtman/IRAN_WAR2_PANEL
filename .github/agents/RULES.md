# GLOBAL DEVELOPMENT RULES: WAR PANEL

## 1. Tech Stack & Environment
- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Shadcn UI, Leaflet (`react-leaflet`), React Query v5.
- **Backend:** Node.js, Express, WebSockets (`ws`).
- **Database:** PostgreSQL using standard `pg.Pool` (MAX 20 connections) and Drizzle ORM. **DO NOT USE NEON SERVERLESS.**
- **Infrastructure:** Self-hosted on Hetzner Ubuntu VPS. No Replit dependencies (`@replit/vite-plugin-*` have been removed).

## 2. Project Structure Strictness
- `client/src/`: ONLY Frontend React code. No direct DB access.
- `server/`: ONLY Backend Express/WebSocket code. No React components.
- `shared/schema.ts`: The SINGLE SOURCE OF TRUTH for Database tables (Drizzle) and Validation (Zod). 

## 3. Code Conventions
- **TypeScript:** Strict mode is ON. Do not use `any`. Use existing Zod schemas for types.
- **RTL Support:** Hebrew, Arabic, and Farsi are supported. ALWAYS use Tailwind logical properties (`ms-`, `me-`, `ps-`, `pe-`, `start-`, `end-`) instead of physical directions (`ml-`, `mr-`, `pl-`, `pr-`, `left-`, `right-`).
- **State Management:** Use React Query for server state. Use WebSockets ONLY for real-time appends to lists. Do not use Redux or Zustand.
- **Map Performance:** Leaflet MUST use `preferCanvas: true`. We render hundreds of tactical markers; SVG DOM nodes will crash mobile browsers.

## 4. Database Safety
- DO NOT alter existing columns in `war_events`, `news_items`, or `alerts` without explicit human permission. 
- ALWAYS use Zod validation before inserting into Drizzle.
