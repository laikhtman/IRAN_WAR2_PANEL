import { useRef, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { NewsItem } from "@shared/schema";
import { AlertTriangle } from "lucide-react";

interface NewsTickerProps {
  news: NewsItem[];
}

export function NewsTicker({ news }: NewsTickerProps) {
  const { t } = useTranslation();
  const breakingNews = news.filter(n => n.breaking);
  const displayNews = breakingNews.length > 0 ? breakingNews : news.slice(0, 5);

  if (displayNews.length === 0) return null;

  const tickerContent = displayNews.map(item => (
    `${item.source}: ${item.title}`
  )).join("  \u00B7\u00B7\u00B7  ");

  const tickerRef = useRef<HTMLDivElement>(null);
  const [animDuration, setAnimDuration] = useState(30);

  useEffect(() => {
    if (tickerRef.current) {
      const width = tickerRef.current.scrollWidth / 2;
      // Roughly 80px per second of scrolling
      const duration = Math.max(15, Math.round(width / 80));
      setAnimDuration(duration);
    }
  }, [tickerContent]);

  return (
    <div className="w-full border-t border-red-500/30 bg-red-500/5" data-testid="news-ticker" role="marquee" aria-live="off" aria-label="Breaking news ticker">
      <div className="flex items-center h-7">
        <div className="flex items-center gap-1.5 px-3 bg-red-600 h-full flex-shrink-0">
          <AlertTriangle className="w-3 h-3 text-white animate-blink-alert" />
          <span className="text-[11px] font-bold text-white uppercase tracking-[0.15em]">
            {t("news.breaking")}
          </span>
        </div>
        <div className="flex-1 overflow-hidden">
          <div
            ref={tickerRef}
            className="whitespace-nowrap"
            style={{ animation: `ticker-scroll ${animDuration}s linear infinite` }}
          >
            <span className="text-[12px] text-red-300 font-medium inline-block px-4">
              {tickerContent}  {"\u00B7\u00B7\u00B7"}  {tickerContent}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
