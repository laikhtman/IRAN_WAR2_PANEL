import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminNews, type PaginatedNews } from "@/lib/admin-api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";

export default function NewsTab() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<any>(null);
  const [editForm, setEditForm] = useState<any>({});

  const { data, isLoading } = useQuery<PaginatedNews>({
    queryKey: ["admin", "news", page, search],
    queryFn: () => adminNews.list({ page, limit: 30, search }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminNews.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "news"] }),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: string[]) => adminNews.deleteBulk(ids),
    onSuccess: () => {
      setSelected(new Set());
      queryClient.invalidateQueries({ queryKey: ["admin", "news"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => adminNews.update(id, data),
    onSuccess: () => {
      setEditing(null);
      queryClient.invalidateQueries({ queryKey: ["admin", "news"] });
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
      setSelected(new Set(data.items.map((n: any) => n.id)));
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
        <h1 className="text-2xl font-bold text-slate-200">News Database</h1>
        {data && <span className="text-sm text-slate-400">{data.total} total items</span>}
      </div>

      {/* Search + bulk actions */}
      <div className="flex gap-2">
        <Input placeholder="Search news..." value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleSearch()}
          className="bg-slate-800 border-slate-700 text-slate-200 max-w-sm" />
        <Button size="sm" onClick={handleSearch} className="bg-blue-600 hover:bg-blue-700">Search</Button>
        {selected.size > 0 && (
          <Button size="sm" variant="destructive"
            onClick={() => bulkDeleteMutation.mutate(Array.from(selected))}>
            Delete {selected.size} selected
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
                  <th className="p-3 text-left">Title</th>
                  <th className="p-3 text-left">Source</th>
                  <th className="p-3 text-left">Category</th>
                  <th className="p-3 text-left">Sentiment</th>
                  <th className="p-3 text-left">Breaking</th>
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
                    <td className="p-3 text-slate-200 max-w-[300px] truncate">{item.title}</td>
                    <td className="p-3 text-slate-400 text-xs">{item.source}</td>
                    <td className="p-3">
                      <Badge variant="outline" className="border-slate-700 text-slate-400 text-xs">{item.category}</Badge>
                    </td>
                    <td className="p-3 font-mono text-xs">
                      {item.sentiment != null ? (
                        <span className={item.sentiment > 0 ? "text-green-400" : item.sentiment < 0 ? "text-red-400" : "text-slate-400"}>
                          {item.sentiment.toFixed(2)}
                        </span>
                      ) : <span className="text-slate-600">—</span>}
                    </td>
                    <td className="p-3">
                      {item.breaking && <Badge className="bg-red-900 text-red-300 text-xs">BREAKING</Badge>}
                    </td>
                    <td className="p-3 text-slate-400 text-xs">
                      {new Date(item.timestamp).toLocaleString()}
                    </td>
                    <td className="p-3 space-x-1">
                      <Button size="sm" variant="ghost" className="text-blue-400 h-7 px-2 text-xs"
                        onClick={() => { setEditing(item); setEditForm({ title: item.title, source: item.source, category: item.category, breaking: item.breaking, url: item.url || "" }); }}>
                        Edit
                      </Button>
                      <Button size="sm" variant="ghost" className="text-red-400 h-7 px-2 text-xs"
                        onClick={() => deleteMutation.mutate(item.id)}>
                        Del
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

      {/* Edit Dialog */}
      <Dialog open={!!editing} onOpenChange={(open) => { if (!open) setEditing(null); }}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-200">
          <DialogHeader>
            <DialogTitle>Edit News Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm text-slate-400">Title</label>
              <Input value={editForm.title || ""} onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                className="bg-slate-800 border-slate-700 text-slate-200" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-slate-400">Source</label>
                <Input value={editForm.source || ""} onChange={e => setEditForm({ ...editForm, source: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-slate-200" />
              </div>
              <div>
                <label className="text-sm text-slate-400">Category</label>
                <Input value={editForm.category || ""} onChange={e => setEditForm({ ...editForm, category: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-slate-200" />
              </div>
            </div>
            <div>
              <label className="text-sm text-slate-400">URL</label>
              <Input value={editForm.url || ""} onChange={e => setEditForm({ ...editForm, url: e.target.value })}
                className="bg-slate-800 border-slate-700 text-slate-200" />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={editForm.breaking || false} onCheckedChange={v => setEditForm({ ...editForm, breaking: v })} />
              <span className="text-sm text-slate-300">Breaking</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)} className="text-slate-400">Cancel</Button>
            <Button className="bg-blue-600 hover:bg-blue-700"
              onClick={() => {
                if (editing) updateMutation.mutate({ id: editing.id, data: editForm });
              }}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
