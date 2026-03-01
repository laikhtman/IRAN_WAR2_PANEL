import { useEffect, useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Radio, Wifi, WifiOff, Activity, Volume2, VolumeX, Maximize2, Minimize2, TrendingDown, TrendingUp, Minus, MoreVertical } from "lucide-react";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useIsMobile } from "@/hooks/use-mobile";
import type { WsStatus } from "@/hooks/use-connection-status";

interface HeaderBarProps {
  isMuted?: boolean;
  onToggleMute?: () => void;
  isPresentation?: boolean;
  onTogglePresentation?: () => void;
  sentimentData?: { average: number; trend: string; sampleSize: number } | null;
  wsStatus?: WsStatus;
  isLiveFeed?: boolean;
}

export function HeaderBar({ isMuted = true, onToggleMute, isPresentation = false, onTogglePresentation, sentimentData, wsStatus = "disconnected", isLiveFeed = false }: HeaderBarProps) {
  const { t, i18n } = useTranslation();
  const [time, setTime] = useState(new Date());
  const [isNarrow, setIsNarrow] = useState(window.innerWidth < 1600);
  const isMobile = useIsMobile();
  const [mobileOverflow, setMobileOverflow] = useState(false);
  const overflowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onResize = () => setIsNarrow(window.innerWidth < 1600);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Close overflow menu on outside click
  useEffect(() => {
    if (!mobileOverflow) return;
    const handleClick = (e: MouseEvent | TouchEvent) => {
      if (overflowRef.current && !overflowRef.current.contains(e.target as Node)) {
        setMobileOverflow(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("touchstart", handleClick);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("touchstart", handleClick);
    };
  }, [mobileOverflow]);

  const [israelTime, setIsraelTime] = useState("");
  const [tehranTime, setTehranTime] = useState("");
  const [localTimeStr, setLocalTimeStr] = useState("");
  const [dateStr, setDateStr] = useState("");

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const locale = i18n.language || "en";
      setTime(now);
      setIsraelTime(now.toLocaleTimeString(locale, {
        timeZone: "Asia/Jerusalem",
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }));
      setTehranTime(now.toLocaleTimeString(locale, {
        timeZone: "Asia/Tehran",
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }));
      setLocalTimeStr(now.toLocaleTimeString(locale, { hour12: false }));
      setDateStr(now.toLocaleDateString(locale, { month: "short", day: "numeric", year: "numeric" }));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [i18n.language]);

  // Shared sub-components
  const shieldTitle = (
    <div className="flex items-center gap-2">
      <img src="/icons/logo-lion.svg" alt="War Panel" className="w-7 h-7 rounded-md" />
      <div>
        <h1 className="text-[13px] font-bold text-foreground tracking-[0.1em] uppercase leading-none">
          {t("header.title")}
        </h1>
        <p className="text-[11px] text-muted-foreground tracking-[0.2em] uppercase">
          {t("header.subtitle")}
        </p>
      </div>
    </div>
  );

  // Unified 4-state status indicator: LIVE / CONNECTED / RECONNECTING / OFFLINE
  // Debounce: suppress sub-second "offline" blips (e.g. from Dialog re-renders)
  const rawState: "live" | "connected" | "reconnecting" | "offline" =
    wsStatus === "connected" && isLiveFeed ? "live" :
    wsStatus === "connected" ? "connected" :
    wsStatus === "reconnecting" ? "reconnecting" : "offline";

  const [connectionState, setConnectionState] = useState(rawState);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Immediately promote to better states; debounce downgrades
    if (rawState === "live" || rawState === "connected" || (rawState === "reconnecting" && connectionState === "offline")) {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      setConnectionState(rawState);
    } else {
      // Downgrade after 500ms to avoid flicker
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        setConnectionState(rawState);
      }, 500);
    }
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [rawState]);

  const statusConfig = {
    live:         { Icon: Activity, color: "text-emerald-400", dot: "bg-emerald-400 animate-pulse", label: t("header.live") },
    connected:    { Icon: Wifi,     color: "text-yellow-400",  dot: "bg-yellow-400",                label: t("header.connectedAwaiting") },
    reconnecting: { Icon: Wifi,     color: "text-yellow-400",  dot: "bg-yellow-400 animate-pulse",  label: t("header.reconnecting") },
    offline:      { Icon: WifiOff,  color: "text-red-400",     dot: "bg-red-400 animate-pulse",     label: t("header.offline") },
  } as const;

  const { Icon: StatusIcon, color: statusColor, dot: statusDot, label: statusLabel } = statusConfig[connectionState];

  const unifiedStatusIndicator = (
    <div className="flex items-center gap-1.5">
      <StatusIcon className={`w-3 h-3 ${statusColor}`} />
      <span className={`text-[11px] uppercase tracking-wider font-semibold ${statusColor}`}>
        {statusLabel}
      </span>
      <span className={`w-1.5 h-1.5 rounded-full ${statusDot}`} />
    </div>
  );

  const dateBadge = (
    <Badge variant="outline" className="text-[11px] border-primary/30 text-primary no-default-hover-elevate no-default-active-elevate">
      <Radio className="w-2.5 h-2.5 me-1" />
      {dateStr}
    </Badge>
  );

  const muteButton = onToggleMute ? (
    <Button
      variant="ghost"
      size="icon"
      className="h-6 w-6"
      onClick={onToggleMute}
      title={isMuted ? "Unmute Alerts" : "Mute Alerts"}
      aria-label={isMuted ? "Unmute Alerts" : "Mute Alerts"}
    >
      {isMuted ? (
        <VolumeX className="w-3.5 h-3.5 text-muted-foreground" />
      ) : (
        <Volume2 className="w-3.5 h-3.5 text-red-400" />
      )}
    </Button>
  ) : null;

  const presentationButton = onTogglePresentation ? (
    <Button
      variant="ghost"
      size="icon"
      className="h-6 w-6"
      onClick={onTogglePresentation}
      title={isPresentation ? "Exit Presentation" : "Enter Presentation"}
      aria-label={isPresentation ? "Exit Presentation" : "Enter Presentation"}
    >
      {isPresentation ? (
        <Minimize2 className="w-3.5 h-3.5 text-primary" />
      ) : (
        <Maximize2 className="w-3.5 h-3.5 text-muted-foreground" />
      )}
    </Button>
  ) : null;

  const sentimentIndicator = sentimentData && sentimentData.sampleSize > 0 ? (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-1.5 cursor-help">
          <div className="h-4 w-px bg-border" />
          {sentimentData.trend === "escalating" ? (
            <TrendingDown className="w-3 h-3 text-red-400" />
          ) : sentimentData.trend === "de-escalating" ? (
            <TrendingUp className="w-3 h-3 text-emerald-400" />
          ) : (
            <Minus className="w-3 h-3 text-yellow-400" />
          )}
          <span className={`text-[11px] uppercase tracking-wider font-semibold ${
            sentimentData.trend === "escalating" ? "text-red-400" :
            sentimentData.trend === "de-escalating" ? "text-emerald-400" : "text-yellow-400"
          }`}>
            {sentimentData.trend} ({sentimentData.average.toFixed(2)})
          </span>
          {sentimentData.trend === "escalating" && (
            <div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs max-w-[200px]">
        <p className="font-semibold">Escalation Index: {sentimentData.average.toFixed(2)}</p>
        <p className="text-muted-foreground">Based on {sentimentData.sampleSize} recent articles</p>
        <p className="text-muted-foreground">Scale: 0 (calm) → 1 (critical)</p>
      </TooltipContent>
    </Tooltip>
  ) : null;

  const fullClocks = (
    <div className="flex items-center gap-3">
      <div className="text-right">
        <p className="text-[11px] text-muted-foreground uppercase tracking-wider">{t("header.local")}</p>
        <p className="text-[13px] font-bold text-foreground tabular-nums leading-none">
          {localTimeStr}
        </p>
      </div>
      <div className="h-4 w-px bg-border" />
      <div className="text-right">
        <p className="text-[11px] text-muted-foreground uppercase tracking-wider">{t("header.israelTime")}</p>
        <p className="text-[13px] font-bold text-cyan-400 tabular-nums leading-none">
          {israelTime}
        </p>
      </div>
      <div className="h-4 w-px bg-border" />
      <div className="text-right">
        <p className="text-[11px] text-muted-foreground uppercase tracking-wider">{t("header.tehranTime")}</p>
        <p className="text-[13px] font-bold text-red-400 tabular-nums leading-none">
          {tehranTime}
        </p>
      </div>
    </div>
  );

  const compactClocks = (
    <div className="flex items-center gap-2 text-[13px] font-mono tabular-nums">
      <span className="text-[9px] text-muted-foreground mr-0.5">LCL</span>
      <span className="text-foreground">{localTimeStr}</span>
      <span className="text-muted-foreground">/</span>
      <span className="text-[9px] text-muted-foreground mr-0.5">ISR</span>
      <span className="text-cyan-400">{israelTime}</span>
      <span className="text-muted-foreground">/</span>
      <span className="text-[9px] text-muted-foreground mr-0.5">THR</span>
      <span className="text-red-400">{tehranTime}</span>
    </div>
  );

  // ─── MOBILE HEADER: single ultra-compact 40px strip ───
  if (isMobile) {
    const statusDotColor = wsStatus === "connected" ? "bg-emerald-400" : wsStatus === "reconnecting" ? "bg-yellow-400 animate-pulse" : "bg-red-400 animate-pulse";
    return (
      <header className="flex items-center justify-between gap-1.5 px-3 h-10 border-b border-border bg-card/50 flex-shrink-0" data-testid="header-bar" aria-label="War Panel status bar">
        {/* Left: logo + title + status dot */}
        <div className="flex items-center gap-1.5 min-w-0">
          <img src="/icons/logo-lion.svg" alt="War Panel" className="w-6 h-6 rounded-md flex-shrink-0" />
          <span className="text-[12px] font-bold text-foreground tracking-[0.08em] uppercase truncate">
            {t("header.title")}
          </span>
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${statusDotColor}`} />
        </div>

        {/* Right: mute + language + overflow */}
        <div className="flex items-center gap-1 flex-shrink-0 relative" ref={overflowRef}>
          {muteButton}
          <LanguageSwitcher />
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setMobileOverflow(v => !v)}
            title="More"
          >
            <MoreVertical className="w-3.5 h-3.5 text-muted-foreground" />
          </Button>

          {/* Overflow dropdown */}
          {mobileOverflow && (
            <div className="absolute end-0 top-full mt-1 z-[1200] w-[220px] bg-card border border-border rounded-md shadow-lg p-2 space-y-2">
              {/* Connection status */}
              <div className="flex items-center gap-2 px-1">
                {unifiedStatusIndicator}
              </div>
              {/* Sentiment */}
              {sentimentIndicator && (
                <div className="flex items-center gap-2 px-1">
                  {sentimentIndicator}
                </div>
              )}
              {/* Date */}
              <div className="flex items-center gap-2 px-1">
                {dateBadge}
              </div>
              {/* Clocks */}
              <div className="border-t border-border pt-2 px-1">
                <div className="flex items-center justify-between text-[11px] tabular-nums">
                  <span className="text-muted-foreground">{t("header.local")}</span>
                  <span className="text-foreground font-bold">{localTimeStr}</span>
                </div>
                <div className="flex items-center justify-between text-[11px] tabular-nums">
                  <span className="text-muted-foreground">{t("header.israelTime")}</span>
                  <span className="text-cyan-400 font-bold">{israelTime}</span>
                </div>
                <div className="flex items-center justify-between text-[11px] tabular-nums">
                  <span className="text-muted-foreground">{t("header.tehranTime")}</span>
                  <span className="text-red-400 font-bold">{tehranTime}</span>
                </div>
              </div>
              {/* Actions row */}
              <div className="border-t border-border pt-2 flex items-center gap-2 px-1">
                {presentationButton}
              </div>
            </div>
          )}
        </div>
      </header>
    );
  }

  if (isNarrow) {
    return (
      <header className="flex flex-col border-b border-border bg-card/50 flex-shrink-0" data-testid="header-bar" aria-label="War Panel status bar">
        {/* Row 1 */}
        <div className="flex items-center justify-between gap-2 px-4 h-10">
          <div className="flex items-center gap-3">
            {shieldTitle}
            <div className="h-4 w-px bg-border" />
            {unifiedStatusIndicator}
          </div>
          <div className="flex items-center gap-3">
            {dateBadge}
          </div>
        </div>
        {/* Row 2 */}
        <div className="flex items-center justify-between gap-2 px-4 h-8 border-t border-border/50 bg-card/30">
          <div className="flex items-center gap-2">
            {muteButton}
            {presentationButton}
            {sentimentIndicator}
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <div className="h-4 w-px bg-border" />
            {compactClocks}
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="flex items-center justify-between gap-2 px-4 h-12 border-b border-border bg-card/50 flex-shrink-0" data-testid="header-bar" aria-label="War Panel status bar">
      <div className="flex items-center gap-3">
        {shieldTitle}

        <div className="h-4 w-px bg-border" />

        {unifiedStatusIndicator}
      </div>

      <div className="flex items-center gap-3">
        {muteButton}
        {presentationButton}

        {sentimentIndicator}

        <LanguageSwitcher />

        <div className="h-4 w-px bg-border" />

        {fullClocks}

        <div className="h-4 w-px bg-border" />

        {dateBadge}
      </div>
    </header>
  );
}
