import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, FlaskConical, TrendingDown, Leaf, DollarSign, Flame, Zap } from "lucide-react";

const FUEL_LABELS: Record<string, string> = {
  firewood: "Firewood", charcoal: "Charcoal", lpg: "LPG",
  biogas: "Biogas", electric: "Electric (Induction)", other: "Biomass Pellets",
};

// Cost per unit per term (KSh) — simplified reference rates
const FUEL_COST_PER_UNIT: Record<string, number> = {
  firewood: 8000,   // per tonne
  charcoal: 120,    // per kg
  lpg: 250,         // per kg
  biogas: 50,       // per m³
  electric: 25,     // per kWh
  other: 80,        // per kg (pellets)
};

// Clean alternative cost multiplier (lower = cheaper)
const CLEAN_COST_MULTIPLIER = 0.4; // clean cooking is ~40% of dirty fuel cost

// CO2 emission factor per unit (kg CO2)
const CO2_FACTOR: Record<string, number> = {
  firewood: 1700,  // per tonne
  charcoal: 3.7,   // per kg
  lpg: 3.0,        // per kg
  biogas: 0.5,     // per m³
  electric: 0.5,   // per kWh
  other: 1.5,      // per kg
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

  if (loading) {
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

  const fuel = institution.current_fuel;
  const consumption = institution.consumption_per_term;
  const costPerUnit = FUEL_COST_PER_UNIT[fuel] || 100;
  const termsPerYear = 3;

  const currentCostPerTerm = consumption * costPerUnit;
  const currentCostPerYear = currentCostPerTerm * termsPerYear;
  const cleanCostPerYear = currentCostPerYear * CLEAN_COST_MULTIPLIER;
  const annualSavings = currentCostPerYear - cleanCostPerYear;
  const co2PerTerm = consumption * (CO2_FACTOR[fuel] || 1);
  const co2PerYear = co2PerTerm * termsPerYear;
  const co2Reduction = co2PerYear * 0.85; // 85% reduction with clean cooking
  const cookingTimeSaved = institution.cooking_time_minutes
    ? Math.round(institution.cooking_time_minutes * 0.5 * termsPerYear * 90) // 50% time savings, ~90 days/term
    : null;

  const formatKSh = (v: number) => `KSh ${v.toLocaleString("en-KE", { maximumFractionDigits: 0 })}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold flex items-center gap-2">
          <FlaskConical className="h-6 w-6 text-primary" /> Cooking Counting
        </h1>
        <p className="text-muted-foreground mt-1">See how much you could save by transitioning to clean cooking</p>
      </div>

      {/* Current State */}
      <Card className="border-destructive/30 bg-destructive/5">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Flame className="h-5 w-5 text-destructive" /> Your Current Cooking Cost
          </CardTitle>
          <CardDescription>Based on {FUEL_LABELS[fuel]} usage of {consumption} {institution.consumption_unit}/term</CardDescription>
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
              <p className="text-xl font-bold text-destructive">{(co2PerYear / 1000).toFixed(1)} tonnes</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Savings Projection */}
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
              <p className="text-2xl font-bold text-primary">{formatKSh(annualSavings)}</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-background">
              <TrendingDown className="h-6 w-6 mx-auto mb-1 text-primary" />
              <p className="text-sm text-muted-foreground">Cost Reduction</p>
              <p className="text-2xl font-bold text-primary">60%</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-background">
              <Leaf className="h-6 w-6 mx-auto mb-1 text-primary" />
              <p className="text-sm text-muted-foreground">CO₂ Reduction</p>
              <p className="text-2xl font-bold text-primary">{(co2Reduction / 1000).toFixed(1)} tonnes/yr</p>
            </div>
            {cookingTimeSaved && (
              <div className="text-center p-4 rounded-lg bg-background">
                <Zap className="h-6 w-6 mx-auto mb-1 text-primary" />
                <p className="text-sm text-muted-foreground">Time Saved/Year</p>
                <p className="text-2xl font-bold text-primary">{(cookingTimeSaved / 60).toFixed(0)} hrs</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 5-Year Projection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">5-Year Savings Projection</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(year => {
              const cumSavings = annualSavings * year;
              const pct = Math.min((cumSavings / (currentCostPerYear * 5)) * 100, 100);
              return (
                <div key={year} className="flex items-center gap-4">
                  <span className="text-sm font-medium w-16">Year {year}</span>
                  <div className="flex-1 bg-muted rounded-full h-4 overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-sm font-bold w-32 text-right">{formatKSh(cumSavings)}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground text-center">
        * These are estimates based on average market rates. Actual savings may vary depending on location, provider, and fuel prices.
      </p>
    </div>
  );
}
