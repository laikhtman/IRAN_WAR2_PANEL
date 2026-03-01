import express, { type Request, Response, NextFunction } from "express";
import compression from "compression";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { geoBlockMiddleware, initGeoBlock } from "./geo-block";
import { loadSettings, getSetting, onSettingChange } from "./admin-settings";
import { registerAdminRoutes } from "./admin-routes";
import { getAdminPath, isAdminEnabled } from "./admin-auth";
import { startAgentScheduler, stopAgentScheduler } from "./agent-scheduler";
import { requestLogger } from "./logger";

const app = express();
app.set('trust proxy', 1); // Behind Cloudflare/Nginx — needed for correct rate-limiting by real client IP
app.use(cookieParser());
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

// gzip/brotli compression for all responses
app.use(compression());

// Security & SEO-relevant headers
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "geolocation=(), microphone=(), camera=()");
  res.setHeader("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  res.setHeader(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https://*.basemaps.cartocdn.com https://*.tile.openstreetmap.org https://server.arcgisonline.com",
      "connect-src 'self' ws: wss:",
      "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://player.twitch.tv",
      "media-src 'self' https://www.oref.org.il",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "upgrade-insecure-requests",
    ].join("; ")
  );
  next();
});

// CORS for API (allows RSS readers and news aggregators to fetch)
app.use("/api", (_req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  next();
});
app.use("/feed.xml", (_req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  next();
});

// Country-based geo-blocking (reads CF-IPCountry header from Cloudflare)
app.use(geoBlockMiddleware);

// Structured request logging for API routes
app.use("/api", requestLogger());

// Early hints for critical resources on HTML pages
app.use((req, res, next) => {
  if (req.accepts("html") && !req.path.startsWith("/api")) {
    res.setHeader("Link", [
      '<https://fonts.googleapis.com>; rel=preconnect',
      '<https://fonts.gstatic.com>; rel=preconnect; crossorigin',
    ].join(", "));
  }
  next();
});

app.use(
  express.json({
    limit: '5mb',
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

// Also accept text/plain bodies (some webhooks don't send application/json)
app.use(express.text({ limit: '5mb', type: 'text/*' }));

app.use(express.urlencoded({ extended: false }));

// Rate limiting: dynamic from admin settings
function createApiLimiter() {
  return rateLimit({
    windowMs: getSetting<number>("rate_limit_window_ms") || 60000,
    max: getSetting<number>("rate_limit_max_requests") || 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests, try again later" },
  });
}
let apiLimiter = createApiLimiter();

// Hot-reload rate limiter when settings change
onSettingChange((key) => {
  if (key === "rate_limit_window_ms" || key === "rate_limit_max_requests") {
    apiLimiter = createApiLimiter();
    console.log("[rate-limit] Reloaded rate limiter from admin settings");
  }
});
// Apply rate limiting to API routes but exclude webhooks
app.use("/api", (req, res, next) => {
  // Skip rate limiting for webhook endpoints
  if (req.path.startsWith('/webhooks/')) {
    return next();
  }
  return apiLimiter(req, res, next);
});

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Load admin settings from DB
  await loadSettings();
  await initGeoBlock();

  // Register admin routes
  registerAdminRoutes(app);

  await registerRoutes(httpServer, app);

  // Start agent scheduler
  startAgentScheduler().catch(err => console.error("[agent-scheduler] Init error:", err.message));

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  // Graceful shutdown
  process.on("SIGTERM", () => {
    stopAgentScheduler();
    httpServer.close();
  });

  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();
