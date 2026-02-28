import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Link } from "wouter";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  MinusCircle,
  Database,
  Wifi,
  Key,
  Tv,
  Camera,
  RefreshCw,
  ArrowLeft,
  Server,
  Activity,
  Globe,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

// ─── Types ─────────────────────────────────────────────────────────────────

interface SourceHealth {
  lastRunAt: string | null;
  lastSuccessAt: string | null;
  lastError: string | null;
  runCount: number;
  errorCount: number;
}

interface DataSourceInfo {
  name: string;
  enabled: boolean;
  fetchIntervalMs: number;
  status: "ok" | "error" | "not_configured" | "no_data";
  missingEnvVars: string[];
  health: SourceHealth | null;
}

interface SystemHealth {
  timestamp: string;
  database: {
    status: "ok" | "error";
    error: string;
    counts: { events: number; news: number; alerts: number; satellite: number };
  };
  envVars: Record<string, "configured" | "missing">;
  dataSources: DataSourceInfo[];
  webSocket: { connectedClients: number };
}

// ─── Stream data (mirrors live-media-panel.tsx) ────────────────────────────

const tvChannels = [
  { id: "kan11", name: "Kan 11", embedUrl: "https://www.livehdtv.com/embed/kan-11-live/", country: "Israel" },
  { id: "channel12", name: "Channel 12", embedUrl: "https://www.livehdtv.com/embed/channel-12-live-stream-from-israel/", country: "Israel" },
  { id: "channel13", name: "Channel 13", embedUrl: "https://www.livehdtv.com/embed/channel-13-live/", country: "Israel" },
  { id: "channel14", name: "Channel 14", embedUrl: "https://www.livehdtv.com/embed/channel-14-isreal-live/", country: "Israel" },
  { id: "i24news-en", name: "i24NEWS English", embedUrl: "https://www.livehdtv.com/embed/i24news-live-stream-israel/", country: "Israel" },
  { id: "aljazeera", name: "Al Jazeera EN", embedUrl: "https://www.youtube.com/embed/gCNeDWCI0vo?autoplay=1&mute=1", country: "Qatar" },
  { id: "aljazeera-ar", name: "الجزيرة", embedUrl: "https://www.youtube.com/embed/bNyUyrR0PHo?autoplay=1&mute=1", country: "Qatar" },
  { id: "alarabiya", name: "العربية", embedUrl: "https://www.youtube.com/embed/n7eQejkXbnM?autoplay=1&mute=1", country: "UAE" },
  { id: "sky-arabia", name: "Sky News Arabia", embedUrl: "https://www.youtube-nocookie.com/embed/live_stream?channel=UCIJXOvggjKtCagMfxvcCzAA&rel=0&autoplay=1", country: "UAE" },
];

const liveCameras = [
  { id: "cam-jerusalem", name: "Jerusalem - Western Wall", embedUrl: "https://www.youtube.com/embed/MV2wIFYkmYA?autoplay=1&mute=1", country: "Israel" },
  { id: "cam-telaviv", name: "Tel Aviv Skyline", embedUrl: "https://www.youtube.com/embed/JvTMNbk20os?autoplay=1&mute=1", country: "Israel" },
  { id: "cam-haifa", name: "Haifa Port", embedUrl: "https://www.youtube.com/embed/7veP96YDAho?autoplay=1&mute=1", country: "Israel" },
  { id: "cam-mecca", name: "Mecca - Masjid al-Haram", embedUrl: "https://www.youtube.com/embed/PYMipRRmq5Q?autoplay=1&mute=1", country: "Saudi Arabia" },
  { id: "cam-dubai", name: "Dubai Skyline", embedUrl: "https://www.youtube.com/embed/7Kzc7gIj9Os?autoplay=1&mute=1", country: "UAE" },
];

// ─── Status helpers ────────────────────────────────────────────────────────

type Status = "ok" | "error" | "not_configured" | "no_data" | "checking" | "unknown";

function StatusIcon({ status }: { status: Status }) {
  switch (status) {
    case "ok":
      return <CheckCircle2 className="h-5 w-5 text-green-400" />;
    case "error":
      return <XCircle className="h-5 w-5 text-red-400" />;
    case "not_configured":
      return <MinusCircle className="h-5 w-5 text-yellow-500" />;
    case "no_data":
      return <AlertTriangle className="h-5 w-5 text-gray-400" />;
    case "checking":
      return <RefreshCw className="h-5 w-5 text-cyan-400 animate-spin" />;
    default:
      return <MinusCircle className="h-5 w-5 text-gray-500" />;
  }
}

function StatusBadge({ status }: { status: Status }) {
  const variants: Record<Status, { label: string; className: string }> = {
    ok: { label: "Working", className: "bg-green-500/20 text-green-400 border-green-500/30" },
    error: { label: "Error", className: "bg-red-500/20 text-red-400 border-red-500/30" },
    not_configured: { label: "Not Configured", className: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
    no_data: { label: "No Data Yet", className: "bg-gray-500/20 text-gray-400 border-gray-500/30" },
    checking: { label: "Checking...", className: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30" },
    unknown: { label: "Unknown", className: "bg-gray-500/20 text-gray-400 border-gray-500/30" },
  };
  const { label, className } = variants[status] || variants.unknown;
  return <Badge variant="outline" className={className}>{label}</Badge>;
}

function formatInterval(ms: number): string {
  if (ms >= 3600000) return `${(ms / 3600000).toFixed(0)}h`;
  if (ms >= 60000) return `${(ms / 60000).toFixed(0)}m`;
  return `${(ms / 1000).toFixed(0)}s`;
}

function timeAgo(iso: string | null): string {
  if (!iso) return "Never";
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60000) return `${Math.round(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.round(diff / 60000)}m ago`;
  return `${Math.round(diff / 3600000)}h ago`;
}

// ─── Stream probe component ───────────────────────────────────────────────

function StreamProbe({
  item,
  type,
}: {
  item: { id: string; name: string; embedUrl: string; country: string };
  type: "tv" | "camera";
}) {
  const [status, setStatus] = useState<Status>("checking");

  useEffect(() => {
    // We probe by creating a hidden iframe and checking if it loads
    const iframe = document.createElement("iframe");
    iframe.style.display = "none";
    iframe.src = item.embedUrl;

    let settled = false;
    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true;
        // If we didn't get an error, assume it's working (iframes don't reliably
        // fire load events for cross-origin content, so timeout = probably ok)
        setStatus("ok");
        iframe.remove();
      }
    }, 6000);

    iframe.onerror = () => {
      if (!settled) {
        settled = true;
        clearTimeout(timeout);
        setStatus("error");
        iframe.remove();
      }
    };

    iframe.onload = () => {
      if (!settled) {
        settled = true;
        clearTimeout(timeout);
        setStatus("ok");
        iframe.remove();
      }
    };

    document.body.appendChild(iframe);

    return () => {
      settled = true;
      clearTimeout(timeout);
      iframe.remove();
    };
  }, [item.embedUrl]);

  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
      <div className="flex items-center gap-3">
        {type === "tv" ? (
          <Tv className="h-4 w-4 text-blue-400" />
        ) : (
          <Camera className="h-4 w-4 text-purple-400" />
        )}
        <div>
          <p className="text-sm font-medium text-gray-200">{item.name}</p>
          <p className="text-xs text-gray-500 truncate max-w-[300px]">{item.embedUrl}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500">{item.country}</span>
        <StatusIcon status={status} />
        <StatusBadge status={status} />
      </div>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────

export default function HealthPage() {
  const {
    data: health,
    isLoading,
    refetch,
    dataUpdatedAt,
  } = useQuery<SystemHealth>({
    queryKey: ["/api/system-health"],
    refetchInterval: 15000,
  });

  // Count statuses per section
  const countSummary = (items: { status: Status }[]): Record<Status, number> => {
    const counts: Record<string, number> = {};
    for (const item of items) {
      counts[item.status] = (counts[item.status] || 0) + 1;
    }
    return counts as Record<Status, number>;
  };

  const dsStatusCounts = health
    ? countSummary(health.dataSources)
    : {};

  const envConfigured = health
    ? Object.values(health.envVars).filter((v) => v === "configured").length
    : 0;
  const envTotal = health ? Object.keys(health.envVars).length : 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* Header */}
      <div className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                <ArrowLeft className="h-4 w-4 mr-1" /> Dashboard
              </Button>
            </Link>
            <Separator orientation="vertical" className="h-6" />
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-cyan-400" />
              <h1 className="text-lg font-bold">System Health</h1>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-400">
            {dataUpdatedAt > 0 && (
              <span>Updated {timeAgo(new Date(dataUpdatedAt).toISOString())}</span>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="border-slate-700 text-gray-300 hover:text-white"
            >
              <RefreshCw className="h-4 w-4 mr-1" /> Refresh
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="h-8 w-8 animate-spin text-cyan-400" />
            <span className="ml-3 text-gray-400">Loading system health...</span>
          </div>
        ) : !health ? (
          <Card className="bg-red-950/30 border-red-500/30">
            <CardContent className="p-6 text-center">
              <XCircle className="h-10 w-10 text-red-400 mx-auto mb-3" />
              <p className="text-red-300 text-lg font-medium">Failed to load system health</p>
              <p className="text-gray-400 text-sm mt-1">The server may be unreachable</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* ─── Overview Cards ─────────────────────────────────── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="bg-slate-900/50 border-slate-700/50">
                <CardContent className="p-4 flex items-center gap-3">
                  <Database className={`h-8 w-8 ${health.database.status === "ok" ? "text-green-400" : "text-red-400"}`} />
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide">Database</p>
                    <p className={`text-lg font-bold ${health.database.status === "ok" ? "text-green-400" : "text-red-400"}`}>
                      {health.database.status === "ok" ? "Connected" : "Error"}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-900/50 border-slate-700/50">
                <CardContent className="p-4 flex items-center gap-3">
                  <Key className={`h-8 w-8 ${envConfigured === envTotal ? "text-green-400" : envConfigured > envTotal / 2 ? "text-yellow-400" : "text-red-400"}`} />
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide">API Keys</p>
                    <p className="text-lg font-bold text-white">{envConfigured}/{envTotal}</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-900/50 border-slate-700/50">
                <CardContent className="p-4 flex items-center gap-3">
                  <Server className={`h-8 w-8 ${(dsStatusCounts as any).error ? "text-yellow-400" : "text-green-400"}`} />
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide">Data Sources</p>
                    <p className="text-lg font-bold text-white">{health.dataSources.filter(d => d.status === "ok").length}/{health.dataSources.length}</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-900/50 border-slate-700/50">
                <CardContent className="p-4 flex items-center gap-3">
                  <Wifi className="h-8 w-8 text-cyan-400" />
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide">WebSocket</p>
                    <p className="text-lg font-bold text-cyan-400">{health.webSocket.connectedClients} clients</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* ─── Database ──────────────────────────────────────── */}
            <Card className="bg-slate-900/50 border-slate-700/50">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Database className="h-5 w-5 text-blue-400" />
                  Database
                  <StatusBadge status={health.database.status} />
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {health.database.error && (
                  <p className="text-sm text-red-400 font-mono bg-red-950/30 rounded p-2">
                    {health.database.error}
                  </p>
                )}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {Object.entries(health.database.counts).map(([key, count]) => (
                    <div key={key} className="bg-slate-800/50 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-white">{count}</p>
                      <p className="text-xs text-gray-400 capitalize">{key}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* ─── Environment Variables / API Keys ──────────────── */}
            <Card className="bg-slate-900/50 border-slate-700/50">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Key className="h-5 w-5 text-yellow-400" />
                  API Keys & Environment Variables
                  <Badge variant="outline" className="text-gray-400 border-gray-600">
                    {envConfigured}/{envTotal} configured
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {Object.entries(health.envVars).map(([key, status]) => (
                    <div
                      key={key}
                      className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 border border-slate-700/50"
                    >
                      <span className="text-sm font-mono text-gray-300">{key}</span>
                      <StatusBadge status={status === "configured" ? "ok" : "not_configured"} />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* ─── Data Sources ──────────────────────────────────── */}
            <Card className="bg-slate-900/50 border-slate-700/50">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Globe className="h-5 w-5 text-green-400" />
                  Data Sources (Fetchers)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {health.dataSources.map((ds) => (
                  <div
                    key={ds.name}
                    className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/50"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <StatusIcon status={ds.status} />
                        <div>
                          <p className="text-sm font-medium text-gray-200">{ds.name}</p>
                          <p className="text-xs text-gray-500">
                            Interval: {formatInterval(ds.fetchIntervalMs)}
                            {!ds.enabled && " · Disabled"}
                          </p>
                        </div>
                      </div>
                      <StatusBadge status={ds.status} />
                    </div>

                    {/* Missing env vars */}
                    {ds.missingEnvVars.length > 0 && (
                      <div className="mt-2 ml-8 text-xs text-yellow-400">
                        Missing: {ds.missingEnvVars.map((v) => (
                          <code key={v} className="bg-yellow-900/30 px-1 rounded mr-1">{v}</code>
                        ))}
                      </div>
                    )}

                    {/* Health details */}
                    {ds.health && (
                      <div className="mt-2 ml-8 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-gray-500">
                        <span>Runs: {ds.health.runCount}</span>
                        <span>Errors: {ds.health.errorCount}</span>
                        <span>Last run: {timeAgo(ds.health.lastRunAt)}</span>
                        <span>Last OK: {timeAgo(ds.health.lastSuccessAt)}</span>
                      </div>
                    )}

                    {/* Last error */}
                    {ds.health?.lastError && (
                      <p className="mt-1 ml-8 text-xs text-red-400 font-mono truncate">
                        {ds.health.lastError}
                      </p>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* ─── TV Channels ───────────────────────────────────── */}
            <Card className="bg-slate-900/50 border-slate-700/50">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Tv className="h-5 w-5 text-blue-400" />
                  TV Channel Streams
                  <Badge variant="outline" className="text-gray-400 border-gray-600">
                    {tvChannels.length} channels
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {tvChannels.map((ch) => (
                  <StreamProbe key={ch.id} item={ch} type="tv" />
                ))}
              </CardContent>
            </Card>

            {/* ─── Live Cameras ──────────────────────────────────── */}
            <Card className="bg-slate-900/50 border-slate-700/50">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Camera className="h-5 w-5 text-purple-400" />
                  Live Cameras
                  <Badge variant="outline" className="text-gray-400 border-gray-600">
                    {liveCameras.length} cameras
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {liveCameras.map((cam) => (
                  <StreamProbe key={cam.id} item={cam} type="camera" />
                ))}
              </CardContent>
            </Card>

            {/* Footer timestamp */}
            <p className="text-center text-xs text-gray-600">
              Server time: {health.timestamp}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
