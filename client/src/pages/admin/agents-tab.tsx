import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { adminAgents, type AgentData, type AgentStats } from "@/lib/admin-api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

const AGENT_TYPES = ["content_moderator", "news_curator", "alert_manager", "seo_optimizer", "custom"];
const TYPE_COLORS: Record<string, string> = {
  content_moderator: "border-purple-700 text-purple-400",
  news_curator: "border-blue-700 text-blue-400",
  alert_manager: "border-red-700 text-red-400",
  seo_optimizer: "border-green-700 text-green-400",
  custom: "border-slate-600 text-slate-400",
};

const ADMIN_PATH = "/panel-272d672e974546a7";

export default function AgentsTab() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", type: "custom", description: "", scheduleCron: "", enabled: true });

  const { data: agentList = [], isLoading } = useQuery<AgentData[]>({
    queryKey: ["admin", "agents"],
    queryFn: adminAgents.list,
  });

  const { data: stats } = useQuery<AgentStats>({
    queryKey: ["admin", "agent-stats"],
    queryFn: adminAgents.stats,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => adminAgents.create(data),
    onSuccess: () => {
      setShowCreate(false);
      setForm({ name: "", type: "custom", description: "", scheduleCron: "", enabled: true });
      queryClient.invalidateQueries({ queryKey: ["admin", "agents"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminAgents.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "agents"] }),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) => adminAgents.update(id, { enabled } as any),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "agents"] }),
  });

  const runMutation = useMutation({
    mutationFn: (id: string) => adminAgents.run(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "agents"] }),
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48 bg-slate-800" />
        <Skeleton className="h-24 bg-slate-800" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map(i => <Skeleton key={i} className="h-40 bg-slate-800" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-200">OpenClaw Agents</h1>
        <Button className="bg-green-600 hover:bg-green-700" onClick={() => setShowCreate(true)}>
          + New Agent
        </Button>
      </div>

      {/* Stats bar */}
      {stats && (
        <div className="grid grid-cols-3 gap-4">
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-slate-200">{stats.totalRuns}</div>
              <div className="text-xs text-slate-400">Total Runs</div>
            </CardContent>
          </Card>
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-slate-200">{stats.totalTokens.toLocaleString()}</div>
              <div className="text-xs text-slate-400">Tokens Used</div>
            </CardContent>
          </Card>
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-slate-200">{stats.successRate}%</div>
              <div className="text-xs text-slate-400">Success Rate</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Agent cards */}
      {agentList.length === 0 ? (
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-8 text-center text-slate-400">
            No agents created yet. Click "+ New Agent" to create your first autonomous agent.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {agentList.map(agent => (
            <Card key={agent.id} className="bg-slate-900 border-slate-800">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base text-slate-200">{agent.name}</CardTitle>
                    <Badge variant="outline" className={TYPE_COLORS[agent.type] || TYPE_COLORS.custom}>
                      {agent.type.replace(/_/g, " ")}
                    </Badge>
                  </div>
                  <Switch checked={agent.enabled}
                    onCheckedChange={(v) => toggleMutation.mutate({ id: agent.id, enabled: v })} />
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {agent.description && (
                  <p className="text-slate-400 text-xs">{agent.description}</p>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-400">Schedule</span>
                  <span className="text-slate-300 font-mono text-xs">{agent.scheduleCron || "Manual only"}</span>
                </div>
                {agent.lastRunAt && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Last Run</span>
                    <span className="text-slate-400 text-xs">{new Date(agent.lastRunAt).toLocaleString()}</span>
                  </div>
                )}
                {agent.lastResult && (
                  <div className={`text-xs p-1.5 rounded ${agent.lastResult.success ? "bg-green-950/30 text-green-400" : "bg-red-950/30 text-red-400"}`}>
                    {agent.lastResult.success ? "✓ Success" : `✗ ${agent.lastResult.error || "Failed"}`}
                  </div>
                )}
                <div className="flex gap-2 pt-1">
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700 h-7 text-xs"
                    onClick={() => runMutation.mutate(agent.id)}
                    disabled={runMutation.isPending}>
                    {runMutation.isPending ? "Running..." : "▶ Run Now"}
                  </Button>
                  <Button size="sm" variant="ghost" className="text-slate-400 h-7 text-xs"
                    onClick={() => navigate(`${ADMIN_PATH}/agents/${agent.id}`)}>
                    Details
                  </Button>
                  <Button size="sm" variant="ghost" className="text-red-400 h-7 text-xs"
                    onClick={() => { if (confirm("Delete this agent?")) deleteMutation.mutate(agent.id); }}>
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-200">
          <DialogHeader>
            <DialogTitle>Create New Agent</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm text-slate-400">Name</label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="e.g., News Deduplicator"
                className="bg-slate-800 border-slate-700 text-slate-200" />
            </div>
            <div>
              <label className="text-sm text-slate-400">Type</label>
              <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}
                className="w-full h-9 px-3 text-sm rounded-md bg-slate-800 border border-slate-700 text-slate-300">
                {AGENT_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm text-slate-400">Description</label>
              <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                className="bg-slate-800 border-slate-700 text-slate-200" />
            </div>
            <div>
              <label className="text-sm text-slate-400">Cron Schedule (optional)</label>
              <Input value={form.scheduleCron} onChange={e => setForm({ ...form, scheduleCron: e.target.value })}
                placeholder="*/30 * * * * (every 30 min)"
                className="bg-slate-800 border-slate-700 text-slate-200" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowCreate(false)} className="text-slate-400">Cancel</Button>
            <Button className="bg-green-600 hover:bg-green-700"
              disabled={!form.name || createMutation.isPending}
              onClick={() => createMutation.mutate(form)}>
              {createMutation.isPending ? "Creating..." : "Create Agent"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
