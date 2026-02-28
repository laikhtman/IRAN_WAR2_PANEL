import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import type { Statistics } from "@shared/schema";
import {
  Crosshair,
  Shield,
  Target,
  TrendingUp,
  Zap,
} from "lucide-react";

function AnimatedCounter({ value, label, icon: Icon, color }: {
  value: number;
  label: string;
  icon: any;
  color: string;
}) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const duration = 1200;
    const startTime = Date.now();
    const startValue = displayValue;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.floor(startValue + (value - startValue) * eased));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [value]);

  const colorClasses: Record<string, string> = {
    red: "text-red-400",
    green: "text-emerald-400",
    cyan: "text-cyan-400",
    orange: "text-orange-400",
    yellow: "text-yellow-400",
    purple: "text-purple-400",
  };

  const glowClasses: Record<string, string> = {
    red: "glow-red",
    green: "glow-green",
    cyan: "glow-cyan",
    orange: "glow-red",
    yellow: "glow-cyan",
    purple: "glow-cyan",
  };

  return (
    <div className={`border border-border rounded-md p-3 bg-card/50 ${glowClasses[color] || ""}`} data-testid={`stat-${label.toLowerCase().replace(/\s/g, '-')}`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-3.5 h-3.5 ${colorClasses[color]}`} />
        <span className="text-[9px] uppercase tracking-[0.15em] text-muted-foreground font-semibold">
          {label}
        </span>
      </div>
      <p className={`text-2xl font-bold tabular-nums ${colorClasses[color]} animate-count-up`}>
        {displayValue.toLocaleString()}
      </p>
    </div>
  );
}

interface StatsPanelProps {
  stats: Statistics | null;
}

const countryFlags: Record<string, string> = {
  Israel: "\uD83C\uDDEE\uD83C\uDDF1",
  Iran: "\uD83C\uDDEE\uD83C\uDDF7",
  Iraq: "\uD83C\uDDEE\uD83C\uDDF6",
  Yemen: "\uD83C\uDDFE\uD83C\uDDEA",
  Lebanon: "\uD83C\uDDF1\uD83C\uDDE7",
  Syria: "\uD83C\uDDF8\uD83C\uDDFE",
  Jordan: "\uD83C\uDDEF\uD83C\uDDF4",
  Palestine: "\uD83C\uDDF5\uD83C\uDDF8",
  "Saudi Arabia": "\uD83C\uDDF8\uD83C\uDDE6",
  "International Waters": "\uD83C\uDF0A",
};

export function StatsPanel({ stats }: StatsPanelProps) {
  const { t } = useTranslation();

  if (!stats) {
    return (
      <div className="space-y-3 p-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="border border-border rounded-md p-3 bg-card/30 animate-pulse h-16" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2" data-testid="stats-panel">
      <div className="flex items-center justify-between gap-1 mb-1">
        <h3 className="text-[10px] uppercase tracking-[0.2em] text-primary font-bold">
          {t("stats.title")}
        </h3>
        <Badge variant="outline" className="text-[8px] border-primary/30 text-primary">
          {t("stats.live")}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <AnimatedCounter
          value={stats.totalMissilesLaunched}
          label={t("stats.missilesLaunched")}
          icon={Crosshair}
          color="red"
        />
        <AnimatedCounter
          value={stats.totalIntercepted}
          label={t("stats.intercepted")}
          icon={Shield}
          color="green"
        />
        <AnimatedCounter
          value={stats.totalHits}
          label={t("stats.impacts")}
          icon={Target}
          color="orange"
        />
        <AnimatedCounter
          value={stats.totalDronesLaunched}
          label={t("stats.dronesLaunched")}
          icon={Zap}
          color="yellow"
        />
      </div>

      <div className="border border-border rounded-md p-3 bg-card/50 glow-green">
        <div className="flex items-center justify-between gap-1">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[9px] uppercase tracking-[0.15em] text-muted-foreground font-semibold">
              {t("stats.interceptionRate")}
            </span>
          </div>
          <span className="text-xl font-bold text-emerald-400 tabular-nums">
            {stats.interceptionRate}%
          </span>
        </div>
      </div>

      <div className="border border-border rounded-md p-3 bg-card/50">
        <p className="text-[9px] uppercase tracking-[0.15em] text-muted-foreground font-semibold mb-2">
          {t("stats.byCountry")}
        </p>
        <div className="space-y-2">
          {Object.entries(stats.byCountry).map(([country, data]) => (
            <div key={country} className="flex items-center justify-between gap-2">
              <span className="text-[10px] text-foreground font-medium">
                {countryFlags[country] && <span className="mr-1.5">{countryFlags[country]}</span>}
                {t(`countries.${country}`, country)}
              </span>
              <div className="flex items-center gap-3">
                <span className="text-[9px] text-red-400 tabular-nums">{data.launched} {t("stats.launched")}</span>
                <span className="text-[9px] text-emerald-400 tabular-nums">{data.intercepted} {t("stats.int")}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="border border-border rounded-md p-3 bg-card/50">
        <p className="text-[9px] uppercase tracking-[0.15em] text-muted-foreground font-semibold mb-2">
          {t("stats.defenseSystems")}
        </p>
        <div className="space-y-1.5">
          {Object.entries(stats.bySystem).map(([system, count]) => (
            <div key={system} className="flex items-center justify-between gap-2">
              <span className="text-[10px] text-foreground font-medium">{system}</span>
              <span className="text-[10px] text-cyan-400 tabular-nums font-semibold">{count}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="border border-border rounded-md p-2.5 bg-card/50 text-center">
          <p className="text-[8px] uppercase tracking-[0.15em] text-muted-foreground mb-1">{t("stats.activeAlerts")}</p>
          <p className="text-lg font-bold text-red-400 tabular-nums">{stats.activeAlerts}</p>
        </div>
        <div className="border border-border rounded-md p-2.5 bg-card/50 text-center">
          <p className="text-[8px] uppercase tracking-[0.15em] text-muted-foreground mb-1">{t("stats.events24h")}</p>
          <p className="text-lg font-bold text-cyan-400 tabular-nums">{stats.last24hEvents}</p>
        </div>
      </div>
    </div>
  );
}
