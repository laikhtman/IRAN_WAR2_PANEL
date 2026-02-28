import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Shield, Radio, Wifi, Activity } from "lucide-react";

export function HeaderBar() {
  const [time, setTime] = useState(new Date());
  const [israelTime, setIsraelTime] = useState("");

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setTime(now);
      setIsraelTime(now.toLocaleTimeString("en-US", {
        timeZone: "Asia/Jerusalem",
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="flex items-center justify-between gap-2 px-4 h-10 border-b border-border bg-card/50 flex-shrink-0" data-testid="header-bar">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center glow-cyan">
            <Shield className="w-3.5 h-3.5 text-primary" />
          </div>
          <div>
            <h1 className="text-[11px] font-bold text-foreground tracking-[0.1em] uppercase leading-none">
              WAR PANEL
            </h1>
            <p className="text-[7px] text-muted-foreground tracking-[0.2em] uppercase">
              INTELLIGENCE DASHBOARD
            </p>
          </div>
        </div>

        <div className="h-4 w-px bg-border" />

        <div className="flex items-center gap-1.5">
          <Wifi className="w-3 h-3 text-emerald-400" />
          <span className="text-[8px] text-emerald-400 uppercase tracking-wider font-semibold">Connected</span>
        </div>

        <div className="flex items-center gap-1.5">
          <Activity className="w-3 h-3 text-primary" />
          <span className="text-[8px] text-primary uppercase tracking-wider font-semibold">Live Feed</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-[8px] text-muted-foreground uppercase tracking-wider">Local</p>
            <p className="text-[11px] font-bold text-foreground tabular-nums leading-none">
              {time.toLocaleTimeString("en-US", { hour12: false })}
            </p>
          </div>
          <div className="h-4 w-px bg-border" />
          <div className="text-right">
            <p className="text-[8px] text-muted-foreground uppercase tracking-wider">Israel (IDT)</p>
            <p className="text-[11px] font-bold text-cyan-400 tabular-nums leading-none">
              {israelTime}
            </p>
          </div>
        </div>

        <div className="h-4 w-px bg-border" />

        <Badge variant="outline" className="text-[8px] border-primary/30 text-primary no-default-hover-elevate no-default-active-elevate">
          <Radio className="w-2.5 h-2.5 mr-1" />
          {time.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </Badge>
      </div>
    </header>
  );
}
