import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { AISummary } from "@shared/schema";
import { Brain, ChevronRight, Shield } from "lucide-react";

const threatColors: Record<string, string> = {
  critical: "text-red-400 bg-red-500/20 border-red-500/30",
  high: "text-orange-400 bg-orange-500/20 border-orange-500/30",
  medium: "text-yellow-400 bg-yellow-500/20 border-yellow-500/30",
  low: "text-emerald-400 bg-emerald-500/20 border-emerald-500/30",
};

interface AISummaryPanelProps {
  summary: AISummary | null;
}

export function AISummaryPanel({ summary }: AISummaryPanelProps) {
  const { t } = useTranslation();

  if (!summary) {
    return (
      <div className="border border-border rounded-md p-4 bg-card/30 animate-pulse" data-testid="ai-summary-loading">
        <div className="flex items-center gap-2 mb-3">
          <Brain className="w-4 h-4 text-primary" />
          <span className="text-[10px] uppercase tracking-[0.2em] text-primary font-bold">{t("ai.loading")}</span>
        </div>
        <div className="space-y-2">
          <div className="h-3 bg-muted rounded w-full" />
          <div className="h-3 bg-muted rounded w-3/4" />
          <div className="h-3 bg-muted rounded w-5/6" />
        </div>
      </div>
    );
  }

  return (
    <div className="border border-border rounded-md bg-card/30 glow-cyan" data-testid="ai-summary">
      <div className="flex items-center justify-between gap-1 p-3 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center">
            <Brain className="w-3.5 h-3.5 text-primary" />
          </div>
          <span className="text-[10px] uppercase tracking-[0.2em] text-primary font-bold">
            {t("ai.title")}
          </span>
        </div>
        <Badge
          variant="outline"
          className={`text-[7px] ${threatColors[summary.threatAssessment]} no-default-hover-elevate no-default-active-elevate`}
        >
          {t("ai.threat")}: {t(`events.threat.${summary.threatAssessment}`)}
        </Badge>
      </div>

      <ScrollArea className="max-h-[240px]">
        <div className="p-3 space-y-3">
          <p className="text-[11px] text-foreground leading-relaxed">
            {summary.summary}
          </p>

          <div>
            <p className="text-[9px] uppercase tracking-[0.15em] text-muted-foreground font-semibold mb-1.5">
              {t("ai.keyPoints")}
            </p>
            <ul className="space-y-1">
              {summary.keyPoints.map((point, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <ChevronRight className="w-3 h-3 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-[10px] text-muted-foreground leading-relaxed">{point}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="border border-border rounded-md p-2.5 bg-primary/5">
            <div className="flex items-center gap-1.5 mb-1">
              <Shield className="w-3 h-3 text-primary" />
              <span className="text-[9px] uppercase tracking-[0.15em] text-primary font-semibold">
                {t("ai.recommendation")}
              </span>
            </div>
            <p className="text-[10px] text-foreground leading-relaxed">
              {summary.recommendation}
            </p>
          </div>

          <p className="text-[8px] text-muted-foreground text-right">
            {t("ai.updated")}: {new Date(summary.lastUpdated).toLocaleTimeString()}
          </p>
        </div>
      </ScrollArea>
    </div>
  );
}
