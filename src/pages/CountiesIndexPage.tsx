import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useCountyIntelligence } from "@/hooks/useCounties";
import { countySlug, groupCountiesByRegion, type CountyIntelligenceSummary } from "@/lib/counties";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, Building2, Users, Search, X } from "lucide-react";
import { DownloadReportButton } from "@/components/admin/DownloadReportButton";

export default function CountiesIndexPage() {
  const { data, isLoading, error } = useCountyIntelligence();
  const [search, setSearch] = useState("");
  const [region, setRegion] = useState<string>("");
  const [fuel, setFuel] = useState<string>("");
  const [hasInstitutionsOnly, setHasInstitutionsOnly] = useState(false);

  // Distinct regions + fuels for the chip rows.
  const regions = useMemo(() => {
    const set = new Set<string>();
    (data ?? []).forEach((c) => c.region && set.add(c.region));
    return Array.from(set).sort();
  }, [data]);

  const fuels = useMemo(() => {
    const set = new Set<string>();
    (data ?? []).forEach((c) => c.dominant_fuel && set.add(c.dominant_fuel));
    return Array.from(set).sort();
  }, [data]);

  // Apply filters before grouping.
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return (data ?? []).filter((c) => {
      if (region && c.region !== region) return false;
      if (fuel && c.dominant_fuel !== fuel) return false;
      if (hasInstitutionsOnly && c.institutions_count === 0) return false;
      if (q && !c.county_name.toLowerCase().includes(q) && !c.county_code.includes(q)) return false;
      return true;
    });
  }, [data, search, region, fuel, hasInstitutionsOnly]);

  const filtersActive = Boolean(search || region || fuel || hasInstitutionsOnly);

  return (
    <div className="container py-12 space-y-8">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-3xl font-display font-bold">County Intelligence</h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">
            Each of Kenya's 47 counties has a different fuel mix, tariff structure, biomass
            deficit, and policy environment. Browse county profiles to see institution counts,
            dominant fuels, and the suppliers serving each area.
          </p>
        </div>
        <DownloadReportButton
          rows={filtered}
          columns={[
            { key: "county_name", label: "County" },
            { key: "county_code", label: "Code" },
            { key: "region", label: "Region" },
            { key: "capital", label: "Capital" },
            { key: "institutions_count", label: "Institutions Tracked" },
            { key: "assessed_count", label: "Assessed" },
            { key: "transitioned_count", label: "Transitioned" },
            { key: "dominant_fuel", label: "Dominant Fuel" },
            { key: "total_meals_per_day", label: "Total Meals/Day" },
            { key: "total_students", label: "Total Students" },
            { key: "providers_serving_count", label: "Providers Serving" },
            { key: "policy_count", label: "Active Policies" },
            { key: "fuel_price_count", label: "Fuel Prices on File" },
          ]}
          title="County Intelligence"
          filename="counties"
          subtitle={`Filters — region: ${region || "all"}, fuel: ${fuel || "any"}, search: "${search || "—"}"`}
        />
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          Failed to load county data. Please try again later.
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by county name or code (e.g. 047)..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {regions.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-2">Region</p>
              <div className="flex flex-wrap gap-2">
                <FilterChip active={!region} onClick={() => setRegion("")}>All</FilterChip>
                {regions.map((r) => (
                  <FilterChip key={r} active={region === r} onClick={() => setRegion(r)}>{r}</FilterChip>
                ))}
              </div>
            </div>
          )}

          {fuels.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-2">Dominant fuel</p>
              <div className="flex flex-wrap gap-2">
                <FilterChip active={!fuel} onClick={() => setFuel("")}>Any</FilterChip>
                {fuels.map((f) => (
                  <FilterChip key={f} active={fuel === f} onClick={() => setFuel(f)}>
                    <span className="capitalize">{f}</span>
                  </FilterChip>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between gap-3 pt-1 border-t">
            <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={hasInstitutionsOnly}
                onChange={(e) => setHasInstitutionsOnly(e.target.checked)}
              />
              Only counties with tracked institutions
            </label>
            {filtersActive && (
              <button
                type="button"
                onClick={() => { setSearch(""); setRegion(""); setFuel(""); setHasInstitutionsOnly(false); }}
                className="text-xs text-primary hover:underline inline-flex items-center gap-1"
              >
                <X className="h-3 w-3" /> Clear filters
              </button>
            )}
          </div>
        </CardContent>
      </Card>

      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      )}

      {data && filtered.length === 0 && !isLoading && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No counties match the current filters.
          </CardContent>
        </Card>
      )}

      {data && filtered.length > 0 && (
        <>
          <p className="text-sm text-muted-foreground">
            Showing {filtered.length} of {data.length} counties
          </p>
          {groupCountiesByRegion(
            filtered.map((d) => ({ ...d, name: d.county_name })),
          ).map((group) => (
            <section key={group.region} className="space-y-3">
              <h2 className="text-xl font-display font-semibold flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" /> {group.region}
                <span className="text-sm font-normal text-muted-foreground">
                  ({group.counties.length} {group.counties.length === 1 ? "county" : "counties"})
                </span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {group.counties.map((county) => (
                  <CountyCard key={county.county_id} county={county} />
                ))}
              </div>
            </section>
          ))}
        </>
      )}
    </div>
  );
}

function FilterChip({
  active, onClick, children,
}: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-background text-muted-foreground border-border hover:border-primary/40"
      }`}
    >
      {children}
    </button>
  );
}

function CountyCard({ county }: { county: CountyIntelligenceSummary }) {
  return (
    <Link to={`/counties/${countySlug(county.county_name)}`} className="group">
      <Card className="h-full transition-shadow hover:shadow-md group-hover:border-primary/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            <span>{county.county_name}</span>
            <Badge variant="outline" className="font-mono text-xs">
              {county.county_code}
            </Badge>
          </CardTitle>
          {county.capital && (
            <p className="text-xs text-muted-foreground">Capital: {county.capital}</p>
          )}
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Building2 className="h-4 w-4" />
            <span>{county.institutions_count} institutions tracked</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>{county.providers_serving_count} suppliers serving</span>
          </div>
          {county.dominant_fuel && (
            <div className="pt-1">
              <Badge variant="secondary" className="capitalize">
                {county.dominant_fuel} dominant
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
