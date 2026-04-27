import { useEffect, useMemo, useState } from "react";
import { Calculator, Loader2, TrendingUp, Wallet } from "lucide-react";
import {
  Bar, BarChart, CartesianGrid, Legend, Line, LineChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useFinancingInstruments,
  useTechnologyProfiles,
  type FinancingInstrument,
  type TechnologyProfile,
} from "@/hooks/useFinancing";
import {
  formatCurrency, formatPercent, formatYears,
  sensitivityTable, tcoModel,
  type FinancingTerms, type TcoInput,
} from "@/lib/tco";

interface DesignParams {
  techId: string;
  instrumentId: string;
  capex: number;
  opexYear1: number;
  baselineYear1Cost: number;
  lifetimeYears: number;
  discountRate: number;
}

export default function FinancingDesigner() {
  const { data: techs, isLoading: techLoading } = useTechnologyProfiles();
  const { data: instruments, isLoading: instLoading } = useFinancingInstruments();

  if (techLoading || instLoading || !techs || !instruments || techs.length === 0 || instruments.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return <FinancingDesignerInner techs={techs} instruments={instruments} />;
}

function FinancingDesignerInner({
  techs, instruments,
}: {
  techs: TechnologyProfile[];
  instruments: FinancingInstrument[];
}) {
  const defaultTech = techs[0];
  const defaultInst = instruments[0];

  const [params, setParams] = useState<DesignParams>(() => ({
    techId: defaultTech.id,
    instrumentId: defaultInst.id,
    capex: (defaultTech.capex_low + defaultTech.capex_high) / 2,
    opexYear1: estimateAnnualOpex(defaultTech),
    baselineYear1Cost: 200_000,
    lifetimeYears: defaultTech.lifetime_years,
    discountRate: 0.12,
  }));

  // If the underlying tech list changes (e.g. admin edits) and the chosen
  // tech is gone, fall back to the first.
  useEffect(() => {
    if (!techs.find((t) => t.id === params.techId)) {
      setParams((p) => ({ ...p, techId: defaultTech.id }));
    }
    if (!instruments.find((i) => i.id === params.instrumentId)) {
      setParams((p) => ({ ...p, instrumentId: defaultInst.id }));
    }
  }, [techs, instruments, params.techId, params.instrumentId, defaultTech.id, defaultInst.id]);

  const tech = techs.find((t) => t.id === params.techId) ?? defaultTech;
  const instrument = instruments.find((i) => i.id === params.instrumentId) ?? defaultInst;

  const tcoInput: TcoInput = useMemo(() => ({
    capex: params.capex,
    installCostPct: tech.install_cost_pct,
    opexYear1: params.opexYear1,
    maintenanceYear1: tech.maintenance_annual,
    lifetimeYears: params.lifetimeYears,
    salvageFraction: tech.salvage_fraction,
    baselineYear1Cost: params.baselineYear1Cost,
    discountRate: params.discountRate,
    financing: financingTermsFromInstrument(instrument),
  }), [params, tech, instrument]);

  const result = useMemo(() => tcoModel(tcoInput), [tcoInput]);
  const sensitivity = useMemo(() => sensitivityTable(tcoInput), [tcoInput]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold flex items-center gap-2">
          <Calculator className="h-6 w-6 text-primary" /> Financing Designer
        </h1>
        <p className="text-muted-foreground mt-1">
          Compose a technology + financing structure and inspect the 10-year cash flow,
          NPV/IRR, payback, and sensitivity to key assumptions.
        </p>
      </div>

      {/* Inputs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Design inputs</CardTitle>
          <CardDescription>Adjust any value to see the model recompute.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <Label className="text-xs">Technology</Label>
            <select
              className="w-full text-sm rounded-md border border-input bg-background px-2 py-1.5"
              value={params.techId}
              onChange={(e) => {
                const next = techs.find((t) => t.id === e.target.value);
                if (!next) return;
                setParams({
                  ...params,
                  techId: next.id,
                  capex: (next.capex_low + next.capex_high) / 2,
                  lifetimeYears: next.lifetime_years,
                  opexYear1: estimateAnnualOpex(next),
                });
              }}
            >
              {techs.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            <p className="text-[10px] text-muted-foreground mt-1">{tech.description}</p>
          </div>

          <div>
            <Label className="text-xs">Financing instrument</Label>
            <select
              className="w-full text-sm rounded-md border border-input bg-background px-2 py-1.5"
              value={params.instrumentId}
              onChange={(e) => setParams({ ...params, instrumentId: e.target.value })}
            >
              {instruments.map((i) => (
                <option key={i.id} value={i.id}>{i.name}</option>
              ))}
            </select>
            <p className="text-[10px] text-muted-foreground mt-1">{instrument.description}</p>
          </div>

          <NumberField
            label={`CapEx (KSh) — range ${tech.capex_low.toLocaleString()}-${tech.capex_high.toLocaleString()}`}
            value={params.capex}
            min={tech.capex_low}
            max={tech.capex_high}
            onChange={(capex) => setParams({ ...params, capex })}
          />
          <NumberField
            label="Year-1 operating cost (KSh/yr)"
            value={params.opexYear1}
            onChange={(opexYear1) => setParams({ ...params, opexYear1 })}
          />
          <NumberField
            label="Year-1 status-quo cost (KSh/yr)"
            value={params.baselineYear1Cost}
            onChange={(baselineYear1Cost) => setParams({ ...params, baselineYear1Cost })}
          />
          <NumberField
            label="Lifetime (years)"
            value={params.lifetimeYears}
            onChange={(lifetimeYears) => setParams({ ...params, lifetimeYears: Math.max(1, lifetimeYears) })}
          />
          <NumberField
            label="Discount rate (%)"
            value={Math.round(params.discountRate * 1000) / 10}
            onChange={(v) => setParams({ ...params, discountRate: v / 100 })}
          />
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi icon={<Wallet className="h-4 w-4" />} label="Total CapEx" value={formatCurrency(result.totalCapex)} />
        <Kpi icon={<TrendingUp className="h-4 w-4" />} label={`NPV @ ${formatPercent(params.discountRate)}`} value={formatCurrency(result.npv)} positive={result.npv >= 0} />
        <Kpi icon={<TrendingUp className="h-4 w-4" />} label="IRR" value={formatPercent(result.irr)} positive={(result.irr ?? 0) > params.discountRate} />
        <Kpi icon={<TrendingUp className="h-4 w-4" />} label="Simple payback" value={formatYears(result.simplePaybackYears)} />
      </div>

      {/* Cash flow chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">10-year cash flow waterfall</CardTitle>
          <CardDescription>Net cash flow per year, plus cumulative.</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={result.yearly} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="year" className="text-xs" />
              <YAxis tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}K`} className="text-xs" />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Legend />
              <Bar dataKey="netCashFlow" name="Net cash flow" fill="hsl(142, 71%, 45%)" />
            </BarChart>
          </ResponsiveContainer>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={result.yearly} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="year" className="text-xs" />
              <YAxis tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}K`} className="text-xs" />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Legend />
              <Line type="monotone" dataKey="cumulativeCashFlow" name="Cumulative" stroke="hsl(217, 91%, 60%)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Sensitivity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sensitivity</CardTitle>
          <CardDescription>How NPV and payback change when key inputs move.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground border-b">
                <tr>
                  <th className="text-left py-2 px-2">Driver</th>
                  <th className="text-left py-2 px-2">Δ</th>
                  <th className="text-right py-2 px-2">Down NPV</th>
                  <th className="text-right py-2 px-2">Baseline</th>
                  <th className="text-right py-2 px-2">Up NPV</th>
                  <th className="text-right py-2 px-2">Down payback</th>
                  <th className="text-right py-2 px-2">Up payback</th>
                </tr>
              </thead>
              <tbody>
                {sensitivity.map((row) => (
                  <tr key={row.knob} className="border-b last:border-0">
                    <td className="py-2 px-2 font-medium">{row.knob}</td>
                    <td className="py-2 px-2">±{(row.delta * 100).toFixed(0)}%</td>
                    <td className="py-2 px-2 text-right">{formatCurrency(row.downNpv)}</td>
                    <td className="py-2 px-2 text-right">{formatCurrency(row.baselineNpv)}</td>
                    <td className="py-2 px-2 text-right">{formatCurrency(row.upNpv)}</td>
                    <td className="py-2 px-2 text-right">{formatYears(row.downPaybackYears)}</td>
                    <td className="py-2 px-2 text-right">{formatYears(row.upPaybackYears)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Risk note */}
      {instrument.risk_notes && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Risk notes — {instrument.name}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">{instrument.risk_notes}</CardContent>
        </Card>
      )}
    </div>
  );
}

function Kpi({ icon, label, value, positive }: { icon: React.ReactNode; label: string; value: string; positive?: boolean }) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">{icon}<span>{label}</span></div>
        <p className={`text-xl font-bold mt-1 ${positive === undefined ? "" : positive ? "text-emerald-600" : "text-destructive"}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

function NumberField({
  label, value, onChange, min, max,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(e) => {
          const v = Number(e.target.value);
          if (Number.isFinite(v)) onChange(v);
        }}
      />
    </div>
  );
}

function estimateAnnualOpex(tech: TechnologyProfile): number {
  // Rough default — admins will refine inline. Assumes a mid-sized institution.
  const base = (tech.capex_low + tech.capex_high) / 2;
  return Math.round(base * 0.15);
}

function financingTermsFromInstrument(instrument: FinancingInstrument): FinancingTerms {
  const t = instrument.default_terms ?? {};
  const num = (k: string) => (typeof t[k] === "number" ? (t[k] as number) : undefined);
  return {
    upfrontGrantPct: num("upfront_grant_pct"),
    loanPct: num("loan_pct") ?? (instrument.instrument_type === "concessional_loan" ? 1 : undefined),
    interestRate: num("interest_rate"),
    tenorMonths: num("tenor_months"),
    graceMonths: num("grace_months"),
    downPaymentPct: num("down_payment_pct"),
  };
}

