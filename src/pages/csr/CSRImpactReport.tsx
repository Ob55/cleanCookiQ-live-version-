import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Leaf, UtensilsCrossed, Users, Banknote, MapPin } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useFunderPortfolio, useFunderPortfolioSummary, useFunderDealFlow } from "@/hooks/useFunder";
import { DownloadReportButton } from "@/components/admin/DownloadReportButton";

const ksh = (v: number | null | undefined) =>
  v == null ? "—" : `KSh ${Math.round(v).toLocaleString()}`;
const num = (v: number | null | undefined) =>
  v == null ? "—" : Math.round(v).toLocaleString();
const t = (v: number | null | undefined) =>
  v == null ? "—" : `${Number(v).toFixed(1)} t`;

export default function CSRImpactReport() {
  const { profile } = useAuth();
  const orgId = profile?.organisation_id ?? undefined;

  const { data: summary, isLoading: sLoading } = useFunderPortfolioSummary(orgId);
  const { data: portfolio, isLoading: pLoading } = useFunderPortfolio(orgId);
  const { data: deals, isLoading: dLoading } = useFunderDealFlow();

  const dealById = useMemo(() => new Map((deals ?? []).map((d) => [d.project_id, d])), [deals]);

  // Total committed across this CSR partner's portfolio.
  const totalCommitted = useMemo(
    () => (portfolio ?? []).reduce((s, p) => s + (p.capital_amount ?? 0), 0),
    [portfolio],
  );

  // Per-institution attribution rows (this org's share of each project).
  const attribution = useMemo(() => {
    if (!portfolio || !deals) return [];
    return portfolio.map((p) => {
      const deal = dealById.get(p.project_id);
      const totalBudget = deal?.total_budget ?? 0;
      const totalCommittedForProject = (deal?.already_committed_capital ?? 0);
      const denom = totalCommittedForProject > 0 ? totalCommittedForProject : totalBudget;
      const sharePct = denom > 0 ? (p.capital_amount ?? 0) / denom : null;
      const forecastAnnualTco2e = deal?.forecast_annual_tco2e ?? null;
      const attributableTco2e =
        forecastAnnualTco2e != null && sharePct != null
          ? forecastAnnualTco2e * sharePct
          : null;
      return {
        portfolioId: p.id,
        institution_code: deal?.institution_code ?? "",
        county: deal?.county ?? "",
        capital_amount: p.capital_amount ?? 0,
        sharePct,
        forecastAnnualTco2e,
        attributableTco2e,
      };
    });
  }, [portfolio, deals, dealById]);

  const counties = useMemo(() => {
    const s = new Set<string>();
    attribution.forEach((a) => a.county && s.add(a.county));
    return s.size;
  }, [attribution]);

  const isLoading = sLoading || pLoading || dLoading;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-rose-500" /> Impact Report
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Impact attributed to your CSR contribution, computed pro-rata against the total capital on each project.
          </p>
        </div>
        <DownloadReportButton
          rows={attribution}
          columns={[
            { key: "institution_code", label: "Institution Code" },
            { key: "county", label: "County" },
            { key: "capital_amount", label: "Your Contribution (KSh)" },
            {
              key: "sharePct",
              label: "Your share of project",
              format: (r: any) => r.sharePct == null ? "—" : `${(r.sharePct * 100).toFixed(1)}%`,
            },
            {
              key: "forecastAnnualTco2e",
              label: "Project tCO₂e / yr",
              format: (r: any) => r.forecastAnnualTco2e == null ? "—" : Number(r.forecastAnnualTco2e).toFixed(2),
            },
            {
              key: "attributableTco2e",
              label: "Your tCO₂e / yr",
              format: (r: any) => r.attributableTco2e == null ? "—" : Number(r.attributableTco2e).toFixed(2),
            },
          ]}
          title="CSR Impact Report"
          filename="csr-impact-report"
        />
      </div>

      {/* Headline KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label="Institutions backed" value={isLoading ? null : num(summary?.project_count ?? 0)} icon={<Users className="h-4 w-4 text-rose-500" />} />
        <Kpi label="Counties reached" value={isLoading ? null : num(counties)} icon={<MapPin className="h-4 w-4 text-rose-500" />} />
        <Kpi label="Total contributed" value={isLoading ? null : ksh(summary?.total_committed ?? totalCommitted)} icon={<Banknote className="h-4 w-4 text-rose-500" />} />
        <Kpi label="Total disbursed" value={isLoading ? null : ksh(summary?.total_disbursed)} icon={<Banknote className="h-4 w-4 text-emerald-600" />} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi
          label="tCO₂e avoided (lifetime, your share)"
          value={isLoading ? null : t(summary?.lifetime_tco2e)}
          icon={<Leaf className="h-4 w-4 text-emerald-600" />}
        />
        <Kpi
          label="KSh saved (lifetime, your share)"
          value={isLoading ? null : ksh(summary?.lifetime_ksh_savings)}
          icon={<Banknote className="h-4 w-4 text-amber-600" />}
        />
        <Kpi
          label="Meals served (lifetime, your share)"
          value={isLoading ? null : num(summary?.lifetime_meals)}
          icon={<UtensilsCrossed className="h-4 w-4 text-amber-600" />}
        />
        <Kpi
          label="Jobs created (lifetime, your share)"
          value={isLoading ? null : num(summary?.lifetime_jobs)}
          icon={<Users className="h-4 w-4 text-amber-600" />}
        />
      </div>

      {/* Per-institution attribution table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Per-institution attribution</CardTitle>
          <p className="text-xs text-muted-foreground">
            Your contribution share × the project's forecast outcomes. Shares are computed against the total capital
            already committed on the project; institutions that haven't received other contributions yet show your share
            against the total budget.
          </p>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {isLoading ? (
            <div className="p-4 space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : attribution.length === 0 ? (
            <p className="py-12 text-center text-muted-foreground text-sm">
              No sponsorships yet — once you commit a contribution, your attribution shows up here.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground border-b bg-muted/30">
                <tr>
                  <th className="text-left py-2 px-3">Institution</th>
                  <th className="text-left py-2 px-3">County</th>
                  <th className="text-right py-2 px-3">Contribution</th>
                  <th className="text-right py-2 px-3">Your share</th>
                  <th className="text-right py-2 px-3">Project tCO₂e / yr</th>
                  <th className="text-right py-2 px-3">Your tCO₂e / yr</th>
                </tr>
              </thead>
              <tbody>
                {attribution.map((row) => (
                  <tr key={row.portfolioId} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="py-2 px-3">
                      <span className="font-mono">{row.institution_code || "—"}</span>
                    </td>
                    <td className="py-2 px-3 text-muted-foreground">{row.county || "—"}</td>
                    <td className="py-2 px-3 text-right font-mono">{ksh(row.capital_amount)}</td>
                    <td className="py-2 px-3 text-right">
                      {row.sharePct == null ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        <Badge variant="outline" className="text-xs">{(row.sharePct * 100).toFixed(1)}%</Badge>
                      )}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-muted-foreground">
                      {row.forecastAnnualTco2e == null ? "—" : Number(row.forecastAnnualTco2e).toFixed(2)}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-medium text-emerald-700">
                      {row.attributableTco2e == null ? "—" : Number(row.attributableTco2e).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Card className="border-dashed">
        <CardContent className="py-4">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Methodology: when multiple partners co-fund one institution, outcomes are split in proportion to capital share —
            the same formula used for funder attribution (§9 of the methodology doc). Verified tCO₂e from independent
            audits (when present) overrides the forecast for issued credits.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function Kpi({ label, value, icon }: { label: string; value: string | null; icon: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="pt-4 pb-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {icon}
          {label}
        </div>
        {value === null ? (
          <Skeleton className="h-7 w-20 mt-1.5" />
        ) : (
          <p className="text-2xl font-bold mt-0.5">{value}</p>
        )}
      </CardContent>
    </Card>
  );
}
