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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerTrigger, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";
import { useConnectionStatus } from "@/hooks/use-connection-status";
import { PanelRight } from "lucide-react";
import type { WarEvent, Statistics, NewsItem, Alert, AISummary, SentimentResponse } from "@shared/schema";

const SIREN_URL = "https://www.oref.org.il/Shared/alarm/Impact.mp3";

export default function Dashboard() {
  const [wsEvents, setWsEvents] = useState<WarEvent[]>([]);
  const [isMuted, setIsMuted] = useState(true);
  const [isPresentation, setIsPresentation] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isMutedRef = useRef(isMuted);
  const isMobile = useIsMobile();

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

  // API fetch success also counts as "live feed" even if WS is quiet
  const apiFresh = !!(events && events.length > 0);
  const liveFeed = isDataFresh || apiFresh;

  const allEvents = [...wsEvents, ...(events || [])].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const uniqueEvents = allEvents.filter(
    (event, index, self) => index === self.findIndex(e => e.id === event.id)
  );

  // ─── Sidebar panels (shared between desktop sidebar and mobile drawer) ───
  const sidebarContent = (
    <div className="flex flex-col gap-3 p-3">
      <EventFeed events={uniqueEvents.slice(0, 20)} />
      <AISummaryPanel summary={aiSummary || null} />
      <AlertsPanel alerts={alerts || []} />
      <NewsFeed news={news || []} />
    </div>
  );

  return (
    <div className="flex flex-col h-screen bg-background grid-overlay" data-testid="dashboard">
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

      <div className="flex-1 flex min-h-0">
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 flex min-h-0">
            <div className="flex-1 min-w-0 relative">
              <WarMap events={uniqueEvents} alerts={alerts || []} />

              {/* Mobile: floating button to open the drawer */}
              {isMobile && (
                <Drawer>
                  <DrawerTrigger asChild>
                    <Button
                      size="icon"
                      className="absolute bottom-4 right-4 z-[1000] h-12 w-12 rounded-full shadow-lg bg-primary text-primary-foreground"
                    >
                      <PanelRight className="w-5 h-5" />
                    </Button>
                  </DrawerTrigger>
                  <DrawerContent className="max-h-[80vh]">
                    <DrawerHeader>
                      <DrawerTitle className="text-sm">Intel Panels</DrawerTitle>
                    </DrawerHeader>
                    <ScrollArea className="flex-1 max-h-[70vh]">
                      {sidebarContent}
                    </ScrollArea>
                  </DrawerContent>
                </Drawer>
              )}
            </div>

            {/* Desktop: stats sidebar */}
            {!isMobile && (
              <div className="w-[320px] border-l border-border flex flex-col min-h-0 bg-card/20">
                <ScrollArea className="flex-1">
                  <div className="p-3">
                    <StatsPanel stats={stats || null} />
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>

          {!isPresentation && !isMobile && <LiveMediaPanel />}

          {!isPresentation && <NewsTicker news={news || []} />}
        </div>

        {/* Desktop: right sidebar with event feed, AI summary, alerts, news */}
        {!isMobile && (
          <div className="w-[340px] border-l border-border flex flex-col min-h-0 bg-card/10">
            <div className="flex-1 flex flex-col min-h-0">
              <div className="h-[45%] border-b border-border p-3">
                <EventFeed events={uniqueEvents.slice(0, 20)} />
              </div>

              <div className="flex-1 flex flex-col min-h-0">
                <div className="border-b border-border p-3 flex-shrink-0">
                  <AISummaryPanel summary={aiSummary || null} />
                </div>

                <div className="flex-1 flex flex-col min-h-0">
                  <div className="h-1/2 border-b border-border p-3">
                    <AlertsPanel alerts={alerts || []} />
                  </div>
                  <div className="h-1/2 p-3">
                    <NewsFeed news={news || []} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
