# SPEC: SEO Optimization Plan

**Created:** 2026-02-28
**Target audience:** 1) Israel (Hebrew) → 2) Arabic GCC → 3) Iran (Persian)
**Status:** Ready for implementation

---

## Current SEO Audit — Gaps Found

| # | Issue | Severity |
|---|-------|----------|
| 1 | **No SSR / pre-rendering** — crawlers receive empty `<div id="root"></div>` | Critical |
| 2 | **No `robots.txt`** | Critical |
| 3 | **No `sitemap.xml`** | Critical |
| 4 | **No `hreflang` tags** — Google can't discover he/ar/fa variants | Critical |
| 5 | **`<html lang="en">` hardcoded** in index.html | High |
| 6 | **Title & meta description not localized** — always English | High |
| 7 | **No canonical URL** | High |
| 8 | **No `og:image`** — zero social preview image | High |
| 9 | **No Twitter/X Card meta tags** | High |
| 10 | **No `og:locale` / `og:locale:alternate`** | High |
| 11 | **No `og:url`, `og:type`, `og:site_name`** | Medium |
| 12 | **No structured data (JSON-LD)** — `NewsArticle`, `WebApplication`, `Event` | Medium |
| 13 | **No `manifest.json`** (PWA manifest) — affects mobile SEO & add-to-homescreen | Medium |
| 14 | **No Apple touch icons / favicon variants** (192px, 512px) | Medium |
| 15 | **No security/performance headers** (CSP, X-Content-Type-Options) — indirect SEO via Core Web Vitals | Low |
| 16 | **404 page not themed / not helpful** (gray card, developer message) | Low |
| 17 | **No RSS feed output** — for Google News and news aggregators | Medium |
| 18 | **No `<link rel="alternate">` hreflang in `<head>`** | Critical |

---

## Architecture Decision: Pre-rendering vs. SSR

Full SSR (Next.js migration) is impractical for this codebase. Instead we use **server-side HTML injection** at the Express level:

- The Express catch-all route (`serveStatic`) will read `index.html` as a template
- Before serving, inject dynamic `<meta>`, `<title>`, `<link rel="alternate">`, JSON-LD, and `lang`/`dir` attributes based on the request URL and an `?hl=` query parameter (or `Accept-Language` header)
- This gives crawlers fully-formed HTML `<head>` with correct metadata, while the SPA boots normally for users
- No React SSR framework needed — just string replacement in `static.ts`

---

## Target Regions & Languages

| Priority | Region | Language | Code | Direction | Google Domain |
|----------|--------|----------|------|-----------|---------------|
| 1 | Israel | Hebrew | `he` | RTL | google.co.il |
| 1 | Israel | English | `en` | LTR | google.co.il |
| 2 | Saudi Arabia | Arabic | `ar-SA` | RTL | google.com.sa |
| 2 | UAE | Arabic | `ar-AE` | RTL | google.ae |
| 2 | Qatar | Arabic | `ar-QA` | RTL | google.com.qa |
| 2 | Bahrain | Arabic | `ar-BH` | RTL | google.com.bh |
| 2 | Kuwait | Arabic | `ar-KW` | RTL | google.com.kw |
| 2 | Oman | Arabic | `ar-OM` | RTL | google.co.om |
| 3 | Iran | Persian | `fa` | RTL | google.com (blocked/VPN) |

---

## Task Breakdown — 42 Tasks

### Phase A — Critical Infrastructure (Server-side, 12 tasks)

> **Agent: Alpha (Backend)**
> Files: `server/static.ts`, `server/routes.ts`, `client/index.html`

#### A-01. HTML template injection system
Refactor `serveStatic` in `server/static.ts` to:
1. Read `dist/public/index.html` once at startup into a string variable
2. Define placeholder tokens in the HTML: `<!--META_INJECT-->`, `<!--JSONLD_INJECT-->`
3. On each request, detect language from:
   - URL query `?hl=he` (highest priority)
   - Cookie `i18next`
   - `Accept-Language` header
   - Default: `en`
4. Build dynamic `<head>` content (title, description, OG, hreflang, canonical, lang/dir)
5. Replace tokens and serve the modified HTML
6. Cache the per-language HTML strings (4 variants) to avoid re-computation

#### A-02. Dynamic `<html lang="..." dir="...">` injection
Replace `<html lang="en">` in the served HTML with the detected language's `lang` and `dir`:
- `he` → `<html lang="he" dir="rtl">`
- `ar` → `<html lang="ar" dir="rtl">`
- `fa` → `<html lang="fa" dir="rtl">`
- `en` → `<html lang="en" dir="ltr">`

#### A-03. Dynamic `<title>` per language
Localized titles:
- `en`: `War Panel — Real-Time Middle East Intelligence Dashboard`
- `he`: `לוח מלחמה — לוח מודיעין מזרח תיכון בזמן אמת`
- `ar`: `لوحة الحرب — لوحة استخبارات الشرق الأوسط في الوقت الفعلي`
- `fa`: `پنل جنگ — داشبورد اطلاعات خاورمیانه در لحظه`

#### A-04. Dynamic `<meta name="description">` per language
Localized descriptions (150–160 chars each):
- `en`: `Live intelligence dashboard tracking missile launches, interceptions, drone activity, and defense systems across the Middle East. Real-time alerts and AI analysis.`
- `he`: `לוח מודיעין חי למעקב אחר שיגורי טילים, יירוטים, פעילות מל"טים ומערכות הגנה ברחבי המזרח התיכון. התרעות ובינה מלאכותית בזמן אמת.`
- `ar`: `لوحة استخبارات حية لتتبع إطلاق الصواريخ والاعتراضات ونشاط الطائرات المسيّرة وأنظمة الدفاع في الشرق الأوسط. تنبيهات وتحليل ذكاء اصطناعي.`
- `fa`: `داشبورد اطلاعات زنده برای ردیابی پرتاب موشک، رهگیری، فعالیت پهپاد و سامانه‌های دفاعی در خاورمیانه. هشدارهای لحظه‌ای و تحلیل هوش مصنوعی.`

#### A-05. Canonical URL injection
Add `<link rel="canonical" href="https://DOMAIN/">` based on the current path.
- `/` → `https://DOMAIN/`
- `/tv` → `https://DOMAIN/tv`
- `/health` → excluded (noindex)
- Use env var `SEO_DOMAIN` or fallback to request `Host` header

#### A-06. Hreflang link injection
For every page, inject 5 `<link rel="alternate">` tags:
```html
<link rel="alternate" hreflang="en" href="https://DOMAIN/?hl=en" />
<link rel="alternate" hreflang="he" href="https://DOMAIN/?hl=he" />
<link rel="alternate" hreflang="ar" href="https://DOMAIN/?hl=ar" />
<link rel="alternate" hreflang="fa" href="https://DOMAIN/?hl=fa" />
<link rel="alternate" hreflang="x-default" href="https://DOMAIN/" />
```

#### A-07. Open Graph full tag set injection
Per-language OG tags:
```html
<meta property="og:type" content="website" />
<meta property="og:site_name" content="War Panel" />
<meta property="og:url" content="https://DOMAIN/" />
<meta property="og:title" content="..." />  <!-- localized -->
<meta property="og:description" content="..." />  <!-- localized -->
<meta property="og:image" content="https://DOMAIN/og-image.png" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:locale" content="en_US" />
<meta property="og:locale:alternate" content="he_IL" />
<meta property="og:locale:alternate" content="ar_SA" />
<meta property="og:locale:alternate" content="fa_IR" />
```

#### A-08. Twitter Card meta tags injection
```html
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="..." />  <!-- localized -->
<meta name="twitter:description" content="..." />  <!-- localized -->
<meta name="twitter:image" content="https://DOMAIN/og-image.png" />
```

#### A-09. JSON-LD structured data injection
Inject a `<script type="application/ld+json">` block:
```json
{
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "War Panel",
  "url": "https://DOMAIN/",
  "description": "...",
  "applicationCategory": "SecurityApplication",
  "operatingSystem": "Web",
  "inLanguage": ["en", "he", "ar", "fa"],
  "author": {
    "@type": "Organization",
    "name": "War Panel"
  },
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD"
  }
}
```

#### A-10. robots.txt route
Add `GET /robots.txt` to Express routes (before static middleware):
```
User-agent: *
Allow: /
Disallow: /api/
Disallow: /health
Disallow: /tv

Sitemap: https://DOMAIN/sitemap.xml
```

#### A-11. sitemap.xml route
Add `GET /sitemap.xml` to Express:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
  <url>
    <loc>https://DOMAIN/</loc>
    <xhtml:link rel="alternate" hreflang="en" href="https://DOMAIN/?hl=en"/>
    <xhtml:link rel="alternate" hreflang="he" href="https://DOMAIN/?hl=he"/>
    <xhtml:link rel="alternate" hreflang="ar" href="https://DOMAIN/?hl=ar"/>
    <xhtml:link rel="alternate" hreflang="fa" href="https://DOMAIN/?hl=fa"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="https://DOMAIN/"/>
    <changefreq>always</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
```
Use `process.env.SEO_DOMAIN` or `req.headers.host`.

#### A-12. RSS/Atom feed endpoint
Add `GET /feed.xml` (or `/rss`) that returns the last 50 events as RSS 2.0:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>War Panel — Live Events</title>
    <link>https://DOMAIN/</link>
    <description>Real-time security events from the Middle East</description>
    <language>en</language>
    <atom:link href="https://DOMAIN/feed.xml" rel="self" type="application/rss+xml"/>
    <item>
      <title>[EVENT_TYPE] — [LOCATION]</title>
      <description>[DETAILS]</description>
      <pubDate>[RFC 2822 DATE]</pubDate>
      <guid isPermaLink="false">event-[ID]</guid>
    </item>
    ...
  </channel>
</rss>
```
This enables Google News indexing and RSS readers.

---

### Phase B — Client-side Meta & PWA (Frontend, 14 tasks)

> **Agent: Beta (Frontend)**
> Files: `client/index.html`, `client/public/*`, `client/src/App.tsx`, `client/src/pages/not-found.tsx`, `client/src/main.tsx`

#### B-01. Update `index.html` template with injection placeholders
Replace hardcoded `<title>` and `<meta>` tags with server-injectable tokens:
```html
<html lang="en" dir="ltr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5, viewport-fit=cover" />
  <!--META_INJECT-->
  <title>War Panel — Real-Time Middle East Intelligence Dashboard</title>
  <meta name="description" content="Live intelligence dashboard tracking missile launches, interceptions, drone activity, and defense systems across the Middle East." />
  ...existing OG tags as fallback...
  <!--JSONLD_INJECT-->
  ...
</head>
```
Also:
- Change `maximum-scale=1` → `maximum-scale=5` (Google penalizes blocked zoom)
- Add `<meta name="robots" content="index, follow" />`
- Add `<link rel="manifest" href="/manifest.json" />`
- Add `<link rel="apple-touch-icon" href="/icons/icon-192.png" />`
- Add `<link rel="alternate" type="application/rss+xml" title="War Panel Events" href="/feed.xml" />`

#### B-02. Create `manifest.json`
Create `client/public/manifest.json`:
```json
{
  "name": "War Panel — Intelligence Dashboard",
  "short_name": "War Panel",
  "description": "Real-time Middle East security intelligence dashboard",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0a0e14",
  "theme_color": "#0a0e14",
  "orientation": "any",
  "lang": "en",
  "dir": "auto",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icons/icon-maskable-192.png", "sizes": "192x192", "type": "image/png", "purpose": "maskable" },
    { "src": "/icons/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ],
  "categories": ["news", "security"]
}
```

#### B-03. Create PWA icons (placeholder SVG-to-PNG)
Create `client/public/icons/` directory with placeholder icons. Since we can't generate PNGs from code, create an SVG-based icon component and a build script note. For now, copy the existing `favicon.png` as `icon-192.png` and `icon-512.png` (the user will replace them with proper sized versions).

#### B-04. Create OG social preview image
Create `client/public/og-image.png` — a 1200×630 static image for social sharing.
Since we can't generate images, create `client/public/og-image.html` as a template the user can screenshot, AND add a note to `docs/todo.md`. For now, reference `/og-image.png` in meta tags (the user will provide the actual image).

#### B-05. Client-side `document.title` sync
In `App.tsx`, update `document.title` dynamically when language changes:
```tsx
useEffect(() => {
  const titles: Record<string, string> = {
    en: "War Panel — Real-Time Middle East Intelligence Dashboard",
    he: "לוח מלחמה — לוח מודיעין מזרח תיכון בזמן אמת",
    ar: "لوحة الحرب — لوحة استخبارات الشرق الأوسط في الوقت الفعلي",
    fa: "پنل جنگ — داشبورد اطلاعات خاورمیانه در لحظه",
  };
  document.title = titles[i18n.language] || titles.en;
}, [i18n.language]);
```

#### B-06. Client-side `meta[name="description"]` sync
When language changes, also update the `<meta name="description">` content attribute dynamically via `document.querySelector`.

#### B-07. Client-side hreflang sync
Inject `<link rel="alternate" hreflang="...">` into `<head>` from React on mount (for SPA navigation cases where the server-injected tags may be stale). Use a `useEffect` in `App.tsx`.

#### B-08. 404 page SEO hardening
Update `not-found.tsx`:
- Add `<meta name="robots" content="noindex" />` via `useEffect` (set + clean up)
- Theme it with the app's dark mode instead of `bg-gray-50`
- Add a "Go to Dashboard" link
- Use `useTranslation()` for the text

#### B-09. `/health` page noindex
In the health page component, add `useEffect` to inject `<meta name="robots" content="noindex">`.

#### B-10. Semantic HTML hardening across pages
Ensure the dashboard uses semantic elements:
- `<main>` wrapping the content area
- `<nav>` for the tab bar
- `<aside>` for sidebars
- `<article>` for individual news items in the feed
- `<time>` elements with `datetime` attribute for all timestamps

#### B-11. Image alt text audit
Ensure all `<img>` tags and icon elements have proper `alt` attributes. Map markers should have meaningful `aria-label` (already done in Phase 1 but verify coverage).

#### B-12. Heading hierarchy fix
Ensure each page has exactly one `<h1>` and a logical hierarchy:
- Dashboard: `<h1 class="sr-only">War Panel Intelligence Dashboard</h1>` (visually hidden, present for crawlers)
- TV Dashboard: Same pattern
- 404: `<h1>Page Not Found</h1>`

#### B-13. Performance meta tags
Add to `index.html`:
```html
<link rel="dns-prefetch" href="https://fonts.googleapis.com" />
<link rel="dns-prefetch" href="https://unpkg.com" />
<link rel="dns-prefetch" href="https://tile.openstreetmap.org" />
<meta http-equiv="x-dns-prefetch-control" content="on" />
```

#### B-14. Language detection on first visit
Update `main.tsx` or `App.tsx` to sync the detected i18next language into the URL as `?hl=` parameter on the first load, so that if the page is shared, the recipient gets the correct language version.

---

### Phase C — Server Performance Headers (Infrastructure, 8 tasks)

> **Agent: Delta (Infrastructure)**
> Files: `server/index.ts` or `server/static.ts`

#### C-01. Cache-Control headers for static assets
Add middleware:
```ts
app.use("/assets", (req, res, next) => {
  res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  next();
});
```
Vite's build output already uses hashed filenames, so assets can be cached forever.

#### C-02. Cache-Control for HTML
The root HTML must NOT be cached by CDNs/browsers (it contains dynamic meta tags):
```ts
// In the HTML serving function:
res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
res.setHeader("Vary", "Accept-Language, Cookie");
```

#### C-03. Security headers
Add middleware for SEO-relevant security headers:
```ts
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
});
```

#### C-04. Compression (gzip/brotli)
Add `compression` middleware if not already present:
```ts
import compression from "compression";
app.use(compression());
```
This improves Core Web Vitals (LCP, FCP) which directly affects Google ranking.

#### C-05. ETag support
Enable ETags for static files (Express's `static` middleware does this by default, just verify it's not disabled).

#### C-06. CORS headers for API
Ensure API responses include proper CORS headers so that the RSS feed and API can be consumed by news aggregators.

#### C-07. Content-Language header
Add `Content-Language` response header matching the detected language:
```ts
res.setHeader("Content-Language", detectedLang);
```

#### C-08. HTTP/2 push hints (103 Early Hints)
If behind Nginx/Cloudflare, configure `Link` headers for critical resources:
```ts
res.setHeader("Link", [
  '</assets/index.css>; rel=preload; as=style',
  '<https://fonts.googleapis.com/css2?family=Inter>; rel=preload; as=style',
].join(", "));
```

---

### Phase D — Content & Regional SEO (AI + Backend, 8 tasks)

> **Agent: Gamma (AI) + Alpha (Backend)**

#### D-01. Google Search Console verification
Add `<meta name="google-site-verification" content="VERIFICATION_CODE" />` placeholder in `index.html`. The user must register at [Google Search Console](https://search.google.com/search-console) and get the code.

#### D-02. Bing Webmaster verification
Add `<meta name="msvalidate.01" content="VERIFICATION_CODE" />` placeholder.

#### D-03. Yandex Webmaster verification (for Iran/CIS traffic)
Add `<meta name="yandex-verification" content="VERIFICATION_CODE" />` placeholder.

#### D-04. Regional keyword research integration
Add localized `<meta name="keywords">` for each language:
- `en`: `war panel, missile tracking, iron dome, israel defense, middle east intelligence, real-time alerts, drone interception`
- `he`: `לוח מלחמה, מעקב טילים, כיפת ברזל, הגנת ישראל, מודיעין מזרח תיכון, התרעות בזמן אמת, יירוט מלטים`
- `ar`: `لوحة الحرب, تتبع الصواريخ, القبة الحديدية, الدفاع الإسرائيلي, استخبارات الشرق الأوسط, تنبيهات فورية`
- `fa`: `پنل جنگ, ردیابی موشک, گنبد آهنین, دفاع اسرائیل, اطلاعات خاورمیانه, هشدار لحظه‌ای`

#### D-05. AI-generated meta descriptions from live data
Enhance the AI summary endpoint to also produce a 155-char SEO snippet from the current situation. Store as `seo_snippet` field. The server injects this as the `<meta description>` when available, falling back to the static descriptions.

#### D-06. News headline structured data
On the RSS feed, add proper `schema.org/NewsArticle` markup for each news item to qualify for Google News Top Stories.

#### D-07. Event structured data
For each war event, generate `schema.org/Event` markup in the JSON-LD block (last 10 events) so they can appear in Google's event/news panels.

#### D-08. Geo-targeting meta tags
Add geo meta tags for primary region:
```html
<meta name="geo.region" content="IL" />
<meta name="geo.placename" content="Israel" />
<meta name="geo.position" content="31.0461;34.8516" />
<meta name="ICBM" content="31.0461, 34.8516" />
```

---

## Implementation Priority Order

```
Phase A (Server-side injection)  ← Do FIRST, biggest SEO impact
  └─ A-01 through A-12
Phase B (Client-side + PWA)      ← Do SECOND
  └─ B-01 through B-14
Phase C (Headers/Performance)    ← Do THIRD  
  └─ C-01 through C-08
Phase D (Content/Regional)       ← Do FOURTH
  └─ D-01 through D-08
```

**Total: 42 tasks across 4 phases.**

---

## File Ownership Matrix

| File | Agent | Phase |
|------|-------|-------|
| `server/static.ts` | Alpha | A-01, A-02, A-03, A-04, A-05, A-06, A-07, A-08, A-09 |
| `server/routes.ts` | Alpha | A-10, A-11, A-12 |
| `server/index.ts` | Delta | C-01 through C-08 |
| `client/index.html` | Beta | B-01, B-13 |
| `client/public/manifest.json` | Beta | B-02 (create) |
| `client/public/icons/*` | Beta | B-03 (create) |
| `client/public/og-image.png` | User | B-04 (manual) |
| `client/src/App.tsx` | Beta | B-05, B-06, B-07, B-14 |
| `client/src/pages/not-found.tsx` | Beta | B-08 |
| `client/src/pages/health.tsx` | Beta | B-09 |
| `client/src/pages/dashboard.tsx` | Beta | B-10, B-12 |
| `client/src/pages/tv-dashboard.tsx` | Beta | B-10, B-12 |
| Various components | Beta | B-11 |
| `docs/todo.md` | Omega | B-04 note |

---

## Expected SEO Impact

| Metric | Before | After |
|--------|--------|-------|
| Google crawlable content | Empty `<div>` | Full `<head>` with title, description, OG, JSON-LD |
| Hreflang coverage | 0 languages | 4 languages + x-default |
| Structured data | None | WebApplication + NewsArticle + Event |
| Social sharing preview | Title only (no image) | Full card with 1200×630 image |
| PWA Lighthouse score | ~30 | ~90+ |
| Google News eligibility | No | Yes (via RSS + NewsArticle schema) |
| Regional targeting | None | IL primary, GCC + IR secondary |
| Core Web Vitals | No optimization | Compression, caching, preload hints |

---

## User Action Items (Cannot Be Automated)

1. **Register domain** in Google Search Console → get verification code → set `GOOGLE_SITE_VERIFICATION` env var
2. **Register domain** in Bing Webmaster Tools → set `BING_VERIFICATION` env var  
3. **Create OG image** (1200×630px) — dark themed screenshot of the dashboard with title overlay → save as `client/public/og-image.png`
4. **Create app icons** (192px + 512px, regular + maskable) → save in `client/public/icons/`
5. **Set `SEO_DOMAIN` env var** to the production domain (e.g., `warpanel.com`)
6. **Submit sitemap** to Google Search Console: `https://DOMAIN/sitemap.xml`
7. **Configure Cloudflare** page rules for geo-targeting (if using Cloudflare)
