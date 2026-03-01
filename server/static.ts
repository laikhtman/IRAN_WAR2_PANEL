import express, { type Express, type Request } from "express";
import fs from "fs";
import path from "path";
import {
  buildMetaTags,
  buildJsonLd,
  SUPPORTED_LANGS,
  DEFAULT_LANG,
  getLangDir,
  type SupportedLang,
} from "@shared/seo-config";
import { getSetting } from "./admin-settings";

function detectLang(req: Request): SupportedLang {
  // 1. Query parameter ?hl=he
  const hl = req.query.hl;
  if (typeof hl === "string" && SUPPORTED_LANGS.includes(hl as SupportedLang)) {
    return hl as SupportedLang;
  }

  // 2. Cookie "i18next"
  const cookie = req.headers.cookie || "";
  const match = cookie.match(/i18next=([a-z]{2})/);
  if (match && SUPPORTED_LANGS.includes(match[1] as SupportedLang)) {
    return match[1] as SupportedLang;
  }

  // 3. Accept-Language header
  const acceptLang = req.headers["accept-language"] || "";
  for (const supported of SUPPORTED_LANGS) {
    if (acceptLang.includes(supported)) return supported;
  }

  return DEFAULT_LANG;
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  // Read the HTML template once at startup
  const rawHtml = fs.readFileSync(path.resolve(distPath, "index.html"), "utf-8");

  // Pre-build the 4 language variants for "/" (the most common page)
  const cachedHome: Record<string, string> = {};
  for (const lang of SUPPORTED_LANGS) {
    cachedHome[lang] = injectSeo(rawHtml, lang, "/");
  }

  // Serve static assets (JS, CSS, images) with long cache
  app.use(
    express.static(distPath, {
      index: false, // Don't serve index.html directly
      fallthrough: true, // Allow unknown paths to fall through to the SPA handler
      setHeaders(res, filePath) {
        // Vite hashed assets get immutable cache
        if (filePath.includes("/assets/")) {
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        }
      },
    })
  );

  // SPA catch-all — inject SEO meta tags per language
  app.use("/{*path}", (req, res) => {
    // Ignore API routes just in case they fell through
    if (req.originalUrl.startsWith("/api")) {
      return res.status(404).json({ error: "Not found" });
    }

    const lang = detectLang(req);
    const pagePath = req.path;

    // Use cached version for homepage, build on-the-fly for others
    const html = pagePath === "/" && cachedHome[lang]
      ? cachedHome[lang]
      : injectSeo(rawHtml, lang, pagePath);

    res.removeHeader("Cache-Control");
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.setHeader("Vary", "Accept-Language, Cookie");
    res.setHeader("Content-Language", lang);
    res.send(html);
  });
}

function injectSeo(template: string, lang: SupportedLang, pagePath: string): string {
  let html = template;
  const dir = getLangDir(lang);

  // Replace <html lang="en" dir="ltr"> with correct lang and dir
  html = html.replace(/<html\s+lang="[^"]*"(\s+dir="[^"]*")?/, `<html lang="${lang}" dir="${dir}"`);

  // Remove the fallback <title> and <meta description> (they'll be in SEO_META)
  html = html.replace(/<title>[^<]*<\/title>/, "");
  html = html.replace(/<meta\s+name="description"[^>]*\/>/, "");

  // Remove fallback OG tags (they'll be in SEO_META)
  html = html.replace(/<meta\s+property="og:title"[^>]*\/>/, "");
  html = html.replace(/<meta\s+property="og:description"[^>]*\/>/, "");

  // Inject SEO meta tags
  html = html.replace("<!--SEO_META-->", buildMetaTags(lang, pagePath));

  // Inject JSON-LD
  html = html.replace("<!--SEO_JSONLD-->", buildJsonLd());

  // Inject Google Analytics if enabled
  const gaEnabled = getSetting<boolean>("ga_enabled");
  const gaId = getSetting<string>("ga_measurement_id");
  if (gaEnabled && gaId) {
    const gaScript = `<script async src="https://www.googletagmanager.com/gtag/js?id=${gaId}"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${gaId}');</script>`;
    html = html.replace("</head>", `${gaScript}\n</head>`);
  }

  return html;
}
