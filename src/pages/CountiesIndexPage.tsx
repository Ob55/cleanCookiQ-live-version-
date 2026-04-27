import { Link } from "react-router-dom";
import { useCountyIntelligence } from "@/hooks/useCounties";
import { countySlug, groupCountiesByRegion, type CountyIntelligenceSummary } from "@/lib/counties";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, Building2, Users } from "lucide-react";

export default function CountiesIndexPage() {
  const { data, isLoading, error } = useCountyIntelligence();

  return (
    <div className="container py-12 space-y-8">
      <div>
        <h1 className="text-3xl font-display font-bold">County Intelligence</h1>
        <p className="text-muted-foreground mt-2 max-w-2xl">
          Each of Kenya's 47 counties has a different fuel mix, tariff structure, biomass
          deficit, and policy environment. Browse county profiles to see institution counts,
          dominant fuels, and the suppliers serving each area.
        </p>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          Failed to load county data. Please try again later.
        </div>
      )}

      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      )}

      {data && groupCountiesByRegion(data).map((group) => (
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
    </div>
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
