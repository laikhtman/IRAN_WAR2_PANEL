# Frontend Guide

## Component Reference

### Dashboard (`pages/dashboard.tsx`)

The main layout orchestrator. Fetches all data via React Query, manages the WebSocket connection, and distributes data to child components via props.

**Layout Structure**:
```
┌──────────────────────────────────────────────────────────┐
│ HeaderBar (full width) — mute, presentation, health, i18n│
├─────────────────────────────────┬────────────────────────┤
│                                 │ StatsPanel             │
│ WarMap + EventFeed (overlay)    │ AISummaryPanel         │
│                                 │ AlertsPanel            │
│                                 │ NewsFeed               │
├─────────────────────────────────┤ (340px fixed sidebar)  │
│ LiveMediaPanel (2×2 grid)       │                        │
├─────────────────────────────────┤                        │
│ NewsTicker                      │                        │
└─────────────────────────────────┴────────────────────────┘

Presentation mode: only WarMap visible, everything else hidden.
Mobile (<768px): sidebar in Vaul Drawer, no LiveMediaPanel.
```

- Left column: ~`flex-1` (takes remaining width)
- Right sidebar: 340px fixed width
- The EventFeed overlays the map as a translucent panel on the left side

### HeaderBar (`components/header-bar.tsx`)

Props:
- `isMuted?: boolean` — audio alert mute state (default: `true`)
- `onToggleMute?: () => void` — callback to toggle mute
- `isPresentation?: boolean` — presentation/fullscreen mode state (default: `false`)
- `onTogglePresentation?: () => void` — callback to toggle presentation mode
- `sentimentData?: SentimentResponse` — current sentiment data for trend indicator
- `wsStatus?: "connected" | "disconnected"` — WebSocket connection state (default: `"disconnected"`)
- `isLiveFeed?: boolean` — whether live data is flowing

Top bar showing:
- App title ("WAR PANEL" / "INTEL HQ")
- Sentiment trend indicator (TrendingDown red / TrendingUp green / Minus neutral)
- WebSocket connection status (green dot = connected, red = disconnected)
- Local time clock
- Israel/Tehran time clocks (Asia/Jerusalem, Asia/Tehran timezones)
- Mute toggle button (Volume2 / VolumeX icons)
- Presentation mode toggle (Maximize2 / Minimize2 icons)
- Health page link (HeartPulse icon → `/health`)
- Language switcher dropdown

All text is internationalized. Clocks update every second.

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

Props: None (self-contained with internal state)

Unified media selector combining TV channels and live cameras into a single panel.

**Architecture**:
- `allSources = [...tvChannels, ...liveCameras]` — merged pool of 14 streams
- Single dropdown grouped by category:
  - **TV Channels** (blue header): Kan 11, Channel 12, Channel 13, Channel 14, i24NEWS English, Al Jazeera EN, Al Jazeera AR, Al Arabiya, Sky News Arabia
  - **Live Cameras** (purple header): Jerusalem Skyline, Tel Aviv, Haifa, Mecca, Dubai Marina
- Max **4 selections** shown in a **2×2 grid** (`grid-cols-2`)
- Default selection: `["kan11", "aljazeera", "cam-jerusalem", "cam-telaviv"]`

**Features**:
- Collapsible panel (thin strip when collapsed)
- Click any stream card to open a modal with the embedded video
- Modal has ESC key support, accessible `role="dialog"`, and sandboxed iframe
- Selection persists in component state (not localStorage)
- Disabled checkbox styling when 4 already selected

**Stream sources**:
- Israeli TV channels: embedded via livehdtv.com and YouTube
- International TV: YouTube live stream embeds
- Cameras: YouTube embed URLs (updated periodically as stream IDs change)

### LanguageSwitcher (`components/language-switcher.tsx`)

Dropdown select for switching between EN, HE, AR, FA. Changes `i18next` language, which triggers RTL/LTR layout shift via `App.tsx`.

### KeyboardShortcuts (`components/keyboard-shortcuts.tsx`)

Global keyboard shortcut handler. Renders no visible UI. Registered at the dashboard level.

| Key | Action |
|-----|--------|
| `F` or `F11` | Toggle fullscreen / presentation mode |
| `M` | Toggle audio mute |
| `Escape` | Exit presentation mode |

### Presentation Mode

Triggered by the Maximize2 button in HeaderBar or keyboard shortcut `F` / `F11`.

When active:
- Header bar is hidden
- Right sidebar is hidden
- Map expands to full viewport width and height
- LiveMediaPanel and NewsTicker are hidden
- Only the WarMap remains visible

State: `isPresentation` boolean in `dashboard.tsx`, toggled via `onTogglePresentation`.

### Audio Alerts

When a `new_event` WebSocket message arrives with `type === "air_raid_alert"`:
1. The browser plays `/Oref Impact.mp3` (Israeli Home Front Command siren)
2. Audio is muted by default (`isMuted` starts as `true`)
3. Mute toggle in HeaderBar: VolumeX (muted) / Volume2 (unmuted)
4. State managed in `dashboard.tsx` via `isMuted` / `setIsMuted`
5. Uses `useRef` to avoid stale closure issues in WebSocket handler

### Health Page (`pages/health.tsx`)

Route: `/health` (accessible via HeartPulse icon in HeaderBar)

System status dashboard with the following sections:

1. **Overview Cards**: Database status, API keys configured (X/12), data sources active (X/7), WebSocket clients connected
2. **Database**: Row counts per table (events, news, alerts, satellite images)
3. **Environment Variables**: Grid showing configured/missing status for each of 12 env vars
4. **Data Source Fetchers**: Per-source health stats — run count, error count, last run time, last error message, status badge (ok/error/not_configured)
5. **TV Channel Stream Probes**: Iframe-based availability check for 9 channels (6-second timeout)
6. **Camera Stream Probes**: Same iframe approach for 5 cameras

Auto-refreshes every 15 seconds via React Query (`refetchInterval: 15000`).

`StreamProbe` component: Creates a hidden iframe, waits 6 seconds. If no `error` event fires, reports "ok". Used for both TV and camera stream checks.

### Mobile Layout

On screens `< 768px` (`md` breakpoint):
- Right sidebar panels (StatsPanel, AISummaryPanel, AlertsPanel, NewsFeed) render inside a **Vaul Drawer** instead of a fixed right column
- The drawer can be swiped up from the bottom of the screen
- LiveMediaPanel is hidden on mobile
- Map takes full width

### Connection Status

WebSocket connection state is tracked in `dashboard.tsx`:
- `wsStatus` state: `"connected"` | `"disconnected"`
- Set to `"connected"` on WebSocket `open` event
- Set to `"disconnected"` on WebSocket `close` or `error` event
- Passed to `HeaderBar` as the `wsStatus` prop
- HeaderBar displays: green Radio icon = connected, red WifiOff icon = disconnected
- When disconnected, data continues flowing via REST polling (React Query `refetchInterval` on all queries)

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
