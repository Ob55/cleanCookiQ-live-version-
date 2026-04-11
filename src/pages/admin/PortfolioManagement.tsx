import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Briefcase, CheckCircle, AlertTriangle, XCircle, Ticket } from "lucide-react";

const dmrvStatusColors: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  verified: "bg-green-100 text-green-700",
  disputed: "bg-red-100 text-red-700",
};

const contractStatusColors: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  expiring_soon: "bg-amber-100 text-amber-700",
  expired: "bg-red-100 text-red-700",
  terminated: "bg-muted text-muted-foreground",
};

const priorityColors: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-amber-100 text-amber-700",
  critical: "bg-red-100 text-red-700",
};

export default function PortfolioManagement() {
  const { data: dmrvRecords, isLoading: loadingDmrv } = useQuery({
    queryKey: ["dmrv-records"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dmrv_records")
        .select("*, projects(title, institutions(name))")
        .order("recorded_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: contracts, isLoading: loadingContracts } = useQuery({
    queryKey: ["opex-contracts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("opex_contracts")
        .select("*, projects(title), providers(name)")
        .order("end_date", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: tickets, isLoading: loadingTickets } = useQuery({
    queryKey: ["support-tickets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_tickets")
        .select("*, projects(title), providers:assigned_to_provider_id(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const totalCo2 = dmrvRecords?.reduce((s, r) => s + (Number(r.co2_verified_tonnes) || 0), 0) ?? 0;

  const ticketsByStatus = (status: string) => tickets?.filter(t => t.status === status) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold flex items-center gap-2">
          <Briefcase className="h-6 w-6 text-primary" /> Portfolio Management
        </h1>
        <p className="text-sm text-muted-foreground">Monitor active projects, contracts, and support</p>
      </div>

      <Tabs defaultValue="dmrv">
        <TabsList>
          <TabsTrigger value="dmrv">dMRV Records</TabsTrigger>
          <TabsTrigger value="opex">OPEX Contracts</TabsTrigger>
          <TabsTrigger value="tickets">Support Tickets</TabsTrigger>
        </TabsList>

        <TabsContent value="dmrv" className="mt-4 space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-card border border-border rounded-lg p-4 shadow-card">
              <p className="text-2xl font-display font-bold">{dmrvRecords?.length ?? 0}</p>
              <p className="text-xs text-muted-foreground">Total Records</p>
            </div>
            <div className="bg-card border border-border rounded-lg p-4 shadow-card">
              <p className="text-2xl font-display font-bold text-green-600">
                {dmrvRecords?.filter(r => r.status === "verified").length ?? 0}
              </p>
              <p className="text-xs text-muted-foreground">Verified</p>
            </div>
            <div className="bg-card border border-border rounded-lg p-4 shadow-card">
              <p className="text-2xl font-display font-bold">{totalCo2.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">CO₂ Verified (tonnes)</p>
            </div>
          </div>

          {loadingDmrv ? (
            <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : (
            <div className="bg-card border border-border rounded-xl overflow-hidden shadow-card">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left text-xs font-medium text-muted-foreground p-3">Project</th>
                    <th className="text-left text-xs font-medium text-muted-foreground p-3">Recorded</th>
                    <th className="text-left text-xs font-medium text-muted-foreground p-3">Meals</th>
                    <th className="text-left text-xs font-medium text-muted-foreground p-3">CO₂ (t)</th>
                    <th className="text-left text-xs font-medium text-muted-foreground p-3">Method</th>
                    <th className="text-left text-xs font-medium text-muted-foreground p-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {dmrvRecords?.map(r => (
                    <tr key={r.id} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="p-3 text-sm font-medium">{(r as any).projects?.title || "—"}</td>
                      <td className="p-3 text-xs text-muted-foreground">{new Date(r.recorded_at).toLocaleDateString()}</td>
                      <td className="p-3 text-sm">{r.meals_verified?.toLocaleString()}</td>
                      <td className="p-3 text-sm">{Number(r.co2_verified_tonnes).toLocaleString()}</td>
                      <td className="p-3"><Badge variant="secondary" className="text-xs">{r.verification_method.replace(/_/g, " ")}</Badge></td>
                      <td className="p-3"><Badge className={`text-xs ${dmrvStatusColors[r.status]}`}>{r.status}</Badge></td>
                    </tr>
                  ))}
                  {!dmrvRecords?.length && (
                    <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No dMRV records</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="opex" className="mt-4">
          {loadingContracts ? (
            <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : (
            <div className="bg-card border border-border rounded-xl overflow-hidden shadow-card">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left text-xs font-medium text-muted-foreground p-3">Project</th>
                    <th className="text-left text-xs font-medium text-muted-foreground p-3">Provider</th>
                    <th className="text-left text-xs font-medium text-muted-foreground p-3">Type</th>
                    <th className="text-left text-xs font-medium text-muted-foreground p-3">Monthly (KSh)</th>
                    <th className="text-left text-xs font-medium text-muted-foreground p-3">End Date</th>
                    <th className="text-left text-xs font-medium text-muted-foreground p-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {contracts?.map(c => {
                    const daysToEnd = c.end_date ? Math.ceil((new Date(c.end_date).getTime() - Date.now()) / 86400000) : null;
                    return (
                      <tr key={c.id} className="border-b border-border/50 hover:bg-muted/30">
                        <td className="p-3 text-sm font-medium">{(c as any).projects?.title || "—"}</td>
                        <td className="p-3 text-sm">{(c as any).providers?.name || "—"}</td>
                        <td className="p-3"><Badge variant="secondary" className="text-xs capitalize">{c.contract_type.replace(/_/g, " ")}</Badge></td>
                        <td className="p-3 text-sm">{Number(c.monthly_value_ksh).toLocaleString()}</td>
                        <td className="p-3 text-xs text-muted-foreground">
                          {c.end_date || "—"}
                          {daysToEnd !== null && daysToEnd <= 30 && daysToEnd > 0 && (
                            <span className="ml-1 text-amber-600">({daysToEnd}d)</span>
                          )}
                          {daysToEnd !== null && daysToEnd <= 0 && (
                            <span className="ml-1 text-red-600">(expired)</span>
                          )}
                        </td>
                        <td className="p-3"><Badge className={`text-xs ${contractStatusColors[c.status]}`}>{c.status.replace(/_/g, " ")}</Badge></td>
                      </tr>
                    );
                  })}
                  {!contracts?.length && (
                    <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No OPEX contracts</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="tickets" className="mt-4">
          {loadingTickets ? (
            <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {["open", "in_progress", "resolved"].map(status => (
                <div key={status} className="space-y-3">
                  <h3 className="text-sm font-bold capitalize flex items-center gap-2">
                    {status === "open" && <AlertTriangle className="h-4 w-4 text-amber-500" />}
                    {status === "in_progress" && <Loader2 className="h-4 w-4 text-blue-500" />}
                    {status === "resolved" && <CheckCircle className="h-4 w-4 text-green-500" />}
                    {status.replace(/_/g, " ")} ({ticketsByStatus(status).length})
                  </h3>
                  {ticketsByStatus(status).map(t => (
                    <div key={t.id} className="bg-card border border-border rounded-lg p-3 shadow-card">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium">{t.title}</p>
                        <Badge className={`text-[10px] ${priorityColors[t.priority]}`}>{t.priority}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{(t as any).projects?.title || "—"}</p>
                      {(t as any).providers?.name && (
                        <p className="text-xs text-muted-foreground mt-1">→ {(t as any).providers.name}</p>
                      )}
                    </div>
                  ))}
                  {!ticketsByStatus(status).length && (
                    <div className="bg-muted/30 border border-dashed border-border rounded-lg p-4 text-center">
                      <p className="text-xs text-muted-foreground">No tickets</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
