import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminEvents, type PaginatedEvents } from "@/lib/admin-api";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

const EVENT_TYPES = [
  "missile_launch", "missile_intercept", "missile_hit",
  "drone_launch", "drone_intercept", "air_raid_alert",
  "ceasefire", "military_operation", "explosion", "sirens",
  "naval_movement", "aircraft_tracking",
];

const THREAT_COLORS: Record<string, string> = {
  critical: "bg-red-900 text-red-300",
  high: "bg-orange-900 text-orange-300",
  medium: "bg-yellow-900 text-yellow-300",
  low: "bg-green-900 text-green-300",
};

export default function EventsTab() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [countryFilter, setCountryFilter] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data, isLoading } = useQuery<PaginatedEvents>({
    queryKey: ["admin", "events", page, search, typeFilter, countryFilter],
    queryFn: () => adminEvents.list({ page, limit: 30, search, type: typeFilter, country: countryFilter }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminEvents.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "events"] }),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: string[]) => adminEvents.deleteBulk(ids),
    onSuccess: () => {
      setSelected(new Set());
      queryClient.invalidateQueries({ queryKey: ["admin", "events"] });
    },
  });

  const handleSearch = () => {
    setPage(1);
    setSearch(searchInput);
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const toggleAll = () => {
    if (!data) return;
    if (selected.size === data.items.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(data.items.map((e: any) => e.id)));
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48 bg-slate-800" />
        <Skeleton className="h-96 bg-slate-800" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-200">Events Database</h1>
        {data && <span className="text-sm text-slate-400">{data.total} total events</span>}
      </div>

      {/* Search + Filters */}
      <div className="flex flex-wrap gap-2">
        <Input placeholder="Search events..." value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleSearch()}
          className="bg-slate-800 border-slate-700 text-slate-200 max-w-[200px]" />
        <Button size="sm" onClick={handleSearch} className="bg-blue-600 hover:bg-blue-700">Search</Button>
        <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1); }}
          className="h-9 px-2 text-sm rounded-md bg-slate-800 border border-slate-700 text-slate-300">
          <option value="">All types</option>
          {EVENT_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
        </select>
        <Input placeholder="Country filter" value={countryFilter}
          onChange={e => { setCountryFilter(e.target.value); setPage(1); }}
          className="bg-slate-800 border-slate-700 text-slate-200 max-w-[140px]" />
        {selected.size > 0 && (
          <Button size="sm" variant="destructive"
            onClick={() => bulkDeleteMutation.mutate(Array.from(selected))}>
            Delete {selected.size}
          </Button>
        )}
      </div>

      {/* Table */}
      <Card className="bg-slate-900 border-slate-800">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="p-3 text-left w-8">
                    <input type="checkbox" checked={data?.items.length ? selected.size === data.items.length : false}
                      onChange={toggleAll} className="accent-red-500" />
                  </th>
                  <th className="p-3 text-left">Type</th>
                  <th className="p-3 text-left">Title</th>
                  <th className="p-3 text-left">Location</th>
                  <th className="p-3 text-left">Country</th>
                  <th className="p-3 text-left">Threat</th>
                  <th className="p-3 text-left">Verified</th>
                  <th className="p-3 text-left">Time</th>
                  <th className="p-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data?.items.map((item: any) => (
                  <tr key={item.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                    <td className="p-3">
                      <input type="checkbox" checked={selected.has(item.id)}
                        onChange={() => toggleSelect(item.id)} className="accent-red-500" />
                    </td>
                    <td className="p-3">
                      <Badge variant="outline" className="border-slate-700 text-slate-400 text-xs">
                        {item.type?.replace(/_/g, " ")}
                      </Badge>
                    </td>
                    <td className="p-3 text-slate-200 max-w-[250px] truncate">{item.title}</td>
                    <td className="p-3 text-slate-400 text-xs">{item.location}</td>
                    <td className="p-3 text-slate-400 text-xs">{item.country}</td>
                    <td className="p-3">
                      <Badge className={`text-xs ${THREAT_COLORS[item.threatLevel || item.threat_level] || "bg-slate-800 text-slate-400"}`}>
                        {item.threatLevel || item.threat_level}
                      </Badge>
                    </td>
                    <td className="p-3 text-xs">
                      {item.verified ? <span className="text-green-400">✓</span> : <span className="text-slate-600">✗</span>}
                    </td>
                    <td className="p-3 text-slate-400 text-xs">
                      {new Date(item.timestamp).toLocaleString()}
                    </td>
                    <td className="p-3">
                      <Button size="sm" variant="ghost" className="text-red-400 h-7 px-2 text-xs"
                        onClick={() => deleteMutation.mutate(item.id)}>
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {data && data.pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button size="sm" variant="outline" disabled={page <= 1}
            className="border-slate-700 text-slate-300" onClick={() => setPage(p => p - 1)}>← Prev</Button>
          <span className="text-sm text-slate-400">Page {data.page} of {data.pages}</span>
          <Button size="sm" variant="outline" disabled={page >= data.pages}
            className="border-slate-700 text-slate-300" onClick={() => setPage(p => p + 1)}>Next →</Button>
        </div>
      )}
    </div>
  );
}
