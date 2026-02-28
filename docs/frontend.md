# Frontend Guide

## Component Reference

### Dashboard (`pages/dashboard.tsx`)

The main layout orchestrator. Fetches all data via React Query, manages the WebSocket connection, and distributes data to child components via props.

**Layout Structure**:
```
┌──────────────────────────────────────────────────────┐
│ HeaderBar (full width)                                │
├─────────────────────────────────┬────────────────────┤
│                                 │ StatsPanel         │
│ WarMap + EventFeed (overlay)    │ AISummaryPanel     │
│                                 │ AlertsPanel        │
│                                 │ NewsFeed           │
├─────────────────────────────────┤                    │
│ LiveMediaPanel                  │                    │
├─────────────────────────────────┤                    │
│ NewsTicker                      │                    │
└─────────────────────────────────┴────────────────────┘
```

- Left column: ~`flex-1` (takes remaining width)
- Right sidebar: 340px fixed width
- The EventFeed overlays the map as a translucent panel on the left side

### HeaderBar (`components/header-bar.tsx`)

Top bar showing:
- App title ("WAR PANEL")
- WebSocket connection status indicator (green dot = connected)
- Local time clock
- Israel time clock (Asia/Jerusalem timezone)
- Language switcher dropdown

All text is internationalized. Clocks update every second and use locale-aware formatting.

### WarMap (`components/war-map.tsx`)

Props: `events: WarEvent[]`, `alerts: Alert[]`

Interactive Leaflet map centered on the Middle East (lat 31, lng 44, zoom 5). Uses dark Stadia tiles.

- Events rendered as `CircleMarker` with colors by type:
  - Red: `missile_launch`, `missile_hit`, `explosion`
  - Green: `missile_intercept`, `drone_intercept`
  - Orange: `drone_launch`
  - Yellow: `air_raid_alert`, `sirens`
  - Blue: `military_operation`, `ceasefire`
- Active alerts rendered with pulsating red rings
- Click on markers shows a popup with event details
- Bottom-left legend showing event type colors

### StatsPanel (`components/stats-panel.tsx`)

Props: `stats: Statistics | null`

Displays defense statistics in a grid:
- Total missiles launched / intercepted / hits
- Interception rate (percentage)
- Active alerts count
- Drone statistics
- Breakdown by defense system (Iron Dome, Arrow-3, David's Sling, THAAD)
- Breakdown by country

Uses an internal `AnimatedCounter` component that "ticks up" numbers for visual effect.

### EventFeed (`components/event-feed.tsx`)

Props: `events: WarEvent[]`

Scrollable vertical list of recent events with:
- Icon per event type (Target, Shield, AlertTriangle, etc. from lucide-react)
- Event title and location
- Relative timestamp ("5 minutes ago")
- Threat level badge (color-coded)
- Country flag indicator

### AISummaryPanel (`components/ai-summary.tsx`)

Props: `summary: AISummary | null`

Displays the AI situation assessment:
- Threat level indicator with color coding (critical=red, high=orange, medium=yellow)
- Summary paragraph
- Bulleted key points
- Recommendation text
- Last updated timestamp

### AlertsPanel (`components/alerts-panel.tsx`)

Props: `alerts: Alert[]`

Shows Pikud HaOref alerts:
- Active alerts highlighted with pulsing red border
- Area name and threat description
- Timestamp
- Active/inactive badge

### NewsFeed (`components/news-feed.tsx`)

Props: `news: NewsItem[]`

Scrollable list of news articles:
- Source attribution
- Breaking news gets special styling (red border, "BREAKING" badge)
- Category badge
- Relative timestamp

### NewsTicker (`components/news-ticker.tsx`)

Props: `news: NewsItem[]`

Horizontal scrolling banner at the bottom of the map area. Filters for breaking news items and scrolls them continuously using CSS animation.

### LiveMediaPanel (`components/live-media-panel.tsx`)

Props: None (self-contained data)

Tabbed panel with two views:
- **TV Channels** (9 channels): Kan 11, Channel 12, Channel 13, Channel 14, i24NEWS English, Al Jazeera EN, Al Jazeera AR, Al Arabiya, Sky News Arabia
- **Live Cameras** (6 feeds): Jerusalem Western Wall, Tel Aviv Skyline, Haifa Port, Eilat Reef, Mecca, Dubai

Features:
- Collapsible (thin strip when collapsed)
- Click any card to open a modal with an embedded YouTube iframe
- Modal has ESC key support, accessible `role="dialog"`, and sandboxed iframe
- All text internationalized

### LanguageSwitcher (`components/language-switcher.tsx`)

Dropdown select for switching between EN, HE, AR, FA. Changes `i18next` language, which triggers RTL/LTR layout shift via `App.tsx`.

## State Management

- **Server state**: Managed entirely by TanStack React Query v5. No Redux or Zustand.
- **Query client**: Configured in `client/src/lib/queryClient.ts` with a default fetcher that calls the backend API.
- **Mutations**: Use `apiRequest()` from `queryClient.ts` for POST/PATCH/DELETE. Invalidate cache by query key after mutations.
- **WebSocket state**: Managed locally in `dashboard.tsx` via `useState` and `useRef`.

## Styling

### Theme

Dark military command center aesthetic defined in `client/src/index.css`:
- Background: Very dark gray/black
- Primary accent: Cyan (`#0ea5e9` / sky-500)
- Alert/threat: Red
- Success/interception: Green
- Fonts: JetBrains Mono, Fira Code (monospace)
- Grid overlay background effect via CSS
- Glow animations (`animate-pulse-glow`)

### Tailwind Configuration

Custom classes are configured in `tailwind.config.ts`. Color variables are defined as CSS custom properties in HSL format (space-separated, no `hsl()` wrapper):

```css
--primary: 199 89% 48%;
```

### Dark Mode

The app is permanently dark-themed. The entire UI is built with dark backgrounds and light text. There is no light mode toggle.

### RTL Support

When Hebrew, Arabic, or Persian is selected:
1. `App.tsx` sets `document.documentElement.dir = "rtl"` and `document.documentElement.lang` to the locale code
2. Tailwind's logical properties (`start-*`, `end-*`, `ms-*`, `me-*`) handle directional spacing
3. Flexbox `gap` and CSS Grid are direction-agnostic by default

## Adding a New Page

1. Create the page component in `client/src/pages/`
2. Add a route in `client/src/App.tsx` using wouter's `<Route>` component
3. If navigation is needed, use `Link` from wouter or the `useLocation` hook

## Test IDs

All interactive and meaningful display elements have `data-testid` attributes following the pattern:
- Interactive: `{action}-{target}` (e.g., `button-submit`, `media-tab-tv`)
- Display: `{type}-{content}` (e.g., `text-username`, `live-media-panel`)
- Dynamic: `{type}-{description}-{id}` (e.g., `media-card-kan11`)
