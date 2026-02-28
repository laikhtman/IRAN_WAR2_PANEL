import { useQuery } from "@tanstack/react-query";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { WarMap } from "@/components/war-map";
import { useConnectionStatus } from "@/hooks/use-connection-status";
import {
  Shield,
  Wifi,
  WifiOff,
  AlertTriangle,
  Brain,
  Crosshair,
  Zap,
  Target,
  TrendingUp,
  Newspaper,
  Tv,
} from "lucide-react";
import type {
  WarEvent,
  Statistics,
  NewsItem,
  Alert,
  AISummary,
  SentimentResponse,
} from "@shared/schema";

// ── Panel identifiers ──────────────────────────────────────────────────────
const PANEL_IDS = ["stats", "ai", "alerts", "media", "news"] as const;
type PanelId = (typeof PANEL_IDS)[number];

const PANEL_ICONS: Record<PanelId, React.ReactNode> = {
  stats: <TrendingUp className="w-5 h-5" />,
  ai: <Brain className="w-5 h-5" />,
  alerts: <AlertTriangle className="w-5 h-5" />,
  media: <Tv className="w-5 h-5" />,
  news: <Newspaper className="w-5 h-5" />,
};

const PANEL_LABELS: Record<PanelId, string> = {
  stats: "Statistics",
  ai: "AI Threat Assessment",
  alerts: "Active Alerts",
  media: "Live Media",
  news: "News Headlines",
};

// ── Helpers ────────────────────────────────────────────────────────────────
function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

function formatTime(date: Date, tz: string) {
  return date.toLocaleTimeString("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function formatDate(date: Date, tz: string) {
  return date.toLocaleDateString("en-GB", { timeZone: tz, weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function threatColor(level: string): string {
  switch (level) {
    case "critical": return "text-red-500";
    case "high": return "text-orange-500";
    case "medium": return "text-yellow-400";
    case "low": return "text-green-400";
    default: return "text-muted-foreground";
  }
}

function threatBg(level: string): string {
  switch (level) {
    case "critical": return "bg-red-500/20 border-red-500/50 text-red-400";
    case "high": return "bg-orange-500/20 border-orange-500/50 text-orange-400";
    case "medium": return "bg-yellow-500/20 border-yellow-500/50 text-yellow-300";
    case "low": return "bg-green-500/20 border-green-500/50 text-green-400";
    default: return "bg-muted/20 border-border text-muted-foreground";
  }
}

function sentimentDot(s?: number) {
  if (s == null) return "bg-gray-500";
  if (s > 0.2) return "bg-green-500";
  if (s < -0.2) return "bg-red-500";
  return "bg-yellow-500";
}

// ── URL Params ─────────────────────────────────────────────────────────────
function parseTvParams(): { cycleSeconds: number; panels: PanelId[] } {
  const params = new URLSearchParams(window.location.search);
  const cycle = parseInt(params.get("cycle") || "8", 10);
  const panelsParam = params.get("panels");
  let panels: PanelId[] = [...PANEL_IDS];
  if (panelsParam) {
    const requested = panelsParam.split(",").filter((p): p is PanelId => PANEL_IDS.includes(p as PanelId));
    if (requested.length > 0) panels = requested;
  }
  return { cycleSeconds: Math.max(3, cycle), panels };
}

// ── KAN11 embed URL (first available stream) ──────────────────────────────
const MEDIA_STREAM = {
  name: "Kan 11",
  embedUrl: "https://www.livehdtv.com/embed/kan-11-live/",
};

// ═══════════════════════════════════════════════════════════════════════════
// TV Dashboard Component
// ═══════════════════════════════════════════════════════════════════════════
export default function TvDashboard() {
  const { t } = useTranslation();
  const now = useNow();
  const { cycleSeconds, panels } = useMemo(() => parseTvParams(), []);

  // ── WebSocket ──────────────────────────────────────────────────────────
  const [wsEvents, setWsEvents] = useState<WarEvent[]>([]);
  const { wsStatus, isDataFresh } = useConnectionStatus(
    useCallback((data: any) => {
      if (data.type === "new_event") {
        setWsEvents((prev) => [data.event, ...prev].slice(0, 20));
      }
    }, []),
  );

  // ── React Query (same endpoints as main dashboard) ────────────────────
  const { data: events } = useQuery<WarEvent[]>({
    queryKey: ["/api/events"],
    refetchInterval: 15000,
  });

  const { data: stats } = useQuery<Statistics>({
    queryKey: ["/api/statistics"],
    refetchInterval: 10000,
  });

  const { data: news } = useQuery<NewsItem[]>({
    queryKey: ["/api/news"],
    refetchInterval: 20000,
  });

  const { data: alerts } = useQuery<Alert[]>({
    queryKey: ["/api/alerts"],
    refetchInterval: 8000,
  });

  const { data: aiSummary } = useQuery<AISummary>({
    queryKey: ["/api/ai-summary"],
    refetchInterval: 30000,
  });

  const { data: sentimentData } = useQuery<SentimentResponse>({
    queryKey: ["/api/news/sentiment"],
    refetchInterval: 30000,
  });

  // ── Derived data ──────────────────────────────────────────────────────
  const allEvents = useMemo(() => {
    const merged = [...wsEvents, ...(events || [])].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
    return merged.filter((e, i, arr) => i === arr.findIndex((x) => x.id === e.id));
  }, [wsEvents, events]);

  const activeAlerts = useMemo(() => (alerts || []).filter((a) => a.active), [alerts]);
  const hasActiveAlerts = activeAlerts.length > 0;
  const apiFresh = !!(events && events.length > 0);
  const liveFeed = isDataFresh || apiFresh;

  // ── Auto-cycling overlay ──────────────────────────────────────────────
  const [activePanelIdx, setActivePanelIdx] = useState(0);
  const [visible, setVisible] = useState(true);
  const cycleTimerRef = useRef<ReturnType<typeof setTimeout>>();

  // When active alerts arrive, pin to alerts view
  useEffect(() => {
    if (hasActiveAlerts && panels.includes("alerts")) {
      const alertIdx = panels.indexOf("alerts");
      setActivePanelIdx(alertIdx);
    }
  }, [hasActiveAlerts, panels]);

  // Cycle logic with cross-fade
  useEffect(() => {
    if (hasActiveAlerts) return; // pause cycling during alerts

    const advance = () => {
      setVisible(false); // fade out
      setTimeout(() => {
        setActivePanelIdx((prev) => (prev + 1) % panels.length);
        setVisible(true); // fade in
      }, 500);
    };

    cycleTimerRef.current = setInterval(advance, cycleSeconds * 1000);
    return () => clearInterval(cycleTimerRef.current);
  }, [cycleSeconds, panels.length, hasActiveAlerts]);

  const activePanel = panels[activePanelIdx];

  // ── Ticker data ───────────────────────────────────────────────────────
  const tickerNews = useMemo(() => {
    const items = news || [];
    const breaking = items.filter((n) => n.breaking);
    return breaking.length > 0 ? breaking : items.slice(0, 10);
  }, [news]);

  const tickerText = tickerNews.map((n) => `${n.source}: ${n.title}`).join("  \u00B7\u00B7\u00B7  ");

  // ═════════════════════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════════════════════
  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden" data-testid="tv-dashboard">
      {/* ── TV STATUS BAR ──────────────────────────────────────────── */}
      <div className="h-14 flex-shrink-0 flex items-center justify-between px-6 bg-card/80 backdrop-blur-sm border-b border-border/50 z-30">
        {/* Left: branding */}
        <div className="flex items-center gap-3">
          <Shield className="w-5 h-5 text-primary" />
          <span className="text-xl font-bold tracking-wider text-foreground">WAR PANEL</span>
          <span className="px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-widest bg-primary/20 text-primary border border-primary/30">
            TV MODE
          </span>
        </div>

        {/* Center: clocks + date */}
        <div className="flex items-center gap-6">
          <div className="flex flex-col items-center">
            <span className="text-sm text-muted-foreground">Israel</span>
            <span className="text-2xl font-mono tabular-nums text-cyan-400 font-bold">
              {formatTime(now, "Asia/Jerusalem")}
            </span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-sm text-muted-foreground">Tehran</span>
            <span className="text-2xl font-mono tabular-nums text-red-400 font-bold">
              {formatTime(now, "Asia/Tehran")}
            </span>
          </div>
          <span className="text-base text-muted-foreground">{formatDate(now, "Asia/Jerusalem")}</span>
        </div>

        {/* Right: WS status + LIVE */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {wsStatus === "connected" ? (
              <Wifi className="w-4 h-4 text-green-400" />
            ) : (
              <WifiOff className="w-4 h-4 text-red-400" />
            )}
            <span className={`text-base font-medium ${wsStatus === "connected" ? "text-green-400" : "text-red-400"}`}>
              {wsStatus === "connected" ? "WS Connected" : wsStatus === "reconnecting" ? "Reconnecting…" : "Disconnected"}
            </span>
          </div>
          {liveFeed && (
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
              </span>
              <span className="text-base font-bold text-red-400 uppercase tracking-wider">LIVE</span>
            </div>
          )}
        </div>
      </div>

      {/* ── MAP + OVERLAY ──────────────────────────────────────────── */}
      <div className="flex-1 relative min-h-0">
        {/* Full-bleed map background */}
        <div className="absolute inset-0 z-0">
          <WarMap events={allEvents} alerts={alerts || []} />
        </div>

        {/* Floating overlay panel */}
        <div
          className={`absolute bottom-20 left-6 z-20 w-[480px] max-h-[400px] rounded-xl border backdrop-blur-md transition-opacity duration-500 ${
            visible ? "opacity-100" : "opacity-0"
          } ${
            hasActiveAlerts && activePanel === "alerts"
              ? "bg-card/85 border-red-500/70 animate-pulse-glow"
              : "bg-card/85 border-border/50"
          }`}
        >
          {/* Panel header */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border/30">
            {PANEL_ICONS[activePanel]}
            <span className="text-base font-semibold tracking-wide">{PANEL_LABELS[activePanel]}</span>
          </div>

          {/* Panel body */}
          <div className="p-4 overflow-hidden max-h-[320px]">
            {activePanel === "stats" && <StatsView stats={stats ?? null} />}
            {activePanel === "ai" && <AiView summary={aiSummary ?? null} />}
            {activePanel === "alerts" && <AlertsView alerts={activeAlerts} />}
            {activePanel === "media" && <MediaView />}
            {activePanel === "news" && <NewsView news={news ?? []} />}
          </div>

          {/* Indicator dots */}
          <div className="flex items-center justify-center gap-2 pb-3">
            {panels.map((p, i) => (
              <span
                key={p}
                className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                  i === activePanelIdx ? "bg-primary" : "bg-muted-foreground/30"
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ── TV NEWS TICKER ─────────────────────────────────────────── */}
      <div className="h-10 flex-shrink-0 w-full border-t border-red-500/30 bg-red-500/5 z-30">
        <div className="flex items-center h-full">
          <div className="flex items-center gap-1.5 px-4 bg-red-600 h-full flex-shrink-0">
            <AlertTriangle className="w-4 h-4 text-white animate-blink-alert" />
            <span className="text-base font-bold text-white uppercase tracking-[0.15em]">BREAKING</span>
          </div>
          <div className="flex-1 overflow-hidden">
            <div
              className="whitespace-nowrap"
              style={{ animation: "ticker-scroll 60s linear infinite" }}
            >
              <span className="text-base text-red-300 font-medium inline-block px-4">
                {tickerText}
                {"  \u00B7\u00B7\u00B7  "}
                {tickerText}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Overlay Panel Views
// ═══════════════════════════════════════════════════════════════════════════

// ── View 1: Stats ──────────────────────────────────────────────────────────
function StatsView({ stats }: { stats: Statistics | null }) {
  if (!stats) {
    return <p className="text-base text-muted-foreground">Loading statistics…</p>;
  }

  const cards = [
    { label: "Missiles Launched", value: stats.totalMissilesLaunched, icon: <Crosshair className="w-5 h-5" />, color: "text-red-400" },
    { label: "Intercepted", value: stats.totalIntercepted, icon: <Shield className="w-5 h-5" />, color: "text-green-400" },
    { label: "Impacts", value: stats.totalHits, icon: <Target className="w-5 h-5" />, color: "text-orange-400" },
    { label: "Drones", value: stats.totalDronesLaunched, icon: <Zap className="w-5 h-5" />, color: "text-yellow-400" },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {cards.map((c) => (
          <div key={c.label} className="bg-background/40 rounded-lg p-3 flex flex-col items-center">
            <div className={`mb-1 ${c.color}`}>{c.icon}</div>
            <span className={`text-5xl font-bold font-mono tabular-nums ${c.color}`}>{c.value}</span>
            <span className="text-base uppercase tracking-widest text-muted-foreground mt-1">{c.label}</span>
          </div>
        ))}
      </div>
      <div className="text-center">
        <span className="text-base text-muted-foreground">Interception Rate: </span>
        <span className="text-3xl font-bold font-mono tabular-nums text-green-400">
          {stats.interceptionRate.toFixed(1)}%
        </span>
      </div>
    </div>
  );
}

// ── View 2: AI Summary ─────────────────────────────────────────────────────
function AiView({ summary }: { summary: AISummary | null }) {
  if (!summary) {
    return <p className="text-base text-muted-foreground">Loading AI assessment…</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span className={`px-3 py-1 rounded border text-base font-semibold uppercase tracking-wider ${threatBg(summary.threatAssessment)}`}>
          {summary.threatAssessment}
        </span>
      </div>
      <p className="text-base text-foreground leading-relaxed">{summary.summary}</p>
      <ul className="space-y-1.5">
        {summary.keyPoints.slice(0, 5).map((point, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
            <span>{point}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── View 3: Active Alerts ──────────────────────────────────────────────────
function AlertsView({ alerts }: { alerts: Alert[] }) {
  if (alerts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <div className="w-16 h-16 rounded-full bg-green-500/10 border-2 border-green-500/40 flex items-center justify-center mb-4" style={{ boxShadow: "0 0 30px rgba(34,197,94,0.3)" }}>
          <Shield className="w-8 h-8 text-green-400" />
        </div>
        <span className="text-2xl font-bold text-green-400 tracking-wider">ALL CLEAR</span>
        <span className="text-base text-muted-foreground mt-1">No active alerts</span>
      </div>
    );
  }

  return (
    <div className="space-y-3 overflow-hidden">
      {alerts.slice(0, 5).map((alert) => (
        <div key={alert.id} className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
          <p className="text-xl font-bold text-red-400">{alert.area}</p>
          <p className="text-sm text-muted-foreground mt-1">{alert.threat}</p>
          <p className="text-sm text-muted-foreground/60 mt-0.5">{timeAgo(alert.timestamp)}</p>
        </div>
      ))}
    </div>
  );
}

// ── View 4: Live Media ─────────────────────────────────────────────────────
function MediaView() {
  return (
    <div className="space-y-2">
      <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
        <iframe
          src={MEDIA_STREAM.embedUrl}
          className="absolute inset-0 w-full h-full rounded-lg"
          allow="autoplay; encrypted-media"
          allowFullScreen
          title={MEDIA_STREAM.name}
        />
        <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm rounded px-2 py-1">
          <span className="text-sm font-medium text-white">{MEDIA_STREAM.name}</span>
        </div>
      </div>
    </div>
  );
}

// ── View 5: News Headlines ─────────────────────────────────────────────────
function NewsView({ news }: { news: NewsItem[] }) {
  const headlines = news.slice(0, 5);

  if (headlines.length === 0) {
    return <p className="text-base text-muted-foreground">No recent headlines</p>;
  }

  return (
    <div className="space-y-3">
      {headlines.map((item) => (
        <div key={item.id} className="flex items-start gap-3">
          <span className={`mt-1.5 w-2.5 h-2.5 rounded-full flex-shrink-0 ${sentimentDot(item.sentiment)}`} />
          <div className="min-w-0">
            <p className="text-base font-semibold text-foreground leading-tight truncate">{item.title}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-sm text-primary">{item.source}</span>
              <span className="text-sm text-muted-foreground">{timeAgo(item.timestamp)}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
