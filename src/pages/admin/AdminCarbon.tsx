import { Leaf, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useCarbonSummary } from "@/hooks/useRisk";
import { formatTco2e } from "@/lib/risk";

const STATUS_COLORS: Record<string, string> = {
  design: "bg-slate-100 text-slate-700",
  validation: "bg-blue-100 text-blue-700",
  registered: "bg-amber-100 text-amber-700",
  issued: "bg-emerald-100 text-emerald-700",
  retired: "bg-violet-100 text-violet-700",
  rejected: "bg-red-100 text-red-700",
};

export default function AdminCarbon() {
  const { data, isLoading } = useCarbonSummary();

  const totals = (data ?? []).reduce(
    (acc, p) => ({
      estimated: acc.estimated + p.total_estimated_tco2e,
      verified: acc.verified + p.total_verified_tco2e,
      annualForecast: acc.annualForecast + p.estimated_annual_credits,
    }),
    { estimated: 0, verified: 0, annualForecast: 0 },
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold flex items-center gap-2">
          <Leaf className="h-6 w-6 text-primary" /> Carbon Ledger
        </h1>
        <p className="text-muted-foreground mt-1">
          Carbon projects per institution, with forecast vs. third-party verified tonnes.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Annual forecast</p>
            <p className="text-2xl font-bold">{formatTco2e(totals.annualForecast)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Total estimated</p>
            <p className="text-2xl font-bold">{formatTco2e(totals.estimated)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Total verified</p>
            <p className="text-2xl font-bold text-emerald-700">{formatTco2e(totals.verified)}</p>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}</div>
      ) : (data ?? []).length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No carbon projects on file yet.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {(data ?? []).map((p) => (
            <Card key={p.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div>
                    <CardTitle className="text-base">{p.project_title}</CardTitle>
                    <p className="text-xs text-muted-foreground">
                      {p.institution_name}{p.institution_county ? ` · ${p.institution_county}` : ""}
                      {p.methodology ? ` · ${p.methodology}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {p.registry && <Badge variant="outline">{p.registry}</Badge>}
                    <Badge className={STATUS_COLORS[p.status] ?? ""}>{p.status}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <Stat label="Annual forecast" value={formatTco2e(p.estimated_annual_credits)} />
                <Stat label="Total estimated" value={formatTco2e(p.total_estimated_tco2e)} />
                <Stat label="Verified" value={formatTco2e(p.total_verified_tco2e)} highlight />
                <Stat
                  label="Baseline / project"
                  value={`${p.baseline_emissions_tco2e.toLocaleString()} → ${p.project_emissions_tco2e.toLocaleString()}`}
                />
                {p.registry_project_id && (
                  <a
                    href="#"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    Registry ID: {p.registry_project_id} <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`font-semibold ${highlight ? "text-emerald-700" : ""}`}>{value}</p>
    </div>
  );
}
