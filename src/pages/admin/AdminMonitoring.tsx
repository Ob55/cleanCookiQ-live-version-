import { Activity, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useMonitoringLatest } from "@/hooks/useRisk";
import { type MonitoringLatest } from "@/lib/risk";

export default function AdminMonitoring() {
  const { data, isLoading } = useMonitoringLatest();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold flex items-center gap-2">
          <Activity className="h-6 w-6 text-primary" /> Monitoring
        </h1>
        <p className="text-muted-foreground mt-1">
          Latest fuel-use reading per project. Clean-fuel share &lt; 50% triggers a
          behavioural-relapse risk and a refresher-training ticket automatically.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}</div>
      ) : (data ?? []).length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No monitoring readings recorded yet.</CardContent></Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Latest reading per project</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground border-b">
                <tr>
                  <th className="text-left py-2 px-3">Project</th>
                  <th className="text-left py-2 px-3">Period</th>
                  <th className="text-right py-2 px-3">Clean fuel</th>
                  <th className="text-right py-2 px-3">Baseline fuel</th>
                  <th className="text-right py-2 px-3">Share</th>
                  <th className="text-right py-2 px-3">Downtime</th>
                  <th className="text-right py-2 px-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {(data ?? []).map((r) => <MonitoringRow key={r.id} row={r} />)}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function MonitoringRow({ row: r }: { row: MonitoringLatest }) {
  const sharePct = r.clean_fuel_share == null ? null : Math.round(r.clean_fuel_share * 100);
  const isRelapse = sharePct !== null && sharePct < 50;
  return (
    <tr className="border-b last:border-0">
      <td className="py-2 px-3">
        <div className="font-medium">{r.project_title}</div>
        <div className="text-xs text-muted-foreground">
          {r.institution_name}{r.institution_county ? ` · ${r.institution_county}` : ""}
        </div>
      </td>
      <td className="py-2 px-3 text-xs">{r.period_start} → {r.period_end}</td>
      <td className="py-2 px-3 text-right">
        {r.clean_fuel_units.toLocaleString()} {r.clean_fuel_unit ?? ""}
      </td>
      <td className="py-2 px-3 text-right">
        {r.baseline_fuel_units.toLocaleString()} {r.baseline_fuel_unit ?? ""}
      </td>
      <td className="py-2 px-3 text-right">
        {sharePct === null ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          <span className={isRelapse ? "text-destructive font-medium" : "text-emerald-700"}>
            {sharePct}%
          </span>
        )}
      </td>
      <td className="py-2 px-3 text-right text-xs text-muted-foreground">
        {r.downtime_hours.toFixed(0)}h
      </td>
      <td className="py-2 px-3 text-right">
        {isRelapse ? (
          <Badge className="bg-red-100 text-red-700 gap-1"><AlertTriangle className="h-3 w-3" /> Relapse</Badge>
        ) : (
          <Badge className="bg-emerald-100 text-emerald-700 gap-1"><CheckCircle2 className="h-3 w-3" /> OK</Badge>
        )}
      </td>
    </tr>
  );
}
