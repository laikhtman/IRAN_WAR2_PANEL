import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { NewsItem } from "@shared/schema";
import { Newspaper, Zap } from "lucide-react";

interface NewsFeedProps {
  news: NewsItem[];
}

const sourceColors: Record<string, string> = {
  "Reuters": "text-orange-400",
  "Al Jazeera": "text-yellow-400",
  "Times of Israel": "text-blue-400",
  "Telegram": "text-cyan-400",
  "Ynet": "text-red-400",
  "IDF Spokesperson": "text-emerald-400",
  "Kann News": "text-purple-400",
  "Channel 12": "text-pink-400",
  "Channel 13": "text-indigo-400",
  "Haaretz": "text-teal-400",
};

function useFormatTimeAgo() {
  const { t } = useTranslation();

  return (timestamp: string): string => {
    const now = new Date();
    const time = new Date(timestamp);
    const diff = Math.floor((now.getTime() - time.getTime()) / 1000);

    if (diff < 60) return t("time.secondsAgo", { count: diff });
    if (diff < 3600) return t("time.minutesAgo", { count: Math.floor(diff / 60) });
    if (diff < 86400) return t("time.hoursAgo", { count: Math.floor(diff / 3600) });
    return t("time.daysAgo", { count: Math.floor(diff / 86400) });
  };
}

export function NewsFeed({ news }: NewsFeedProps) {
  const { t } = useTranslation();
  const formatTimeAgo = useFormatTimeAgo();

  return (
    <div className="flex flex-col h-full" data-testid="news-feed">
      <div className="flex items-center justify-between gap-1 mb-2">
        <div className="flex items-center gap-2">
          <Newspaper className="w-3.5 h-3.5 text-primary" />
          <h3 className="text-[10px] uppercase tracking-[0.2em] text-primary font-bold">
            {t("news.title")}
          </h3>
        </div>
        <span className="text-[8px] text-muted-foreground tabular-nums">
          {t("news.items", { count: news.length })}
        </span>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-1.5 pr-1">
          {news.length === 0 ? (
            <div className="flex items-center justify-center h-20">
              <p className="text-[10px] text-muted-foreground">{t("news.loading")}</p>
            </div>
          ) : (
            news.map((item) => (
              <div
                key={item.id}
                className={`border rounded-md p-2.5 transition-colors hover-elevate cursor-pointer ${
                  item.breaking
                    ? "border-red-500/30 bg-red-500/5"
                    : "border-border bg-card/20"
                }`}
                data-testid={`news-item-${item.id}`}
              >
                <div className="flex items-start gap-2">
                  {item.breaking && (
                    <Zap className="w-3 h-3 text-red-400 flex-shrink-0 mt-0.5 animate-pulse-glow" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className={`text-[10px] font-semibold leading-snug mb-1 ${
                      item.breaking ? "text-red-200" : "text-foreground"
                    }`}>
                      {item.title}
                    </p>
                    <div className="flex items-center justify-between gap-1 flex-wrap">
                      <span className={`text-[8px] font-semibold uppercase tracking-wider ${
                        sourceColors[item.source] || "text-muted-foreground"
                      }`}>
                        {item.source}
                      </span>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className="text-[7px] px-1 py-0 h-3 no-default-hover-elevate no-default-active-elevate"
                        >
                          {item.category}
                        </Badge>
                        <span className="text-[8px] text-muted-foreground tabular-nums">
                          {formatTimeAgo(item.timestamp)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
