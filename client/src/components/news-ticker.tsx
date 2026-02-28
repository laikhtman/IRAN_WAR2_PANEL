import type { NewsItem } from "@shared/schema";
import { AlertTriangle } from "lucide-react";

interface NewsTickerProps {
  news: NewsItem[];
}

export function NewsTicker({ news }: NewsTickerProps) {
  const breakingNews = news.filter(n => n.breaking);
  const displayNews = breakingNews.length > 0 ? breakingNews : news.slice(0, 5);

  if (displayNews.length === 0) return null;

  const tickerContent = displayNews.map(item => (
    `${item.source}: ${item.title}`
  )).join("  \u00B7\u00B7\u00B7  ");

  return (
    <div className="w-full border-t border-red-500/30 bg-red-500/5" data-testid="news-ticker">
      <div className="flex items-center h-7">
        <div className="flex items-center gap-1.5 px-3 bg-red-600 h-full flex-shrink-0">
          <AlertTriangle className="w-3 h-3 text-white animate-blink-alert" />
          <span className="text-[9px] font-bold text-white uppercase tracking-[0.15em]">
            BREAKING
          </span>
        </div>
        <div className="flex-1 overflow-hidden">
          <div className="animate-ticker whitespace-nowrap">
            <span className="text-[10px] text-red-300 font-medium inline-block px-4">
              {tickerContent}  {"\u00B7\u00B7\u00B7"}  {tickerContent}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
