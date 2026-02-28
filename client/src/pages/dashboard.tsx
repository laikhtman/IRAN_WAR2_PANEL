import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { WarMap } from "@/components/war-map";
import { StatsPanel } from "@/components/stats-panel";
import { EventFeed } from "@/components/event-feed";
import { NewsTicker } from "@/components/news-ticker";
import { AISummaryPanel } from "@/components/ai-summary";
import { AlertsPanel } from "@/components/alerts-panel";
import { NewsFeed } from "@/components/news-feed";
import { HeaderBar } from "@/components/header-bar";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { WarEvent, Statistics, NewsItem, Alert, AISummary } from "@shared/schema";

export default function Dashboard() {
  const [wsEvents, setWsEvents] = useState<WarEvent[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

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

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    let unmounted = false;

    const connect = () => {
      if (unmounted) return;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "new_event") {
            setWsEvents(prev => [data.event, ...prev].slice(0, 5));
          }
        } catch (e) {}
      };

      ws.onclose = () => {
        if (!unmounted) {
          setTimeout(connect, 3000);
        }
      };
    };

    connect();

    return () => {
      unmounted = true;
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const allEvents = [...wsEvents, ...(events || [])].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const uniqueEvents = allEvents.filter(
    (event, index, self) => index === self.findIndex(e => e.id === event.id)
  );

  return (
    <div className="flex flex-col h-screen bg-background grid-overlay" data-testid="dashboard">
      <HeaderBar />

      <div className="flex-1 flex min-h-0">
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 flex min-h-0">
            <div className="flex-1 min-w-0 relative">
              <WarMap events={uniqueEvents} alerts={alerts || []} />
            </div>

            <div className="w-[320px] border-l border-border flex flex-col min-h-0 bg-card/20">
              <ScrollArea className="flex-1">
                <div className="p-3">
                  <StatsPanel stats={stats || null} />
                </div>
              </ScrollArea>
            </div>
          </div>

          <NewsTicker news={news || []} />
        </div>

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
      </div>
    </div>
  );
}
