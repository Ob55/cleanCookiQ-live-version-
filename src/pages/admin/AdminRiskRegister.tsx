import { useMemo, useState } from "react";
import { ShieldAlert, AlertCircle, AlertTriangle, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useRiskRegister } from "@/hooks/useRisk";
import {
  riskBandColorClass, riskTypeLabel,
  type RiskBand, type RiskRow,
} from "@/lib/risk";
import { DownloadReportButton, dateColumn } from "@/components/admin/DownloadReportButton";

const BANDS: Array<{ band: RiskBand; icon: React.ElementType; label: string }> = [
  { band: "critical", icon: ShieldAlert, label: "Critical" },
  { band: "high",     icon: AlertCircle, label: "High" },
  { band: "medium",   icon: AlertTriangle, label: "Medium" },
  { band: "low",      icon: ShieldCheck, label: "Low" },
];

export default function AdminRiskRegister() {
  const { data, isLoading } = useRiskRegister();
  const [bandFilter, setBandFilter] = useState<RiskBand | "">("");

  const counts = useMemo(() => {
    const m = new Map<RiskBand, number>();
    (data ?? []).forEach((r) => m.set(r.risk_band, (m.get(r.risk_band) ?? 0) + 1));
    return m;
  }, [data]);

  const filtered = bandFilter ? (data ?? []).filter((r) => r.risk_band === bandFilter) : data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-primary" /> Risk Register
          </h1>
          <p className="text-muted-foreground mt-1">
            Open risks across the portfolio, ordered by score (severity × likelihood).
            Behavioural-relapse risks are auto-opened when a project's clean-fuel share
            falls below 50% for two consecutive readings.
          </p>
        </div>
        <DownloadReportButton
          rows={filtered}
          columns={[
            { key: "risk_type", label: "Risk Type", format: (r) => riskTypeLabel(r.risk_type) },
            { key: "project_title", label: "Project" },
            { key: "institution_name", label: "Institution" },
            { key: "institution_county", label: "County" },
            { key: "bearer", label: "Bearer" },
            { key: "severity", label: "Severity" },
            { key: "likelihood", label: "Likelihood" },
            { key: "risk_score", label: "Score" },
            { key: "risk_band", label: "Band" },
            { key: "status", label: "Status" },
            { key: "description", label: "Description" },
            { key: "mitigation", label: "Mitigation" },
            dateColumn("next_review_at", "Next Review"),
            dateColumn("created_at", "Opened"),
          ]}
          title="Risk Register"
          filename="risk-register"
          subtitle={bandFilter ? `Filter: ${bandFilter} band only` : "All risk bands"}
        />
      </div>

      {/* Band counts */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {BANDS.map(({ band, icon: Icon, label }) => (
          <button
            key={band}
            type="button"
            onClick={() => setBandFilter(bandFilter === band ? "" : band)}
            className={`text-left ${bandFilter === band ? "ring-2 ring-primary rounded-lg" : ""}`}
          >
            <Card>
              <CardContent className="pt-4">
                <div className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs ${riskBandColorClass(band)}`}>
                  <Icon className="h-3 w-3" /> {label}
                </div>
                <p className="text-2xl font-bold mt-1">{counts.get(band) ?? 0}</p>
              </CardContent>
            </Card>
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}</div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No risks match the current filter.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => <RiskCard key={r.id} risk={r} />)}
        </div>
      )}
    </div>
  );
}

function RiskCard({ risk: r }: { risk: RiskRow }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div>
            <CardTitle className="text-base">{riskTypeLabel(r.risk_type)}</CardTitle>
            <p className="text-xs text-muted-foreground">
              {r.project_title} · {r.institution_name}
              {r.institution_county ? ` · ${r.institution_county}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-1 flex-wrap">
            <Badge className={riskBandColorClass(r.risk_band)}>
              {r.risk_band.toUpperCase()} ({r.risk_score})
            </Badge>
            <Badge variant="outline" className="text-xs capitalize">{r.bearer}</Badge>
            <Badge variant="outline" className="text-xs capitalize">{r.status}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="text-sm space-y-1">
        <p>{r.description}</p>
        {r.mitigation && <p className="text-xs text-muted-foreground italic">Mitigation: {r.mitigation}</p>}
        <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground pt-1">
          <span>Severity: {r.severity}/5</span>
          <span>Likelihood: {r.likelihood}/5</span>
          {r.next_review_at && <span>Next review: {r.next_review_at}</span>}
        </div>
      </CardContent>
    </Card>
  );
}
