/**
 * Structured Logger — lightweight console + in-memory ring buffer
 * Exposes:
 *   - log/warn/error helpers with structured JSON output
 *   - requestLogger middleware for API routes
 *   - wsLogger for WebSocket connection events
 *   - getRecentLogs() for admin endpoint
 */

export type LogLevel = "info" | "warn" | "error" | "debug";

export interface LogEntry {
  ts: string;
  level: LogLevel;
  source: string;
  message: string;
  meta?: Record<string, unknown>;
}

const MAX_LOG_ENTRIES = 500;
const logBuffer: LogEntry[] = [];

function pushLog(entry: LogEntry): void {
  logBuffer.push(entry);
  if (logBuffer.length > MAX_LOG_ENTRIES) {
    logBuffer.shift();
  }
}

function formatEntry(entry: LogEntry): string {
  const meta = entry.meta ? ` ${JSON.stringify(entry.meta)}` : "";
  return `[${entry.ts}] [${entry.level.toUpperCase()}] [${entry.source}] ${entry.message}${meta}`;
}

function createEntry(level: LogLevel, source: string, message: string, meta?: Record<string, unknown>): LogEntry {
  return {
    ts: new Date().toISOString(),
    level,
    source,
    message,
    meta,
  };
}

export function log(source: string, message: string, meta?: Record<string, unknown>): void {
  const entry = createEntry("info", source, message, meta);
  pushLog(entry);
  console.log(formatEntry(entry));
}

export function warn(source: string, message: string, meta?: Record<string, unknown>): void {
  const entry = createEntry("warn", source, message, meta);
  pushLog(entry);
  console.warn(formatEntry(entry));
}

export function error(source: string, message: string, meta?: Record<string, unknown>): void {
  const entry = createEntry("error", source, message, meta);
  pushLog(entry);
  console.error(formatEntry(entry));
}

export function debug(source: string, message: string, meta?: Record<string, unknown>): void {
  const entry = createEntry("debug", source, message, meta);
  pushLog(entry);
  if (process.env.NODE_ENV !== "production") {
    console.debug(formatEntry(entry));
  }
}

/**
 * Express middleware — logs request method, path, status, and duration.
 */
export function requestLogger() {
  return (req: any, res: any, next: any) => {
    const start = Date.now();
    const originalEnd = res.end;

    res.end = function (...args: any[]) {
      const duration = Date.now() - start;
      const entry = createEntry("info", "http", `${req.method} ${req.originalUrl || req.url}`, {
        status: res.statusCode,
        durationMs: duration,
        ip: req.ip || req.connection?.remoteAddress,
      });
      pushLog(entry);

      // Only log to console for non-200 or slow requests to reduce noise
      if (res.statusCode >= 400 || duration > 1000) {
        console.log(formatEntry(entry));
      }

      originalEnd.apply(res, args);
    };

    next();
  };
}

/**
 * Log WebSocket connection/disconnection with client count.
 */
export function wsConnect(clientCount: number, ip?: string): void {
  log("ws", "Client connected", { clientCount, ip });
}

export function wsDisconnect(clientCount: number, ip?: string): void {
  log("ws", "Client disconnected", { clientCount, ip });
}

/**
 * Return recent log entries for admin endpoint.
 * Optionally filter by level or source.
 */
export function getRecentLogs(opts?: {
  level?: LogLevel;
  source?: string;
  limit?: number;
}): LogEntry[] {
  let logs = [...logBuffer];

  if (opts?.level) {
    logs = logs.filter((l) => l.level === opts.level);
  }
  if (opts?.source) {
    logs = logs.filter((l) => l.source === opts.source);
  }

  const limit = opts?.limit ?? 100;
  return logs.slice(-limit).reverse(); // newest first
}
