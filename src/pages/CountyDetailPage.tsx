import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Building2, Flame, FileText, ShoppingBag, Users, ExternalLink } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useCountyBySlug,
  useCountyFuelPrices,
  useCountyPolicies,
} from "@/hooks/useCounties";
import { useActiveDataPoints } from "@/hooks/useDataPoints";
import { resolveDataPoint, type FuelKey } from "@/lib/dataPoints";
import { Sourced } from "@/components/Sourced";

export default function CountyDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { summary, isLoading, error } = useCountyBySlug(slug);
  const { data: fuelPrices, isLoading: pricesLoading } = useCountyFuelPrices(summary?.county_id);
  const { data: policies, isLoading: policiesLoading } = useCountyPolicies(summary?.county_id);
  const { data: nationalPoints = [] } = useActiveDataPoints(["fuel.cost_per_unit"]);

  if (error) {
    return (
      <div className="container py-12">
        <p className="text-destructive">Failed to load county.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container py-12 space-y-4">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="container py-12 space-y-3">
        <Link to="/counties" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
          <ArrowLeft className="h-4 w-4" /> All counties
        </Link>
        <h1 className="text-2xl font-display font-bold">County not found</h1>
        <p className="text-muted-foreground">No county matches the slug "{slug}".</p>
      </div>
    );
  }

  return (
    <div className="container py-10 space-y-8">
      <Link to="/counties" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
        <ArrowLeft className="h-4 w-4" /> All counties
      </Link>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-display font-bold">{summary.county_name} County</h1>
          <p className="text-muted-foreground mt-1">
            {summary.region}{summary.capital ? ` · capital ${summary.capital}` : ""}
          </p>
        </div>
        <Badge variant="outline" className="font-mono">{summary.county_code}</Badge>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<Building2 className="h-5 w-5" />} label="Institutions tracked" value={summary.institutions_count} />
        <StatCard icon={<Flame className="h-5 w-5" />} label="Assessed or later" value={summary.assessed_count} />
        <StatCard icon={<Users className="h-5 w-5" />} label="Suppliers serving" value={summary.providers_serving_count} />
        <StatCard icon={<ShoppingBag className="h-5 w-5" />} label="Active policies" value={summary.policy_count} />
      </div>

      {/* Fuel pricing */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-primary" /> Fuel Pricing
          </CardTitle>
          <CardDescription>
            Latest county-level observations alongside the national reference. Click any
            value's info icon to see the underlying source.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pricesLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : (
            <FuelPricingTable
              countyPrices={fuelPrices ?? []}
              nationalPoints={nationalPoints}
            />
          )}
        </CardContent>
      </Card>

      {/* Policies */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" /> Policy Environment
          </CardTitle>
          <CardDescription>
            County-level policies, CIDP commitments, and gazette notices that affect
            clean cooking deployments here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {policiesLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : (policies ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No policies have been catalogued for this county yet.
            </p>
          ) : (
            <ul className="space-y-3">
              {(policies ?? []).map((policy) => (
                <li key={policy.id} className="border-l-2 border-primary/40 pl-3 py-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-sm">{policy.title}</span>
                    <Badge variant="outline" className="text-xs capitalize">
                      {policy.status.replace("_", " ")}
                    </Badge>
                  </div>
                  {policy.summary && (
                    <p className="text-xs text-muted-foreground mt-1">{policy.summary}</p>
                  )}
                  {policy.full_text_url && (
                    <a
                      href={policy.full_text_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1"
                    >
                      Read full text <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-2 text-muted-foreground text-xs">
          {icon}
          <span>{label}</span>
        </div>
        <p className="text-2xl font-bold mt-1">{value}</p>
      </CardContent>
    </Card>
  );
}

function FuelPricingTable({
  countyPrices,
  nationalPoints,
}: {
  countyPrices: Array<{
    fuel_type: string;
    price_numeric: number;
    unit: string;
    observed_on: string;
    source_id: string;
    source_slug: string;
    source_title: string;
    source_publisher: string | null;
    source_url: string | null;
    source_confidence: "high" | "medium" | "modeled" | "preliminary";
    notes: string | null;
    county_id: string;
    county_code: string;
    county_name: string;
  }>;
  nationalPoints: Parameters<typeof resolveDataPoint>[0];
}) {
  const FUELS: FuelKey[] = ["firewood", "charcoal", "lpg", "biogas", "electric"];
  const countyByFuel = new Map(countyPrices.map((p) => [p.fuel_type, p]));

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-xs text-muted-foreground border-b">
          <tr>
            <th className="text-left py-2 px-2 font-medium">Fuel</th>
            <th className="text-left py-2 px-2 font-medium">National</th>
            <th className="text-left py-2 px-2 font-medium">County observation</th>
            <th className="text-left py-2 px-2 font-medium">Δ vs national</th>
          </tr>
        </thead>
        <tbody>
          {FUELS.map((fuel) => {
            const national = resolveDataPoint(nationalPoints, {
              metricKey: "fuel.cost_per_unit",
              fuel,
            });
            const county = countyByFuel.get(fuel);
            const delta =
              national?.value_numeric && county
                ? ((county.price_numeric - national.value_numeric) / national.value_numeric) * 100
                : null;

            return (
              <tr key={fuel} className="border-b last:border-0">
                <td className="py-2 px-2 capitalize font-medium">{fuel}</td>
                <td className="py-2 px-2">
                  {national ? (
                    <Sourced point={national}>
                      KSh {national.value_numeric?.toLocaleString()} {national.unit?.split("/")[1]}
                    </Sourced>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="py-2 px-2">
                  {county ? (
                    <Sourced
                      point={{
                        id: county.source_id,
                        metric_key: "fuel.cost_per_unit",
                        value_numeric: county.price_numeric,
                        value_text: null,
                        unit: county.unit,
                        fuel_type: county.fuel_type as FuelKey,
                        county_id: county.county_id,
                        county_name: county.county_name,
                        county_code: county.county_code,
                        source_id: county.source_id,
                        source_slug: county.source_slug,
                        source_title: county.source_title,
                        source_publisher: county.source_publisher,
                        source_url: county.source_url,
                        source_confidence: county.source_confidence,
                        valid_from: county.observed_on,
                        valid_until: null,
                        notes: county.notes,
                      }}
                    >
                      KSh {county.price_numeric.toLocaleString()} {county.unit.split("/")[1]}
                    </Sourced>
                  ) : (
                    <span className="text-muted-foreground italic text-xs">no county data</span>
                  )}
                </td>
                <td className="py-2 px-2">
                  {delta !== null ? (
                    <Badge variant={delta > 0 ? "destructive" : "secondary"} className="text-xs">
                      {delta > 0 ? "+" : ""}{delta.toFixed(1)}%
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
