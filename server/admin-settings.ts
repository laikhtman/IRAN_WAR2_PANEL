import { db } from "./db";
import { adminSettings } from "@shared/schema";
import { eq } from "drizzle-orm";

// ─── In-memory settings cache ────────────────────────────────────
let settingsCache: Record<string, any> = {};
let loaded = false;

// Default values for settings (used if not yet in DB)
const DEFAULTS: Record<string, any> = {
  rate_limit_window_ms: 60000,
  rate_limit_max_requests: 100,
  ga_measurement_id: "",
  ga_enabled: false,
  country_blocking_enabled: false,
  country_blocking_mode: "block",
  country_blocking_message: "Access restricted in your region",
  data_sources_config: {},
  maintenance_mode: false,
  maintenance_message: "We'll be back shortly",
};

export async function loadSettings(): Promise<void> {
  try {
    const rows = await db.select().from(adminSettings);
    settingsCache = { ...DEFAULTS };
    for (const row of rows) {
      settingsCache[row.key] = row.value;
    }
    loaded = true;
    console.log(`[admin-settings] Loaded ${rows.length} settings from DB`);
  } catch (err: any) {
    console.error("[admin-settings] Failed to load settings:", err.message);
    settingsCache = { ...DEFAULTS };
    loaded = true;
  }
}

export function getSetting<T = any>(key: string): T {
  if (!loaded) {
    // Return default if not yet loaded (first calls before DB ready)
    return (DEFAULTS[key] ?? null) as T;
  }
  return (settingsCache[key] ?? DEFAULTS[key] ?? null) as T;
}

export function getAllSettings(): Record<string, any> {
  return { ...DEFAULTS, ...settingsCache };
}

export async function setSetting(key: string, value: any): Promise<void> {
  const now = new Date().toISOString();
  await db.insert(adminSettings).values({ key, value, updatedAt: now })
    .onConflictDoUpdate({
      target: adminSettings.key,
      set: { value, updatedAt: now },
    });
  settingsCache[key] = value;
  
  // Fire change listeners
  for (const listener of changeListeners) {
    try { listener(key, value); } catch {}
  }
}

export async function setSettingsBulk(settings: { key: string; value: any }[]): Promise<number> {
  const now = new Date().toISOString();
  let count = 0;
  for (const { key, value } of settings) {
    await db.insert(adminSettings).values({ key, value, updatedAt: now })
      .onConflictDoUpdate({
        target: adminSettings.key,
        set: { value, updatedAt: now },
      });
    settingsCache[key] = value;
    count++;
  }
  // Fire change listeners for all
  for (const { key, value } of settings) {
    for (const listener of changeListeners) {
      try { listener(key, value); } catch {}
    }
  }
  return count;
}

// ─── Change listeners (for hot-reloading rate limiter, etc.) ─────
type SettingChangeListener = (key: string, value: any) => void;
const changeListeners: SettingChangeListener[] = [];

export function onSettingChange(listener: SettingChangeListener): void {
  changeListeners.push(listener);
}

export function isLoaded(): boolean {
  return loaded;
}
