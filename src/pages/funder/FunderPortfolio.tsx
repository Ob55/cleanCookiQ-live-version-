import { Briefcase, TrendingUp, Leaf, Users, Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { useFunderPortfolio, useFunderPortfolioSummary } from "@/hooks/useFunder";
import { formatBigNumber } from "@/lib/funder";

const STATUS_COLORS: Record<string, string> = {
  pipeline: "bg-slate-100 text-slate-700",
  committed: "bg-blue-100 text-blue-700",
  disbursed: "bg-emerald-100 text-emerald-700",
  repaid: "bg-violet-100 text-violet-700",
  written_off: "bg-red-100 text-red-700",
};

export default function FunderPortfolio() {
  const { profile } = useAuth();
  const orgId = profile?.organisation_id ?? undefined;
  const { data: portfolio, isLoading } = useFunderPortfolio(orgId);
  const { data: summary } = useFunderPortfolioSummary(orgId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold flex items-center gap-2">
          <Briefcase className="h-6 w-6 text-primary" /> Your Portfolio
        </h1>
        <p className="text-muted-foreground mt-1">
          Capital deployed and outcomes attributed to your share, across every project
          you've committed to.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard icon={<TrendingUp className="h-4 w-4" />} label="Projects" value={String(summary?.project_count ?? 0)} />
        <KpiCard icon={<Wallet className="h-4 w-4" />} label="Committed" value={`KSh ${formatBigNumber(summary?.total_committed)}`} />
        <KpiCard icon={<Leaf className="h-4 w-4" />} label="tCO₂e attributed" value={formatBigNumber(summary?.lifetime_tco2e)} />
        <KpiCard icon={<Users className="h-4 w-4" />} label="Meals attributed" value={formatBigNumber(summary?.lifetime_meals)} />
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
      ) : (portfolio ?? []).length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No commitments on file yet.</CardContent></Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Commitments</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground border-b">
                <tr>
                  <th className="text-left py-2 px-3">Project</th>
                  <th className="text-right py-2 px-3">Capital</th>
                  <th className="text-right py-2 px-3">Share</th>
                  <th className="text-left py-2 px-3">Committed</th>
                  <th className="text-left py-2 px-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {(portfolio ?? []).map((row) => (
                  <tr key={row.id} className="border-b last:border-0">
                    <td className="py-2 px-3 font-mono text-xs">{row.project_id.slice(0, 8)}</td>
                    <td className="py-2 px-3 text-right">
                      {row.capital_currency} {row.capital_amount.toLocaleString()}
                    </td>
                    <td className="py-2 px-3 text-right">
                      {row.capital_share_pct != null
                        ? `${(row.capital_share_pct * 100).toFixed(1)}%`
                        : "—"}
                    </td>
                    <td className="py-2 px-3 text-xs">{row.committed_at}</td>
                    <td className="py-2 px-3">
                      <Badge className={STATUS_COLORS[row.status] ?? ""}>{row.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function KpiCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">{icon}<span>{label}</span></div>
        <p className="text-2xl font-bold mt-1">{value}</p>
      </CardContent>
    </Card>
  );
}
