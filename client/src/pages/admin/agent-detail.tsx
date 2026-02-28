import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { adminAgents, type AgentData, type PaginatedLogs } from "@/lib/admin-api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";

const ADMIN_PATH = "/panel-272d672e974546a7";

export default function AgentDetailPage({ params }: { params?: { id?: string } }) {
  const agentId = params?.id || "";
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [logsPage, setLogsPage] = useState(1);

  const { data: agent, isLoading } = useQuery<AgentData & { recentLogs: any[] }>({
    queryKey: ["admin", "agent", agentId],
    queryFn: () => adminAgents.get(agentId),
    enabled: !!agentId,
  });

  const { data: logsData } = useQuery<PaginatedLogs>({
    queryKey: ["admin", "agent-logs", agentId, logsPage],
    queryFn: () => adminAgents.getLogs(agentId, { page: logsPage, limit: 20 }),
    enabled: !!agentId,
  });

  const runMutation = useMutation({
    mutationFn: () => adminAgents.run(agentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "agent", agentId] });
      queryClient.invalidateQueries({ queryKey: ["admin", "agent-logs", agentId] });
    },
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64 bg-slate-800" />
        <Skeleton className="h-48 bg-slate-800" />
      </div>
    );
  }

  if (!agent) {
    return <div className="p-6 text-red-400">Agent not found</div>;
  }

  const config = agent.config || {};

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`${ADMIN_PATH}/agents`}>
          <Button variant="ghost" size="sm" className="text-slate-400">← Back</Button>
        </Link>
        <h1 className="text-2xl font-bold text-slate-200">{agent.name}</h1>
        <Badge variant="outline" className="text-slate-400 border-slate-700">
          {agent.type.replace(/_/g, " ")}
        </Badge>
        <Badge variant={agent.enabled ? "default" : "secondary"} className={agent.enabled ? "bg-green-900 text-green-300" : ""}>
          {agent.enabled ? "Enabled" : "Disabled"}
        </Badge>
      </div>

      {/* Config card */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-lg text-slate-200">Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {agent.description && (
            <div><span className="text-slate-400">Description:</span> <span className="text-slate-300">{agent.description}</span></div>
          )}
          <div><span className="text-slate-400">Schedule:</span> <span className="text-slate-300 font-mono">{agent.scheduleCron || "Manual"}</span></div>
          <div><span className="text-slate-400">Model:</span> <span className="text-slate-300 font-mono">{config.model || "gpt-4o-mini"}</span></div>
          <div><span className="text-slate-400">Temperature:</span> <span className="text-slate-300 font-mono">{config.temperature ?? 0.3}</span></div>
          <div><span className="text-slate-400">Max Tokens:</span> <span className="text-slate-300 font-mono">{config.maxTokens || 2000}</span></div>
          {agent.lastRunAt && (
            <div><span className="text-slate-400">Last Run:</span> <span className="text-slate-300">{new Date(agent.lastRunAt).toLocaleString()}</span></div>
          )}
          {agent.lastResult && (
            <div className={`p-2 rounded text-xs ${agent.lastResult.success ? "bg-green-950/30 text-green-400" : "bg-red-950/30 text-red-400"}`}>
              {agent.lastResult.success ? "Last result: Success" : `Last result: Error — ${agent.lastResult.error}`}
            </div>
          )}
          <div className="pt-2">
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700"
              onClick={() => runMutation.mutate()}
              disabled={runMutation.isPending}>
              {runMutation.isPending ? "Running..." : "▶ Run Now"}
            </Button>
          </div>
          {config.systemPrompt && (
            <div className="mt-2">
              <span className="text-slate-400 text-xs">System Prompt:</span>
              <pre className="mt-1 p-2 bg-slate-800 rounded text-xs text-slate-300 whitespace-pre-wrap max-h-40 overflow-auto">
                {config.systemPrompt}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Logs */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-lg text-slate-200">Execution Logs</CardTitle>
        </CardHeader>
        <CardContent>
          {(!logsData || logsData.logs.length === 0) ? (
            <p className="text-slate-400 text-sm">No execution logs yet.</p>
          ) : (
            <div className="space-y-2">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="pb-2 text-left">Started</th>
                    <th className="pb-2 text-left">Status</th>
                    <th className="pb-2 text-left">Duration</th>
                    <th className="pb-2 text-left">Tokens</th>
                    <th className="pb-2 text-left">Error</th>
                  </tr>
                </thead>
                <tbody>
                  {logsData.logs.map((log: any) => {
                    const duration = log.finishedAt && log.startedAt
                      ? `${((new Date(log.finishedAt).getTime() - new Date(log.startedAt).getTime()) / 1000).toFixed(1)}s`
                      : "—";
                    return (
                      <tr key={log.id} className="border-b border-slate-800/50">
                        <td className="py-2 text-slate-300 text-xs">{new Date(log.startedAt).toLocaleString()}</td>
                        <td className="py-2">
                          <Badge variant="outline" className={
                            log.status === "success" ? "border-green-700 text-green-400" :
                            log.status === "error" ? "border-red-700 text-red-400" :
                            log.status === "running" ? "border-blue-700 text-blue-400" :
                            "border-slate-700 text-slate-400"
                          }>
                            {log.status}
                          </Badge>
                        </td>
                        <td className="py-2 text-slate-400 font-mono text-xs">{duration}</td>
                        <td className="py-2 text-slate-400 font-mono text-xs">{log.tokensUsed || "—"}</td>
                        <td className="py-2 text-red-400 text-xs max-w-[200px] truncate">{log.error || "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {logsData.pages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-2">
                  <Button size="sm" variant="outline" disabled={logsPage <= 1}
                    className="border-slate-700 text-slate-300" onClick={() => setLogsPage(p => p - 1)}>←</Button>
                  <span className="text-xs text-slate-400">{logsData.page}/{logsData.pages}</span>
                  <Button size="sm" variant="outline" disabled={logsPage >= logsData.pages}
                    className="border-slate-700 text-slate-300" onClick={() => setLogsPage(p => p + 1)}>→</Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
