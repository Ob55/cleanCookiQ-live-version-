import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Loader2, ArrowLeft, Flame, MapPin, Users, UtensilsCrossed,
  Calculator, TrendingDown, Leaf, Zap, Building2, Phone, Mail,
  CheckCircle2, XCircle, Banknote
} from "lucide-react";

const FUEL_LABELS: Record<string, string> = {
  firewood: "Firewood", charcoal: "Charcoal", lpg: "LPG",
  biogas: "Biogas", electric: "Electric (Induction)", other: "Biomass Pellets",
};

export default function FunderInstitutionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: inst, isLoading } = useQuery({
    queryKey: ["funder-inst-detail", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("institutions")
        .select("*")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
    enabled: !!id,
  });

  const { data: costModel } = useQuery({
    queryKey: ["funder-cost-model", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cost_models")
        .select("*")
        .eq("institution_id", id!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!inst) {
    return <p className="text-muted-foreground">Institution not found.</p>;
  }

  const monthlySpend = inst.monthly_fuel_spend || 0;
  const annualCost = monthlySpend * 12;
  const monthlySaving = costModel?.projected_monthly_savings || (inst.annual_savings_ksh ? inst.annual_savings_ksh / 12 : 0);
  const paybackMonths = costModel?.capex && monthlySaving > 0
    ? Math.ceil(costModel.capex / monthlySaving)
    : null;

  const scoreCategoryColor: Record<string, string> = {
    "Ready Now": "bg-emerald-500/20 text-emerald-600",
    "Ready with Minor Actions": "bg-amber-500/20 text-amber-600",
    "Needs Enabling Support": "bg-orange-500/20 text-orange-600",
    "Longer-Term Opportunity": "bg-muted text-muted-foreground",
  };

  // What they have vs what they don't
  const checklist = [
    { label: "Dedicated Kitchen", has: inst.has_dedicated_kitchen === true, value: inst.has_dedicated_kitchen === true ? "Yes" : inst.has_dedicated_kitchen === false ? "No" : "Unknown" },
    { label: "Kitchen Condition", has: inst.kitchen_condition === "clean_ready", value: inst.kitchen_condition ? inst.kitchen_condition.replace(/_/g, " ") : "Not assessed" },
    { label: "Contact Person", has: !!inst.contact_person, value: inst.contact_person || "Not provided" },
    { label: "Contact Phone", has: !!inst.contact_phone, value: inst.contact_phone || "Not provided" },
    { label: "Contact Email", has: !!inst.contact_email, value: inst.contact_email || "Not provided" },
    { label: "Number of Students", has: (inst.number_of_students || 0) > 0, value: inst.number_of_students?.toLocaleString() || "Not set" },
    { label: "Fuel Consumption Data", has: (inst.consumption_per_term || 0) > 0, value: inst.consumption_per_term ? `${inst.consumption_per_term} ${inst.consumption_unit || ""}` : "Not set" },
    { label: "Monthly Fuel Spend", has: monthlySpend > 0, value: monthlySpend > 0 ? `KSh ${monthlySpend.toLocaleString()}` : "Not set" },
    { label: "Financial Decision Maker", has: !!inst.financial_decision_maker, value: inst.financial_decision_maker?.replace(/_/g, " ") || "Not set" },
    { label: "Financing Preference", has: !!inst.financing_preference, value: inst.financing_preference?.replace(/_/g, " ") || "Not set" },
    { label: "Kitchen Photo", has: !!inst.kitchen_photo_url, value: inst.kitchen_photo_url ? "Uploaded" : "Not uploaded" },
    { label: "Transition Needs Described", has: !!inst.transition_needs, value: inst.transition_needs || "Not described" },
  ];

  const hasItems = checklist.filter(c => c.has);
  const missingItems = checklist.filter(c => !c.has);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/funder/dashboard")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-display font-bold">{inst.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="secondary">{inst.county}</Badge>
            <Badge variant="outline" className="capitalize">{inst.institution_type}</Badge>
            {inst.assessment_category && (
              <Badge className={scoreCategoryColor[inst.assessment_category] || ""}>
                {inst.assessment_category}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Flame className="h-6 w-6 text-primary mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">Current Fuel</p>
            <p className="font-semibold text-sm">{inst.current_fuel ? FUEL_LABELS[inst.current_fuel] || inst.current_fuel : "—"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="h-6 w-6 text-primary mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">Students Fed</p>
            <p className="font-semibold text-sm">{inst.number_of_students?.toLocaleString() || "—"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Calculator className="h-6 w-6 text-primary mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">Monthly Spend</p>
            <p className="font-semibold text-sm">{monthlySpend > 0 ? `KSh ${monthlySpend.toLocaleString()}` : "—"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Banknote className="h-6 w-6 text-primary mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">Assessment Score</p>
            <p className="font-semibold text-sm">{(inst.assessment_score && inst.assessment_score > 0) ? `${inst.assessment_score}%` : "Pending"}</p>
          </CardContent>
        </Card>
      </div>

      {/* Transition Cost Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            Transition Cost Estimate
          </CardTitle>
        </CardHeader>
        <CardContent>
          {costModel ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
                <p className="text-xs text-muted-foreground">CapEx (One-Time Cost)</p>
                <p className="text-xl font-bold text-primary">KSh {costModel.capex?.toLocaleString() || "—"}</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
                <p className="text-xs text-muted-foreground">Monthly OpEx</p>
                <p className="text-xl font-bold">KSh {costModel.monthly_opex?.toLocaleString() || "—"}</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
                <p className="text-xs text-muted-foreground">Monthly Savings</p>
                <p className="text-xl font-bold text-emerald-600">KSh {costModel.projected_monthly_savings?.toLocaleString() || "—"}</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
                <p className="text-xs text-muted-foreground">Payback Period</p>
                <p className="text-xl font-bold">{paybackMonths ? `${paybackMonths} months` : "—"}</p>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Calculator className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="font-medium">Cost model not yet available</p>
              <p className="text-sm mt-1">The admin team is still calculating transition costs for this institution.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cooking Alchemy */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Flame className="h-5 w-5 text-primary" />
            Cooking Alchemy — Assessment Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: Flame, label: "Current Fuel", value: inst.current_fuel ? FUEL_LABELS[inst.current_fuel] || inst.current_fuel : "—", desc: `${inst.consumption_per_term ?? "—"} ${inst.consumption_unit || ""} per term` },
              { icon: Calculator, label: "Annual Fuel Cost", value: annualCost > 0 ? `KSh ${annualCost.toLocaleString()}` : "—", desc: `Monthly: KSh ${monthlySpend > 0 ? monthlySpend.toLocaleString() : "—"}` },
              { icon: Users, label: "Students Fed Daily", value: inst.number_of_students?.toLocaleString() || "—", desc: `Meals per day: ${inst.meals_per_day || "—"}` },
              { icon: Zap, label: "Recommended Solution", value: inst.recommended_solution || "Pending", desc: "Least-cost clean cooking technology" },
              { icon: TrendingDown, label: "Annual Saving", value: inst.annual_savings_ksh > 0 ? `KSh ${inst.annual_savings_ksh.toLocaleString()}` : "—", desc: paybackMonths ? `Payback in ${paybackMonths} months` : "Pending" },
              { icon: Leaf, label: "CO₂ Reduction", value: inst.co2_reduction_tonnes_pa > 0 ? `${inst.co2_reduction_tonnes_pa} tonnes/yr` : "—", desc: "Annual carbon reduction" },
            ].map(item => (
              <div key={item.label} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <item.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className="text-sm font-semibold">{item.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* What They Have vs What They Don't */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
              What They Have ({hasItems.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {hasItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">No data available yet.</p>
            ) : (
              hasItems.map(item => (
                <div key={item.label} className="flex items-center justify-between py-2 px-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                  <span className="text-sm font-medium">{item.label}</span>
                  <span className="text-sm text-muted-foreground capitalize">{item.value}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-destructive">
              <XCircle className="h-5 w-5" />
              What's Missing ({missingItems.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {missingItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">All data is complete!</p>
            ) : (
              missingItems.map(item => (
                <div key={item.label} className="flex items-center justify-between py-2 px-3 rounded-lg bg-destructive/5 border border-destructive/10">
                  <span className="text-sm font-medium">{item.label}</span>
                  <span className="text-sm text-muted-foreground">{item.value}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Transition Needs */}
      {inst.transition_needs && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">What They Need for Transitioning</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{inst.transition_needs}</p>
          </CardContent>
        </Card>
      )}

      {/* Contact & Location */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{inst.contact_person || "—"}</span>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{inst.contact_phone || "—"}</span>
            </div>
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{inst.contact_email || "—"}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Location</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{inst.county}{inst.sub_county ? `, ${inst.sub_county}` : ""}</span>
            </div>
            <div className="flex items-center gap-3">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm capitalize">{inst.institution_type || "—"}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
