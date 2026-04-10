import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Search, Shield, Clock } from "lucide-react";
import { useState } from "react";

export default function AuditLog() {
  const [search, setSearch] = useState("");
  const [filterTable, setFilterTable] = useState<string>("all");

  const { data: logs, isLoading } = useQuery({
    queryKey: ["audit-log"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data;
    },
  });

  const tables = [...new Set(logs?.map(l => l.table_name).filter(Boolean) || [])];

  const filtered = logs?.filter(l => {
    const matchSearch = !search ||
      l.action.toLowerCase().includes(search.toLowerCase()) ||
      l.table_name?.toLowerCase().includes(search.toLowerCase()) ||
      l.record_id?.toLowerCase().includes(search.toLowerCase());
    const matchTable = filterTable === "all" || l.table_name === filterTable;
    return matchSearch && matchTable;
  });

  const actionColors: Record<string, string> = {
    create: "bg-emerald-500/20 text-emerald-600",
    update: "bg-blue-500/20 text-blue-600",
    delete: "bg-destructive/20 text-destructive",
  };

  const getActionColor = (action: string) => {
    if (action.includes("create") || action.includes("insert")) return actionColors.create;
    if (action.includes("update") || action.includes("approve") || action.includes("change")) return actionColors.update;
    if (action.includes("delete") || action.includes("reject")) return actionColors.delete;
    return "bg-muted text-muted-foreground";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">System Audit Log</h1>
        <p className="text-sm text-muted-foreground">Complete record of all system actions</p>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search actions, tables, IDs..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterTable} onValueChange={setFilterTable}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Filter by table" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tables</SelectItem>
            {tables.map(t => <SelectItem key={t} value={t!}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-card">
          {filtered?.length === 0 ? (
            <div className="p-12 text-center">
              <Shield className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">No audit entries found</p>
              <p className="text-xs text-muted-foreground mt-1">Actions will appear here as users interact with the system</p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {filtered?.map(log => (
                <div key={log.id} className="p-4 hover:bg-muted/30 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center mt-0.5">
                        <Shield className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className={getActionColor(log.action)}>
                            {log.action}
                          </Badge>
                          {log.table_name && (
                            <span className="text-xs text-muted-foreground font-mono">{log.table_name}</span>
                          )}
                        </div>
                        {log.record_id && (
                          <p className="text-xs text-muted-foreground mt-1 font-mono">
                            Record: {log.record_id}
                          </p>
                        )}
                        {log.old_data && (
                          <details className="mt-1">
                            <summary className="text-xs text-muted-foreground cursor-pointer">View changes</summary>
                            <pre className="text-xs bg-muted/50 p-2 rounded mt-1 overflow-auto max-h-32">
                              {JSON.stringify({ old: log.old_data, new: log.new_data }, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
                      <Clock className="h-3 w-3" />
                      {new Date(log.created_at).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
