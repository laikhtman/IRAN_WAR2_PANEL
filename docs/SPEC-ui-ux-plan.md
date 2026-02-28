# SPEC: UI/UX Improvement Plan

> **Author**: Agent Omega (Lead Architect)
> **Date**: 2026-02-28
> **Status**: PLAN — Ready for delegation

---

## Table of Contents

1. [Current State Audit](#1-current-state-audit)
2. [Desktop (1280px–1920px)](#2-desktop-improvements)
3. [Large TV / Command Center (1920px–4K+)](#3-large-tv--command-center-improvements)
4. [Mobile iOS (iPhone)](#4-mobile-ios-improvements)
5. [Mobile Android](#5-mobile-android-improvements)
6. [Cross-Platform Improvements](#6-cross-platform-improvements)
7. [Agent Delegation Checklist](#7-agent-delegation-checklist)

---

## 1. Current State Audit

### Layout Structure (Desktop)

```
┌─────────────────────────────────────────────────────────────────────┐
│ HeaderBar (h-10, 40px) — shield icon, WS status, live feed,       │
│   mute, presentation, sentiment, lang, health, clocks, date       │
├─────────────────────────────────────────────┬───────────┬──────────┤
│                                             │ StatsPanel│          │
│  WarMap (flex-1)                            │ (w-320px) │ R-sidebar│
│  - CircleMarkers + popups                   │           │ (w-340px)│
│  - Legend overlay (top-left)                │           │          │
│  - Events count (bottom-left)              │           │ EventFeed│
│                                             │           │ AI Sum.  │
│                                             │           │ Alerts   │
├─────────────────────────────────────────────┤           │ NewsFeed │
│ LiveMediaPanel (2×2 grid, 16:9 iframes)     │           │          │
├─────────────────────────────────────────────┤           │          │
│ NewsTicker (h-7, breaking scroll)           │           │          │
└─────────────────────────────────────────────┴───────────┴──────────┘
```

### Known Pain Points

| # | Issue | Severity | Affects |
|---|-------|----------|---------|
| 1 | **Header is cramped** — 40px height packs 12+ elements with 7-8px fonts | High | All |
| 2 | **Font sizes are microscopic** — heavy use of `text-[7px]`, `text-[8px]`, `text-[9px]` throughout all components | Critical | All |
| 3 | **No responsive breakpoints between mobile (768px) and desktop** — tablets get desktop layout | High | Tablet |
| 4 | **Fixed sidebar widths** (320px + 340px = 660px) leave barely 620px for map on 1280px screens | High | Desktop |
| 5 | **Mobile: only a floating FAB + Vaul Drawer** — no bottom nav, no quick-glance panels | High | Mobile |
| 6 | **No touch gesture support** — no swipe between panels, no pinch-to-zoom awareness on map | Medium | Mobile |
| 7 | **LiveMediaPanel hidden on mobile** — users can't watch streams on phone | High | Mobile |
| 8 | **NewsTicker scrolls at fixed 30s speed** — too fast/slow depending on content length | Medium | All |
| 9 | **No dark/light theme toggle** — dark-only (fine for command center, bad for outdoor mobile) | Medium | Mobile |
| 10 | **Map popup styling uses inline styles** — hard to theme/maintain | Low | All |
| 11 | **Header clocks use 3 separate divs** — wastes horizontal space | Medium | Desktop |
| 12 | **StatsPanel fixed 320px in middle sidebar** — eats map space on smaller screens | Medium | Desktop |
| 13 | **Presentation mode hides EVERYTHING except map** — should keep ticker + minimal overlay | Medium | Desktop/TV |
| 14 | **No "TV mode" optimized for wall-mounted displays** — needs auto-cycling, larger fonts | Critical | TV |
| 15 | **No safe-area-inset handling for iOS notch/dynamic island** | High | iOS |
| 16 | **No pull-to-refresh** | Medium | Mobile |
| 17 | **No haptic feedback on alerts** | Low | Mobile |
| 18 | **Keyboard shortcuts not discoverable** — no visible hint or help modal | Low | Desktop |
| 19 | **News feed and event feed share duplicate `useFormatTimeAgo` hook** | Low | Code |
| 20 | **No skeleton/loading states for map** | Medium | All |
| 21 | **Monospace font (JetBrains Mono) for everything** — fine for data, poor for body text | Medium | All |
| 22 | **No scroll snap or virtualization on long feed lists** | Medium | All |
| 23 | **RTL layout not fully tested** — some hardcoded `mr-`, `ml-` classes in components | Medium | RTL |
| 24 | **Color contrast issues** — 7px text at 55% lightness on 7% background fails WCAG | High | All |

---

## 2. Desktop Improvements

### 2.1 Layout Overhaul

**Goal**: Flexible, resizable layout that adapts to 1280px–1920px without wasting map space.

#### 2.1.1 Collapsible Sidebars
- [ ] **D-01**: Make the right sidebar (340px) collapsible via a toggle button (chevron icon on the border)
- [ ] **D-02**: Make the stats sidebar (320px) collapsible — when collapsed, show mini stat badges overlaid on the map
- [ ] **D-03**: When both sidebars collapsed → map fills full width with floating overlays
- [ ] **D-04**: Persist sidebar state in `localStorage` so it survives refresh

#### 2.1.2 Resizable Panels
- [ ] **D-05**: Add drag-to-resize handles between map and sidebars using `react-resizable-panels` (shadcn `<Resizable>` component already in the project)
- [ ] **D-06**: Set min-width constraints: map ≥ 400px, right sidebar 280–500px, stats sidebar 240–400px

#### 2.1.3 Responsive Sidebar Merge
- [ ] **D-07**: At 1280px–1440px: merge StatsPanel INTO the right sidebar as a collapsible accordion, eliminating the middle sidebar entirely
- [ ] **D-08**: Keep separate sidebars only when viewport ≥ 1440px

### 2.2 Header Bar Redesign

#### 2.2.1 Two-Row Header (Optional on Narrower Screens)
- [ ] **D-09**: When viewport < 1600px, split header into two rows:
  - **Row 1** (h-8): Title + WS status + live feed indicator + date
  - **Row 2** (h-8): Sentiment + clocks + mute + presentation + health + language
- [ ] **D-10**: When viewport ≥ 1600px, keep single-row compact header

#### 2.2.2 Increase Minimum Font Sizes
- [ ] **D-11**: Minimum font size on desktop: **11px** (currently 7-8px in many places)
- [ ] **D-12**: Header title: 13px (currently 11px), subtitle: 9px (currently 7px)
- [ ] **D-13**: All status badges: minimum 9px (currently 7-8px)

#### 2.2.3 Clock Consolidation
- [ ] **D-14**: Merge 3 clock columns into a single compact clock widget with a cycling display or a dropdown showing all timezones

### 2.3 Map Enhancements

- [ ] **D-15**: Add map control toolbar: zoom home, fit-to-events, satellite toggle, heatmap toggle
- [ ] **D-16**: Cluster markers at low zoom levels (use `react-leaflet-cluster`)
- [ ] **D-17**: Add animated pulse rings on new events (CSS animation on markers)
- [ ] **D-18**: Replace inline popup styles with themed CSS classes
- [ ] **D-19**: Add mini-map widget showing full region overview (Leaflet `MiniMap` plugin)
- [ ] **D-20**: Loading skeleton: dark rectangle with subtle shimmer animation while tiles load

### 2.4 Event Feed & News Feed

- [ ] **D-21**: Virtualize long lists using `@tanstack/react-virtual` for smooth scrolling of 500+ events
- [ ] **D-22**: Add event type filters (checkboxes at top of EventFeed): missile, drone, alert, naval, etc.
- [ ] **D-23**: Add search/filter bar to NewsFeed (filter by source, keyword, sentiment range)
- [ ] **D-24**: Click event in feed → fly-to on map + highlight the marker
- [ ] **D-25**: New events slide in from top with a subtle enter animation (framer-motion or CSS)
- [ ] **D-26**: Group events by time period (e.g., "Last hour", "Earlier today")

### 2.5 AI Summary Panel

- [ ] **D-27**: Expand/collapse toggle — when collapsed, show only threat badge + 1-line summary
- [ ] **D-28**: Add "Copy to clipboard" button for the full summary text
- [ ] **D-29**: Timestamp shows "Updated X min ago" with relative time like the feeds

### 2.6 Presentation Mode (Desktop)

- [ ] **D-30**: Keep NewsTicker visible in presentation mode (overlay at bottom)
- [ ] **D-31**: Show floating translucent stat badges on the map (top-right corner): missiles, intercepts, active alerts
- [ ] **D-32**: Auto-cycle: rotate between map, stats, AI summary on a timer (configurable interval)
- [ ] **D-33**: Add a "Presenter Controls" floating dock: next panel, pause cycle, exit

### 2.7 Keyboard Shortcuts

- [ ] **D-34**: Add `?` or `Ctrl+/` to open shortcuts help modal
- [ ] **D-35**: Add shortcuts: `1-4` to toggle sidebar panels, `S` to toggle stats sidebar
- [ ] **D-36**: Add `Ctrl+F` to focus the event/news search filter

---

## 3. Large TV / Command Center Improvements

### 3.1 TV Mode (`/tv` Route)

**Goal**: A dedicated route optimized for 55"–85" wall-mounted displays at 1080p–4K resolution, viewed from 2–5 meters away.

#### 3.1.1 Dedicated TV Layout
- [ ] **TV-01**: Create new route `/tv` with a `TvDashboard` page
- [ ] **TV-02**: Layout: full-bleed map background with floating translucent panels overlaid
- [ ] **TV-03**: No scroll, no sidebars, no interactive controls — everything auto-cycles
- [ ] **TV-04**: Add URL params: `/tv?cycle=30&panels=stats,alerts,media` for customization

#### 3.1.2 TV Typography
- [ ] **TV-05**: Base font size: **16px** minimum, headers **24px+**, stat numbers **48-72px**
- [ ] **TV-06**: Use sans-serif font (Inter / system-ui) for readability at distance — keep monospace only for numbers
- [ ] **TV-07**: Increase all icon sizes: minimum 24px (currently 12-14px)
- [ ] **TV-08**: All text must meet **WCAG AAA** contrast ratio (7:1) for distance viewing

#### 3.1.3 Auto-Cycling Panels
- [ ] **TV-09**: Overlay panel cycles every N seconds (configurable):
  1. **Stats View**: 4 large stat cards (missiles, intercepts, drones, alerts) with animated counters
  2. **AI Summary**: Full threat assessment with key points
  3. **Alert View**: Active alerts with map zoom
  4. **Media View**: Single selected live stream (large)
  5. **News Digest**: Last 5 headlines with sentiment indicators
- [ ] **TV-10**: Smooth cross-fade transitions between panels (300ms)
- [ ] **TV-11**: Panel cycle pauses when an active alert arrives → shows alert fullscreen with pulsing red border

#### 3.1.4 TV Map Behavior
- [ ] **TV-12**: Map auto-pans to latest event every 30 seconds
- [ ] **TV-13**: Map markers are 2× larger with thicker borders for visibility
- [ ] **TV-14**: Animated "focus ring" on the most recent event
- [ ] **TV-15**: Active alert zones get a large pulsing red overlay visible from across the room
- [ ] **TV-16**: Remove zoom controls (no mouse interaction expected)

#### 3.1.5 TV News Ticker
- [ ] **TV-17**: Permanent bottom ticker with 18px font, slower scroll (60s cycle)
- [ ] **TV-18**: Breaking news interrupts: ticker background flashes red, font grows to 22px
- [ ] **TV-19**: Source logos/icons instead of text source names

#### 3.1.6 TV Status Bar
- [ ] **TV-20**: Thin top bar showing: time/date (large), WS connection, data source health dots, sentiment trend
- [ ] **TV-21**: Connection loss: full-width red banner "CONNECTION LOST" with reconnection countdown
- [ ] **TV-22**: Last updated timestamp visible at all times

#### 3.1.7 TV Special Effects
- [ ] **TV-23**: Ambient glow behind active alert areas (CSS box-shadow halo)
- [ ] **TV-24**: Subtle radar sweep animation on the map when scanning for events
- [ ] **TV-25**: "LIVE" indicator with pulsing dot — large enough to see from 5m away
- [ ] **TV-26**: Night mode: automatically reduce brightness after 22:00 local time (dim overlay)

### 3.2 Multi-Monitor / Split-View Support

- [ ] **TV-27**: URL params to show ONLY specific panels: `/tv?view=map`, `/tv?view=stats`, `/tv?view=media`
- [ ] **TV-28**: Allow running multiple browser windows, each showing a different view, all sharing the same WS connection

---

## 4. Mobile iOS Improvements

### 4.1 Layout

#### 4.1.1 Safe Area Handling
- [ ] **iOS-01**: Add `env(safe-area-inset-top)` / `env(safe-area-inset-bottom)` padding for notch and home indicator
- [ ] **iOS-02**: Add `<meta name="viewport" content="..., viewport-fit=cover">` to `index.html`
- [ ] **iOS-03**: HeaderBar must sit below the status bar / Dynamic Island

#### 4.1.2 Bottom Tab Navigation
- [ ] **iOS-04**: Replace floating FAB + Drawer with a fixed bottom tab bar (5 tabs):
  1. 🗺️ **Map** (default)
  2. 📡 **Events** (event feed)
  3. 🧠 **Intel** (AI summary + alerts)
  4. 📰 **News** (news feed)
  5. 📺 **Media** (live stream viewer)
- [ ] **iOS-05**: Tab bar height: 56px + safe-area-inset-bottom
- [ ] **iOS-06**: Active tab indicator: cyan underline (matches `--primary`)
- [ ] **iOS-07**: Badge dot on Events tab when new WS events arrive while on another tab
- [ ] **iOS-08**: Badge count on Alerts tab showing active alert count

#### 4.1.3 Compact Header
- [ ] **iOS-09**: Mobile header (h-12, 48px):
  - Left: Shield icon + "WAR PANEL" title (12px)
  - Center: WS status dot + Israel time
  - Right: Mute toggle + overflow menu (⋯) for language, health, presentation
- [ ] **iOS-10**: Remove sentiment indicator, Tehran time, and date from mobile header — move to Intel tab

#### 4.1.4 Full-Screen Map Tab
- [ ] **iOS-11**: Map fills from header to tab bar edge-to-edge
- [ ] **iOS-12**: Map legend: collapsed by default, show as floating pill button "Legend ▾"
- [ ] **iOS-13**: Events count badge: bottom-left floating pill above tab bar
- [ ] **iOS-14**: Map markers: increase tap target to minimum 44×44pt (iOS HIG)

### 4.2 Events Tab

- [ ] **iOS-15**: Full-height scrollable list with pull-to-refresh
- [ ] **iOS-16**: Swipe-right on event → "Show on Map" (switches to Map tab and flies to location)
- [ ] **iOS-17**: Segment control at top: "All" | "Critical" | "Alerts" | "Naval/Air"
- [ ] **iOS-18**: Min font size: 14px for titles, 12px for metadata

### 4.3 Intel Tab

- [ ] **iOS-19**: Stacked cards layout:
  1. **Threat Assessment** card (top) — large badge + 1-line summary
  2. **Active Alerts** — collapsible list with count badge
  3. **Key Points** — bullet list
  4. **Recommendation** — highlighted card
  5. **Sentiment Trend** — mini chart or indicator
- [ ] **iOS-20**: Pull-to-refresh triggers `/api/ai-summary` refetch

### 4.4 News Tab

- [ ] **iOS-21**: Full-height news list with sentiment dot indicators
- [ ] **iOS-22**: Breaking news appears as a sticky card at the top
- [ ] **iOS-23**: Tap headline → expandable detail view (not a new page)
- [ ] **iOS-24**: Source filter chips (horizontally scrollable) at top

### 4.5 Media Tab

- [ ] **iOS-25**: Single stream viewer (full-width 16:9) with channel picker below
- [ ] **iOS-26**: Horizontal scroll of channel cards (thumbnail + name)
- [ ] **iOS-27**: PiP (Picture-in-Picture) support using `requestPictureInPicture()` API
- [ ] **iOS-28**: When PiP active, user can browse other tabs while watching

### 4.6 iOS-Specific Features

- [ ] **iOS-29**: PWA support: add `apple-mobile-web-app-capable` meta tags, launch screen images
- [ ] **iOS-30**: Haptic feedback on siren alert (via `navigator.vibrate()` fallback — iOS Safari doesn't support, so use visual flash)
- [ ] **iOS-31**: Status bar color matches header (`apple-mobile-web-app-status-bar-style: black-translucent`)
- [ ] **iOS-32**: Smooth momentum scrolling (`-webkit-overflow-scrolling: touch` / native)
- [ ] **iOS-33**: Prevent rubber-band bounce on main container (allow in scroll areas)

### 4.7 Touch Gestures

- [ ] **iOS-34**: Swipe left/right between tabs (complement to tab bar taps)
- [ ] **iOS-35**: Long-press on map marker → expanded detail tooltip
- [ ] **iOS-36**: Pinch-to-zoom on media streams (where iframe allows)

---

## 5. Mobile Android Improvements

> Android shares most improvements with iOS (§4). This section covers Android-specific differences.

### 5.1 Android-Specific Layout

- [ ] **AND-01**: Use Android system navigation insets (`navigation-bar-height`) for bottom padding
- [ ] **AND-02**: Support both gesture navigation (edge-to-edge) and 3-button navigation bar
- [ ] **AND-03**: Material Design-inspired bottom nav bar with ripple effect on tab tap

### 5.2 Android-Specific Features

- [ ] **AND-04**: `navigator.vibrate([200, 100, 200])` pattern for air_raid_alert events
- [ ] **AND-05**: Chrome custom tab theme-color: `<meta name="theme-color" content="#0a0e14">` (dark header)
- [ ] **AND-06**: Web App Manifest (`manifest.json`) with proper Android icons (192px, 512px), shortcuts, and screenshots for "Add to Home Screen"
- [ ] **AND-07**: Chrome "Install App" banner support via `beforeinstallprompt` event handler

### 5.3 Android Performance

- [ ] **AND-08**: Use `will-change: transform` on animated elements (ticker, map markers) for GPU compositing
- [ ] **AND-09**: Reduce map tile quality on slow connections (detect via `navigator.connection.effectiveType`)
- [ ] **AND-10**: Lazy-load media panel iframes — only create iframes when Media tab is active
- [ ] **AND-11**: Use `IntersectionObserver` for feed item visibility — pause off-screen animations

### 5.4 Android Back Button

- [ ] **AND-12**: Handle hardware back button: if in sub-view (expanded event, media modal) → close it. If on non-Map tab → go to Map. If on Map → confirm exit.
- [ ] **AND-13**: Use History API to make back navigation feel native

---

## 6. Cross-Platform Improvements

### 6.1 Typography System

- [ ] **X-01**: Define a proper type scale with CSS custom properties:
  ```
  --text-xs:   11px   (minimum allowed — currently 7px exists)
  --text-sm:   13px
  --text-base: 15px
  --text-lg:   18px
  --text-xl:   22px
  --text-2xl:  28px
  --text-3xl:  36px   (TV mode stat numbers)
  --text-4xl:  48px   (TV mode large counters)
  ```
- [ ] **X-02**: Body text font: system-ui / Inter (variable) for readability — keep JetBrains Mono for numbers/data/code only
- [ ] **X-03**: Load fonts via `@font-face` with `font-display: swap`

### 6.2 Color & Accessibility

- [ ] **X-04**: Audit all text colors against backgrounds for **WCAG AA** (4.5:1 for text, 3:1 for large text)
- [ ] **X-05**: Fix `text-muted-foreground` (HSL 215 12% 55% ≈ #7a8494) on `--background` (HSL 220 20% 7% ≈ #0f1318) — currently 4.2:1, needs bump to 60%+ lightness
- [ ] **X-06**: Add high-contrast mode toggle (boosts all muted colors by +15% lightness)
- [ ] **X-07**: Ensure all interactive elements have visible focus rings (for keyboard navigation)
- [ ] **X-08**: Add `aria-live="polite"` to event feed and alert panels for screen reader announcements
- [ ] **X-09**: Add `role="alert"` to active Oref alert items

### 6.3 Animation & Performance

- [ ] **X-10**: Respect `prefers-reduced-motion`: disable ticker scroll, pulse animations, radar sweep
- [ ] **X-11**: Add `loading="lazy"` to all iframe embeds
- [ ] **X-12**: Use CSS `contain: layout style paint` on sidebar panels for rendering isolation
- [ ] **X-13**: NewsTicker: dynamically calculate animation duration based on content width, not fixed 30s

### 6.4 Theming

- [ ] **X-14**: Add optional "High Visibility" theme: brighter borders, thicker text, larger markers
- [ ] **X-15**: Add "OLED Black" theme variant: true `#000000` background for AMOLED screens
- [ ] **X-16**: Persist theme preference in `localStorage`

### 6.5 Loading & Empty States

- [ ] **X-17**: Map: show shimmer skeleton while tiles load
- [ ] **X-18**: Each panel: proper loading skeleton (already exists for StatsPanel and AISummary — add for EventFeed, AlertsPanel, NewsFeed)
- [ ] **X-19**: Error boundaries per panel: if one panel crashes, it shows "Failed to load — Retry" without killing the whole dashboard
- [ ] **X-20**: Network offline banner: when `navigator.onLine` is false, show full-width amber "OFFLINE — Cached data may be stale"

### 6.6 Notifications

- [ ] **X-21**: Push notification support (via Service Worker) for critical alerts when tab is backgrounded
- [ ] **X-22**: Notification permission prompt — shown once after first alert arrives

### 6.7 Data Density Modes

- [ ] **X-23**: Three data density presets:
  - **Compact** (current): small fonts, tight spacing — for experienced operators
  - **Comfortable**: 1.5× spacing, 14px base — for general viewing
  - **TV**: 2× spacing, 18px base — for distance viewing
- [ ] **X-24**: Store preference in `localStorage`, expose via settings menu

### 6.8 RTL Fixes

- [ ] **X-25**: Audit all components for hardcoded `mr-`, `ml-`, `left-`, `right-` — replace with `ms-`, `me-`, `start-`, `end-`
- [ ] **X-26**: NewsTicker: reverse scroll direction when RTL is active
- [ ] **X-27**: Map legend: position flip to top-right in RTL
- [ ] **X-28**: Test all 4 languages (EN, HE, AR, FA) end-to-end on all form factors

---

## 7. Agent Delegation Checklist

### Phase 1: Foundation (Cross-Platform, do first)

| Task | Agent | Priority | Description |
|------|-------|----------|-------------|
| X-01, X-02, X-03 | **Beta** | 🔴 Critical | Typography system overhaul |
| X-04, X-05, X-06, X-07 | **Beta** | 🔴 Critical | Color accessibility audit + fixes |
| X-08, X-09 | **Beta** | 🟡 Important | ARIA roles for screen readers |
| X-10, X-11, X-12, X-13 | **Beta** | 🟡 Important | Performance & animation improvements |
| X-17, X-18, X-19, X-20 | **Beta** | 🟡 Important | Loading states & error boundaries |
| X-25, X-26, X-27, X-28 | **Beta** | 🟡 Important | RTL audit and fixes |
| D-11, D-12, D-13 | **Beta** | 🔴 Critical | Minimum font size enforcement |
| D-10, D-18 | **Beta** | 🟡 Important | Map popup theming |

### Phase 2: Desktop Layout

| Task | Agent | Priority | Description |
|------|-------|----------|-------------|
| D-01, D-02, D-03, D-04 | **Beta** | 🔴 Critical | Collapsible sidebars |
| D-05, D-06 | **Beta** | 🟡 Important | Resizable panels |
| D-07, D-08 | **Beta** | 🟡 Important | Responsive sidebar merge at 1440px |
| D-09, D-14 | **Beta** | 🟡 Important | Header two-row split + clock consolidation |
| D-15, D-16, D-17, D-19, D-20 | **Beta** | 🟡 Important | Map enhancements |
| D-21 | **Beta** | 🟡 Important | List virtualization |
| D-22, D-23 | **Beta** | 🟡 Important | Feed filters |
| D-24 | **Beta** | 🟡 Important | Click event → fly-to on map |
| D-25, D-26 | **Beta** | 🟢 Nice | Event animations + time grouping |
| D-27, D-28, D-29 | **Beta** | 🟢 Nice | AI summary UX polish |
| D-30, D-31, D-32, D-33 | **Beta** | 🟡 Important | Enhanced presentation mode |
| D-34, D-35, D-36 | **Beta** | 🟢 Nice | Keyboard shortcut help |

### Phase 3: TV Mode

| Task | Agent | Priority | Description |
|------|-------|----------|-------------|
| TV-01, TV-02, TV-03, TV-04 | **Beta** | 🔴 Critical | TV route + layout skeleton |
| TV-05, TV-06, TV-07, TV-08 | **Beta** | 🔴 Critical | TV typography + icons |
| TV-09, TV-10, TV-11 | **Beta** | 🔴 Critical | Auto-cycling panel system |
| TV-12, TV-13, TV-14, TV-15, TV-16 | **Beta** | 🟡 Important | TV map behavior |
| TV-17, TV-18, TV-19 | **Beta** | 🟡 Important | TV news ticker |
| TV-20, TV-21, TV-22 | **Beta** | 🟡 Important | TV status bar |
| TV-23, TV-24, TV-25, TV-26 | **Beta** | 🟢 Nice | TV visual effects |
| TV-27, TV-28 | **Beta** | 🟢 Nice | Multi-monitor support |
| — | **Alpha** | 🟡 Important | Add `/tv` route in `server/routes.ts` (if SPA routing needs server catch-all update) |

### Phase 4: Mobile (iOS + Android)

| Task | Agent | Priority | Description |
|------|-------|----------|-------------|
| iOS-01, iOS-02, iOS-03 | **Beta** | 🔴 Critical | Safe area handling |
| iOS-04, iOS-05, iOS-06, iOS-07, iOS-08 | **Beta** | 🔴 Critical | Bottom tab navigation |
| iOS-09, iOS-10 | **Beta** | 🔴 Critical | Compact mobile header |
| iOS-11, iOS-12, iOS-13, iOS-14 | **Beta** | 🟡 Important | Mobile map tab |
| iOS-15, iOS-16, iOS-17, iOS-18 | **Beta** | 🟡 Important | Mobile events tab |
| iOS-19, iOS-20 | **Beta** | 🟡 Important | Mobile intel tab |
| iOS-21, iOS-22, iOS-23, iOS-24 | **Beta** | 🟡 Important | Mobile news tab |
| iOS-25, iOS-26, iOS-27, iOS-28 | **Beta** | 🟡 Important | Mobile media tab + PiP |
| iOS-29, iOS-30, iOS-31, iOS-32, iOS-33 | **Beta** + **Delta** | 🟡 Important | PWA + iOS meta tags |
| iOS-34, iOS-35, iOS-36 | **Beta** | 🟢 Nice | Touch gestures |
| AND-01, AND-02, AND-03 | **Beta** | 🟡 Important | Android nav insets |
| AND-04, AND-05, AND-06, AND-07 | **Beta** + **Delta** | 🟡 Important | Android manifest + vibration |
| AND-08, AND-09, AND-10, AND-11 | **Beta** | 🟡 Important | Android performance |
| AND-12, AND-13 | **Beta** | 🟡 Important | Android back button |

### Phase 5: Polish

| Task | Agent | Priority | Description |
|------|-------|----------|-------------|
| X-14, X-15, X-16 | **Beta** | 🟢 Nice | Theme variants (high-vis, OLED) |
| X-21, X-22 | **Beta** + **Delta** | 🟢 Nice | Push notifications (Service Worker) |
| X-23, X-24 | **Beta** | 🟢 Nice | Data density modes |
| D-19 | **Beta** | 🟢 Nice | Mini-map plugin |

---

## Summary

| Form Factor | Total Tasks | Critical | Important | Nice |
|-------------|-------------|----------|-----------|------|
| Cross-Platform | 28 | 7 | 15 | 6 |
| Desktop | 36 | 6 | 22 | 8 |
| Large TV | 28 | 8 | 12 | 8 |
| Mobile iOS | 36 | 6 | 22 | 8 |
| Mobile Android | 13 | 0 | 11 | 2 |
| **Total** | **141** | **27** | **82** | **32** |

### Agent Workload

| Agent | Tasks | Domain |
|-------|-------|--------|
| **Beta** (Frontend) | ~135 | All UI/UX work — layout, components, styles, interactions |
| **Delta** (DevOps) | ~6 | PWA config, manifest.json, meta tags, service worker setup |
| **Alpha** (Backend) | ~1 | Server route catch-all for `/tv` (already handled by SPA, may need no changes) |
| **Gamma** (AI) | 0 | No AI changes needed for UI/UX improvements |

> **Recommendation**: Execute in **5 phases** as listed above. Phase 1 (Foundation) must complete first because typography and accessibility changes affect every subsequent phase. Phases 2–4 can be parallelized once Phase 1 is merged.

---

## Next Steps

1. **Human**: Review this plan, mark tasks as approved/deferred/rejected
2. **Omega**: After approval, produce per-phase SPEC files with exact component changes
3. **Agent execution**: Phase 1 → Phase 2+3+4 (parallel) → Phase 5
