# SPEC-MOBILE-V1: Mobile Experience Hardening

**Date**: 2026-03-01  
**Author**: Agent Omega (Lead Architect)  
**Priority**: HIGH — Mobile traffic is significant for a real-time alert dashboard  
**Prerequisite**: SPEC-BUGFIX-V1 Phase 1 (data layer fixes) should land first  

---

## Triage: What Already Exists vs. What's Missing

The tester's report describes a desktop-only site, but substantial mobile infrastructure **already ships**:

| Report Claim | Actual Status | Verdict |
|---|---|---|
| "No toggle for mobile-friendly layout" | `useIsMobile()` hook (768px breakpoint) triggers a completely separate layout in `dashboard.tsx` | **Already implemented** — tester may not have resized below 768px |
| "No hamburger menu" | Mobile layout uses bottom tab bar with 5 tabs (Map/Events/Intel/News/Media) | **Already implemented** |
| "Stats panel too wide for phone" | Stats are in a dedicated "Intel" tab on mobile, not overlapping map | **Already implemented** |
| "Content beneath the fold / long scroll" | Tab system isolates each section, no long-scroll on mobile | **Already implemented** |
| "No offline state" | `OfflineBanner` component shows "Offline — Cached data may be stale" | **Already implemented** |
| "No keyboard shortcuts" | `KeyboardShortcuts` component with keys 1-5 for mobile tabs | **Already implemented** |
| "Legend covers map on mobile" | Legend renders identically on all viewports — **real issue** | **Needs fix** |
| "Channel selector hard to use on mobile" | Dropdown is absolute-positioned small box — **real issue** | **Needs fix** |
| "Video streams: 2×2 grid on mobile" | `LiveMediaPanel` has no mobile-specific layout — **real issue** | **Needs fix** |
| "Header wraps awkwardly" | Header has narrow mode (`isNarrow < 1600px`) but not a mobile (<768) variant | **Needs fix** |
| "Pinch-to-zoom on map" | Leaflet supports touch natively, but `zoomControl={true}` adds button-only UI | **Partial — needs minor tweak** |
| "Push notifications" | No service worker — planned (todo #38) | **Backlog item, not this SPEC** |
| "Lazy-load videos" | All 4 iframes load immediately even in mobile Media tab | **Needs fix** |

**Summary**: 7 of 13 reported issues are already handled. 6 genuine gaps remain.

---

## Agent Boundary Rules

| Agent | Scope |
|---|---|
| **Beta** (Frontend) | All changes in this SPEC — purely client-side |

---

## 1. MAP LEGEND — Collapsible on Mobile

### Problem
The legend div at `war-map.tsx:193-217` renders a fixed box over the map. On mobile viewports (<768px), this consumes ~40% of the visible map area.

### Files
`client/src/components/war-map.tsx`

### Changes
- Accept an optional `isMobile` prop (passed from `dashboard.tsx`)
- On mobile: render legend as a **floating toggle button** ("⊕ Legend") in the top-left corner
  - On tap: expand a compact overlay with event types, dismiss on second tap or click-outside
  - Default: collapsed (hidden)
- On desktop: keep current always-visible legend (no change)
- Add smooth CSS transition for open/close

### Contract
```tsx
interface WarMapProps {
  events: WarEvent[];
  alerts: Alert[];
  isMobile?: boolean; // NEW — controls legend mode
}
```

---

## 2. LIVE MEDIA PANEL — Mobile Carousel

### Problem
`LiveMediaPanel` renders a 2×2 grid of iframes. On mobile, thumbnails are too small to see anything useful, and 4 simultaneous video streams kill battery and bandwidth.

### Files
`client/src/components/live-media-panel.tsx`

### Changes

#### 2a. Single-stream carousel on mobile
- Detect mobile via `useIsMobile()` hook
- On mobile: show **one stream at a time** with swipe or left/right arrow buttons
  - Display channel name + country as a pill above the player
  - Show dots indicator (● ○ ○ ○) for position
  - "Select Channels" opens a **bottom sheet** (Drawer from vaul) instead of dropdown

#### 2b. Lazy-load iframes
- On mobile: only render the `<iframe>` for the currently visible stream
- Other streams in the carousel are placeholder thumbnails until swiped to
- This reduces from 4 simultaneous iframe loads to 1
- On desktop: keep current behavior (all 4 visible)

#### 2c. Channel selector as bottom sheet on mobile
- Import `Drawer` from vaul (already a dependency)
- Replace the absolute dropdown with a full-height Drawer
- Each option gets a larger touch target (48px min height per Apple HIG)

---

## 3. HEADER BAR — Ultra-Compact Mobile Strip

### Problem
The header's "narrow" mode triggers at <1600px and splits into 2 rows. On mobile (<768px), even 2 rows is too much — each row wraps, pushing content down.

### Files
`client/src/components/header-bar.tsx`

### Changes
- Add a third layout tier: `isMobile` (from `useIsMobile()`)
- Mobile header: **single row, 40px height**:
  ```
  [Lion logo] WAR PANEL  [● LIVE]  [🔔] [🌐] [⋯]
  ```
  - Logo + title (shortened)
  - Connection status as a single colored dot (green/yellow/red)
  - Mute toggle icon
  - Language switcher (compact, just flag emoji or 2-letter code)
  - Overflow menu button (⋯) that opens a Drawer with: clocks, sentiment, presentation mode, health link
- This replaces the dual-row header on mobile
- Desktop/narrow behavior unchanged

---

## 4. MAP TOUCH GESTURES

### Problem
Leaflet's `MapContainer` supports touch by default, but the explicit `zoomControl={true}` adds desktop-style +/− buttons that overlap content on small screens.

### Files
`client/src/components/war-map.tsx`

### Changes
- Set `zoomControl={false}` on mobile — Leaflet's built-in pinch-to-zoom is sufficient
- Keep zoom control on desktop
- Touch interaction is already enabled by default in Leaflet; no additional config needed
- Verify `dragging`, `touchZoom`, `tap` are not explicitly disabled (they aren't — confirmed in codebase)
- Move the custom toolbar buttons (fit bounds, reset view) to bottom-right on mobile so they don't overlap the collapsed legend button

---

## 5. CHANNEL SELECTOR Z-INDEX & CLOSE BEHAVIOR

### Problem (applies to both desktop and mobile)
The channel dropdown uses `z-50` but map leaflet containers use `z-[1000]`. On larger screens the dropdown appears behind the map when the live-media panel is adjacent.

### Files
`client/src/components/live-media-panel.tsx`

### Changes
- Increase dropdown `z-index` to `z-[1100]`
- Add click-outside handler: `useEffect` with `mousedown`/`touchstart` listener
- On mobile: this is superseded by the Drawer (item 2c), so only applies to desktop
- Add `touchstart` alongside `mousedown` for touch devices that use the desktop layout (tablets)

---

## 6. PERFORMANCE — LAZY-LOAD VIDEOS & REDUCE MAP TILES

### Problem
Loading 4 video iframes + full-resolution map tiles on a cellular connection is heavy.

### Files
`client/src/components/live-media-panel.tsx`, `client/src/components/war-map.tsx`

### Changes

#### 6a. Iframe lazy-loading (partially covered in item 2b)
- On mobile: only render the active carousel slide's iframe
- On desktop: add `loading="lazy"` attribute to iframes (already present — confirmed)
- Add intersection observer to pause/destroy iframes in the collapsed media panel state

#### 6b. Map tile quality
- On mobile: switch the default tile layer to a lower-resolution provider or add `detectRetina: false` to TileLayer options
- Consider using `maxZoom={10}` on mobile instead of 12 to reduce tile requests at deep zooms
- These are minor optimizations — defer if negligible impact

---

## Implementation Priority

All items in this SPEC are **Agent Beta** scope.

### Priority A — Must Fix (2-3h total)
| # | Task | Est. |
|---|------|------|
| 1 | Collapsible map legend on mobile | 1h |
| 3 | Ultra-compact mobile header | 1.5h |
| 5 | Channel selector z-index + close-outside | 0.5h |

### Priority B — Should Fix (3-4h total)
| # | Task | Est. |
|---|------|------|
| 2 | Live media carousel + bottom sheet on mobile | 3h |
| 4 | Map zoom control hide + toolbar reposition | 0.5h |

### Priority C — Nice to Have (1h)
| # | Task | Est. |
|---|------|------|
| 6 | Lazy-loading improvements + tile optimization | 1h |

---

## Files Modified

All changes are **Beta (Frontend)** scope:

| File | Changes |
|------|---------|
| `client/src/components/war-map.tsx` | Add `isMobile` prop, collapsible legend, hide zoomControl on mobile, reposition toolbar |
| `client/src/components/live-media-panel.tsx` | Mobile carousel, bottom sheet selector, lazy iframe, z-index fix, close-outside handler |
| `client/src/components/header-bar.tsx` | Add mobile-specific single-row header with overflow Drawer |
| `client/src/pages/dashboard.tsx` | Pass `isMobile` to WarMap |

---

## Items Explicitly Not In Scope

| Item | Reason |
|------|--------|
| Push notifications / Service Worker | Backlog item #38+#90, requires Delta agent + backend work |
| Swipe gestures for tab switching | The tab bar already works well; swipe adds complexity for marginal gain |
| Cross-browser testing (Safari/Chrome/Firefox) | QA task, not a code change |
| PWA install prompt | Manifest already configured; install prompt is browser-native |

---

*End of SPEC-MOBILE-V1*
