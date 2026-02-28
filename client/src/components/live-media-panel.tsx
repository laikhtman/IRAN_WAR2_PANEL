import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
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
    embedUrl: "https://www.livehdtv.com/embed/kan-11-live/",
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
    embedUrl: "https://www.livehdtv.com/embed/channel-12-live-stream-from-israel/",
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
    embedUrl: "https://www.livehdtv.com/embed/channel-13-live/",
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
    embedUrl: "https://www.livehdtv.com/embed/channel-14-isreal-live/",
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
    embedUrl: "https://www.livehdtv.com/embed/i24news-live-stream-israel/",
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
    embedUrl: "https://www.youtube.com/embed/n7eQejkXbnM?autoplay=1&mute=1",
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
    embedUrl: "https://www.youtube-nocookie.com/embed/live_stream?channel=UCIJXOvggjKtCagMfxvcCzAA&rel=0&autoplay=1",
    language: "ar",
    description: "Sky News Arabia Live",
    descriptionKey: "media.channels.skyarabia",
  },
];

const liveCameras: StreamSource[] = [
  {
    id: "cam-jerusalem",
    name: "Jerusalem Skyline",
    category: "camera",
    country: "Israel",
    countryKey: "Israel",
    embedUrl: "https://www.youtube.com/embed/ITAlerjV8Ro?autoplay=1&mute=1&controls=0",
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
    embedUrl: "https://www.youtube.com/embed/CXP_uPkf_sY?autoplay=1&mute=1&controls=0",
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
    embedUrl: "https://www.youtube.com/embed/nNegFX3ys5Q?autoplay=1&mute=1&controls=0",
    language: "none",
    description: "Haifa port area",
    descriptionKey: "media.cameras.haifa",
  },
  {
    id: "cam-mecca",
    name: "Mecca - Masjid al-Haram",
    category: "camera",
    country: "Saudi Arabia",
    countryKey: "SaudiArabia",
    embedUrl: "https://www.youtube.com/embed/-t-yKcXSrhM?autoplay=1&mute=1&controls=0",
    language: "none",
    description: "Live from Mecca",
    descriptionKey: "media.cameras.mecca",
  },
  {
    id: "cam-dubai",
    name: "Dubai Marina",
    category: "camera",
    country: "UAE",
    countryKey: "UAE",
    embedUrl: "https://www.youtube.com/embed/MfIpyflPbHQ?autoplay=1&mute=1&controls=0",
    language: "none",
    description: "Dubai live camera",
    descriptionKey: "media.cameras.dubai",
  },
];

export function LiveMediaPanel() {
  const { t } = useTranslation();
  const [expandedStream, setExpandedStream] = useState<StreamSource | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>(["kan11", "aljazeera", "cam-jerusalem", "cam-telaviv"]);
  const [selectorOpen, setSelectorOpen] = useState(false);

  const allSources = [...tvChannels, ...liveCameras];
  const selectedStreams = allSources.filter((s) => selectedIds.includes(s.id));

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) {
        // Don't allow removing last one
        if (prev.length <= 1) return prev;
        return prev.filter((x) => x !== id);
      }
      if (prev.length >= 4) return prev; // max 4
      return [...prev, id];
    });
  };

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

          <div className="flex-1" />

          <Badge variant="outline" className="text-[8px] border-red-500/30 text-red-400 no-default-hover-elevate no-default-active-elevate">
            {selectedStreams.length}/4 {t("media.live")}
          </Badge>

          <div className="relative">
            <button
              onClick={() => setSelectorOpen((v) => !v)}
              className="flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20 transition-colors"
              data-testid="media-selector-btn"
            >
              {t("media.selectChannels")}
              {selectorOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            {selectorOpen && (
              <div className="absolute end-0 top-full mt-1 z-50 w-[260px] max-h-[320px] overflow-y-auto bg-card border border-border rounded-md shadow-lg p-1.5" data-testid="media-selector-dropdown">
                <p className="text-[8px] text-muted-foreground uppercase tracking-wider px-1.5 py-1">
                  {t("media.selectUpTo3")}
                </p>

                {/* TV Channels group */}
                <div className="flex items-center gap-1.5 px-1.5 pt-2 pb-1">
                  <Tv className="w-3 h-3 text-blue-400" />
                  <span className="text-[8px] font-bold text-blue-400 uppercase tracking-wider">{t("media.tvChannels")}</span>
                </div>
                {tvChannels.map((source) => {
                  const isSelected = selectedIds.includes(source.id);
                  const isDisabled = !isSelected && selectedIds.length >= 4;
                  return (
                    <button
                      key={source.id}
                      onClick={() => toggleSelection(source.id)}
                      disabled={isDisabled}
                      className={`w-full flex items-center gap-2 px-2 py-1 rounded text-start transition-colors ${
                        isSelected
                          ? "bg-primary/15 text-primary"
                          : isDisabled
                          ? "text-muted-foreground/40 cursor-not-allowed"
                          : "text-foreground hover:bg-muted"
                      }`}
                      data-testid={`media-select-${source.id}`}
                    >
                      <div className={`w-3 h-3 rounded border flex items-center justify-center flex-shrink-0 ${
                        isSelected ? "bg-primary border-primary" : "border-muted-foreground/40"
                      }`}>
                        {isSelected && <span className="text-[8px] text-primary-foreground font-bold">✓</span>}
                      </div>
                      <span className="text-[9px] font-medium truncate">{source.name}</span>
                      {source.language !== "none" && (
                        <Badge variant="outline" className="text-[6px] px-1 py-0 h-3 ms-auto flex-shrink-0 no-default-hover-elevate no-default-active-elevate">
                          {source.language.toUpperCase()}
                        </Badge>
                      )}
                    </button>
                  );
                })}

                {/* Live Cameras group */}
                <div className="flex items-center gap-1.5 px-1.5 pt-3 pb-1 border-t border-border/50 mt-1">
                  <Camera className="w-3 h-3 text-purple-400" />
                  <span className="text-[8px] font-bold text-purple-400 uppercase tracking-wider">{t("media.liveCameras")}</span>
                </div>
                {liveCameras.map((source) => {
                  const isSelected = selectedIds.includes(source.id);
                  const isDisabled = !isSelected && selectedIds.length >= 4;
                  return (
                    <button
                      key={source.id}
                      onClick={() => toggleSelection(source.id)}
                      disabled={isDisabled}
                      className={`w-full flex items-center gap-2 px-2 py-1 rounded text-start transition-colors ${
                        isSelected
                          ? "bg-primary/15 text-primary"
                          : isDisabled
                          ? "text-muted-foreground/40 cursor-not-allowed"
                          : "text-foreground hover:bg-muted"
                      }`}
                      data-testid={`media-select-${source.id}`}
                    >
                      <div className={`w-3 h-3 rounded border flex items-center justify-center flex-shrink-0 ${
                        isSelected ? "bg-primary border-primary" : "border-muted-foreground/40"
                      }`}>
                        {isSelected && <span className="text-[8px] text-primary-foreground font-bold">✓</span>}
                      </div>
                      <span className="text-[9px] font-medium truncate">{source.name}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <button
            onClick={() => setCollapsed(true)}
            className="text-muted-foreground hover:text-foreground transition-colors"
            data-testid="media-collapse-btn"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Selected channel previews — live iframes */}
        <div className="grid grid-cols-2 gap-2 p-2">
          {selectedStreams.map((source) => (
            <div
              key={source.id}
              className="relative border border-border rounded-md bg-black/80 overflow-hidden group"
              data-testid={`media-preview-${source.id}`}
            >
              <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
                <iframe
                  src={source.embedUrl}
                  className="absolute inset-0 w-full h-full"
                  allow="autoplay; encrypted-media"
                  referrerPolicy="no-referrer"
                  sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
                />
              </div>
              {/* Overlay with name + expand on hover */}
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                <div className="flex items-center gap-1 p-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse-glow" />
                  <span className="text-[7px] font-bold text-red-400 uppercase drop-shadow-md">{t("media.live")}</span>
                </div>
                <div
                  className="flex items-center justify-between p-1.5 bg-gradient-to-t from-black/70 to-transparent pointer-events-auto cursor-pointer opacity-70 hover:opacity-100 transition-opacity"
                  onClick={() => setExpandedStream(source)}
                >
                  <div>
                    <p className="text-[9px] font-semibold text-white truncate drop-shadow-md">{source.name}</p>
                    <span className="text-[7px] text-white/60">
                      {t(`countries.${source.countryKey}`, source.country)}
                    </span>
                  </div>
                  <Maximize2 className="w-4 h-4 text-white/80" />
                </div>
              </div>
            </div>
          ))}
        </div>
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
                {t(`media.${expandedStream.category === "tv" ? "channels" : "cameras"}.${expandedStream.nameKey}`, expandedStream.description ?? "")}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
