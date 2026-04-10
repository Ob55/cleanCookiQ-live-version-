import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BarChart3, Building2, TrendingUp, Flame } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

const COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "#22c55e", "#8b5cf6", "#f97316", "#06b6d4", "#ec4899"];

export default function IntelligencePage() {
  const { data: institutions, isLoading } = useQuery({
    queryKey: ["public-intelligence"],
    queryFn: async () => {
      const { data, error } = await supabase.from("institutions").select("county, institution_type, pipeline_stage, current_fuel, meals_per_day");
      if (error) throw error;
      return data ?? [];
    },
  });

  if (isLoading) {
    return (
      <div className="container py-12">
        <Skeleton className="h-8 w-64 mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">{[1,2,3].map(i => <Skeleton key={i} className="h-40 rounded-xl" />)}</div>
      </div>
    );
  }

  const total = institutions?.length ?? 0;
  const assessed = institutions?.filter(i => i.pipeline_stage !== "identified").length ?? 0;

  // County breakdown
  const countyMap: Record<string, number> = {};
  institutions?.forEach(i => { countyMap[i.county] = (countyMap[i.county] ?? 0) + 1; });
  const countyData = Object.entries(countyMap).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, value]) => ({ name, value }));

  // Pipeline stage
  const stageMap: Record<string, number> = {};
  institutions?.forEach(i => { stageMap[i.pipeline_stage] = (stageMap[i.pipeline_stage] ?? 0) + 1; });
  const stageData = Object.entries(stageMap).map(([name, value]) => ({ name, value }));

  // Fuel mix
  const fuelMap: Record<string, number> = {};
  institutions?.forEach(i => { if (i.current_fuel) fuelMap[i.current_fuel] = (fuelMap[i.current_fuel] ?? 0) + 1; });
  const fuelData = Object.entries(fuelMap).map(([name, value]) => ({ name, value }));

  return (
    <div className="min-h-[80vh] bg-background py-12">
      <div className="container">
        <div className="text-center mb-10">
          <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <BarChart3 className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-3xl font-display font-bold mb-2">Public Intelligence & Reports</h1>
          <p className="text-muted-foreground max-w-lg mx-auto">Aggregate statistics, county breakdowns, and technology mix analysis.</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {[
            { label: "Total Institutions", value: total, icon: Building2 },
            { label: "Assessed", value: assessed, icon: TrendingUp },
            { label: "Total Daily Meals", value: (institutions?.reduce((s, i) => s + (i.meals_per_day ?? 0), 0) ?? 0).toLocaleString(), icon: Flame },
          ].map(k => (
            <div key={k.label} className="bg-card rounded-xl border border-border p-6 flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <k.icon className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-display font-bold">{k.value}</p>
                <p className="text-sm text-muted-foreground">{k.label}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* County bar chart */}
          <div className="bg-card rounded-xl border border-border p-6">
            <h2 className="font-display font-bold text-lg mb-4">Top Counties by Institution Count</h2>
            {countyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={countyData}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" height={60} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-muted-foreground text-sm">No data available</p>}
          </div>

          {/* Fuel mix pie */}
          <div className="bg-card rounded-xl border border-border p-6">
            <h2 className="font-display font-bold text-lg mb-4">Current Fuel Mix</h2>
            {fuelData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={fuelData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                    {fuelData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Legend />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : <p className="text-muted-foreground text-sm">No data available</p>}
          </div>

          {/* Pipeline stage */}
          <div className="bg-card rounded-xl border border-border p-6 lg:col-span-2">
            <h2 className="font-display font-bold text-lg mb-4">Pipeline Stage Distribution</h2>
            {stageData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={stageData} layout="vertical">
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="hsl(var(--accent))" radius={[0,4,4,0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-muted-foreground text-sm">No data available</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
