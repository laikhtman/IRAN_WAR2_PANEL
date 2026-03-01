import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState, useCallback } from "react";
import { WarMap } from "@/components/war-map";
import { StatsPanel } from "@/components/stats-panel";
import { EventFeed } from "@/components/event-feed";
import { NewsTicker } from "@/components/news-ticker";
import { AISummaryPanel } from "@/components/ai-summary";
import { AlertsPanel } from "@/components/alerts-panel";
import { NewsFeed } from "@/components/news-feed";
import { HeaderBar } from "@/components/header-bar";
import { LiveMediaPanel } from "@/components/live-media-panel";
import { KeyboardShortcuts } from "@/components/keyboard-shortcuts";
import { OfflineBanner } from "@/components/offline-banner";
import { ErrorBoundary } from "@/components/error-boundary";
import { FeedbackDialog } from "@/components/feedback-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { useConnectionStatus } from "@/hooks/use-connection-status";
import {
  ChevronLeft,
  ChevronRight,
  Map,
  Radio,
  Brain,
  Newspaper,
  Tv,
  AlertTriangle,
  Target,
  Shield,
} from "lucide-react";
import type { WarEvent, Statistics, NewsItem, Alert, AISummary, SentimentResponse } from "@shared/schema";

const SIREN_URL = "https://www.oref.org.il/Shared/alarm/Impact.mp3";

// ─── localStorage helpers ───
function readBool(key: string, fallback: boolean): boolean {
  try {
    const v = localStorage.getItem(key);
    if (v === "true") return true;
    if (v === "false") return false;
  } catch {}
  return fallback;
}

export default function Dashboard() {
  const [wsEvents, setWsEvents] = useState<WarEvent[]>([]);
  const [isMuted, setIsMuted] = useState(true);
  const [isPresentation, setIsPresentation] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isMutedRef = useRef(isMuted);
  const isMobile = useIsMobile();

  // ─── Viewport width for responsive sidebar merge ───
  const [viewportWidth, setViewportWidth] = useState(typeof window !== "undefined" ? window.innerWidth : 1920);
  useEffect(() => {
    const onResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  const isWide = viewportWidth >= 1440;

  // ─── Sidebar collapse state (desktop) ───
  const [statsCollapsed, setStatsCollapsed] = useState(() => readBool("war-panel-stats-collapsed", false));
  const [rightCollapsed, setRightCollapsed] = useState(() => readBool("war-panel-right-collapsed", false));

  const toggleStatsCollapsed = useCallback(() => {
    setStatsCollapsed(prev => {
      const next = !prev;
      try { localStorage.setItem("war-panel-stats-collapsed", String(next)); } catch {}
      return next;
    });
  }, []);

  const toggleRightCollapsed = useCallback(() => {
    setRightCollapsed(prev => {
      const next = !prev;
      try { localStorage.setItem("war-panel-right-collapsed", String(next)); } catch {}
      return next;
    });
  }, []);

  // ─── Mobile tab state ───
  const [mobileTab, setMobileTab] = useState<"map" | "events" | "intel" | "news" | "media">("map");

  // WebSocket with real connection status tracking
  const { wsStatus, isDataFresh } = useConnectionStatus(
    useCallback((data: any) => {
      if (data.type === "new_event") {
        setWsEvents(prev => [data.event, ...prev].slice(0, 5));

        // Play siren for air_raid_alert events when not muted
        if (data.event.type === "air_raid_alert" && !isMutedRef.current && audioRef.current) {
          audioRef.current.currentTime = 0;
          audioRef.current.play().catch(() => {});
        }
      }
    }, [])
  );

  // Keep ref in sync with state so the WS handler always sees current value
  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  // Initialize audio element
  useEffect(() => {
    const audio = new Audio(SIREN_URL);
    audio.loop = false;
    audio.preload = "auto";
    audioRef.current = audio;
    return () => {
      audio.pause();
      audio.src = "";
    };
  }, []);

  const handleToggleMute = useCallback(() => {
    setIsMuted(prev => !prev);
  }, []);

  const handleTogglePresentation = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsPresentation(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsPresentation(false);
    }
  }, []);

  useEffect(() => {
    const handler = () => {
      if (!document.fullscreenElement) {
        setIsPresentation(false);
      }
    };
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const { data: events } = useQuery<WarEvent[]>({
    queryKey: ["/api/events"],
    refetchInterval: 15000,
  });

  const { data: stats } = useQuery<Statistics>({
    queryKey: ["/api/statistics"],
    refetchInterval: 10000,
  });

  const { data: news, isLoading: newsLoading } = useQuery<NewsItem[]>({
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

  // API fetch success also counts as "live feed" even if WS is quiet
  const apiFresh = !!(events && events.length > 0);
  const liveFeed = isDataFresh || apiFresh;

  const allEvents = [...wsEvents, ...(events || [])].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const uniqueEvents = allEvents.filter(
    (event, index, self) => index === self.findIndex(e => e.id === event.id)
  );

  const activeAlerts = (alerts || []).filter(a => a.active);

  // Show informational banner when connected but no data has arrived yet
  const noDataYet = wsStatus === "connected" && uniqueEvents.length === 0 && (news || []).length === 0 && activeAlerts.length === 0;

  // ─── MOBILE LAYOUT ───
  if (isMobile) {
    const tabContent = () => {
      switch (mobileTab) {
        case "map":
          return (
            <div className="flex-1 relative min-h-0 h-full">
              <WarMap events={uniqueEvents} alerts={alerts || []} isMobile={true} />
              <div className="absolute bottom-0 left-0 right-0 z-[400]">
                <NewsTicker news={news || []} />
              </div>
            </div>
          );
        case "events":
          return (
            <ScrollArea className="flex-1">
              <div className="p-3 pb-[env(safe-area-inset-bottom)]">
                <ErrorBoundary fallbackTitle="Events failed">
                  <EventFeed events={uniqueEvents.slice(0, 20)} />
                </ErrorBoundary>
              </div>
            </ScrollArea>
          );
        case "intel":
          return (
            <ScrollArea className="flex-1">
              <div className="p-3 space-y-3 pb-[env(safe-area-inset-bottom)]">
                <ErrorBoundary fallbackTitle="Stats failed">
                  <StatsPanel stats={stats || null} />
                </ErrorBoundary>
                <ErrorBoundary fallbackTitle="AI Summary failed">
                  <AISummaryPanel summary={aiSummary || null} />
                </ErrorBoundary>
                <ErrorBoundary fallbackTitle="Alerts failed">
                  <AlertsPanel alerts={alerts || []} />
                </ErrorBoundary>
              </div>
            </ScrollArea>
          );
        case "news":
          return (
            <ScrollArea className="flex-1">
              <div className="p-3 pb-[env(safe-area-inset-bottom)]">
                <ErrorBoundary fallbackTitle="News failed">
                  <NewsFeed news={news || []} isLoading={newsLoading} />
                </ErrorBoundary>
              </div>
            </ScrollArea>
          );
        case "media":
          return (
            <div className="flex-1 pb-[env(safe-area-inset-bottom)]">
              <ErrorBoundary fallbackTitle="Media failed">
                <LiveMediaPanel />
              </ErrorBoundary>
            </div>
          );
      }
    };

    const tabs: { key: typeof mobileTab; label: string; icon: React.ReactNode; badge?: React.ReactNode }[] = [
      { key: "map", label: "Map", icon: <Map className="w-5 h-5" /> },
      {
        key: "events",
        label: "Events",
        icon: <Radio className="w-5 h-5" />,
        badge:
          wsEvents.length > 0 && mobileTab !== "events" ? (
            <span className="absolute top-0 right-1 w-2.5 h-2.5 rounded-full bg-red-500" />
          ) : null,
      },
      {
        key: "intel",
        label: "Intel",
        icon: <Brain className="w-5 h-5" />,
        badge:
          activeAlerts.length > 0 ? (
            <span className="absolute -top-0.5 right-0 min-w-[16px] h-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center px-1 font-medium">
              {activeAlerts.length}
            </span>
          ) : null,
      },
      { key: "news", label: "News", icon: <Newspaper className="w-5 h-5" /> },
      { key: "media", label: "Media", icon: <Tv className="w-5 h-5" /> },
    ];

    return (
      <div className="flex flex-col h-screen overflow-hidden bg-background grid-overlay" data-testid="dashboard">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-[9999] focus:p-2 focus:bg-primary focus:text-primary-foreground">
          Skip to content
        </a>
        <OfflineBanner />
        <HeaderBar
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          isPresentation={isPresentation}
          onTogglePresentation={handleTogglePresentation}
          sentimentData={sentimentData || null}
          wsStatus={wsStatus}
          isLiveFeed={liveFeed}
        />
        <KeyboardShortcuts onToggleMute={handleToggleMute} onTogglePresentation={handleTogglePresentation} />

        {noDataYet && (
          <div className="bg-yellow-500/10 border-b border-yellow-500/30 px-3 py-1.5 text-center">
            <p className="text-[11px] text-yellow-400 font-medium">No live data yet — intelligence feeds are initializing</p>
          </div>
        )}

        {/* Tab content area — fills between header and tab bar */}
        <div id="main-content" className="flex-1 flex flex-col min-h-0 pb-14">{tabContent()}</div>

        {/* Bottom Tab Bar */}
        <nav className="fixed bottom-0 left-0 right-0 z-[1000] h-14 pb-[env(safe-area-inset-bottom)] bg-card/95 backdrop-blur-md border-t border-border flex items-center justify-around" role="tablist" aria-label="Dashboard navigation">
          {tabs.map(tab => {
            const active = mobileTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setMobileTab(tab.key)}
                role="tab"
                aria-selected={active}
                aria-label={tab.label}
                className={`relative flex flex-col items-center justify-center flex-1 h-full ${
                  active ? "border-t-2 border-primary text-primary" : "text-muted-foreground"
                }`}
              >
                <span className="relative">
                  {tab.icon}
                  {tab.badge}
                </span>
                <span className="text-[11px] mt-0.5">{tab.label}</span>
              </button>
            );
          })}
        </nav>
        <FeedbackDialog />
      </div>
    );
  }

  // ─── DESKTOP LAYOUT ───

  // Collapse‐toggle button shared component
  const CollapseBtn = ({
    collapsed,
    onToggle,
    side,
    label,
  }: {
    collapsed: boolean;
    onToggle: () => void;
    side: "left" | "right";
    label?: string;
  }) => (
    <Button
      variant="ghost"
      size="icon"
      onClick={onToggle}
      title={collapsed ? `Show ${label || "panel"}` : `Hide ${label || "panel"}`}
      className={`absolute top-1/2 -translate-y-1/2 z-[600] h-8 w-8 rounded-full border border-border bg-card/90 shadow-md hover:bg-card hover:border-primary/50 transition-colors ${
        side === "left" ? "-left-4" : "-right-4"
      }`}
    >
      {side === "left" ? (
        collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />
      ) : (
        collapsed ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
      )}
    </Button>
  );

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background grid-overlay" data-testid="dashboard">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-[9999] focus:p-2 focus:bg-primary focus:text-primary-foreground">
        Skip to content
      </a>
      <OfflineBanner />
      <HeaderBar
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
        isPresentation={isPresentation}
        onTogglePresentation={handleTogglePresentation}
        sentimentData={sentimentData || null}
        wsStatus={wsStatus}
        isLiveFeed={liveFeed}
      />
      <KeyboardShortcuts onToggleMute={handleToggleMute} onTogglePresentation={handleTogglePresentation} />

      {noDataYet && (
        <div className="bg-yellow-500/10 border-b border-yellow-500/30 px-3 py-1.5 text-center">
          <p className="text-[11px] text-yellow-400 font-medium">No live data yet — intelligence feeds are initializing</p>
        </div>
      )}

      <div id="main-content" className="flex-1 flex min-h-0">
        {/* ─── Main center column (map + live media + ticker) ─── */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 flex min-h-0">
            {/* Map area */}
            <div className="flex-1 min-w-0 relative h-full">
              <WarMap events={uniqueEvents} alerts={alerts || []} isMobile={false} />

              {/* Presentation mode: floating stat badges */}
              {isPresentation && stats && (
                <div className="absolute top-4 right-4 z-[500] flex flex-col gap-2">
                  <div className="flex items-center gap-2 rounded-lg bg-black/50 backdrop-blur-sm px-3 py-1.5 text-white text-sm">
                    <Target className="w-4 h-4 text-red-400" />
                    <span className="font-medium">{stats.totalMissilesLaunched}</span>
                    <span className="text-white/70 text-xs">missiles</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-lg bg-black/50 backdrop-blur-sm px-3 py-1.5 text-white text-sm">
                    <Shield className="w-4 h-4 text-green-400" />
                    <span className="font-medium">{stats.totalIntercepted}</span>
                    <span className="text-white/70 text-xs">intercepts</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-lg bg-black/50 backdrop-blur-sm px-3 py-1.5 text-white text-sm">
                    <AlertTriangle className="w-4 h-4 text-yellow-400" />
                    <span className="font-medium">{stats.activeAlerts}</span>
                    <span className="text-white/70 text-xs">alerts</span>
                  </div>
                </div>
              )}
            </div>

            {/* Stats sidebar — only shown as separate column when viewport >= 1440 */}
            {isWide && (
              <div className="relative flex-shrink-0">
                <CollapseBtn collapsed={statsCollapsed} onToggle={toggleStatsCollapsed} side="left" label="Stats" />
                <div
                  className="border-l border-border flex flex-col min-h-0 bg-card/20 contain-layout transition-all duration-300 overflow-hidden"
                  style={{ width: statsCollapsed ? 0 : 320 }}
                >
                  <ScrollArea className="flex-1">
                    <div className="p-3" style={{ width: 320 }}>
                      <ErrorBoundary fallbackTitle="Stats failed">
                        <StatsPanel stats={stats || null} />
                      </ErrorBoundary>
                    </div>
                  </ScrollArea>
                </div>
              </div>
            )}
          </div>

          {!isPresentation && <LiveMediaPanel />}

          <NewsTicker news={news || []} />
        </div>

        {/* ─── Right sidebar ─── */}
        <div className="relative flex-shrink-0">
          <CollapseBtn collapsed={rightCollapsed} onToggle={toggleRightCollapsed} side="right" label="Intel" />
          {rightCollapsed ? (
            /* Collapsed strip — visible affordance so users know content is hidden */
            <div
              className="border-l border-border bg-card/20 flex flex-col items-center justify-center cursor-pointer hover:bg-card/40 transition-colors"
              style={{ width: 36 }}
              onClick={toggleRightCollapsed}
              title="Show Intel Panel"
            >
              <ChevronLeft className="w-4 h-4 text-muted-foreground mb-2" />
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.15em] writing-mode-vertical" style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}>
                Intel Panel
              </span>
            </div>
          ) : (
          <div
            className="border-l border-border flex flex-col min-h-0 bg-card/10 contain-layout transition-all duration-300 overflow-hidden"
            style={{ width: 340 }}
          >
            <ScrollArea className="flex-1">
              <div className="flex flex-col min-h-0" style={{ width: 340 }}>
                {/* When viewport < 1440, merge StatsPanel into right sidebar */}
                {!isWide && (
                  <div className="border-b border-border p-3">
                    <ErrorBoundary fallbackTitle="Stats failed">
                      <StatsPanel stats={stats || null} />
                    </ErrorBoundary>
                  </div>
                )}

                <div className="border-b border-border p-3" style={{ minHeight: "35%" }}>
                  <ErrorBoundary fallbackTitle="Events failed">
                    <EventFeed events={uniqueEvents.slice(0, 20)} />
                  </ErrorBoundary>
                </div>

                <div className="border-b border-border p-3 flex-shrink-0">
                  <ErrorBoundary fallbackTitle="AI Summary failed">
                    <AISummaryPanel summary={aiSummary || null} />
                  </ErrorBoundary>
                </div>

                <div className="border-b border-border p-3">
                  <ErrorBoundary fallbackTitle="Alerts failed">
                    <AlertsPanel alerts={alerts || []} />
                  </ErrorBoundary>
                </div>

                <div className="p-3">
                  <ErrorBoundary fallbackTitle="News failed">
                    <NewsFeed news={news || []} isLoading={newsLoading} />
                  </ErrorBoundary>
                </div>
              </div>
            </ScrollArea>
          </div>
          )}
        </div>
      </div>
      <FeedbackDialog />
    </div>
  );
}
