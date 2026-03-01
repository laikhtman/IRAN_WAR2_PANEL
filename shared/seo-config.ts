/**
 * ═══════════════════════════════════════════════════════════════════
 *  SEO Configuration — Single source of truth for all meta tags
 * ═══════════════════════════════════════════════════════════════════
 *
 *  Edit this file to change any SEO-related content, then redeploy.
 *  Both the server (HTML injection) and client (dynamic updates)
 *  import from here.
 *
 *  After editing, run:  npm run build && npm run start
 * ═══════════════════════════════════════════════════════════════════
 */

// ─── Domain ──────────────────────────────────────────────────────
// Set via env var SEO_DOMAIN or change this fallback
export const SEO_DOMAIN = process.env.SEO_DOMAIN || "intelhq.io";
export const SEO_PROTOCOL = "https";
export const BASE_URL = `${SEO_PROTOCOL}://${SEO_DOMAIN}`;

// ─── Supported Languages ─────────────────────────────────────────
export const SUPPORTED_LANGS = ["en", "he", "ar", "fa"] as const;
export type SupportedLang = (typeof SUPPORTED_LANGS)[number];
export const DEFAULT_LANG: SupportedLang = "en";

export const RTL_LANGS: SupportedLang[] = ["he", "ar", "fa"];

export function isRTLLang(lang: string): boolean {
  return RTL_LANGS.includes(lang as SupportedLang);
}

export function getLangDir(lang: string): "rtl" | "ltr" {
  return isRTLLang(lang) ? "rtl" : "ltr";
}

// ─── OG Locale Mapping ──────────────────────────────────────────
export const OG_LOCALES: Record<SupportedLang, string> = {
  en: "en_US",
  he: "he_IL",
  ar: "ar_SA",
  fa: "fa_IR",
};

// ─── Page Titles ────────────────────────────────────────────────
// Max ~60 characters for Google SERP display
export const TITLES: Record<SupportedLang, string> = {
  en: "War Panel — Real-Time Middle East Intelligence Dashboard",
  he: "לוח מלחמה — לוח מודיעין מזרח תיכון בזמן אמת",
  ar: "لوحة الحرب — لوحة استخبارات الشرق الأوسط في الوقت الفعلي",
  fa: "پنل جنگ — داشبورد اطلاعات خاورمیانه در لحظه",
};

// ─── Meta Descriptions ──────────────────────────────────────────
// Aim for 150–160 characters
export const DESCRIPTIONS: Record<SupportedLang, string> = {
  en: "Live intelligence dashboard tracking missile launches, interceptions, drone activity, and defense systems across the Middle East. Real-time alerts and AI analysis.",
  he: "לוח מודיעין חי למעקב אחר שיגורי טילים, יירוטים, פעילות מל\"טים ומערכות הגנה ברחבי המזרח התיכון. התרעות ובינה מלאכותית בזמן אמת.",
  ar: "لوحة استخبارات حية لتتبع إطلاق الصواريخ والاعتراضات ونشاط الطائرات المسيّرة وأنظمة الدفاع في الشرق الأوسط. تنبيهات وتحليل ذكاء اصطناعي.",
  fa: "داشبورد اطلاعات زنده برای ردیابی پرتاب موشک، رهگیری، فعالیت پهپاد و سامانه‌های دفاعی در خاورمیانه. هشدارهای لحظه‌ای و تحلیل هوش مصنوعی.",
};

// ─── Keywords (comma-separated) ─────────────────────────────────
export const KEYWORDS: Record<SupportedLang, string> = {
  en: "war panel, missile tracking, iron dome, israel defense, middle east intelligence, real-time alerts, drone interception, air defense, IDF, CENTCOM",
  he: "לוח מלחמה, מעקב טילים, כיפת ברזל, הגנת ישראל, מודיעין מזרח תיכון, התרעות בזמן אמת, יירוט מלטים, הגנה אווירית, צהל",
  ar: "لوحة الحرب, تتبع الصواريخ, القبة الحديدية, الدفاع الإسرائيلي, استخبارات الشرق الأوسط, تنبيهات فورية, اعتراض طائرات مسيرة, دفاع جوي",
  fa: "پنل جنگ, ردیابی موشک, گنبد آهنین, دفاع اسرائیل, اطلاعات خاورمیانه, هشدار لحظه‌ای, رهگیری پهپاد, پدافند هوایی",
};

// ─── Open Graph ─────────────────────────────────────────────────
export const OG_SITE_NAME = "War Panel";
export const OG_TYPE = "website";
export const OG_IMAGE_PATH = "/og-image.png";
export const OG_IMAGE_WIDTH = 1200;
export const OG_IMAGE_HEIGHT = 630;

// ─── Twitter Card ───────────────────────────────────────────────
export const TWITTER_CARD_TYPE = "summary_large_image";
// Set your Twitter handle (without @) or leave empty
export const TWITTER_SITE = "";
export const TWITTER_CREATOR = "";

// ─── Geo Targeting (primary region: Israel) ─────────────────────
export const GEO = {
  region: "IL",
  placename: "Israel",
  latitude: "31.0461",
  longitude: "34.8516",
};

// ─── Search Console Verification Codes ──────────────────────────
// Paste your verification codes here after registering
export const VERIFICATION = {
  google: process.env.GOOGLE_SITE_VERIFICATION || "",
  bing: process.env.BING_VERIFICATION || "",
  yandex: process.env.YANDEX_VERIFICATION || "",
};

// ─── Robots Directives ──────────────────────────────────────────
// Pages that should NOT be indexed
export const NOINDEX_PATHS = ["/health", "/tv"];
// Paths disallowed in robots.txt
export const ROBOTS_DISALLOW = ["/api/", "/health", "/tv"];

// ─── RSS Feed ───────────────────────────────────────────────────
export const RSS = {
  title: "War Panel — Live Events",
  description: "Real-time security events from the Middle East",
  language: "en",
  maxItems: 50,
  path: "/feed.xml",
};

// ─── Structured Data (JSON-LD) ──────────────────────────────────
export const JSONLD_WEB_APP = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "War Panel",
  url: BASE_URL,
  description: DESCRIPTIONS.en,
  applicationCategory: "SecurityApplication",
  operatingSystem: "Web",
  inLanguage: [...SUPPORTED_LANGS],
  author: {
    "@type": "Organization",
    name: "War Panel",
  },
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
};

// ─── Theme ──────────────────────────────────────────────────────
export const THEME_COLOR = "#0a0e14";
export const BACKGROUND_COLOR = "#0a0e14";

// ─── PWA Manifest Overrides ─────────────────────────────────────
export const PWA = {
  name: "War Panel — Intelligence Dashboard",
  shortName: "War Panel",
  description: "Real-time Middle East security intelligence dashboard",
  display: "standalone" as const,
  orientation: "any" as const,
  categories: ["news", "security"],
};

// ═══════════════════════════════════════════════════════════════════
//  Helper: Build full <head> meta string for a given language
// ═══════════════════════════════════════════════════════════════════

export function buildMetaTags(lang: SupportedLang, path: string = "/"): string {
  const url = `${BASE_URL}${path}`;
  const title = TITLES[lang] || TITLES.en;
  const desc = DESCRIPTIONS[lang] || DESCRIPTIONS.en;
  const keywords = KEYWORDS[lang] || KEYWORDS.en;
  const ogLocale = OG_LOCALES[lang] || OG_LOCALES.en;
  const ogImageUrl = `${BASE_URL}${OG_IMAGE_PATH}`;

  const lines: string[] = [];

  // Basic
  lines.push(`<title>${title}</title>`);
  lines.push(`<meta name="description" content="${escapeAttr(desc)}" />`);
  lines.push(`<meta name="keywords" content="${escapeAttr(keywords)}" />`);
  lines.push(`<meta name="robots" content="${NOINDEX_PATHS.includes(path) ? "noindex, nofollow" : "index, follow"}" />`);

  // Canonical
  lines.push(`<link rel="canonical" href="${url}" />`);

  // Hreflang
  for (const l of SUPPORTED_LANGS) {
    lines.push(`<link rel="alternate" hreflang="${l}" href="${BASE_URL}${path}${path.includes("?") ? "&" : "?"}hl=${l}" />`);
  }
  lines.push(`<link rel="alternate" hreflang="x-default" href="${BASE_URL}${path}" />`);

  // Open Graph
  lines.push(`<meta property="og:type" content="${OG_TYPE}" />`);
  lines.push(`<meta property="og:site_name" content="${OG_SITE_NAME}" />`);
  lines.push(`<meta property="og:url" content="${url}" />`);
  lines.push(`<meta property="og:title" content="${escapeAttr(title)}" />`);
  lines.push(`<meta property="og:description" content="${escapeAttr(desc)}" />`);
  lines.push(`<meta property="og:image" content="${ogImageUrl}" />`);
  lines.push(`<meta property="og:image:width" content="${OG_IMAGE_WIDTH}" />`);
  lines.push(`<meta property="og:image:height" content="${OG_IMAGE_HEIGHT}" />`);
  lines.push(`<meta property="og:locale" content="${ogLocale}" />`);
  for (const l of SUPPORTED_LANGS) {
    if (l !== lang) {
      lines.push(`<meta property="og:locale:alternate" content="${OG_LOCALES[l]}" />`);
    }
  }

  // Twitter Card
  lines.push(`<meta name="twitter:card" content="${TWITTER_CARD_TYPE}" />`);
  lines.push(`<meta name="twitter:title" content="${escapeAttr(title)}" />`);
  lines.push(`<meta name="twitter:description" content="${escapeAttr(desc)}" />`);
  lines.push(`<meta name="twitter:image" content="${ogImageUrl}" />`);
  if (TWITTER_SITE) lines.push(`<meta name="twitter:site" content="@${TWITTER_SITE}" />`);
  if (TWITTER_CREATOR) lines.push(`<meta name="twitter:creator" content="@${TWITTER_CREATOR}" />`);

  // Geo
  lines.push(`<meta name="geo.region" content="${GEO.region}" />`);
  lines.push(`<meta name="geo.placename" content="${GEO.placename}" />`);
  lines.push(`<meta name="geo.position" content="${GEO.latitude};${GEO.longitude}" />`);
  lines.push(`<meta name="ICBM" content="${GEO.latitude}, ${GEO.longitude}" />`);

  // Verification
  if (VERIFICATION.google) lines.push(`<meta name="google-site-verification" content="${VERIFICATION.google}" />`);
  if (VERIFICATION.bing) lines.push(`<meta name="msvalidate.01" content="${VERIFICATION.bing}" />`);
  if (VERIFICATION.yandex) lines.push(`<meta name="yandex-verification" content="${VERIFICATION.yandex}" />`);

  // RSS
  lines.push(`<link rel="alternate" type="application/rss+xml" title="${escapeAttr(RSS.title)}" href="${BASE_URL}${RSS.path}" />`);

  return lines.join("\n    ");
}

export function buildJsonLd(): string {
  return `<script type="application/ld+json">${JSON.stringify(JSONLD_WEB_APP)}</script>`;
}

function escapeAttr(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
