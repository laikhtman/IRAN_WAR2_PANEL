import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { adminHealth, type HealthData } from "@/lib/admin-api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${d}d ${h}h ${m}m`;
}

function formatBytes(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function HealthTab() {
  const [autoRefresh, setAutoRefresh] = useState(true);

  const { data, isLoading, error } = useQuery<HealthData>({
    queryKey: ["admin", "health"],
    queryFn: adminHealth.get,
    refetchInterval: autoRefresh ? 5000 : false,
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48 bg-slate-800" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 bg-slate-800" />)}
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="p-6 text-red-400">Error loading health data: {(error as Error).message}</div>;
  }

  if (!data) return null;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-200">System Health</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-400">Auto-refresh (5s)</span>
          <Switch checked={autoRefresh} onCheckedChange={setAutoRefresh} />
        </div>
      </div>

      {/* Overview cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-4">
            <div className="text-sm text-slate-400">Database</div>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={data.database.status === "ok" ? "default" : "destructive"}
                className={data.database.status === "ok" ? "bg-green-900 text-green-300" : ""}>
                {data.database.status}
              </Badge>
            </div>
            {data.database.error && <p className="text-xs text-red-400 mt-1">{data.database.error}</p>}
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-4">
            <div className="text-sm text-slate-400">Uptime</div>
            <div className="text-lg font-mono text-slate-200 mt-1">{formatUptime(data.uptime)}</div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-4">
            <div className="text-sm text-slate-400">Memory (RSS)</div>
            <div className="text-lg font-mono text-slate-200 mt-1">{formatBytes(data.memory.rss)}</div>
            <div className="text-xs text-slate-500">Heap: {formatBytes(data.memory.heapUsed)} / {formatBytes(data.memory.heapTotal)}</div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-4">
            <div className="text-sm text-slate-400">DB Records</div>
            <div className="text-sm text-slate-300 mt-1 space-y-0.5">
              {Object.entries(data.database.counts).map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <span className="capitalize">{k}</span>
                  <span className="font-mono">{v}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Data Sources */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-lg text-slate-200">Data Sources</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="pb-2 text-left">Name</th>
                  <th className="pb-2 text-left">Status</th>
                  <th className="pb-2 text-left">Enabled</th>
                  <th className="pb-2 text-left">Interval</th>
                  <th className="pb-2 text-left">Last Success</th>
                  <th className="pb-2 text-left">Last Error</th>
                </tr>
              </thead>
              <tbody>
                {data.dataSources.map((src: any) => (
                  <tr key={src.name} className="border-b border-slate-800/50">
                    <td className="py-2 text-slate-200 font-mono text-xs">{src.name}</td>
                    <td className="py-2">
                      <Badge variant="outline" className={
                        src.status === "ok" ? "border-green-700 text-green-400" :
                        src.status === "error" ? "border-red-700 text-red-400" :
                        src.status === "not_configured" ? "border-yellow-700 text-yellow-400" :
                        "border-slate-700 text-slate-400"
                      }>
                        {src.status}
                      </Badge>
                    </td>
                    <td className="py-2 text-slate-300">{src.enabled ? "✓" : "✗"}</td>
                    <td className="py-2 text-slate-400 font-mono text-xs">{Math.round(src.fetchIntervalMs / 1000)}s</td>
                    <td className="py-2 text-slate-400 text-xs">
                      {src.health?.lastSuccessAt ? new Date(src.health.lastSuccessAt).toLocaleTimeString() : "—"}
                    </td>
                    <td className="py-2 text-red-400 text-xs max-w-[200px] truncate">
                      {src.health?.lastError || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Environment Variables */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-lg text-slate-200">Environment Variables</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {Object.entries(data.envVars).map(([key, status]) => (
              <div key={key} className="flex items-center gap-2 text-xs">
                <span className={status === "configured" ? "text-green-400" : "text-red-400"}>
                  {status === "configured" ? "●" : "○"}
                </span>
                <span className="text-slate-400 font-mono truncate">{key}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="text-xs text-slate-600">Last updated: {data.timestamp}</div>
    </div>
  );
}
