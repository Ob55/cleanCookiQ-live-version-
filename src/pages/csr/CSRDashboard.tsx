import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Heart, HandHeart, Sparkles, Users, Leaf, UtensilsCrossed,
  TrendingUp, ArrowRight, Building2, MapPin,
} from "lucide-react";
import { useFunderPortfolio, useFunderPortfolioSummary, useFunderDealFlow } from "@/hooks/useFunder";
import { useMyActorCode } from "@/hooks/useMyActorCode";
import { DownloadReportButton } from "@/components/admin/DownloadReportButton";

const ksh = (v: number | null | undefined) =>
  v == null ? "—" : `KSh ${Math.round(v).toLocaleString()}`;
const num = (v: number | null | undefined) =>
  v == null ? "—" : Math.round(v).toLocaleString();
const t = (v: number | null | undefined) =>
  v == null ? "—" : `${Number(v).toFixed(1)} t`;

export default function CSRDashboard() {
  const { profile } = useAuth();
  const orgId = profile?.organisation_id ?? undefined;
  const { data: code } = useMyActorCode();

  // Reuse the funder_portfolio infrastructure — CSR rows live in the same tables.
  const { data: portfolio, isLoading: portfolioLoading } = useFunderPortfolio(orgId);
  const { data: summary, isLoading: summaryLoading } = useFunderPortfolioSummary(orgId);
  const { data: deals, isLoading: dealsLoading } = useFunderDealFlow();

  const sponsoredProjectIds = new Set((portfolio ?? []).map((p) => p.project_id));
  const opportunities = (deals ?? [])
    .filter((d) => !sponsoredProjectIds.has(d.project_id) && (d.funding_gap ?? 0) > 0)
    .slice(0, 6);

  // Build sponsored-institutions detail by joining portfolio rows to the deal-flow view.
  const dealById = new Map((deals ?? []).map((d) => [d.project_id, d]));
  const sponsored = (portfolio ?? [])
    .map((p) => ({ portfolio: p, deal: dealById.get(p.project_id) }))
    .filter((row) => row.deal);

  // Org profile (for org name)
  const { data: org } = useQuery({
    queryKey: ["my-org", orgId],
    enabled: Boolean(orgId),
    queryFn: async () => {
      const { data } = await supabase.from("organisations").select("name").eq("id", orgId!).maybeSingle();
      return data;
    },
  });

  const isLoading = portfolioLoading || summaryLoading || dealsLoading;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <Heart className="h-6 w-6 text-rose-500" /> CSR Partner Dashboard
          </h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {code && (
              <Badge variant="outline" className="font-mono text-xs">{code}</Badge>
            )}
            {org?.name && <span className="text-sm text-muted-foreground">{org.name}</span>}
          </div>
          <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
            Track the institutions you've sponsored, browse new sponsorship opportunities, and
            see the impact attributed to your contribution.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link to="/csr/impact">
              <TrendingUp className="h-4 w-4 mr-2" /> Impact Report
            </Link>
          </Button>
          <Button asChild className="bg-rose-500 hover:bg-rose-600 text-white">
            <Link to="/csr/opportunities">
              <Sparkles className="h-4 w-4 mr-2" /> Browse Opportunities
            </Link>
          </Button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          label="Institutions sponsored"
          value={isLoading ? null : num(summary?.project_count ?? 0)}
          icon={<Building2 className="h-4 w-4 text-rose-500" />}
        />
        <KpiCard
          label="Total contribution"
          value={isLoading ? null : ksh(summary?.total_committed)}
          icon={<HandHeart className="h-4 w-4 text-rose-500" />}
        />
        <KpiCard
          label="tCO₂e avoided (lifetime)"
          value={isLoading ? null : t(summary?.lifetime_tco2e)}
          icon={<Leaf className="h-4 w-4 text-emerald-600" />}
          sub="Attributed pro-rata to your contribution share."
        />
        <KpiCard
          label="Meals served (lifetime)"
          value={isLoading ? null : num(summary?.lifetime_meals)}
          icon={<UtensilsCrossed className="h-4 w-4 text-amber-600" />}
        />
      </div>

      {/* Sponsored institutions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 pb-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <HandHeart className="h-4 w-4 text-rose-500" /> Your sponsorships
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              {sponsored.length === 0
                ? "You haven't sponsored any institutions yet — browse opportunities below."
                : `${sponsored.length} institution${sponsored.length === 1 ? "" : "s"} you currently back.`}
            </p>
          </div>
          {sponsored.length > 0 && (
            <div className="flex gap-2">
              <DownloadReportButton
                rows={sponsored.map(({ portfolio, deal }) => ({
                  institution_code: deal?.institution_code ?? "",
                  institution_name: deal?.institution_name ?? "",
                  county: deal?.county ?? "",
                  capital_amount: portfolio.capital_amount,
                  status: portfolio.status,
                  committed_at: portfolio.committed_at,
                  forecast_annual_tco2e: deal?.forecast_annual_tco2e ?? "",
                }))}
                columns={[
                  { key: "institution_code", label: "Institution Code" },
                  { key: "institution_name", label: "Institution" },
                  { key: "county", label: "County" },
                  { key: "capital_amount", label: "Contribution (KSh)" },
                  { key: "status", label: "Status" },
                  { key: "committed_at", label: "Committed On" },
                  { key: "forecast_annual_tco2e", label: "Forecast tCO₂e / yr" },
                ]}
                title="CSR Sponsorships"
                filename="csr-sponsorships"
              />
              <Button asChild variant="ghost" size="sm">
                <Link to="/csr/sponsorships">View all <ArrowRight className="h-3 w-3 ml-1" /></Link>
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent className="pt-0">
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : sponsored.length === 0 ? (
            <EmptyState
              icon={<HandHeart className="h-8 w-8 text-muted-foreground" />}
              title="No sponsorships yet"
              body="Browse the opportunities below to commit your first contribution."
              cta={
                <Button asChild className="bg-rose-500 hover:bg-rose-600 text-white">
                  <Link to="/csr/opportunities">Browse opportunities</Link>
                </Button>
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground border-b">
                  <tr>
                    <th className="text-left py-2 px-3">Institution</th>
                    <th className="text-left py-2 px-3">County</th>
                    <th className="text-right py-2 px-3">Contribution</th>
                    <th className="text-left py-2 px-3">Status</th>
                    <th className="text-right py-2 px-3">Forecast tCO₂e/yr</th>
                  </tr>
                </thead>
                <tbody>
                  {sponsored.slice(0, 6).map(({ portfolio, deal }) => (
                    <tr key={portfolio.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-2">
                          {deal?.institution_code && (
                            <span className="font-mono text-[10px] text-muted-foreground">{deal.institution_code}</span>
                          )}
                          <span className="font-medium">{deal?.institution_name ?? "—"}</span>
                        </div>
                      </td>
                      <td className="py-2 px-3 text-muted-foreground">
                        {deal?.county ? (
                          <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{deal.county}</span>
                        ) : "—"}
                      </td>
                      <td className="py-2 px-3 text-right font-mono">{ksh(portfolio.capital_amount)}</td>
                      <td className="py-2 px-3">
                        <Badge variant="secondary" className="capitalize text-xs">{portfolio.status}</Badge>
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-muted-foreground">
                        {deal?.forecast_annual_tco2e == null ? "—" : Number(deal.forecast_annual_tco2e).toFixed(1)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Opportunities preview */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 pb-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-rose-500" /> Sponsorship opportunities
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Institutions on the platform with an open funding gap — first six shown.
            </p>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link to="/csr/opportunities">View all <ArrowRight className="h-3 w-3 ml-1" /></Link>
          </Button>
        </CardHeader>
        <CardContent className="pt-0">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
            </div>
          ) : opportunities.length === 0 ? (
            <EmptyState
              icon={<Sparkles className="h-8 w-8 text-muted-foreground" />}
              title="No open opportunities right now"
              body="When institutions register with funding gaps, they'll appear here."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {opportunities.map((deal) => (
                <OpportunityCard key={deal.project_id} deal={deal} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* About attribution */}
      <Card className="border-dashed">
        <CardContent className="py-4">
          <p className="text-xs text-muted-foreground leading-relaxed">
            <Users className="h-3 w-3 inline -mt-0.5 mr-1" />
            <strong>How attribution works:</strong> when several partners co-fund one institution,
            we split the outcomes between them in proportion to the capital each one put in.
            Your share of tCO₂e, savings, meals and jobs reflects your share of the contribution.
            See the full methodology in <Link className="underline" to="/about">About → Methodology</Link>.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({ label, value, icon, sub }: {
  label: string;
  value: string | null;
  icon: React.ReactNode;
  sub?: string;
}) {
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
        {sub && <p className="text-[10px] text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function OpportunityCard({ deal }: { deal: any }) {
  return (
    <Link to={`/funder/institution/${deal.institution_id}`}>
      <Card className="hover:shadow-md hover:border-rose-300 transition">
        <CardContent className="py-3 px-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                {deal.institution_code && (
                  <span className="font-mono text-[10px] text-muted-foreground">{deal.institution_code}</span>
                )}
                <p className="text-sm font-medium truncate">{deal.institution_name}</p>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {deal.county ?? ""}
                {deal.institution_type ? ` · ${deal.institution_type.replace("_", " ")}` : ""}
                {deal.baseline_fuel ? ` · ${deal.baseline_fuel}` : ""}
              </p>
            </div>
            <Badge variant="outline" className="text-xs shrink-0">
              {deal.funding_gap == null ? "Open" : ksh(deal.funding_gap) + " gap"}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function EmptyState({ icon, title, body, cta }: {
  icon: React.ReactNode;
  title: string;
  body: string;
  cta?: React.ReactNode;
}) {
  return (
    <div className="text-center py-8 px-4">
      <div className="inline-flex h-12 w-12 rounded-full bg-muted items-center justify-center mb-3">
        {icon}
      </div>
      <p className="font-medium text-sm">{title}</p>
      <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">{body}</p>
      {cta && <div className="mt-4">{cta}</div>}
    </div>
  );
}
