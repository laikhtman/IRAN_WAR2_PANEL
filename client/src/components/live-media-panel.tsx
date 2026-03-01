import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from "@/components/ui/drawer";
import { Tv, Camera, X, Maximize2, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Radio, RefreshCw, WifiOff, ExternalLink } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

/** Derive a watchable YouTube URL from an embed URL */
function getYouTubeWatchUrl(embedUrl: string): string | null {
  try {
    const url = new URL(embedUrl);
    // Channel live stream: /embed/live_stream?channel=XXX
    const channel = url.searchParams.get("channel");
    if (channel) return `https://www.youtube.com/channel/${channel}/live`;
    // Direct video ID: /embed/VIDEO_ID
    const parts = url.pathname.split("/");
    const videoId = parts[parts.length - 1];
    if (videoId && videoId !== "embed" && videoId !== "live_stream") {
      return `https://www.youtube.com/watch?v=${videoId}`;
    }
  } catch {}
  return null;
}

/** Add origin param to embed URL for YouTube API compatibility */
function withOrigin(embedUrl: string): string {
  try {
    const url = new URL(embedUrl);
    // Always use youtube.com (not youtube-nocookie.com) for better embed compat
    if (url.hostname === "www.youtube-nocookie.com") {
      url.hostname = "www.youtube.com";
    }
    if (typeof window !== "undefined" && !url.searchParams.has("origin")) {
      url.searchParams.set("origin", window.location.origin);
    }
    // Ensure enablejsapi for proper player init
    if (!url.searchParams.has("enablejsapi")) {
      url.searchParams.set("enablejsapi", "1");
    }
    return url.toString();
  } catch {
    return embedUrl;
  }
}

/** Iframe wrapper with load-timeout detection + retry fallback */
function StreamIframe({ src, className, sandbox, ...rest }: React.IframeHTMLAttributes<HTMLIFrameElement> & { src: string }) {
  const [loadState, setLoadState] = useState<"loading" | "loaded" | "error">("loading");
  const [retryKey, setRetryKey] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setLoadState("loading");
    timerRef.current = setTimeout(() => {
      setLoadState((s) => (s === "loading" ? "error" : s));
    }, 15000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [retryKey, src]);

  const handleLoad = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setLoadState("loaded");
  };

  const handleError = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setLoadState("error");
  };

  if (loadState === "error") {
    const watchUrl = getYouTubeWatchUrl(src);
    return (
      <div className={`${className} flex flex-col items-center justify-center gap-2 bg-black/80`}>
        <WifiOff className="w-6 h-6 text-muted-foreground/50" />
        <p className="text-[11px] text-muted-foreground text-center px-4">Stream unavailable or blocked in your region</p>
        <button
          onClick={() => { setRetryKey((k) => k + 1); }}
          className="flex items-center gap-1.5 px-3 py-1 rounded-md text-[11px] font-semibold bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30 transition-colors"
        >
          <RefreshCw className="w-3 h-3" />
          Retry
        </button>
        {watchUrl && (
          <a
            href={watchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1 rounded-md text-[11px] font-semibold text-muted-foreground hover:text-primary transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
            Watch on YouTube
          </a>
        )}
      </div>
    );
  }

  return (
    <>
      {loadState === "loading" && (
        <div className={`${className} flex items-center justify-center bg-black/80`}>
          <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      )}
      <iframe
        key={retryKey}
        src={src}
        className={`${className} ${loadState === "loading" ? "opacity-0 pointer-events-none" : ""}`}
        onLoad={handleLoad}
        onError={handleError}
        sandbox="allow-scripts allow-same-origin allow-presentation allow-popups allow-popups-without-user-activation"
        {...rest}
      />
    </>
  );
}

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
    embedUrl: "https://www.youtube-nocookie.com/embed/live_stream?channel=UCa1-N3CzLICPd6BwAY4WI_A&autoplay=1&mute=1",
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
    embedUrl: "https://www.youtube-nocookie.com/embed/live_stream?channel=UC3Lx0QcdkGRTFCnsvGJRMXg&autoplay=1&mute=1",
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
    embedUrl: "https://www.youtube-nocookie.com/embed/live_stream?channel=UCDGSmruaSbIaJsR9Fm6V-tg&autoplay=1&mute=1",
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
    embedUrl: "https://www.youtube-nocookie.com/embed/live_stream?channel=UCRd_3DhFAaRKxP5TJwPbqSQ&autoplay=1&mute=1",
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
    embedUrl: "https://www.youtube-nocookie.com/embed/live_stream?channel=UCMdGPato0IC5-MU5i_ZRXNQ&autoplay=1&mute=1",
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
  const isMobile = useIsMobile();
  const [expandedStream, setExpandedStream] = useState<StreamSource | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>(["kan11", "aljazeera", "cam-jerusalem", "cam-telaviv"]);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(0);

  const allSources = [...tvChannels, ...liveCameras];
  const selectedStreams = allSources.filter((s) => selectedIds.includes(s.id));

  // Keep carousel index in bounds when selection changes
  useEffect(() => {
    if (carouselIndex >= selectedStreams.length) {
      setCarouselIndex(Math.max(0, selectedStreams.length - 1));
    }
  }, [selectedStreams.length, carouselIndex]);

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
  const selectorRef = useRef<HTMLDivElement>(null);

  // Close channel selector on outside click
  useEffect(() => {
    if (!selectorOpen) return;
    const handleOutside = (e: MouseEvent | TouchEvent) => {
      if (selectorRef.current && !selectorRef.current.contains(e.target as Node)) {
        setSelectorOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("touchstart", handleOutside);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
    };
  }, [selectorOpen]);

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
          <span className="text-[11px] uppercase tracking-[0.15em] text-primary font-semibold">
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
            <span className="text-[11px] uppercase tracking-[0.2em] text-primary font-bold">
              {t("media.title")}
            </span>
          </div>

          <div className="flex-1" />

          <Badge variant="outline" className="text-[11px] border-red-500/30 text-red-400 no-default-hover-elevate no-default-active-elevate">
            {selectedStreams.length}/4 {t("media.live")}
          </Badge>

          <div className="relative" ref={selectorRef}>
            <button
              onClick={() => setSelectorOpen((v) => !v)}
              className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wider bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20 transition-colors"
              data-testid="media-selector-btn"
            >
              {t("media.selectChannels")}
              {selectorOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            {selectorOpen && !isMobile && (
              <div className="absolute end-0 top-full mt-1 z-[1100] w-[260px] max-h-[320px] overflow-y-auto bg-card border border-border rounded-md shadow-lg p-1.5" data-testid="media-selector-dropdown">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider px-1.5 py-1">
                  {t("media.selectUpTo3")}
                </p>

                {/* TV Channels group */}
                <div className="flex items-center gap-1.5 px-1.5 pt-2 pb-1">
                  <Tv className="w-3 h-3 text-blue-400" />
                  <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wider">{t("media.tvChannels")}</span>
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
                        {isSelected && <span className="text-[11px] text-primary-foreground font-bold">✓</span>}
                      </div>
                      <span className="text-[11px] font-medium truncate">{source.name}</span>
                      {source.language !== "none" && (
                        <Badge variant="outline" className="text-[11px] px-1 py-0 h-3 ms-auto flex-shrink-0 no-default-hover-elevate no-default-active-elevate">
                          {source.language.toUpperCase()}
                        </Badge>
                      )}
                    </button>
                  );
                })}

                {/* Live Cameras group */}
                <div className="flex items-center gap-1.5 px-1.5 pt-3 pb-1 border-t border-border/50 mt-1">
                  <Camera className="w-3 h-3 text-purple-400" />
                  <span className="text-[11px] font-bold text-purple-400 uppercase tracking-wider">{t("media.liveCameras")}</span>
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
                        {isSelected && <span className="text-[11px] text-primary-foreground font-bold">✓</span>}
                      </div>
                      <span className="text-[11px] font-medium truncate">{source.name}</span>
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
        {isMobile ? (
          /* ─── MOBILE: Single-stream carousel ─── */
          <div className="relative">
            {selectedStreams.length > 0 && (() => {
              const source = selectedStreams[carouselIndex];
              return (
                <div className="relative">
                  {/* Channel pill */}
                  <div className="flex items-center justify-center gap-2 py-1.5 px-3">
                    {source.category === "tv" ? (
                      <Tv className="w-3 h-3 text-blue-400" />
                    ) : (
                      <Camera className="w-3 h-3 text-purple-400" />
                    )}
                    <span className="text-[11px] font-bold text-foreground">{source.name}</span>
                    <span className="text-[11px] text-muted-foreground">
                      — {t(`countries.${source.countryKey}`, source.country)}
                    </span>
                  </div>
                  {/* Video player */}
                  <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
                    <StreamIframe
                      key={source.id}
                      src={withOrigin(source.embedUrl)}
                      className="absolute inset-0 w-full h-full"
                      allow="autoplay; encrypted-media"
                      referrerPolicy="no-referrer"
                      loading="lazy"
                    />
                  </div>
                  {/* Prev / Next arrows */}
                  {selectedStreams.length > 1 && (
                    <>
                      <button
                        onClick={() => setCarouselIndex((i) => (i - 1 + selectedStreams.length) % selectedStreams.length)}
                        className="absolute left-1 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-black/60 flex items-center justify-center text-white/80 hover:text-white transition-colors"
                        aria-label="Previous channel"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => setCarouselIndex((i) => (i + 1) % selectedStreams.length)}
                        className="absolute right-1 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-black/60 flex items-center justify-center text-white/80 hover:text-white transition-colors"
                        aria-label="Next channel"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </>
                  )}
                  {/* Expand button on mobile */}
                  <button
                    onClick={() => setExpandedStream(source)}
                    className="absolute bottom-2 right-2 z-10 w-8 h-8 rounded-md bg-black/60 flex items-center justify-center text-white/80 hover:text-white transition-colors"
                    aria-label="Expand"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })()}
            {/* Dot indicators */}
            {selectedStreams.length > 1 && (
              <div className="flex items-center justify-center gap-1.5 py-2">
                {selectedStreams.map((s, i) => (
                  <button
                    key={s.id}
                    onClick={() => setCarouselIndex(i)}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      i === carouselIndex ? "bg-primary" : "bg-muted-foreground/30"
                    }`}
                    aria-label={s.name}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          /* ─── DESKTOP: 2×2 grid ─── */
          <div className="grid grid-cols-2 gap-2 p-2">
          {selectedStreams.map((source) => (
            <div
              key={source.id}
              className="relative border border-border rounded-md bg-black/80 overflow-hidden group"
              data-testid={`media-preview-${source.id}`}
            >
              <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
                <StreamIframe
                  src={withOrigin(source.embedUrl)}
                  className="absolute inset-0 w-full h-full"
                  allow="autoplay; encrypted-media"
                  referrerPolicy="no-referrer"
                  loading="lazy"
                />
              </div>
              {/* Overlay with name + expand on hover */}
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                <div className="flex items-center gap-1 p-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse-glow" />
                  <span className="text-[11px] font-bold text-red-400 uppercase drop-shadow-md">{t("media.live")}</span>
                </div>
                <div
                  className="flex items-center justify-between p-1.5 bg-gradient-to-t from-black/70 to-transparent pointer-events-auto cursor-pointer opacity-70 hover:opacity-100 transition-opacity"
                  onClick={() => setExpandedStream(source)}
                >
                  <div>
                    <p className="text-[11px] font-semibold text-white truncate drop-shadow-md">{source.name}</p>
                    <span className="text-[11px] text-white/60">
                      {t(`countries.${source.countryKey}`, source.country)}
                    </span>
                  </div>
                  <Maximize2 className="w-4 h-4 text-white/80" />
                </div>
              </div>
            </div>
          ))}
          </div>
        )}
      </div>

      {/* ─── MOBILE: Channel selector as bottom-sheet Drawer ─── */}
      {isMobile && (
        <Drawer open={selectorOpen} onOpenChange={setSelectorOpen}>
          <DrawerContent className="max-h-[70vh]">
            <DrawerHeader className="pb-2">
              <DrawerTitle className="text-sm uppercase tracking-wider">{t("media.selectChannels")}</DrawerTitle>
            </DrawerHeader>
            <div className="overflow-y-auto px-4 pb-6 space-y-1">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider px-1 pb-2">
                {t("media.selectUpTo3")}
              </p>

              {/* TV Channels */}
              <div className="flex items-center gap-1.5 px-1 pt-2 pb-1">
                <Tv className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-[12px] font-bold text-blue-400 uppercase tracking-wider">{t("media.tvChannels")}</span>
              </div>
              {tvChannels.map((source) => {
                const isSelected = selectedIds.includes(source.id);
                const isDisabled = !isSelected && selectedIds.length >= 4;
                return (
                  <button
                    key={source.id}
                    onClick={() => toggleSelection(source.id)}
                    disabled={isDisabled}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-start transition-colors min-h-[48px] ${
                      isSelected
                        ? "bg-primary/15 text-primary"
                        : isDisabled
                        ? "text-muted-foreground/40 cursor-not-allowed"
                        : "text-foreground hover:bg-muted"
                    }`}
                  >
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                      isSelected ? "bg-primary border-primary" : "border-muted-foreground/40"
                    }`}>
                      {isSelected && <span className="text-[12px] text-primary-foreground font-bold">✓</span>}
                    </div>
                    <span className="text-[13px] font-medium truncate">{source.name}</span>
                    {source.language !== "none" && (
                      <Badge variant="outline" className="text-[11px] px-1.5 py-0 ms-auto flex-shrink-0 no-default-hover-elevate no-default-active-elevate">
                        {source.language.toUpperCase()}
                      </Badge>
                    )}
                  </button>
                );
              })}

              {/* Live Cameras */}
              <div className="flex items-center gap-1.5 px-1 pt-4 pb-1 border-t border-border/50 mt-2">
                <Camera className="w-3.5 h-3.5 text-purple-400" />
                <span className="text-[12px] font-bold text-purple-400 uppercase tracking-wider">{t("media.liveCameras")}</span>
              </div>
              {liveCameras.map((source) => {
                const isSelected = selectedIds.includes(source.id);
                const isDisabled = !isSelected && selectedIds.length >= 4;
                return (
                  <button
                    key={source.id}
                    onClick={() => toggleSelection(source.id)}
                    disabled={isDisabled}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-start transition-colors min-h-[48px] ${
                      isSelected
                        ? "bg-primary/15 text-primary"
                        : isDisabled
                        ? "text-muted-foreground/40 cursor-not-allowed"
                        : "text-foreground hover:bg-muted"
                    }`}
                  >
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                      isSelected ? "bg-primary border-primary" : "border-muted-foreground/40"
                    }`}>
                      {isSelected && <span className="text-[12px] text-primary-foreground font-bold">✓</span>}
                    </div>
                    <span className="text-[13px] font-medium truncate">{source.name}</span>
                  </button>
                );
              })}
            </div>
          </DrawerContent>
        </Drawer>
      )}

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
                <span className="text-[11px] text-muted-foreground">
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
              <StreamIframe
                src={withOrigin(expandedStream.embedUrl)}
                className="absolute inset-0 w-full h-full"
                allow="autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
                referrerPolicy="no-referrer"
                loading="lazy"
                data-testid="media-player-iframe"
              />
            </div>
            <div className="px-4 py-2 border-t border-border bg-card/80">
              <p className="text-[11px] text-muted-foreground">
                {t(`media.${expandedStream.category === "tv" ? "channels" : "cameras"}.${expandedStream.nameKey}`, expandedStream.description ?? "")}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
