import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Tv, Camera, X, Maximize2, ChevronDown, ChevronUp, Radio } from "lucide-react";

interface StreamSource {
  id: string;
  name: string;
  nameKey?: string;
  category: "tv" | "camera";
  country: string;
  countryKey: string;
  embedUrl: string;
  thumbnailUrl?: string;
  language: string;
  description?: string;
  descriptionKey?: string;
}

const tvChannels: StreamSource[] = [
  {
    id: "kan11",
    name: "Kan 11",
    category: "tv",
    country: "Israel",
    countryKey: "Israel",
    embedUrl: "https://www.youtube.com/embed/T3k9ii2igfg?autoplay=1&mute=1",
    language: "he",
    description: "Israeli Public Broadcasting",
    descriptionKey: "media.channels.kan11",
  },
  {
    id: "channel12",
    name: "Channel 12",
    category: "tv",
    country: "Israel",
    countryKey: "Israel",
    embedUrl: "https://www.youtube.com/embed/VvSJmqbEwqM?autoplay=1&mute=1",
    language: "he",
    description: "Keshet 12 News",
    descriptionKey: "media.channels.channel12",
  },
  {
    id: "channel13",
    name: "Channel 13",
    category: "tv",
    country: "Israel",
    countryKey: "Israel",
    embedUrl: "https://www.youtube.com/embed/hEJYP3LjoUE?autoplay=1&mute=1",
    language: "he",
    description: "Reshet 13 News",
    descriptionKey: "media.channels.channel13",
  },
  {
    id: "channel14",
    name: "Channel 14",
    category: "tv",
    country: "Israel",
    countryKey: "Israel",
    embedUrl: "https://www.youtube.com/embed/Mup3-JhsMfU?autoplay=1&mute=1",
    language: "he",
    description: "Now 14",
    descriptionKey: "media.channels.channel14",
  },
  {
    id: "i24news-en",
    name: "i24NEWS English",
    category: "tv",
    country: "Israel",
    countryKey: "Israel",
    embedUrl: "https://www.youtube.com/embed/KHhwS1bljOg?autoplay=1&mute=1",
    language: "en",
    description: "International news from Israel",
    descriptionKey: "media.channels.i24news",
  },
  {
    id: "aljazeera",
    name: "Al Jazeera",
    category: "tv",
    country: "Qatar",
    countryKey: "Qatar",
    embedUrl: "https://www.youtube.com/embed/gCNeDWCI0vo?autoplay=1&mute=1",
    language: "en",
    description: "Al Jazeera English Live",
    descriptionKey: "media.channels.aljazeera",
  },
  {
    id: "aljazeera-ar",
    name: "الجزيرة",
    category: "tv",
    country: "Qatar",
    countryKey: "Qatar",
    embedUrl: "https://www.youtube.com/embed/bNyUyrR0PHo?autoplay=1&mute=1",
    language: "ar",
    description: "Al Jazeera Arabic",
    descriptionKey: "media.channels.aljazeeraar",
  },
  {
    id: "alarabiya",
    name: "العربية",
    category: "tv",
    country: "UAE",
    countryKey: "UAE",
    embedUrl: "https://www.youtube.com/embed/1Mg-5ksTNcs?autoplay=1&mute=1",
    language: "ar",
    description: "Al Arabiya News",
    descriptionKey: "media.channels.alarabiya",
  },
  {
    id: "sky-arabia",
    name: "Sky News Arabia",
    category: "tv",
    country: "UAE",
    countryKey: "UAE",
    embedUrl: "https://www.youtube.com/embed/XHSqGQ3lVLY?autoplay=1&mute=1",
    language: "ar",
    description: "Sky News Arabia Live",
    descriptionKey: "media.channels.skyarabia",
  },
];

const liveCameras: StreamSource[] = [
  {
    id: "cam-jerusalem",
    name: "Jerusalem - Western Wall",
    category: "camera",
    country: "Israel",
    countryKey: "Israel",
    embedUrl: "https://www.youtube.com/embed/MV2wIFYkmYA?autoplay=1&mute=1",
    language: "none",
    description: "Live view of the Western Wall",
    descriptionKey: "media.cameras.jerusalem",
  },
  {
    id: "cam-telaviv",
    name: "Tel Aviv Skyline",
    category: "camera",
    country: "Israel",
    countryKey: "Israel",
    embedUrl: "https://www.youtube.com/embed/JvTMNbk20os?autoplay=1&mute=1",
    language: "none",
    description: "Tel Aviv beach & skyline",
    descriptionKey: "media.cameras.telaviv",
  },
  {
    id: "cam-haifa",
    name: "Haifa Port",
    category: "camera",
    country: "Israel",
    countryKey: "Israel",
    embedUrl: "https://www.youtube.com/embed/qGzgzqD9Y5A?autoplay=1&mute=1",
    language: "none",
    description: "Haifa port area",
    descriptionKey: "media.cameras.haifa",
  },
  {
    id: "cam-eilat",
    name: "Eilat - Red Sea",
    category: "camera",
    country: "Israel",
    countryKey: "Israel",
    embedUrl: "https://www.youtube.com/embed/7HaJArMDKgI?autoplay=1&mute=1",
    language: "none",
    description: "Eilat underwater reef cam",
    descriptionKey: "media.cameras.eilat",
  },
  {
    id: "cam-mecca",
    name: "Mecca - Masjid al-Haram",
    category: "camera",
    country: "Saudi Arabia",
    countryKey: "SaudiArabia",
    embedUrl: "https://www.youtube.com/embed/PYMipRRmq5Q?autoplay=1&mute=1",
    language: "none",
    description: "Live from Mecca",
    descriptionKey: "media.cameras.mecca",
  },
  {
    id: "cam-dubai",
    name: "Dubai Skyline",
    category: "camera",
    country: "UAE",
    countryKey: "UAE",
    embedUrl: "https://www.youtube.com/embed/7Kzc7gIj9Os?autoplay=1&mute=1",
    language: "none",
    description: "Dubai live camera",
    descriptionKey: "media.cameras.dubai",
  },
];

export function LiveMediaPanel() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<"tv" | "camera">("tv");
  const [expandedStream, setExpandedStream] = useState<StreamSource | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  const sources = activeTab === "tv" ? tvChannels : liveCameras;

  const closeModal = useCallback(() => setExpandedStream(null), []);

  useEffect(() => {
    if (!expandedStream) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [expandedStream, closeModal]);

  if (collapsed) {
    return (
      <div className="border-t border-border bg-card/30 flex-shrink-0">
        <button
          onClick={() => setCollapsed(false)}
          className="w-full flex items-center justify-center gap-2 py-1 hover:bg-card/50 transition-colors"
          data-testid="media-expand-btn"
        >
          <Tv className="w-3 h-3 text-primary" />
          <span className="text-[9px] uppercase tracking-[0.15em] text-primary font-semibold">
            {t("media.title")}
          </span>
          <ChevronUp className="w-3 h-3 text-primary" />
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="border-t border-border bg-card/30 flex-shrink-0" data-testid="live-media-panel">
        <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border/50">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse-glow" />
              <Radio className="w-3 h-3 text-red-400" />
            </div>
            <span className="text-[10px] uppercase tracking-[0.2em] text-primary font-bold">
              {t("media.title")}
            </span>
          </div>

          <div className="flex items-center gap-1 ms-2">
            <button
              onClick={() => setActiveTab("tv")}
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider transition-colors ${
                activeTab === "tv"
                  ? "bg-primary/20 text-primary border border-primary/30"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              data-testid="media-tab-tv"
            >
              <Tv className="w-3 h-3" />
              {t("media.tvChannels")}
            </button>
            <button
              onClick={() => setActiveTab("camera")}
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider transition-colors ${
                activeTab === "camera"
                  ? "bg-primary/20 text-primary border border-primary/30"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              data-testid="media-tab-camera"
            >
              <Camera className="w-3 h-3" />
              {t("media.liveCameras")}
            </button>
          </div>

          <div className="flex-1" />

          <Badge variant="outline" className="text-[8px] border-red-500/30 text-red-400 no-default-hover-elevate no-default-active-elevate">
            {sources.length} {t("media.live")}
          </Badge>

          <button
            onClick={() => setCollapsed(true)}
            className="text-muted-foreground hover:text-foreground transition-colors"
            data-testid="media-collapse-btn"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>

        <ScrollArea className="w-full">
          <div className="flex gap-2 p-2">
            {sources.map((source) => (
              <div
                key={source.id}
                className="flex-shrink-0 w-[180px] border border-border rounded-md bg-card/50 overflow-hidden cursor-pointer hover-elevate group transition-all"
                onClick={() => setExpandedStream(source)}
                data-testid={`media-card-${source.id}`}
              >
                <div className="relative w-full h-[100px] bg-black/80 flex items-center justify-center">
                  <div className="absolute inset-0 flex items-center justify-center">
                    {activeTab === "tv" ? (
                      <Tv className="w-8 h-8 text-muted-foreground/30" />
                    ) : (
                      <Camera className="w-8 h-8 text-muted-foreground/30" />
                    )}
                  </div>
                  <div className="absolute top-1 start-1 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse-glow" />
                    <span className="text-[7px] font-bold text-red-400 uppercase">{t("media.live")}</span>
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                    <Maximize2 className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className="p-1.5">
                  <p className="text-[9px] font-semibold text-foreground truncate">{source.name}</p>
                  <div className="flex items-center justify-between gap-1 mt-0.5">
                    <span className="text-[8px] text-muted-foreground truncate">
                      {t(`countries.${source.countryKey}`, source.country)}
                    </span>
                    {source.language !== "none" && (
                      <Badge variant="outline" className="text-[6px] px-1 py-0 h-3 no-default-hover-elevate no-default-active-elevate">
                        {source.language.toUpperCase()}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>

      {expandedStream && (
        <div
          className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center p-4"
          onClick={closeModal}
          role="dialog"
          aria-modal="true"
          aria-labelledby="media-modal-title"
          data-testid="media-modal-overlay"
        >
          <div
            className="relative w-full max-w-4xl bg-card border border-border rounded-lg overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2 px-4 py-2 border-b border-border bg-card/80">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse-glow" />
                {expandedStream.category === "tv" ? (
                  <Tv className="w-3.5 h-3.5 text-primary" />
                ) : (
                  <Camera className="w-3.5 h-3.5 text-primary" />
                )}
                <span id="media-modal-title" className="text-[11px] font-bold text-foreground">
                  {t(`media.${expandedStream.category === "tv" ? "channels" : "cameras"}.${expandedStream.nameKey}`, expandedStream.name)}
                </span>
                <span className="text-[9px] text-muted-foreground">
                  — {t(`countries.${expandedStream.countryKey}`, expandedStream.country)}
                </span>
              </div>
              <button
                onClick={closeModal}
                className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                aria-label="Close"
                data-testid="media-modal-close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
              <iframe
                src={expandedStream.embedUrl}
                className="absolute inset-0 w-full h-full"
                allow="autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
                referrerPolicy="no-referrer"
                sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
                data-testid="media-player-iframe"
              />
            </div>
            <div className="px-4 py-2 border-t border-border bg-card/80">
              <p className="text-[9px] text-muted-foreground">
                {t(`media.${expandedStream.category === "tv" ? "channels" : "cameras"}.${expandedStream.nameKey}`, expandedStream.description)}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
