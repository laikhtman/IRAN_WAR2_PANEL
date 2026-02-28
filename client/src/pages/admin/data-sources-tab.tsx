import { useQuery } from "@tanstack/react-query";
import { adminDataSources } from "@/lib/admin-api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

const STATUS_STYLES: Record<string, string> = {
  ok: "border-green-700 text-green-400",
  error: "border-red-700 text-red-400",
  not_configured: "border-yellow-700 text-yellow-400",
  no_data: "border-slate-700 text-slate-400",
};

export default function DataSourcesTab() {
  const { data: sources, isLoading } = useQuery<any[]>({
    queryKey: ["admin", "data-sources"],
    queryFn: adminDataSources.list,
    refetchInterval: 10000,
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48 bg-slate-800" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-40 bg-slate-800" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-slate-200">Data Sources</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {(sources || []).map((src: any) => (
          <Card key={src.name} className="bg-slate-900 border-slate-800">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base text-slate-200 font-mono">{src.name}</CardTitle>
                <Badge variant="outline" className={STATUS_STYLES[src.status] || STATUS_STYLES.no_data}>
                  {src.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Enabled</span>
                <span className={src.enabled ? "text-green-400" : "text-red-400"}>
                  {src.enabled ? "Yes" : "No"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Interval</span>
                <span className="text-slate-300 font-mono">{Math.round(src.fetchIntervalMs / 1000)}s</span>
              </div>
              {src.health && (
                <>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Runs</span>
                    <span className="text-slate-300 font-mono">{src.health.runCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Errors</span>
                    <span className={src.health.errorCount > 0 ? "text-red-400 font-mono" : "text-slate-300 font-mono"}>
                      {src.health.errorCount}
                    </span>
                  </div>
                  {src.health.lastSuccessAt && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Last Success</span>
                      <span className="text-green-400 text-xs">{new Date(src.health.lastSuccessAt).toLocaleTimeString()}</span>
                    </div>
                  )}
                  {src.health.lastError && (
                    <div className="mt-1 p-2 bg-red-950/30 rounded text-xs text-red-400 break-all">
                      {src.health.lastError}
                    </div>
                  )}
                </>
              )}
              {src.missingEnvVars?.length > 0 && (
                <div className="mt-1 p-2 bg-yellow-950/30 rounded text-xs text-yellow-400">
                  Missing: {src.missingEnvVars.join(", ")}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
