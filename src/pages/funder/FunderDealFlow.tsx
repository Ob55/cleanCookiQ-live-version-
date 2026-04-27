import { useMemo } from "react";
import { Link } from "react-router-dom";
import { TrendingUp, Filter, MapPin, Flame, ShieldAlert, Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { useFunderDealFlow, useFunderPreferences } from "@/hooks/useFunder";
import {
  dealMatchScore, formatBigNumber,
  type DealRow, type FunderPreferences,
} from "@/lib/funder";
import { riskBand, riskBandColorClass } from "@/lib/risk";

export default function FunderDealFlow() {
  const { profile } = useAuth();
  const { data: deals, isLoading } = useFunderDealFlow();
  const { data: prefs } = useFunderPreferences(profile?.organisation_id ?? undefined);

  const ranked = useMemo(() => rankDeals(deals ?? [], prefs), [deals, prefs]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold flex items-center gap-2">
          <TrendingUp className="h-6 w-6 text-primary" /> Deal Flow
        </h1>
        <p className="text-muted-foreground mt-1">
          Pipeline projects ranked against your stated preferences. Set or update them
          on the Preferences page to refine the ranking.
        </p>
      </div>

      {!prefs && (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="pt-4 text-sm">
            <Filter className="h-4 w-4 inline mr-1" />
            No funder preferences set — every deal is currently shown unranked.
            <Link to="/funder/preferences" className="text-primary hover:underline ml-1">
              Set preferences
            </Link>.
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}</div>
      ) : ranked.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No projects in the pipeline yet.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {ranked.map(({ deal, score }) => (
            <DealCard key={deal.project_id} deal={deal} score={score} />
          ))}
        </div>
      )}
    </div>
  );
}

function rankDeals(deals: DealRow[], prefs: FunderPreferences | null | undefined) {
  if (!prefs) return deals.map((deal) => ({ deal, score: null as null | number }));
  return deals
    .map((deal) => ({ deal, score: dealMatchScore(deal, prefs).total }))
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
}

function DealCard({ deal, score }: { deal: DealRow; score: number | null }) {
  const band = deal.max_open_risk_score > 0 ? riskBand(deal.max_open_risk_score) : null;
  const matchPct = score === null ? null : Math.round(score * 100);
  return (
    <Link to={`/funder/institution/${deal.institution_id}`}>
      <Card className="hover:shadow-md hover:border-primary/40 transition-shadow">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div>
              <CardTitle className="text-base">{deal.project_title}</CardTitle>
              <p className="text-xs text-muted-foreground">
                {deal.institution_name}{deal.county ? ` · ${deal.county}` : ""}
                {deal.institution_type ? ` · ${deal.institution_type.replace("_", " ")}` : ""}
              </p>
            </div>
            <div className="flex items-center gap-1 flex-wrap">
              {matchPct !== null && (
                <Badge className="bg-primary/10 text-primary">{matchPct}% match</Badge>
              )}
              {band && <Badge className={riskBandColorClass(band)}>Risk: {band}</Badge>}
              <Badge variant="outline" className="capitalize">{deal.project_status}</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <Stat icon={<Wallet className="h-3 w-3" />} label="Total budget" value={`KSh ${formatBigNumber(deal.total_budget)}`} />
          <Stat icon={<Wallet className="h-3 w-3" />} label="Funding gap" value={`KSh ${formatBigNumber(deal.funding_gap)}`} />
          <Stat icon={<Flame className="h-3 w-3" />} label="Annual tCO₂e" value={formatBigNumber(deal.forecast_annual_tco2e)} />
          <Stat icon={<ShieldAlert className="h-3 w-3" />} label="Open risks" value={String(deal.open_risk_count)} />
        </CardContent>
      </Card>
    </Link>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div>
      <div className="flex items-center gap-1 text-xs text-muted-foreground">{icon}<span>{label}</span></div>
      <p className="font-semibold">{value}</p>
    </div>
  );
}
