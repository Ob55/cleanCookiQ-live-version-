import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchAllRows, countRows } from "@/lib/fetchAllRows";
import { TrendingUp, Building2, Factory, BarChart3, FileText, Loader2 } from "lucide-react";
import { DownloadReportButton } from "@/components/admin/DownloadReportButton";

export default function PipelineDashboard() {
  // Count on the DB, not the browser: the funnel needs only the pipeline_stage
  // column, and the assessed / provider tallies come back as head counts (no
  // rows shipped, no 1k cap). Keeps this dashboard light and accurate.
  const { data: stageRows } = useQuery({
    queryKey: ["pipeline-stage-rows"],
    queryFn: () => fetchAllRows<{ pipeline_stage: string }>((from, to) =>
      supabase.from("institutions").select("pipeline_stage").range(from, to)),
  });
  const { data: assessedCount = 0 } = useQuery({
    queryKey: ["pipeline-assessed-count"],
    queryFn: () => countRows(() => supabase.from("institutions").select("*", { count: "exact", head: true })
      .or("pipeline_stage.in.(assessed,scored),assessment_score.gt.0")),
  });
  const { data: providersCount = 0 } = useQuery({
    queryKey: ["pipeline-providers-count"],
    queryFn: () => countRows(() => supabase.from("providers").select("*", { count: "exact", head: true })),
  });

  const total = stageRows?.length ?? 0;
  const stageCounts: Record<string, number> = {};
  stageRows?.forEach(i => { stageCounts[i.pipeline_stage] = (stageCounts[i.pipeline_stage] || 0) + 1; });

  const stages = [
    { stage: "Identified", key: "identified" },
    { stage: "Assessed / Scored", keys: ["assessed", "scored"] },
    { stage: "Installed", key: "installed" },
  ].map(s => {
    const keys = (s as any).keys || [(s as any).key];
    const count = keys.reduce((sum: number, k: string) => sum + (stageCounts[k] || 0), 0);
    return { stage: s.stage, count, pct: total ? Math.round((count / total) * 100) : 0 };
  });

  const kpis = [
    { label: "Total Institutions", value: total.toLocaleString(), icon: Building2 },
    { label: "Assessed", value: assessedCount.toString(), icon: BarChart3 },
    { label: "In Delivery", value: ((stageCounts["contracted"] || 0) + (stageCounts["installed"] || 0) + (stageCounts["in_delivery"] || 0)).toString(), icon: TrendingUp },
    { label: "Providers", value: providersCount.toLocaleString(), icon: Factory },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-display font-bold">Pipeline Dashboard</h1>
          <p className="text-sm text-muted-foreground">Real-time national transition pipeline</p>
        </div>
        <DownloadReportButton
          rows={[
            ...stages.map(s => ({ stage: s.stage, count: s.count, pct: `${s.pct}%` })),
            { stage: "Total Institutions", count: total, pct: "100%" },
            { stage: "Assessed", count: assessedCount, pct: total ? `${Math.round((assessedCount/total)*100)}%` : "0%" },
            { stage: "Providers", count: providersCount, pct: "—" },
          ]}
          columns={[
            { key: "stage", label: "Pipeline Stage" },
            { key: "count", label: "Count" },
            { key: "pct", label: "% of Total" },
          ]}
          title="Pipeline Funnel"
          filename="pipeline-funnel"
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="bg-card border border-border rounded-xl p-4 shadow-card">
            <div className="flex items-center justify-between mb-2">
              <kpi.icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-xl font-display font-bold">{kpi.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{kpi.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-card border border-border rounded-xl p-6 shadow-card">
        <h2 className="font-display font-bold text-lg mb-6">Pipeline Stage Funnel</h2>
        <div className="space-y-3">
          {stages.map((s) => (
            <div key={s.stage} className="flex items-center gap-4">
              <span className="text-sm font-medium w-28 shrink-0">{s.stage}</span>
              <div className="flex-1 bg-muted rounded-full h-8 overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full flex items-center justify-end pr-3 transition-all"
                  style={{ width: `${Math.max(s.pct * 2, s.count > 0 ? 8 : 0)}%` }}
                >
                  {s.count > 0 && <span className="text-xs font-bold text-primary-foreground">{s.count}</span>}
                </div>
              </div>
              <span className="text-xs text-muted-foreground w-10 text-right">{s.pct}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
