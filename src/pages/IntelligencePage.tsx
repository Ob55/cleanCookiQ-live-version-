import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import ReactECharts from "echarts-for-react";
import {
  BarChart3,
  Building2,
  Flame,
  Leaf,
  Utensils,
  Users,
  CheckCircle2,
  ChefHat,
  Zap,
  Loader2,
  Filter,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import cleancookIqLogo from "@/assets/cleancookiq-logo.png";

type Row = {
  county: string | null;
  institution_type: string | null;
  pipeline_stage: string | null;
  current_fuel: string | null;
  meals_per_day: number | null;
  number_of_students: number | null;
  number_of_staff: number | null;
  has_dedicated_kitchen: boolean | null;
  monthly_fuel_spend: number | null;
  co2_reduction_tonnes_pa: number | null;
  annual_savings_ksh: number | null;
  fuel_sourcing: string | null;
  grid_connected: boolean | null;
  ownership_type: string | null;
};

const PALETTE = {
  primary: "#16704a",      // emerald
  primaryLight: "#4a9277",
  accent: "#e5a028",        // amber
  accentLight: "#f5c363",
  emeraldDark: "#0d4a30",
  gray: "#64748b",
  red: "#dc2626",
  blue: "#3b82f6",
  teal: "#14b8a6",
  purple: "#8b5cf6",
  slate: "#475569",
};

const FUEL_COLORS: Record<string, string> = {
  firewood: "#8b5a3c",
  charcoal: "#3f3f46",
  lpg: PALETTE.accent,
  biogas: PALETTE.primary,
  electric: PALETTE.blue,
  other: PALETTE.gray,
};

const TYPE_COLORS: Record<string, string> = {
  school: PALETTE.blue,
  hospital: PALETTE.red,
  faith_based: PALETTE.teal,
  prison: PALETTE.slate,
  factory: PALETTE.accent,
  hotel: PALETTE.purple,
  restaurant: "#ec4899",
  other: PALETTE.gray,
};

const TYPE_LABELS: Record<string, string> = {
  school: "Schools",
  hospital: "Hospitals",
  faith_based: "Faith-Based",
  prison: "Prisons",
  factory: "Factories",
  hotel: "Hotels",
  restaurant: "Restaurants",
  other: "Other",
};

const FUEL_LABELS: Record<string, string> = {
  firewood: "Firewood",
  charcoal: "Charcoal",
  lpg: "LPG",
  biogas: "Biogas",
  electric: "Electricity",
  other: "Other",
};

const STAGE_LABEL = (s: string) => s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const CHART_COMMON = {
  textStyle: { fontFamily: "'DM Sans', system-ui, sans-serif" },
  tooltip: {
    trigger: "axis",
    backgroundColor: "rgba(20, 40, 30, 0.92)",
    borderColor: "transparent",
    textStyle: { color: "#fff", fontSize: 12 },
    axisPointer: { type: "shadow" },
  },
  grid: { top: 24, right: 20, bottom: 40, left: 60, containLabel: true },
};

export default function IntelligencePage() {
  const [countyFilter, setCountyFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [fuelFilter, setFuelFilter] = useState("all");

  const { data: rows, isLoading } = useQuery({
    queryKey: ["intelligence-dashboard"],
    queryFn: async (): Promise<Row[]> => {
      const { data, error } = await supabase
        .from("institutions")
        .select(
          "county, institution_type, pipeline_stage, current_fuel, meals_per_day, number_of_students, number_of_staff, has_dedicated_kitchen, monthly_fuel_spend, co2_reduction_tonnes_pa, annual_savings_ksh, fuel_sourcing, grid_connected, ownership_type",
        );
      if (error) throw error;
      return (data as Row[] | null) ?? [];
    },
  });

  const filtered = useMemo(() => {
    if (!rows) return [];
    return rows.filter((r) => {
      if (countyFilter !== "all" && r.county !== countyFilter) return false;
      if (typeFilter !== "all" && r.institution_type !== typeFilter) return false;
      if (fuelFilter !== "all" && r.current_fuel !== fuelFilter) return false;
      return true;
    });
  }, [rows, countyFilter, typeFilter, fuelFilter]);

  const counties = useMemo(() => [...new Set((rows ?? []).map((r) => r.county).filter(Boolean) as string[])].sort(), [rows]);
  const types = useMemo(() => [...new Set((rows ?? []).map((r) => r.institution_type).filter(Boolean) as string[])].sort(), [rows]);
  const fuels = useMemo(() => [...new Set((rows ?? []).map((r) => r.current_fuel).filter(Boolean) as string[])].sort(), [rows]);

  // ---------- aggregates on filtered ----------
  const total = filtered.length;
  const assessed = filtered.filter((r) => r.pipeline_stage && r.pipeline_stage !== "identified").length;
  const withKitchen = filtered.filter((r) => r.has_dedicated_kitchen === true).length;
  const totalMeals = filtered.reduce((s, r) => s + (r.meals_per_day ?? 0), 0);
  const totalStudents = filtered.reduce((s, r) => s + (r.number_of_students ?? 0), 0);
  const totalMonthlySpend = filtered.reduce((s, r) => s + Number(r.monthly_fuel_spend ?? 0), 0);
  const totalCo2 = filtered.reduce((s, r) => s + Number(r.co2_reduction_tonnes_pa ?? 0), 0);
  const gridConnected = filtered.filter((r) => r.grid_connected === true).length;
  const gridPct = total ? Math.round((gridConnected / total) * 100) : 0;
  const kitchenPct = total ? Math.round((withKitchen / total) * 100) : 0;

  // By county (top 10)
  const countyCounts = countBy(filtered, "county");
  const countyRanked = Object.entries(countyCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);

  // Fuel mix
  const fuelCounts = countBy(filtered, "current_fuel");
  const fuelPie = Object.entries(fuelCounts)
    .map(([k, v]) => ({ name: FUEL_LABELS[k] ?? k, value: v, itemStyle: { color: FUEL_COLORS[k] ?? PALETTE.gray } }))
    .sort((a, b) => b.value - a.value);

  // Type mix
  const typeCounts = countBy(filtered, "institution_type");
  const typePie = Object.entries(typeCounts)
    .map(([k, v]) => ({ name: TYPE_LABELS[k] ?? k, value: v, itemStyle: { color: TYPE_COLORS[k] ?? PALETTE.gray } }))
    .sort((a, b) => b.value - a.value);

  // Pipeline funnel
  const stageCounts = countBy(filtered, "pipeline_stage");
  const stageData = Object.entries(stageCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => ({ name: STAGE_LABEL(k), value: v }));

  // Monthly spend by fuel
  const spendByFuel: Record<string, { total: number; n: number }> = {};
  filtered.forEach((r) => {
    if (!r.current_fuel || r.monthly_fuel_spend == null) return;
    const b = (spendByFuel[r.current_fuel] ??= { total: 0, n: 0 });
    b.total += Number(r.monthly_fuel_spend);
    b.n += 1;
  });
  const spendByFuelData = Object.entries(spendByFuel).map(([fuel, { total, n }]) => ({
    fuel: FUEL_LABELS[fuel] ?? fuel,
    avg: n ? Math.round(total / n) : 0,
    color: FUEL_COLORS[fuel] ?? PALETTE.gray,
  })).sort((a, b) => b.avg - a.avg);

  // Meals/day by type (avg)
  const mealsByType: Record<string, { total: number; n: number }> = {};
  filtered.forEach((r) => {
    if (!r.institution_type || r.meals_per_day == null) return;
    const b = (mealsByType[r.institution_type] ??= { total: 0, n: 0 });
    b.total += r.meals_per_day;
    b.n += 1;
  });
  const mealsByTypeData = Object.entries(mealsByType).map(([t, { total, n }]) => ({
    type: TYPE_LABELS[t] ?? t,
    avg: n ? Math.round(total / n) : 0,
    color: TYPE_COLORS[t] ?? PALETTE.gray,
  })).sort((a, b) => b.avg - a.avg);

  return (
    <div className="min-h-screen bg-muted/20">
      <div className="container py-8">
        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-3 mb-6">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-lg bg-primary flex items-center justify-center shrink-0">
              <BarChart3 className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-display font-bold">Clean Cooking Intelligence</h1>
              <p className="text-xs text-muted-foreground">
                {isLoading ? "Loading…" : `${total.toLocaleString()} institutions${total !== (rows?.length ?? 0) ? ` (filtered from ${rows?.length ?? 0})` : ""}`}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setCountyFilter("all"); setTypeFilter("all"); setFuelFilter("all"); }}
            disabled={countyFilter === "all" && typeFilter === "all" && fuelFilter === "all"}
          >
            Reset filters
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-12 gap-4">
            {/* Sidebar filters */}
            <aside className="col-span-12 lg:col-span-3 xl:col-span-2">
              <div className="bg-primary text-primary-foreground rounded-xl p-5 sticky top-20 space-y-5">
                <div className="flex items-center gap-2">
                  <img src={cleancookIqLogo} alt="" className="h-8 w-8 rounded object-contain bg-white/10 p-1" />
                  <div className="text-xs">
                    <p className="font-bold leading-tight">KENYA ENERGY</p>
                    <p className="leading-tight">DATA HUB</p>
                    <p className="text-[10px] text-primary-foreground/70 mt-1">2025</p>
                  </div>
                </div>

                <FilterBlock label="Filters" icon={Filter}>
                  <label className="text-[10px] uppercase tracking-wider text-primary-foreground/70">County</label>
                  <Select value={countyFilter} onValueChange={setCountyFilter}>
                    <SelectTrigger className="h-8 bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground text-xs"><SelectValue placeholder="All" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All counties</SelectItem>
                      {counties.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>

                  <label className="text-[10px] uppercase tracking-wider text-primary-foreground/70 mt-3 block">Institution Type</label>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="h-8 bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground text-xs"><SelectValue placeholder="All" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All types</SelectItem>
                      {types.map((t) => <SelectItem key={t} value={t}>{TYPE_LABELS[t] ?? t}</SelectItem>)}
                    </SelectContent>
                  </Select>

                  <label className="text-[10px] uppercase tracking-wider text-primary-foreground/70 mt-3 block">Primary Fuel</label>
                  <Select value={fuelFilter} onValueChange={setFuelFilter}>
                    <SelectTrigger className="h-8 bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground text-xs"><SelectValue placeholder="All" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All fuels</SelectItem>
                      {fuels.map((f) => <SelectItem key={f} value={f}>{FUEL_LABELS[f] ?? f}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </FilterBlock>

                <div className="text-[10px] text-primary-foreground/60 border-t border-primary-foreground/20 pt-4 leading-relaxed">
                  Source: institutional clean cooking survey data collected via field enumerators, stored in Supabase.
                </div>
              </div>
            </aside>

            {/* KPI strip */}
            <div className="col-span-12 lg:col-span-9 xl:col-span-10 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
              <Kpi icon={Building2} label="Institutions surveyed" value={total.toLocaleString()} />
              <Kpi icon={CheckCircle2} label="Assessed" value={assessed.toLocaleString()} />
              <Kpi icon={ChefHat} label="% with a kitchen" value={`${kitchenPct}%`} />
              <Kpi icon={Utensils} label="Meals served per day" value={totalMeals.toLocaleString()} />
              <Kpi icon={Users} label="Students reached" value={totalStudents.toLocaleString()} />
              <Kpi icon={Zap} label="Grid connected" value={`${gridPct}%`} />
            </div>

            {/* Chart grid */}
            <div className="col-span-12 lg:col-span-9 xl:col-span-10 grid grid-cols-1 md:grid-cols-2 gap-4">
              <Panel title="Institutions by Primary Fuel" subtitle="Count of institutions by main cooking fuel">
                <ReactECharts style={{ height: 320 }} option={fuelBarOption(fuelPie)} notMerge lazyUpdate />
              </Panel>

              <Panel title="Institution Type Mix" subtitle="Share of each institution type">
                <ReactECharts style={{ height: 320 }} option={donutOption(typePie)} notMerge lazyUpdate />
              </Panel>

              <Panel title="Top Counties" subtitle="Institutions per county (top 10)">
                <ReactECharts style={{ height: 320 }} option={countyBarOption(countyRanked)} notMerge lazyUpdate />
              </Panel>

              <Panel title="Pipeline Stage" subtitle="Where institutions sit in the transition pipeline">
                <ReactECharts style={{ height: 320 }} option={stageBarOption(stageData)} notMerge lazyUpdate />
              </Panel>

              <Panel
                title="Average Monthly Fuel Spend by Fuel"
                subtitle="KSh per month, averaged across institutions"
                footer={totalMonthlySpend > 0 ? `Total monthly spend across filtered: KSh ${Math.round(totalMonthlySpend).toLocaleString()}` : undefined}
              >
                <ReactECharts style={{ height: 320 }} option={spendBarOption(spendByFuelData)} notMerge lazyUpdate />
              </Panel>

              <Panel
                title="Average Meals Served by Type"
                subtitle="Meals per day, averaged within each type"
              >
                <ReactECharts style={{ height: 320 }} option={mealsBarOption(mealsByTypeData)} notMerge lazyUpdate />
              </Panel>

              <Panel
                title="Estimated CO₂ Reduction Potential"
                subtitle="Tonnes per year, if all filtered institutions transition"
                tall
              >
                <div className="flex items-center justify-center h-full min-h-[200px]">
                  <div className="text-center">
                    <Leaf className="h-12 w-12 text-primary mx-auto mb-2" />
                    <p className="text-5xl font-display font-bold text-primary">
                      {totalCo2.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">tonnes CO₂ avoided per year</p>
                  </div>
                </div>
              </Panel>

              <Panel title="Summary" subtitle="Highlights from the filtered data" tall>
                <ul className="text-sm space-y-2 leading-relaxed">
                  <li className="flex items-start gap-2"><Flame className="h-4 w-4 text-accent mt-0.5 shrink-0" /><span><strong>{fuelPie[0]?.name ?? "—"}</strong> is the most common primary fuel ({fuelPie[0]?.value ?? 0} institutions).</span></li>
                  <li className="flex items-start gap-2"><Building2 className="h-4 w-4 text-primary mt-0.5 shrink-0" /><span><strong>{typePie[0]?.name ?? "—"}</strong> lead the mix with {typePie[0]?.value ?? 0} institutions.</span></li>
                  <li className="flex items-start gap-2"><Utensils className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" /><span>Together these institutions serve <strong>{totalMeals.toLocaleString()}</strong> meals per day.</span></li>
                  <li className="flex items-start gap-2"><Zap className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" /><span><strong>{gridPct}%</strong> are connected to the electricity grid.</span></li>
                </ul>
              </Panel>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- helpers ----------

function countBy<T extends object, K extends keyof T>(rows: T[], key: K): Record<string, number> {
  const acc: Record<string, number> = {};
  for (const r of rows) {
    const v = r[key];
    if (v == null || v === "") continue;
    const k = String(v);
    acc[k] = (acc[k] ?? 0) + 1;
  }
  return acc;
}

function Kpi({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="bg-card rounded-xl border border-border p-4 flex items-center gap-3">
      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div className="min-w-0">
        <p className="text-lg font-display font-bold leading-tight truncate">{value}</p>
        <p className="text-[11px] text-muted-foreground leading-tight">{label}</p>
      </div>
    </div>
  );
}

function FilterBlock({ label, icon: Icon, children }: { label: string; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2 text-xs font-semibold uppercase tracking-wider text-primary-foreground/90">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function Panel({ title, subtitle, children, footer, tall }: { title: string; subtitle?: string; children: React.ReactNode; footer?: string; tall?: boolean }) {
  return (
    <div className={`bg-card rounded-xl border border-border p-5 shadow-card ${tall ? "" : ""}`}>
      <div className="mb-3">
        <h2 className="font-display font-semibold text-base">{title}</h2>
        {subtitle && <p className="text-[11px] text-muted-foreground">{subtitle}</p>}
      </div>
      <div>{children}</div>
      {footer && <p className="text-[11px] text-muted-foreground mt-3 border-t border-border pt-2">{footer}</p>}
    </div>
  );
}

// ---------- chart options ----------

function fuelBarOption(items: { name: string; value: number; itemStyle: { color: string } }[]) {
  return {
    ...CHART_COMMON,
    grid: { ...CHART_COMMON.grid, left: 80 },
    tooltip: { ...CHART_COMMON.tooltip, trigger: "axis" },
    xAxis: { type: "value", splitLine: { lineStyle: { type: "dashed", color: "#e5e7eb" } } },
    yAxis: { type: "category", data: items.map((i) => i.name), axisLine: { show: false }, axisTick: { show: false } },
    series: [{
      type: "bar",
      data: items.map((i) => ({ value: i.value, itemStyle: i.itemStyle })),
      barWidth: 18,
      label: { show: true, position: "right", fontSize: 11, color: "#475569" },
      itemStyle: { borderRadius: [0, 4, 4, 0] },
    }],
  };
}

function donutOption(items: { name: string; value: number; itemStyle: { color: string } }[]) {
  return {
    ...CHART_COMMON,
    tooltip: { ...CHART_COMMON.tooltip, trigger: "item", formatter: "{b}: {c} ({d}%)" },
    legend: { orient: "horizontal", bottom: 0, icon: "circle", textStyle: { fontSize: 11 } },
    series: [{
      type: "pie",
      radius: ["55%", "80%"],
      center: ["50%", "45%"],
      avoidLabelOverlap: true,
      itemStyle: { borderRadius: 4, borderColor: "#fff", borderWidth: 2 },
      label: { show: true, formatter: "{d}%", fontSize: 11, color: "#475569" },
      labelLine: { length: 8, length2: 4 },
      data: items,
    }],
  };
}

function countyBarOption(ranked: [string, number][]) {
  return {
    ...CHART_COMMON,
    grid: { ...CHART_COMMON.grid, left: 90 },
    xAxis: { type: "value", splitLine: { lineStyle: { type: "dashed", color: "#e5e7eb" } } },
    yAxis: { type: "category", data: ranked.map(([n]) => n).reverse(), axisLine: { show: false }, axisTick: { show: false } },
    series: [{
      type: "bar",
      data: ranked.map(([, v]) => v).reverse(),
      barWidth: 16,
      itemStyle: { color: PALETTE.primary, borderRadius: [0, 4, 4, 0] },
      label: { show: true, position: "right", fontSize: 11, color: "#475569" },
    }],
  };
}

function stageBarOption(items: { name: string; value: number }[]) {
  return {
    ...CHART_COMMON,
    grid: { ...CHART_COMMON.grid, left: 140 },
    xAxis: { type: "value", splitLine: { lineStyle: { type: "dashed", color: "#e5e7eb" } } },
    yAxis: { type: "category", data: items.map((i) => i.name).reverse(), axisLine: { show: false }, axisTick: { show: false } },
    series: [{
      type: "bar",
      data: items.map((i) => i.value).reverse(),
      barWidth: 16,
      itemStyle: { color: PALETTE.accent, borderRadius: [0, 4, 4, 0] },
      label: { show: true, position: "right", fontSize: 11, color: "#475569" },
    }],
  };
}

function spendBarOption(items: { fuel: string; avg: number; color: string }[]) {
  return {
    ...CHART_COMMON,
    grid: { ...CHART_COMMON.grid, left: 80 },
    tooltip: { ...CHART_COMMON.tooltip, formatter: (p: unknown) => {
      const x = p as { name: string; value: number };
      return `${x.name}<br/><b>KSh ${x.value.toLocaleString()}</b> / month (avg)`;
    } },
    xAxis: { type: "value", splitLine: { lineStyle: { type: "dashed", color: "#e5e7eb" } }, axisLabel: { formatter: (v: number) => v >= 1000 ? `${(v/1000).toFixed(0)}K` : String(v) } },
    yAxis: { type: "category", data: items.map((i) => i.fuel), axisLine: { show: false }, axisTick: { show: false } },
    series: [{
      type: "bar",
      data: items.map((i) => ({ value: i.avg, itemStyle: { color: i.color, borderRadius: [0, 4, 4, 0] } })),
      barWidth: 18,
      label: {
        show: true,
        position: "right",
        fontSize: 11,
        color: "#475569",
        formatter: (p: unknown) => {
          const x = p as { value: number };
          return x.value >= 1000 ? `${(x.value/1000).toFixed(1)}K` : String(x.value);
        },
      },
    }],
  };
}

function mealsBarOption(items: { type: string; avg: number; color: string }[]) {
  return {
    ...CHART_COMMON,
    xAxis: { type: "category", data: items.map((i) => i.type), axisLine: { show: false }, axisTick: { show: false }, axisLabel: { fontSize: 11 } },
    yAxis: { type: "value", splitLine: { lineStyle: { type: "dashed", color: "#e5e7eb" } } },
    series: [{
      type: "bar",
      data: items.map((i) => ({ value: i.avg, itemStyle: { color: i.color, borderRadius: [4, 4, 0, 0] } })),
      barWidth: 28,
      label: { show: true, position: "top", fontSize: 11, color: "#475569" },
    }],
  };
}
