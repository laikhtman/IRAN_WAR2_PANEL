import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminSettings, adminCountries, type BlockedCountry } from "@/lib/admin-api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsTab() {
  const queryClient = useQueryClient();
  const { data: settings, isLoading } = useQuery({
    queryKey: ["admin", "settings"],
    queryFn: adminSettings.getAll,
  });

  const { data: blocked = [] } = useQuery<BlockedCountry[]>({
    queryKey: ["admin", "blocked-countries"],
    queryFn: adminCountries.getBlocked,
  });

  const saveMutation = useMutation({
    mutationFn: ({ key, value }: { key: string; value: any }) => adminSettings.set(key, value),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "settings"] }),
  });

  const blockMutation = useMutation({
    mutationFn: ({ code, name }: { code: string; name: string }) => adminCountries.block(code, name),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "blocked-countries"] }),
  });

  const unblockMutation = useMutation({
    mutationFn: (code: string) => adminCountries.unblock(code),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "blocked-countries"] }),
  });

  // Local form state
  const [rateLimitWindow, setRateLimitWindow] = useState(60000);
  const [rateLimitMax, setRateLimitMax] = useState(100);
  const [gaEnabled, setGaEnabled] = useState(false);
  const [gaId, setGaId] = useState("");
  const [blockingEnabled, setBlockingEnabled] = useState(false);
  const [blockingMode, setBlockingMode] = useState("block");
  const [blockingMessage, setBlockingMessage] = useState("");
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceMsg, setMaintenanceMsg] = useState("");
  const [newCountryCode, setNewCountryCode] = useState("");
  const [newCountryName, setNewCountryName] = useState("");

  // Sync from loaded settings
  useEffect(() => {
    if (settings) {
      setRateLimitWindow(settings.rate_limit_window_ms ?? 60000);
      setRateLimitMax(settings.rate_limit_max_requests ?? 100);
      setGaEnabled(settings.ga_enabled ?? false);
      setGaId(settings.ga_measurement_id ?? "");
      setBlockingEnabled(settings.country_blocking_enabled ?? false);
      setBlockingMode(settings.country_blocking_mode ?? "block");
      setBlockingMessage(settings.country_blocking_message ?? "");
      setMaintenanceMode(settings.maintenance_mode ?? false);
      setMaintenanceMsg(settings.maintenance_message ?? "");
    }
  }, [settings]);

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48 bg-slate-800" />
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-48 bg-slate-800" />)}
      </div>
    );
  }

  const save = (key: string, value: any) => saveMutation.mutate({ key, value });

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-slate-200">Settings</h1>

      {/* Rate Limiting */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-lg text-slate-200">Rate Limiting</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-slate-400 mb-1 block">Window (ms)</label>
              <Input type="number" value={rateLimitWindow} onChange={e => setRateLimitWindow(Number(e.target.value))}
                className="bg-slate-800 border-slate-700 text-slate-200" />
            </div>
            <div>
              <label className="text-sm text-slate-400 mb-1 block">Max Requests</label>
              <Input type="number" value={rateLimitMax} onChange={e => setRateLimitMax(Number(e.target.value))}
                className="bg-slate-800 border-slate-700 text-slate-200" />
            </div>
          </div>
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700"
            onClick={() => {
              save("rate_limit_window_ms", rateLimitWindow);
              save("rate_limit_max_requests", rateLimitMax);
            }}>
            Save Rate Limits
          </Button>
        </CardContent>
      </Card>

      {/* Google Analytics */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-lg text-slate-200">Google Analytics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Switch checked={gaEnabled} onCheckedChange={(v) => { setGaEnabled(v); save("ga_enabled", v); }} />
            <span className="text-sm text-slate-300">{gaEnabled ? "Enabled" : "Disabled"}</span>
          </div>
          <div>
            <label className="text-sm text-slate-400 mb-1 block">GA4 Measurement ID</label>
            <div className="flex gap-2">
              <Input placeholder="G-XXXXXXXXXX" value={gaId} onChange={e => setGaId(e.target.value)}
                className="bg-slate-800 border-slate-700 text-slate-200" />
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700"
                onClick={() => save("ga_measurement_id", gaId)}>Save</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Country Blocking */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-lg text-slate-200">Country Blocking</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Switch checked={blockingEnabled} onCheckedChange={(v) => { setBlockingEnabled(v); save("country_blocking_enabled", v); }} />
            <span className="text-sm text-slate-300">{blockingEnabled ? "Active" : "Inactive"}</span>
          </div>

          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input type="radio" name="blockMode" value="block" checked={blockingMode === "block"}
                onChange={() => { setBlockingMode("block"); save("country_blocking_mode", "block"); }} />
              Blocklist
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input type="radio" name="blockMode" value="allow" checked={blockingMode === "allow"}
                onChange={() => { setBlockingMode("allow"); save("country_blocking_mode", "allow"); }} />
              Allowlist
            </label>
          </div>

          <div>
            <label className="text-sm text-slate-400 mb-1 block">Block Message</label>
            <div className="flex gap-2">
              <Input value={blockingMessage} onChange={e => setBlockingMessage(e.target.value)}
                className="bg-slate-800 border-slate-700 text-slate-200" />
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700"
                onClick={() => save("country_blocking_message", blockingMessage)}>Save</Button>
            </div>
          </div>

          <Separator className="bg-slate-800" />

          <div>
            <label className="text-sm text-slate-400 mb-2 block">Add Country</label>
            <div className="flex gap-2">
              <Input placeholder="Code (e.g. IR)" value={newCountryCode}
                onChange={e => setNewCountryCode(e.target.value.toUpperCase())}
                className="w-20 bg-slate-800 border-slate-700 text-slate-200" maxLength={2} />
              <Input placeholder="Country name" value={newCountryName}
                onChange={e => setNewCountryName(e.target.value)}
                className="bg-slate-800 border-slate-700 text-slate-200" />
              <Button size="sm" className="bg-red-600 hover:bg-red-700"
                onClick={() => {
                  if (newCountryCode.length === 2 && newCountryName) {
                    blockMutation.mutate({ code: newCountryCode, name: newCountryName });
                    setNewCountryCode("");
                    setNewCountryName("");
                  }
                }}>
                Block
              </Button>
            </div>
          </div>

          {blocked.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {blocked.map(c => (
                <Badge key={c.countryCode} variant="outline"
                  className="border-red-800 text-red-400 cursor-pointer hover:bg-red-900/30"
                  onClick={() => unblockMutation.mutate(c.countryCode)}>
                  {c.countryCode} — {c.countryName} ✕
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Maintenance Mode */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-lg text-slate-200">Maintenance Mode</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Switch checked={maintenanceMode} onCheckedChange={(v) => { setMaintenanceMode(v); save("maintenance_mode", v); }} />
            <span className="text-sm text-slate-300">{maintenanceMode ? "Site is in maintenance" : "Normal operation"}</span>
          </div>
          <div>
            <label className="text-sm text-slate-400 mb-1 block">Maintenance Message</label>
            <div className="flex gap-2">
              <Input value={maintenanceMsg} onChange={e => setMaintenanceMsg(e.target.value)}
                className="bg-slate-800 border-slate-700 text-slate-200" />
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700"
                onClick={() => save("maintenance_message", maintenanceMsg)}>Save</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {saveMutation.isPending && (
        <div className="text-sm text-blue-400">Saving...</div>
      )}
    </div>
  );
}
