import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import type { NewsItem } from "@shared/schema";
import { Newspaper, Zap, Search, X } from "lucide-react";

interface NewsFeedProps {
  news: NewsItem[];
  isLoading?: boolean;
}

function getSentimentColor(sentiment: number | undefined): string | null {
  if (sentiment === undefined || sentiment === null) return null;
  if (sentiment <= -0.5) return "bg-red-500";
  if (sentiment <= -0.15) return "bg-orange-400";
  if (sentiment <= 0.15) return "bg-yellow-400";
  if (sentiment <= 0.5) return "bg-lime-400";
  return "bg-emerald-400";
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

const LANG_OPTIONS = ["All", "EN", "HE", "AR", "FA"] as const;
type LangFilter = typeof LANG_OPTIONS[number];

const TIME_OPTIONS = ["all", "1h", "6h", "24h"] as const;
type TimeFilter = typeof TIME_OPTIONS[number];

const TIME_MS: Record<TimeFilter, number> = {
  all: Infinity,
  "1h": 3_600_000,
  "6h": 21_600_000,
  "24h": 86_400_000,
};

function getStoredFilter<T extends string>(key: string, fallback: T, valid: readonly T[]): T {
  try {
    const v = localStorage.getItem(key) as T;
    if (valid.includes(v)) return v;
  } catch {}
  return fallback;
}

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

export function NewsFeed({ news, isLoading = false }: NewsFeedProps) {
  const { t } = useTranslation();
  const formatTimeAgo = useFormatTimeAgo();

  const [searchQuery, setSearchQuery] = useState("");
  const [langFilter, setLangFilter] = useState<LangFilter>(
    () => getStoredFilter("war-panel-news-lang", "All", LANG_OPTIONS)
  );
  const [timeFilter, setTimeFilter] = useState<TimeFilter>(
    () => getStoredFilter("war-panel-news-time", "all", TIME_OPTIONS)
  );

  const setLang = (v: LangFilter) => {
    setLangFilter(v);
    try { localStorage.setItem("war-panel-news-lang", v); } catch {}
  };
  const setTime = (v: TimeFilter) => {
    setTimeFilter(v);
    try { localStorage.setItem("war-panel-news-time", v); } catch {}
  };

  const filteredNews = useMemo(() => {
    const now = Date.now();
    const maxAge = TIME_MS[timeFilter];
    const q = searchQuery.toLowerCase().trim();
    const langCode = langFilter === "All" ? null : langFilter.toLowerCase();

    return news.filter((item) => {
      // Time filter
      if (maxAge !== Infinity) {
        const age = now - new Date(item.timestamp).getTime();
        if (age > maxAge) return false;
      }
      // Language filter
      if (langCode && item.language && item.language.toLowerCase() !== langCode) return false;
      // Search filter
      if (q && !item.title.toLowerCase().includes(q) && !item.source.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [news, searchQuery, langFilter, timeFilter]);

  const hasActiveFilters = searchQuery || langFilter !== "All" || timeFilter !== "all";

  return (
    <div data-testid="news-feed">
      {/* Header */}
      <div className="flex items-center justify-between gap-1 mb-1.5">
        <div className="flex items-center gap-2">
          <Newspaper className="w-3.5 h-3.5 text-primary" />
          <h3 className="text-[11px] uppercase tracking-[0.2em] text-primary font-bold">
            {t("news.title")}
          </h3>
        </div>
        <span className="text-[11px] text-muted-foreground tabular-nums">
          {isLoading && news.length === 0
            ? t("news.loadingSkeleton")
            : hasActiveFilters
              ? `${filteredNews.length}/${news.length}`
              : t("news.items", { count: news.length })}
        </span>
      </div>

      {/* Search bar */}
      <div className="relative mb-1.5">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t("news.search")}
          className="h-7 pl-6 pr-6 text-[11px] bg-card/30 border-border"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Filter row: language + time */}
      <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
        {/* Language filters */}
        <div className="flex items-center gap-0.5">
          {LANG_OPTIONS.map((lang) => (
            <button
              key={lang}
              onClick={() => setLang(lang)}
              className={`px-1.5 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                langFilter === lang
                  ? "bg-primary text-primary-foreground"
                  : "bg-card/30 text-muted-foreground hover:text-foreground hover:bg-card/50"
              }`}
            >
              {lang === "All" ? t("news.all") : lang}
            </button>
          ))}
        </div>

        <div className="h-3 w-px bg-border" />

        {/* Time filters */}
        <div className="flex items-center gap-0.5">
          {TIME_OPTIONS.map((tf) => (
            <button
              key={tf}
              onClick={() => setTime(tf)}
              className={`px-1.5 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                timeFilter === tf
                  ? "bg-primary text-primary-foreground"
                  : "bg-card/30 text-muted-foreground hover:text-foreground hover:bg-card/50"
              }`}
            >
              {tf === "all" ? t("news.all") : t(`news.${tf}`)}
            </button>
          ))}
        </div>
      </div>

      {/* News list */}
      <div>
        <div className="space-y-1.5">
          {isLoading && news.length === 0 ? (
            <div className="space-y-1.5">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="border border-border rounded-md p-2.5 bg-card/20 animate-pulse">
                  <div className="h-3 bg-muted rounded w-full mb-2" />
                  <div className="h-3 bg-muted rounded w-2/3" />
                </div>
              ))}
            </div>
          ) : filteredNews.length === 0 ? (
            <div className="flex items-center justify-center h-20">
              <p className="text-[11px] text-muted-foreground">
                {news.length === 0 ? t("news.loading") : t("news.noResults")}
              </p>
            </div>
          ) : (
            filteredNews.map((item) => (
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
                    <p className={`text-[11px] font-semibold leading-snug mb-1 ${
                      item.breaking ? "text-red-200" : "text-foreground"
                    }`}>
                      {item.title}
                    </p>
                    <div className="flex items-center justify-between gap-1 flex-wrap">
                      <span className={`text-[11px] font-semibold uppercase tracking-wider ${
                        sourceColors[item.source] || "text-muted-foreground"
                      }`}>
                        {item.source}
                      </span>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className="text-[11px] px-1 py-0 h-3 no-default-hover-elevate no-default-active-elevate"
                        >
                          {item.category}
                        </Badge>
                        {item.language && (
                          <span className="text-[9px] text-muted-foreground/60 uppercase font-mono">
                            {item.language}
                          </span>
                        )}
                        <span className="text-[11px] text-muted-foreground tabular-nums">
                          {formatTimeAgo(item.timestamp)}
                        </span>
                        {item.sentiment !== undefined && item.sentiment !== null && (
                          <div
                            className={`w-1.5 h-1.5 rounded-full ${getSentimentColor(item.sentiment)}`}
                            title={`Sentiment: ${item.sentiment.toFixed(2)}`}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
