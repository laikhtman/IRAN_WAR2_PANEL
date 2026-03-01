# SPEC-bugfix-v2.md — War Panel Post-Update Bug Fixes

**Date**: 2026-03-01  
**Reporter**: QA / production testing on intelhq.io  
**Severity**: CRITICAL (map regression), HIGH (content visibility), MEDIUM (video, WS flicker)

---

## Executive Summary

After Phase 3 (SPEC-bugfix-v1) merged, five issues were observed in production:
1. Map displays blank white — tiles fail to render
2. Live video streams remain broken (YouTube embed errors)
3. AI analysis, alerts, and news feed invisible on desktop
4. Status bar shows "0 events tracked" (no seed data)
5. Connection indicator flickers when feedback modal opens

---

## Root-Cause Analysis

### 1. Blank Map Tiles — CRITICAL

**Symptom**: Solid white rectangle where the map should be.

**Root cause**: Leaflet `MapContainer` uses `className="w-full h-full"` which relies on the parent having an explicit computed height. In the nested flex layout (`h-screen` → `flex-1` → `flex-1` → `flex-1` → `relative`), the intermediate containers use `min-h-0` but the innermost map wrapper `<div className="flex-1 min-w-0 relative">` does **not** pass down a concrete height to Leaflet. Leaflet calls `getComputedStyle()` on mount and if the container returns `0` or `auto` height, tiles never render.

**Secondary**: No `map.invalidateSize()` is called after the flex layout settles, so even if height eventually resolves, Leaflet's internal size cache is stale.

**Fix** (two-part):
1. Add explicit `h-full` to the map wrapper div in `dashboard.tsx` so Leaflet's parent has a resolved height.
2. Add a delayed `invalidateSize()` call in the `MapUpdater` component (fires after layout is painted).

**Files**: `client/src/pages/dashboard.tsx`, `client/src/components/war-map.tsx`

---

### 2. Video Streams Broken — MEDIUM

**Symptom**: Kan 11 shows "Video unavailable"; Al Jazeera / skyline feeds show "Error 153 – Video player configuration error."

**Root cause**: YouTube deprecated the `live_stream?channel=CHANNEL_ID` embed format. It now only works sporadically. The `youtube-nocookie.com` domain adds additional restrictions. Error 153 indicates the player configuration is invalid for the requested content.

**Fix**:
1. Replace all `live_stream?channel=` URLs with YouTube's current live embed format: `https://www.youtube.com/embed/live_stream?channel=CHANNEL_ID` → `https://www.youtube.com/embed?listType=playlist&list=CHANNEL_ID` or hardcoded current live video IDs.
2. For channels that consistently fail, add a fallback to an **oEmbed lookup** or a direct website link with a "Watch on YouTube" button instead of a broken iframe.
3. Add `origin=${window.location.origin}` parameter to embed URLs to resolve Error 153.
4. Ensure the `StreamIframe` timeout-based error detection (currently 15s) shows the retry UI quickly and gracefully.

**Files**: `client/src/components/live-media-panel.tsx`

---

### 3. Missing Lower-Page Sections (AI, Alerts, News) — HIGH

**Symptom**: On desktop, the page ends below live media panels. No AI analysis, alerts, or news visible. Only "Feedback" button remains at bottom.

**Root cause**: These sections live in the **right sidebar** (`width: 340px`). Two issues compound:
- The `rightCollapsed` state defaults to `readBool("war-panel-right-collapsed", false)`, but if a user or tester previously collapsed it, it stays collapsed with `width: 0` and `overflow-hidden`.
- The 6×6px collapse toggle button (`CollapseBtn`) is `absolute top-1/2 -translate-y-1/2 -right-3`, which sits at the very edge of the center column. It's nearly invisible — small, no label, blends into border.

**Fix**:
1. Make the collapse button larger and more discoverable (icon + tooltip, 8×8 minimum, slight background).
2. Add a visual affordance when sidebar is collapsed — a thin vertical strip with an icon/label like "◀ Intel Panel" so users know content is hidden.
3. On first visit (no localStorage key set), ensure sidebar is **open** by default — this is already the case (`false` fallback) but add a one-time localStorage reset if the key was set during testing.
4. Consider adding the content sections below the media panel as well (scrollable), not only in the sidebar, to match user expectations from the previous layout.

**Files**: `client/src/pages/dashboard.tsx`

---

### 4. "0 Events Tracked" / Empty Statistics — LOW

**Symptom**: Header shows "Connected — Awaiting Data", "0 events tracked", no populated map pins or stats.

**Root cause**: `server/routes.ts` line: `// No seed data — production uses only live data from fetchers`. The data fetchers (`server/data-fetcher.ts`) depend on external APIs (RSS.app, GDELT, ACLED, etc.) and many are configured with placeholder API keys or rate-limited. Until real data flows in, everything reads empty.

**Fix**:
1. Add a **demo/seed mode** activated by env var `ENABLE_SEED_DATA=true` that inserts representative sample events, alerts, and news on startup (call `server/seed.ts`).
2. Show a prominent "No live data yet — fetchers are initializing" banner instead of a blank dashboard when all API responses are empty.
3. The "Awaiting Data" status label (`header.connectedAwaiting`) should only show when WS is connected but zero events exist — this is already correct.

**Files**: `server/routes.ts`, `server/seed.ts`, `client/src/pages/dashboard.tsx` (optional banner)

---

### 5. Connection Status Flicker on Feedback Modal — MEDIUM

**Symptom**: Opening the feedback dialog briefly toggles status from "Connected" → "Offline" → "Connected."

**Root cause**: The Radix Dialog component traps focus and may trigger a micro-task that unmounts/remounts the `HeaderBar` (or an ancestor context provider) causing the `useConnectionStatus` hook's cleanup to fire. The cleanup closes the WebSocket (`wsRef.current.close()`), setting status to `"disconnected"`. The subsequent mount re-runs the effect, reconnecting. This produces a visible flicker.

**Fix**:
1. Move the WebSocket connection management **out** of the component tree into a stable singleton (module-level or React context at the app root), so Dialog-induced re-renders cannot trigger WS disconnection.
2. Alternatively, add a `300ms` debounce on the status display in `HeaderBar` so sub-second disconnects don't flash on screen.
3. Ensure `FeedbackDialog` does not cause a parent re-mount by wrapping it in `React.memo` or moving it outside the flex container.

**Files**: `client/src/hooks/use-connection-status.ts`, `client/src/components/header-bar.tsx`, `client/src/components/feedback-dialog.tsx`

---

## Task Breakdown

### Phase 1 — CRITICAL (ship immediately)

| ID | Task | Agent | Est. |
|----|------|-------|------|
| 1.1 | Add `h-full` to map wrapper div in dashboard.tsx (desktop + mobile) | Beta | 10m |
| 1.2 | Add `invalidateSize()` with `requestAnimationFrame` in `MapUpdater` component | Beta | 10m |
| 1.3 | Enlarge sidebar collapse button → 10×32px pill with icon + "Intel" label; add collapsed-state vertical strip | Beta | 30m |
| 1.4 | Ensure sidebar opens by default on fresh visit — clear any leftover localStorage in dev | Beta | 5m |

### Phase 2 — HIGH (follow-up)

| ID | Task | Agent | Est. |
|----|------|-------|------|
| 2.1 | Replace deprecated `live_stream?channel=` YouTube embeds with working format + `origin` param. Verify each channel has a valid live stream ID | Beta | 45m |
| 2.2 | Add "Watch on YouTube" fallback link inside `StreamIframe` error state | Beta | 15m |
| 2.3 | Move WebSocket to a stable singleton (module-scope or Context at `<App>` root) so Dialog re-renders can't kill the connection | Beta | 30m |
| 2.4 | Add 500ms debounce on status indicator display to prevent sub-second flickers | Beta | 10m |
| 2.5 | Add `ENABLE_SEED_DATA` env-var gated seed on startup in `routes.ts` to call `seed.ts` | Alpha | 20m |
| 2.6 | Add "No live data" informational banner when all endpoints return empty arrays | Beta | 15m |

---

## API Contract Changes

**None.** All fixes are frontend rendering / embed URL / hook stability changes. No new API routes or schema modifications required.

---

## Database Changes

**None.**

---

## Agent Delegation Checklist

### Invoke **Agent Beta** (Frontend) — Phase 1

> **Prompt**: "Implement Phase 1 of `docs/SPEC-bugfix-v2.md` — 4 tasks:
>
> 1. In `client/src/pages/dashboard.tsx`, find the desktop map wrapper `<div className="flex-1 min-w-0 relative">` (around the `<WarMap>` component) and add `h-full` to its className. Do the same for the mobile map wrapper if it exists.
>
> 2. In `client/src/components/war-map.tsx`, inside the `MapUpdater` component, after setting the initial view, add a `requestAnimationFrame(() => { map.invalidateSize(); })` call so Leaflet re-measures its container after the flex layout paints. Also add a resize observer or a `setTimeout(() => map.invalidateSize(), 100)` as a safety net.
>
> 3. In `client/src/pages/dashboard.tsx`, replace the desktop `CollapseBtn` for the right sidebar with a more visible collapsed state: when `rightCollapsed` is true, render a vertical strip (e.g., 32px wide, full-height, with a rotated 'Intel Panel' label + ChevronLeft icon) instead of a tiny 6×6 circle. Make the expand button at least 10×32px.
>
> 4. Verify `rightCollapsed` defaults to `false` (sidebar open). It already does — just confirm no code overrides it.
>
> Run `npx tsc --noEmit` after all changes."

### Invoke **Agent Beta** (Frontend) — Phase 2

> **Prompt**: "Implement Phase 2 of `docs/SPEC-bugfix-v2.md` — tasks 2.1–2.4 and 2.6:
>
> 2.1. In `client/src/components/live-media-panel.tsx`, update all YouTube embed URLs:
>   - For `youtube-nocookie.com/embed/live_stream?channel=XXX` entries, change to `youtube.com/embed/live_stream?channel=XXX&origin=${encodeURIComponent(window.location.origin)}`. 
>   - For hardcoded video ID embeds (`/embed/VIDEO_ID`), add `&origin=${encodeURIComponent(window.location.origin)}` parameter.
>   - Note: embed URLs are static strings in the source. The `origin` param must be added dynamically at render time or use a getter function.
>
> 2.2. In the `StreamIframe` error fallback, below the 'Retry' button, add a 'Watch on YouTube' link that opens the channel page in a new tab. Derive the YouTube channel URL from the embed URL.
>
> 2.3. Refactor `client/src/hooks/use-connection-status.ts`: move the WebSocket creation to module scope (singleton pattern) so that component unmounts don't close the WS. The hook should subscribe/unsubscribe to the singleton's events, not own the WS lifecycle.
>
> 2.4. In `client/src/components/header-bar.tsx`, add a 500ms debounce on the `connectionState` derivation so sub-second 'offline' blips don't render.
>
> 2.6. In `client/src/pages/dashboard.tsx`, when `events` and `news` and `alerts` all return empty arrays AND `wsStatus === 'connected'`, show a subtle banner below the header: 'No live data yet — intelligence feeds are initializing.'
>
> Run `npx tsc --noEmit` after all changes."

### Invoke **Agent Alpha** (Backend) — Phase 2

> **Prompt**: "Implement task 2.5 of `docs/SPEC-bugfix-v2.md`:
>
> In `server/routes.ts`, before `startDataFetcher()`, add a conditional: if `process.env.ENABLE_SEED_DATA === 'true'`, import and call the seed function from `./seed`. Check what `seed.ts` exports and call appropriately. This allows demo deployments to show sample data.
>
> Run `npx tsc --noEmit` after."

---

## Verification Criteria

| Bug | How to Verify |
|-----|--------------|
| Blank map | Map tiles render on page load; zoom/pan shows new tiles. Test dark/terrain/satellite styles. |
| Video streams | At least 2 of 4 default streams load. Error state shows "Watch on YouTube" fallback. |
| Missing sections | Right sidebar is open by default. AI summary, alerts, event feed, news all visible on desktop. Collapse button is obvious. |
| Empty data | With `ENABLE_SEED_DATA=true`, dashboard shows sample events/pins/stats. Without it, "No live data" banner appears. |
| WS flicker | Open/close feedback dialog 5 times rapidly — status indicator never flashes "Offline." |

---

## Files Modified (Expected)

| File | Phase | Changes |
|------|-------|---------|
| `client/src/pages/dashboard.tsx` | 1 + 2 | Map wrapper `h-full`, sidebar collapsed UI, no-data banner |
| `client/src/components/war-map.tsx` | 1 | `invalidateSize()` in MapUpdater |
| `client/src/components/live-media-panel.tsx` | 2 | YouTube embed URL fixes, error fallback link |
| `client/src/hooks/use-connection-status.ts` | 2 | WS singleton refactor |
| `client/src/components/header-bar.tsx` | 2 | Status debounce |
| `server/routes.ts` | 2 | Seed data gating |
