import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Alert } from "@shared/schema";
import { AlertTriangle, MapPin } from "lucide-react";

interface AlertsPanelProps {
  alerts: Alert[];
}

export function AlertsPanel({ alerts }: AlertsPanelProps) {
  const activeAlerts = alerts.filter(a => a.active);
  const recentInactive = alerts.filter(a => !a.active).slice(0, 3);

  return (
    <div className="flex flex-col h-full" data-testid="alerts-panel">
      <div className="flex items-center justify-between gap-1 mb-2">
        <div className="flex items-center gap-2">
          <AlertTriangle className={`w-3.5 h-3.5 ${activeAlerts.length > 0 ? "text-red-400 animate-blink-alert" : "text-muted-foreground"}`} />
          <h3 className="text-[10px] uppercase tracking-[0.2em] text-primary font-bold">
            Oref Alerts
          </h3>
        </div>
        {activeAlerts.length > 0 && (
          <Badge variant="destructive" className="text-[8px] animate-pulse-glow">
            {activeAlerts.length} ACTIVE
          </Badge>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-1.5 pr-1">
          {activeAlerts.length === 0 && recentInactive.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6">
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center mb-2">
                <AlertTriangle className="w-5 h-5 text-emerald-400" />
              </div>
              <p className="text-[10px] text-emerald-400 font-semibold">NO ACTIVE ALERTS</p>
              <p className="text-[9px] text-muted-foreground">All clear</p>
            </div>
          ) : (
            <>
              {activeAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="border border-red-500/30 rounded-md p-2.5 bg-red-500/5 glow-red"
                  data-testid={`alert-active-${alert.id}`}
                >
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse-glow mt-1 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <p className="text-[10px] font-bold text-red-300 uppercase tracking-wider">
                          {alert.area}
                        </p>
                      </div>
                      <p className="text-[9px] text-red-200/70">{alert.threat}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <MapPin className="w-2.5 h-2.5 text-red-400/50" />
                        <span className="text-[8px] text-red-400/50 tabular-nums">
                          {new Date(alert.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {recentInactive.length > 0 && (
                <div className="mt-2">
                  <p className="text-[8px] uppercase tracking-[0.15em] text-muted-foreground mb-1.5 font-semibold">
                    Recently Expired
                  </p>
                  {recentInactive.map((alert) => (
                    <div
                      key={alert.id}
                      className="border border-border rounded-md p-2 bg-card/20 mb-1"
                      data-testid={`alert-expired-${alert.id}`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[9px] text-muted-foreground">{alert.area}</span>
                        <span className="text-[8px] text-muted-foreground tabular-nums">
                          {new Date(alert.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
