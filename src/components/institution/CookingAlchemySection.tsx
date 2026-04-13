import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Flame, Leaf, TrendingDown, Calculator, Zap, Users } from "lucide-react";

const FUEL_LABELS: Record<string, string> = {
  firewood: "Firewood", charcoal: "Charcoal", lpg: "LPG",
  biogas: "Biogas", electric: "Electric (Induction)", other: "Biomass Pellets",
};

interface Props {
  institution: {
    current_fuel: string | null;
    consumption_per_term: number | null;
    consumption_unit: string | null;
    monthly_fuel_spend: number | null;
    number_of_students: number | null;
    recommended_solution: string | null;
    annual_savings_ksh: number | null;
    co2_reduction_tonnes_pa: number | null;
  };
  costModel: {
    capex: number | null;
    monthly_opex: number | null;
    projected_monthly_savings: number | null;
  } | null;
}

export default function CookingAlchemySection({ institution, costModel }: Props) {
  const monthlySpend = institution.monthly_fuel_spend || 0;
  const annualCost = monthlySpend * 12;
  const monthlySaving = costModel?.projected_monthly_savings || (institution.annual_savings_ksh ? institution.annual_savings_ksh / 12 : 0);
  const paybackMonths = costModel?.capex && monthlySaving > 0
    ? Math.ceil(costModel.capex / monthlySaving)
    : null;

  const items = [
    {
      icon: Flame, label: "Current Fuel",
      value: institution.current_fuel ? FUEL_LABELS[institution.current_fuel] || institution.current_fuel : "—",
      desc: `${institution.consumption_per_term ?? "—"} ${institution.consumption_unit || ""} per term`,
    },
    {
      icon: Calculator, label: "Monthly Fuel Spend",
      value: monthlySpend ? `KSh ${monthlySpend.toLocaleString()}` : "—",
      desc: `Annual cost: KSh ${annualCost ? annualCost.toLocaleString() : "—"}`,
    },
    {
      icon: Users, label: "Students Fed Daily",
      value: institution.number_of_students?.toLocaleString() || "—",
      desc: "Number of students fed each day",
    },
    {
      icon: Zap, label: "Recommended Solution",
      value: institution.recommended_solution || "Pending Assessment",
      desc: "Least-cost clean cooking technology",
    },
    {
      icon: TrendingDown, label: "Estimated Annual Saving",
      value: institution.annual_savings_ksh ? `KSh ${institution.annual_savings_ksh.toLocaleString()}` : "—",
      desc: paybackMonths ? `Payback in ${paybackMonths} months` : "Payback period pending",
    },
    {
      icon: Leaf, label: "CO₂ Reduction",
      value: institution.co2_reduction_tonnes_pa ? `${institution.co2_reduction_tonnes_pa} tonnes/yr` : "—",
      desc: "Annual carbon reduction from switching",
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Flame className="h-5 w-5 text-primary" />
          Cooking Alchemy — Transition Assessment
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
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
  );
}
