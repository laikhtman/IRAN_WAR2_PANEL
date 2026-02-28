# Code Conventions

Coding standards for the War Panel project. These rules apply to all contributors.

## TypeScript

- **Strict mode** enabled (`"strict": true` in `tsconfig.json`)
- Use `type` imports where possible: `import type { Foo } from "..."`
- No `any` — use `unknown` with type narrowing, or specific types
- Zod schemas validate all data at API boundaries (see `shared/schema.ts`)
- Prefer `const` over `let`; never use `var`

## React

- **React Query v5** for all server state — no Redux, Zustand, or other state managers
- Query keys match API paths: `["/api/events"]`, `["/api/news"]`
- `refetchInterval` for polling; WebSocket for real-time push
- No `useEffect` for data fetching — always use `useQuery`
- Avoid prop drilling — prefer composing components at the dashboard level

## Leaflet / Maps

- `preferCanvas: true` on all `MapContainer` instances (performance optimization)
- react-leaflet pinned to **v4.2.1** (v5 requires React 19)
- Dark Stadia tiles (`alidade_smooth_dark`)
- Do NOT modify `vite.config.ts` Leaflet chunk configuration

## CSS / Styling

- **Tailwind CSS utility classes only** — no custom CSS files except `index.css` for globals
- Use **logical properties** for RTL support:
  - `ps-4` not `pl-4` (padding-start, not padding-left)
  - `ms-2` not `ml-2` (margin-start)
  - `start-0` not `left-0`
  - `end-0` not `right-0`
- **shadcn/ui** for all base components — do not install alternative UI libraries (no MUI, Chakra, Ant)
- Color variables in HSL format (space-separated, no `hsl()` wrapper):
  ```css
  --primary: 199 89% 48%;
  ```

## File Organization

| Path | Purpose |
|------|---------|
| `client/src/components/` | React UI components |
| `client/src/components/ui/` | shadcn/ui primitives (auto-generated, rarely edited) |
| `client/src/pages/` | Page-level components (one per route) |
| `client/src/hooks/` | Custom React hooks |
| `client/src/lib/` | Utility functions, configs (i18n, queryClient) |
| `client/src/locales/` | i18n JSON files (en, he, ar, fa) |
| `server/` | Express backend |
| `shared/schema.ts` | Drizzle tables + Zod schemas + TypeScript types |

## Database

- **Drizzle ORM** for all queries — never raw SQL in application code
- Schema changes: edit `shared/schema.ts` → run `npm run db:push`
- Always add Zod insert schemas alongside table definitions
- Use `createInsertSchema()` from `drizzle-zod`

## Internationalization

- All user-facing strings must be translated in all 4 locales (EN, HE, AR, FA)
- Use `useTranslation()` hook: `const { t } = useTranslation()`
- Key format: `section.key` (e.g., `stats.title`, `events.types.missile_launch`)
- Database content (event titles, news headlines) stays in English — only UI labels are translated

## Test IDs

All interactive elements need `data-testid` attributes:
- Buttons: `data-testid="button-{action}"`
- Inputs: `data-testid="input-{name}"`
- Display: `data-testid="text-{name}"`
- Dynamic: `data-testid="{type}-{name}-{id}"`

## Commit Messages

Follow conventional commits:
- `feat:` — new feature
- `fix:` — bug fix
- `docs:` — documentation only
- `chore:` — build, deps, config
- `refactor:` — code restructure without behavior change

## Performance

- Database auto-prunes at configured limits (500 events, 500 news, 200 alerts, 50 summaries)
- React Query polling intervals are tuned for freshness vs server load balance
- WebSocket broadcasts to all clients via `ws` library (efficient binary frames)
- Leaflet uses canvas renderer for better performance with many markers
