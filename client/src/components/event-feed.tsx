import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import type { WarEvent } from "@shared/schema";
import { Crosshair, Shield, Target, Zap, AlertTriangle, Radio } from "lucide-react";

const eventIcons: Record<string, any> = {
  missile_launch: Crosshair,
  missile_intercept: Shield,
  missile_hit: Target,
  drone_launch: Zap,
  drone_intercept: Shield,
  air_raid_alert: AlertTriangle,
  ceasefire: Radio,
  military_operation: Crosshair,
  explosion: Target,
  sirens: AlertTriangle,
};

const eventColorClasses: Record<string, string> = {
  missile_launch: "text-red-400 bg-red-400/10",
  missile_intercept: "text-emerald-400 bg-emerald-400/10",
  missile_hit: "text-orange-400 bg-orange-400/10",
  drone_launch: "text-yellow-400 bg-yellow-400/10",
  drone_intercept: "text-cyan-400 bg-cyan-400/10",
  air_raid_alert: "text-red-400 bg-red-400/10",
  ceasefire: "text-blue-400 bg-blue-400/10",
  military_operation: "text-purple-400 bg-purple-400/10",
  explosion: "text-orange-400 bg-orange-400/10",
  sirens: "text-red-400 bg-red-400/10",
};

const threatBadgeVariants: Record<string, string> = {
  critical: "bg-red-500/20 text-red-300 border-red-500/30",
  high: "bg-orange-500/20 text-orange-300 border-orange-500/30",
  medium: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  low: "bg-blue-500/20 text-blue-300 border-blue-500/30",
};

interface EventFeedProps {
  events: WarEvent[];
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

export function EventFeed({ events }: EventFeedProps) {
  const { t } = useTranslation();
  const formatTimeAgo = useFormatTimeAgo();

  return (
    <div data-testid="event-feed">
      <div className="flex items-center justify-between gap-1 px-1 mb-2">
        <h3 className="text-[11px] uppercase tracking-[0.2em] text-primary font-bold">
          {t("events.title")}
        </h3>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse-glow" />
          <span className="text-[11px] text-red-400 uppercase tracking-wider font-semibold">{t("events.live")}</span>
        </div>
      </div>

      <div aria-live="polite">
        <div className="space-y-1.5">
          {events.length === 0 ? (
            <div className="flex items-center justify-center h-20">
              <p className="text-[11px] text-muted-foreground">{t("events.noEvents")}</p>
            </div>
          ) : (
            events.map((event) => {
              const Icon = eventIcons[event.type] || Radio;
              const colorClass = eventColorClasses[event.type] || "text-cyan-400 bg-cyan-400/10";

              return (
                <div
                  key={event.id}
                  className="border border-border rounded-md p-2.5 bg-card/30 hover-elevate cursor-pointer transition-colors"
                  data-testid={`event-item-${event.id}`}
                >
                  <div className="flex items-start gap-2">
                    <div className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                      <Icon className="w-3 h-3" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <p className="text-[11px] font-semibold text-foreground truncate">
                          {event.title}
                        </p>
                        <Badge
                          variant="outline"
                          className={`text-[11px] px-1 py-0 h-3.5 ${threatBadgeVariants[event.threatLevel]} no-default-hover-elevate no-default-active-elevate`}
                        >
                          {t(`events.threat.${event.threatLevel}`)}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate mb-1">
                        {event.description}
                      </p>
                      <div className="flex items-center justify-between gap-1 flex-wrap">
                        <span className="text-[11px] text-muted-foreground">
                          {event.location} - {t(`countries.${event.country}`, event.country)}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-muted-foreground">{event.source}</span>
                          <span className="text-[11px] text-primary tabular-nums">
                            {formatTimeAgo(event.timestamp)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
