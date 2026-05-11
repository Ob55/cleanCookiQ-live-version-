import { Link } from "react-router-dom";
import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Search, MapPin, Flame, Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useFunderDealFlow, useFunderPortfolio } from "@/hooks/useFunder";
import { DownloadReportButton } from "@/components/admin/DownloadReportButton";

const FUELS = ["firewood", "charcoal", "lpg", "biogas", "electric", "other"] as const;

const ksh = (v: number | null | undefined) =>
  v == null ? "—" : `KSh ${Math.round(v).toLocaleString()}`;

export default function CSROpportunities() {
  const { profile } = useAuth();
  const orgId = profile?.organisation_id ?? undefined;
  const { data: deals, isLoading } = useFunderDealFlow();
  const { data: portfolio } = useFunderPortfolio(orgId);

  const [search, setSearch] = useState("");
  const [countyFilter, setCountyFilter] = useState<string>("all");
  const [fuelFilter, setFuelFilter] = useState<string>("all");

  const sponsoredIds = useMemo(
    () => new Set((portfolio ?? []).map((p) => p.project_id)),
    [portfolio],
  );

  const counties = useMemo(() => {
    const set = new Set<string>();
    (deals ?? []).forEach((d) => d.county && set.add(d.county));
    return Array.from(set).sort();
  }, [deals]);

  const filtered = useMemo(() => {
    return (deals ?? []).filter((d) => {
      if (sponsoredIds.has(d.project_id)) return false;
      if ((d.funding_gap ?? 0) <= 0) return false;
      if (countyFilter !== "all" && d.county !== countyFilter) return false;
      if (fuelFilter !== "all" && d.baseline_fuel !== fuelFilter) return false;
      if (search) {
        const s = search.toLowerCase();
        if (
          !d.institution_name.toLowerCase().includes(s) &&
          !(d.institution_code ?? "").toLowerCase().includes(s) &&
          !(d.county ?? "").toLowerCase().includes(s)
        ) return false;
      }
      return true;
    });
  }, [deals, sponsoredIds, countyFilter, fuelFilter, search]);

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-rose-500" /> Sponsorship Opportunities
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Institutions with an open funding gap. Click any card for the full profile and to commit a contribution.
          </p>
        </div>
        <DownloadReportButton
          rows={filtered}
          columns={[
            { key: "institution_code", label: "Institution Code" },
            { key: "institution_name", label: "Institution" },
            { key: "county", label: "County" },
            { key: "institution_type", label: "Type" },
            { key: "baseline_fuel", label: "Baseline Fuel" },
            { key: "students", label: "Students" },
            { key: "total_budget", label: "Total Budget (KSh)" },
            { key: "already_committed_capital", label: "Already Committed (KSh)" },
            { key: "funding_gap", label: "Funding Gap (KSh)" },
            { key: "forecast_annual_tco2e", label: "Forecast tCO₂e / yr" },
          ]}
          title="CSR Opportunities"
          filename="csr-opportunities"
        />
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, code, county…"
            className="pl-9"
          />
        </div>
        <Select value={countyFilter} onValueChange={setCountyFilter}>
          <SelectTrigger className="w-48"><SelectValue placeholder="County" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All counties</SelectItem>
            {counties.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={fuelFilter} onValueChange={setFuelFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Baseline fuel" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All fuels</SelectItem>
            {FUELS.map((f) => <SelectItem key={f} value={f} className="capitalize">{f}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground text-sm">
            No open opportunities match your filters.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((deal) => (
            <Link key={deal.project_id} to={`/funder/institution/${deal.institution_id}`}>
              <Card className="hover:shadow-md hover:border-rose-300 transition h-full">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-sm flex items-center gap-2 flex-wrap">
                        {deal.institution_code && (
                          <span className="font-mono text-[10px] text-muted-foreground">{deal.institution_code}</span>
                        )}
                        <span className="truncate">{deal.institution_name}</span>
                      </CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1 flex-wrap">
                        <MapPin className="h-3 w-3" /> {deal.county ?? "—"}
                        {deal.institution_type ? <> · <span className="capitalize">{deal.institution_type.replace("_", " ")}</span></> : null}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs shrink-0">
                      {deal.funding_gap == null ? "Open" : `${ksh(deal.funding_gap)} gap`}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-1 pb-3 text-xs text-muted-foreground space-y-1">
                  {deal.baseline_fuel && (
                    <p className="flex items-center gap-1"><Flame className="h-3 w-3" /> {deal.baseline_fuel}</p>
                  )}
                  {deal.students != null && deal.students > 0 && (
                    <p className="flex items-center gap-1"><Users className="h-3 w-3" /> {deal.students.toLocaleString()} students</p>
                  )}
                  {deal.forecast_annual_tco2e != null && (
                    <p>~ {Number(deal.forecast_annual_tco2e).toFixed(1)} tCO₂e / yr avoided</p>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
