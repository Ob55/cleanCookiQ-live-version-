import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, FlaskConical, TrendingDown, Leaf, DollarSign, Flame, Zap } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Sourced } from "@/components/Sourced";
import { useActiveDataPoints } from "@/hooks/useDataPoints";
import { resolveDataPoint, type FuelKey } from "@/lib/dataPoints";

const FUEL_LABELS: Record<string, string> = {
  firewood: "Firewood", charcoal: "Charcoal", lpg: "LPG",
  biogas: "Biogas", electric: "Electric (Induction)", other: "Biomass Pellets",
};

interface InstitutionData {
  name: string;
  current_fuel: string | null;
  consumption_per_term: number | null;
  consumption_unit: string | null;
  meals_per_day: number | null;
  cooking_time_minutes: number | null;
}

export default function CookingAlchemy() {
  const { user } = useAuth();
  const [institution, setInstitution] = useState<InstitutionData | null>(null);
  const [loading, setLoading] = useState(true);

  const { data: dataPoints = [], isLoading: dpLoading } = useActiveDataPoints([
    "fuel.cost_per_unit",
    "fuel.co2_factor",
    "transition.clean_cost_multiplier",
    "transition.co2_reduction_fraction",
    "transition.cooking_time_savings",
  ]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      let { data } = await supabase
        .from("institutions")
        .select("name, current_fuel, consumption_per_term, consumption_unit, meals_per_day, cooking_time_minutes")
        .eq("created_by", user.id)
        .limit(1)
        .maybeSingle();

      if (!data) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("organisation_id")
          .eq("user_id", user.id)
          .single();
        if (profile?.organisation_id) {
          const { data: orgInst } = await supabase
            .from("institutions")
            .select("name, current_fuel, consumption_per_term, consumption_unit, meals_per_day, cooking_time_minutes")
            .eq("organisation_id", profile.organisation_id)
            .limit(1)
            .maybeSingle();
          data = orgInst;
        }
      }
      setInstitution(data as InstitutionData | null);
      setLoading(false);
    })();
  }, [user]);

  if (loading || dpLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!institution || !institution.current_fuel || !institution.consumption_per_term) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-display font-bold flex items-center gap-2">
          <FlaskConical className="h-6 w-6 text-primary" /> Cooking Counting
        </h1>
        <Card>
          <CardContent className="py-12 text-center">
            <FlaskConical className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
            <p className="text-muted-foreground text-lg">Complete your institution setup and profile to unlock savings calculations.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const fuel = institution.current_fuel as FuelKey;
  const consumption = institution.consumption_per_term;
  const termsPerYear = 3;

  const costPoint = resolveDataPoint(dataPoints, { metricKey: "fuel.cost_per_unit", fuel });
  const co2Point = resolveDataPoint(dataPoints, { metricKey: "fuel.co2_factor", fuel });
  const cleanMultiplierPoint = resolveDataPoint(dataPoints, {
    metricKey: "transition.clean_cost_multiplier",
  });
  const co2ReductionPoint = resolveDataPoint(dataPoints, {
    metricKey: "transition.co2_reduction_fraction",
  });
  const timeSavingsPoint = resolveDataPoint(dataPoints, {
    metricKey: "transition.cooking_time_savings",
  });

  const costPerUnit = costPoint?.value_numeric ?? 100;
  const co2PerUnit = co2Point?.value_numeric ?? 1;
  const cleanMultiplier = cleanMultiplierPoint?.value_numeric ?? 0.4;
  const co2ReductionFraction = co2ReductionPoint?.value_numeric ?? 0.85;
  const timeSavingsFraction = timeSavingsPoint?.value_numeric ?? 0.5;

  const currentCostPerTerm = consumption * costPerUnit;
  const currentCostPerYear = currentCostPerTerm * termsPerYear;
  const cleanCostPerYear = currentCostPerYear * cleanMultiplier;
  const annualSavings = currentCostPerYear - cleanCostPerYear;
  const co2PerTerm = consumption * co2PerUnit;
  const co2PerYear = co2PerTerm * termsPerYear;
  const co2Reduction = co2PerYear * co2ReductionFraction;
  const cookingTimeSaved = institution.cooking_time_minutes
    ? Math.round(institution.cooking_time_minutes * timeSavingsFraction * termsPerYear * 90)
    : null;

  const formatKSh = (v: number) => `KSh ${v.toLocaleString("en-KE", { maximumFractionDigits: 0 })}`;
  const reductionPct = Math.round((1 - cleanMultiplier) * 100);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold flex items-center gap-2">
          <FlaskConical className="h-6 w-6 text-primary" /> Cooking Counting
        </h1>
        <p className="text-muted-foreground mt-1">See how much you could save by transitioning to clean cooking</p>
      </div>

      <Card className="border-destructive/30 bg-destructive/5">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Flame className="h-5 w-5 text-destructive" /> Your Current Cooking Cost
          </CardTitle>
          <CardDescription>
            Based on {FUEL_LABELS[fuel]} usage of {consumption} {institution.consumption_unit}/term at{" "}
            <Sourced point={costPoint}>
              {formatKSh(costPerUnit)}/{costPoint?.unit?.split("/")[1] ?? "unit"}
            </Sourced>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="text-center p-4 rounded-lg bg-background">
              <p className="text-sm text-muted-foreground">Cost Per Term</p>
              <p className="text-xl font-bold text-destructive">{formatKSh(currentCostPerTerm)}</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-background">
              <p className="text-sm text-muted-foreground">Annual Cost</p>
              <p className="text-xl font-bold text-destructive">{formatKSh(currentCostPerYear)}</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-background">
              <p className="text-sm text-muted-foreground">CO₂ Emissions/Year</p>
              <p className="text-xl font-bold text-destructive">
                <Sourced point={co2Point}>
                  {(co2PerYear / 1000).toFixed(1)} tonnes
                </Sourced>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-primary/30 bg-primary/5">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" /> With Clean Cooking
          </CardTitle>
          <CardDescription>Projected savings after transitioning</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center p-4 rounded-lg bg-background">
              <DollarSign className="h-6 w-6 mx-auto mb-1 text-primary" />
              <p className="text-sm text-muted-foreground">Annual Savings</p>
              <p className="text-2xl font-bold text-primary">
                <Sourced point={cleanMultiplierPoint}>{formatKSh(annualSavings)}</Sourced>
              </p>
            </div>
            <div className="text-center p-4 rounded-lg bg-background">
              <TrendingDown className="h-6 w-6 mx-auto mb-1 text-primary" />
              <p className="text-sm text-muted-foreground">Cost Reduction</p>
              <p className="text-2xl font-bold text-primary">
                <Sourced point={cleanMultiplierPoint}>{reductionPct}%</Sourced>
              </p>
            </div>
            <div className="text-center p-4 rounded-lg bg-background">
              <Leaf className="h-6 w-6 mx-auto mb-1 text-primary" />
              <p className="text-sm text-muted-foreground">CO₂ Reduction</p>
              <p className="text-2xl font-bold text-primary">
                <Sourced point={co2ReductionPoint}>
                  {(co2Reduction / 1000).toFixed(1)} tonnes/yr
                </Sourced>
              </p>
            </div>
            {cookingTimeSaved && (
              <div className="text-center p-4 rounded-lg bg-background">
                <Zap className="h-6 w-6 mx-auto mb-1 text-primary" />
                <p className="text-sm text-muted-foreground">Time Saved/Year</p>
                <p className="text-2xl font-bold text-primary">
                  <Sourced point={timeSavingsPoint}>
                    {(cookingTimeSaved / 60).toFixed(0)} hrs
                  </Sourced>
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">5-Year Cost Comparison</CardTitle>
          <CardDescription>Current cooking cost vs clean cooking cost over 5 years</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={[1, 2, 3, 4, 5].map(year => ({
              name: `Year ${year}`,
              "Current Cooking Cost": currentCostPerYear * year,
              "With Clean Cooking": cleanCostPerYear * year,
            }))}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="name" className="text-xs" />
              <YAxis tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}K`} className="text-xs" />
              <Tooltip formatter={(value: number) => formatKSh(value)} />
              <Legend />
              <Bar dataKey="Current Cooking Cost" fill="hsl(0, 72%, 51%)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="With Clean Cooking" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground text-center">
        Each metric above is sourced — click the info icon next to a value to see the underlying citation, publisher, and confidence level.
      </p>
    </div>
  );
}
