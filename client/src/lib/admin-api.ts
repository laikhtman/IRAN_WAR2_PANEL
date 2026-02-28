const API = "/api/__admin";

async function adminFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// ─── Auth ────────────────────────────────────────────────────────
export const adminAuth = {
  login: (token: string) =>
    adminFetch<{ ok: boolean; expiresAt: string }>("/login", {
      method: "POST",
      body: JSON.stringify({ token }),
    }),
  logout: () =>
    adminFetch<{ ok: boolean }>("/logout", { method: "POST" }),
  checkSession: () =>
    adminFetch<{ valid: boolean; expiresAt: string }>("/session"),
};

// ─── Settings ────────────────────────────────────────────────────
export const adminSettings = {
  getAll: () => adminFetch<Record<string, any>>("/settings"),
  set: (key: string, value: any) =>
    adminFetch<{ ok: boolean }>("/settings", {
      method: "PUT",
      body: JSON.stringify({ key, value }),
    }),
  setBulk: (settings: { key: string; value: any }[]) =>
    adminFetch<{ ok: boolean; updated: number }>("/settings/bulk", {
      method: "PUT",
      body: JSON.stringify({ settings }),
    }),
};

// ─── Health ──────────────────────────────────────────────────────
export interface HealthData {
  timestamp: string;
  database: { status: string; error: string; counts: Record<string, number> };
  envVars: Record<string, "configured" | "missing">;
  dataSources: any[];
  uptime: number;
  memory: { rss: number; heapUsed: number; heapTotal: number; external: number };
}

export const adminHealth = {
  get: () => adminFetch<HealthData>("/health"),
};

// ─── Country Blocking ────────────────────────────────────────────
export interface BlockedCountry {
  countryCode: string;
  countryName: string;
  blockedAt: string;
}

export const adminCountries = {
  getBlocked: () => adminFetch<BlockedCountry[]>("/countries/blocked"),
  block: (code: string, name: string) =>
    adminFetch<{ ok: boolean }>("/countries/blocked", {
      method: "POST",
      body: JSON.stringify({ code, name }),
    }),
  unblock: (code: string) =>
    adminFetch<{ ok: boolean }>(`/countries/blocked/${code}`, { method: "DELETE" }),
  blockBulk: (countries: { code: string; name: string }[]) =>
    adminFetch<{ ok: boolean; count: number }>("/countries/blocked/bulk", {
      method: "PUT",
      body: JSON.stringify({ countries }),
    }),
};

// ─── News ────────────────────────────────────────────────────────
export interface PaginatedNews {
  items: any[];
  total: number;
  page: number;
  pages: number;
}

export const adminNews = {
  list: (params?: { page?: number; limit?: number; search?: string; category?: string; sort?: string; order?: string }) => {
    const qs = new URLSearchParams();
    if (params?.page) qs.set("page", String(params.page));
    if (params?.limit) qs.set("limit", String(params.limit));
    if (params?.search) qs.set("search", params.search);
    if (params?.category) qs.set("category", params.category);
    if (params?.sort) qs.set("sort", params.sort);
    if (params?.order) qs.set("order", params.order);
    return adminFetch<PaginatedNews>(`/news?${qs.toString()}`);
  },
  get: (id: string) => adminFetch<any>(`/news/${id}`),
  update: (id: string, data: Record<string, any>) =>
    adminFetch<{ ok: boolean }>(`/news/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    adminFetch<{ ok: boolean }>(`/news/${id}`, { method: "DELETE" }),
  deleteBulk: (ids: string[]) =>
    adminFetch<{ ok: boolean; deleted: number }>("/news/bulk", {
      method: "DELETE",
      body: JSON.stringify({ ids }),
    }),
};

// ─── Events ──────────────────────────────────────────────────────
export interface PaginatedEvents {
  items: any[];
  total: number;
  page: number;
  pages: number;
}

export const adminEvents = {
  list: (params?: { page?: number; limit?: number; search?: string; type?: string; country?: string; order?: string }) => {
    const qs = new URLSearchParams();
    if (params?.page) qs.set("page", String(params.page));
    if (params?.limit) qs.set("limit", String(params.limit));
    if (params?.search) qs.set("search", params.search);
    if (params?.type) qs.set("type", params.type);
    if (params?.country) qs.set("country", params.country);
    if (params?.order) qs.set("order", params.order);
    return adminFetch<PaginatedEvents>(`/events?${qs.toString()}`);
  },
  delete: (id: string) =>
    adminFetch<{ ok: boolean }>(`/events/${id}`, { method: "DELETE" }),
  deleteBulk: (ids: string[]) =>
    adminFetch<{ ok: boolean; deleted: number }>("/events/bulk", {
      method: "DELETE",
      body: JSON.stringify({ ids }),
    }),
};

// ─── Data Sources ────────────────────────────────────────────────
export const adminDataSources = {
  list: () => adminFetch<any[]>("/data-sources"),
};

// ─── Agents ──────────────────────────────────────────────────────
export interface AgentData {
  id: string;
  name: string;
  type: string;
  description: string | null;
  enabled: boolean;
  scheduleCron: string | null;
  config: Record<string, any>;
  lastRunAt: string | null;
  lastResult: { success: boolean; output: string; error?: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface AgentStats {
  totalRuns: number;
  totalTokens: number;
  successRate: number;
}

export interface PaginatedLogs {
  logs: any[];
  total: number;
  page: number;
  pages: number;
}

export const adminAgents = {
  list: () => adminFetch<AgentData[]>("/agents"),
  create: (data: { name: string; type: string; description?: string; enabled?: boolean; scheduleCron?: string; config?: Record<string, any> }) =>
    adminFetch<AgentData>("/agents", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  get: (id: string) => adminFetch<AgentData & { recentLogs: any[] }>(`/agents/${id}`),
  update: (id: string, data: Partial<AgentData>) =>
    adminFetch<{ ok: boolean }>(`/agents/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    adminFetch<{ ok: boolean }>(`/agents/${id}`, { method: "DELETE" }),
  run: (id: string) =>
    adminFetch<{ ok: boolean; logId: number }>(`/agents/${id}/run`, { method: "POST" }),
  getLogs: (id: string, params?: { page?: number; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params?.page) qs.set("page", String(params.page));
    if (params?.limit) qs.set("limit", String(params.limit));
    return adminFetch<PaginatedLogs>(`/agents/${id}/logs?${qs.toString()}`);
  },
  stats: () => adminFetch<AgentStats>("/agents/stats"),
};
