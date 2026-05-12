import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, TrendingUp, MapPin, Users, Factory, DollarSign } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { DownloadReportButton } from "@/components/admin/DownloadReportButton";

export default function BDDashboard() {
  const { data: institutions, isLoading: loadingInst } = useQuery({
    queryKey: ["bd-institutions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("institutions").select("*");
      if (error) throw error;
      return data;
    },
  });

  const { data: providers } = useQuery({
    queryKey: ["bd-providers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("providers").select("*");
      if (error) throw error;
      return data;
    },
  });

  const { data: scores } = useQuery({
    queryKey: ["bd-scores"],
    queryFn: async () => {
      const { data, error } = await supabase.from("readiness_scores").select("*");
      if (error) throw error;
      return data;
    },
  });

  const { data: opportunities } = useQuery({
    queryKey: ["bd-opportunities"],
    queryFn: async () => {
      const { data, error } = await supabase.from("opportunities").select("*");
      if (error) throw error;
      return data;
    },
  });

  if (loadingInst) return <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  // Ready Now institutions (score >= 80)
  const readyNow = scores?.filter(s => (s.overall_score || 0) >= 80) || [];
  const readyMinor = scores?.filter(s => (s.overall_score || 0) >= 60 && (s.overall_score || 0) < 80) || [];

  // County breakdown
  const countyMap = new Map<string, number>();
  institutions?.forEach(i => countyMap.set(i.county, (countyMap.get(i.county) || 0) + 1));
  const countyData = Array.from(countyMap.entries())
    .map(([county, count]) => ({ county, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Market value estimate (simple: students × avg CapEx)
  const totalStudents = institutions?.reduce((s, i) => s + (i.number_of_students || 0), 0) || 0;
  const avgCapexPerStudent = 1200; // KSh average
  const marketValue = totalStudents * avgCapexPerStudent;

  // Provider capacity by tech type
  const techCapacity = new Map<string, number>();
  providers?.forEach(p => {
    p.technology_types?.forEach((t: string) => techCapacity.set(t, (techCapacity.get(t) || 0) + 1));
  });
  const techData = Array.from(techCapacity.entries()).map(([name, value]) => ({ name, value }));

  // Pipeline value
  const pipelineValue = opportunities?.reduce((s, o) => s + (Number(o.estimated_value) || 0), 0) || 0;

  const COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "#10b981", "#3b82f6", "#8b5cf6", "#f59e0b"];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-display font-bold">Business Development Dashboard</h1>
          <p className="text-sm text-muted-foreground">Commercial opportunity intelligence and market analysis</p>
        </div>
        <DownloadReportButton
          rows={countyData}
          columns={[
            { key: "county", label: "County" },
            { key: "count", label: "Institutions" },
          ]}
          title="BD Dashboard — Top Counties"
          filename="bd-dashboard-counties"
          subtitle={`Pipeline value KSh ${(pipelineValue / 1_000_000).toFixed(1)}M · ${institutions?.length ?? 0} institutions · ${readyNow.length} Ready Now`}
        />
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: "Ready Now", value: readyNow.length, icon: TrendingUp, color: "text-emerald-600" },
          { label: "Ready (Minor Actions)", value: readyMinor.length, icon: MapPin, color: "text-blue-600" },
          { label: "Total Institutions", value: institutions?.length || 0, icon: Users, color: "text-foreground" },
          { label: "Active Providers", value: providers?.filter(p => p.verified).length || 0, icon: Factory, color: "text-primary" },
          { label: "Pipeline Value", value: `KSh ${(pipelineValue / 1_000_000).toFixed(1)}M`, icon: DollarSign, color: "text-amber-600" },
        ].map(k => (
          <div key={k.label} className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-2">
              <k.icon className={`h-4 w-4 ${k.color}`} />
              <p className="text-xs text-muted-foreground">{k.label}</p>
            </div>
            <p className={`text-2xl font-bold mt-1 ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Top Counties */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-display font-semibold mb-4">Top Counties by Institutions</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={countyData} layout="vertical">
              <XAxis type="number" />
              <YAxis type="category" dataKey="county" width={100} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Provider Technology Capacity */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-display font-semibold mb-4">Provider Capacity by Technology</h3>
          {techData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={techData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, value }) => `${name}: ${value}`}>
                  {techData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-muted-foreground">No provider data yet</div>
          )}
        </div>
      </div>

      {/* Market Value Calculator */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="font-display font-semibold mb-2">Market Value Estimate</h3>
        <p className="text-sm text-muted-foreground mb-4">If all tracked institutions transitioned to clean cooking</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-xs text-muted-foreground">Total Beneficiaries</p>
            <p className="text-xl font-bold">{totalStudents.toLocaleString()}</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-xs text-muted-foreground">Est. Total CapEx</p>
            <p className="text-xl font-bold">KSh {(marketValue / 1_000_000).toFixed(1)}M</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-xs text-muted-foreground">Est. Ignis Fee (5%)</p>
            <p className="text-xl font-bold">KSh {(marketValue * 0.05 / 1_000_000).toFixed(1)}M</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-xs text-muted-foreground">Est. CO2 Reduction/yr</p>
            <p className="text-xl font-bold">{(totalStudents * 0.003).toFixed(0)} T</p>
          </div>
        </div>
      </div>
    </div>
  );
}
