import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Loader2, Briefcase } from "lucide-react";
import { DownloadReportButton, dateColumn } from "@/components/admin/DownloadReportButton";

const dmrvStatusColors: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  verified: "bg-green-100 text-green-700",
  disputed: "bg-red-100 text-red-700",
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

  const totalCo2 = dmrvRecords?.reduce((s, r) => s + (Number(r.co2_verified_tonnes) || 0), 0) ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <Briefcase className="h-6 w-6 text-primary" /> Portfolio Management
          </h1>
          <p className="text-sm text-muted-foreground">Monitor active projects and dMRV records</p>
        </div>
        <DownloadReportButton
          rows={dmrvRecords ?? []}
          columns={[
            { key: "projects", label: "Project", format: (r: any) => r.projects?.title ?? "" },
            { key: "projects", label: "Institution", format: (r: any) => r.projects?.institutions?.name ?? "" },
            dateColumn("recorded_at", "Recorded"),
            { key: "meals_verified", label: "Meals Verified" },
            { key: "co2_verified_tonnes", label: "CO₂ Verified (t)" },
            { key: "verification_method", label: "Method" },
            { key: "status", label: "Status" },
          ]}
          title="Portfolio dMRV Records"
          filename="dmrv-portfolio"
        />
      </div>

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
    </div>
  );
}
