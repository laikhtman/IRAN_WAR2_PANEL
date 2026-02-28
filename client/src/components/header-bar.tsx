import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, Radio, Wifi, Activity, Volume2, VolumeX, Maximize2, Minimize2 } from "lucide-react";
import { LanguageSwitcher } from "@/components/language-switcher";

interface HeaderBarProps {
  isMuted?: boolean;
  onToggleMute?: () => void;
  isPresentation?: boolean;
  onTogglePresentation?: () => void;
}

export function HeaderBar({ isMuted = true, onToggleMute, isPresentation = false, onTogglePresentation }: HeaderBarProps) {
  const { t, i18n } = useTranslation();
  const [time, setTime] = useState(new Date());
  const [israelTime, setIsraelTime] = useState("");
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
      setLocalTimeStr(now.toLocaleTimeString(locale, { hour12: false }));
      setDateStr(now.toLocaleDateString(locale, { month: "short", day: "numeric", year: "numeric" }));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [i18n.language]);

  return (
    <header className="flex items-center justify-between gap-2 px-4 h-10 border-b border-border bg-card/50 flex-shrink-0" data-testid="header-bar">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center glow-cyan">
            <Shield className="w-3.5 h-3.5 text-primary" />
          </div>
          <div>
            <h1 className="text-[11px] font-bold text-foreground tracking-[0.1em] uppercase leading-none">
              {t("header.title")}
            </h1>
            <p className="text-[7px] text-muted-foreground tracking-[0.2em] uppercase">
              {t("header.subtitle")}
            </p>
          </div>
        </div>

        <div className="h-4 w-px bg-border" />

        <div className="flex items-center gap-1.5">
          <Wifi className="w-3 h-3 text-emerald-400" />
          <span className="text-[8px] text-emerald-400 uppercase tracking-wider font-semibold">{t("header.connected")}</span>
        </div>

        <div className="flex items-center gap-1.5">
          <Activity className="w-3 h-3 text-primary" />
          <span className="text-[8px] text-primary uppercase tracking-wider font-semibold">{t("header.liveFeed")}</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {onToggleMute && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={onToggleMute}
            title={isMuted ? "Unmute Alerts" : "Mute Alerts"}
          >
            {isMuted ? (
              <VolumeX className="w-3.5 h-3.5 text-muted-foreground" />
            ) : (
              <Volume2 className="w-3.5 h-3.5 text-red-400" />
            )}
          </Button>
        )}
        {onTogglePresentation && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={onTogglePresentation}
            title={isPresentation ? "Exit Presentation" : "Enter Presentation"}
          >
            {isPresentation ? (
              <Minimize2 className="w-3.5 h-3.5 text-primary" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5 text-muted-foreground" />
            )}
          </Button>
        )}

        <LanguageSwitcher />

        <div className="h-4 w-px bg-border" />

        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-[8px] text-muted-foreground uppercase tracking-wider">{t("header.local")}</p>
            <p className="text-[11px] font-bold text-foreground tabular-nums leading-none">
              {localTimeStr}
            </p>
          </div>
          <div className="h-4 w-px bg-border" />
          <div className="text-right">
            <p className="text-[8px] text-muted-foreground uppercase tracking-wider">{t("header.israelTime")}</p>
            <p className="text-[11px] font-bold text-cyan-400 tabular-nums leading-none">
              {israelTime}
            </p>
          </div>
        </div>

        <div className="h-4 w-px bg-border" />

        <Badge variant="outline" className="text-[8px] border-primary/30 text-primary no-default-hover-elevate no-default-active-elevate">
          <Radio className="w-2.5 h-2.5 mr-1 rtl:ml-1 rtl:mr-0" />
          {dateStr}
        </Badge>
      </div>
    </header>
  );
}
