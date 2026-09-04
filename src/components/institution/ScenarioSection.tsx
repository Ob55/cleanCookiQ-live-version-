import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Plus, Star, Calculator, ShieldCheck } from "lucide-react";
import {
  useScenarios, useScenarioTechnologies, useUpsertScenario,
  useSetRecommendedScenario, useReviewScenario,
  type TransitionScenario, type ScenarioStatus,
} from "@/hooks/useScenarios";

const techLabel = (t: string) =>
  t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const STATUS_TONE: Record<ScenarioStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  reviewed: "bg-blue-100 text-blue-700",
  approved: "bg-green-100 text-green-700",
};
const NEXT_STATUS: Record<ScenarioStatus, ScenarioStatus | null> = {
  draft: "reviewed", reviewed: "approved", approved: null,
};

const fmtKsh = (n: number | null | undefined) =>
  n == null ? "—" : `KSh ${Math.round(n).toLocaleString()}`;
const fmtPayback = (m: number | null | undefined) =>
  m == null ? "—" : m < 12 ? `${m} mo` : `${(m / 12).toFixed(1)} yr`;

type Form = {
  technology_type: string; capex: string; monthly_opex: string;
  current_monthly_fuel_cost: string; residual_risk: string; methodology_version: string;
};
const emptyForm: Form = {
  technology_type: "", capex: "", monthly_opex: "",
  current_monthly_fuel_cost: "", residual_risk: "", methodology_version: "",
};

// Transition Scenarios for one institution: the costed pathway(s) — capex,
// fuel saving, payback (auto-computed via tco.ts), review workflow, and a
// single recommended pathway. Only host/lead/editor see this (canEdit); RLS
// backs it.
export default function ScenarioSection({
  institutionId, programmeId, canEdit,
}: {
  institutionId: string;
  programmeId: string | null;
  canEdit: boolean;
}) {
  const { data: scenarios = [], isLoading } = useScenarios(institutionId);
  const { data: tech } = useScenarioTechnologies(programmeId ?? undefined);
  const upsert = useUpsertScenario();
  const setRecommended = useSetRecommendedScenario();
  const review = useReviewScenario();

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(emptyForm);

  const benchmarkSet = new Set(tech?.benchmark_only ?? []);
  const techOptions = [...(tech?.allowed ?? []), ...(tech?.benchmark_only ?? [])];

  const openAdd = () => { setEditingId(null); setForm(emptyForm); setOpen(true); };
  const openEdit = (s: TransitionScenario) => {
    setEditingId(s.id);
    setForm({
      technology_type: s.technology_type,
      capex: String(s.capex ?? ""),
      monthly_opex: String(s.monthly_opex ?? ""),
      current_monthly_fuel_cost: String(s.current_monthly_fuel_cost ?? ""),
      residual_risk: s.residual_risk ?? "",
      methodology_version: s.methodology_version ?? "",
    });
    setOpen(true);
  };

  const submit = () => {
    if (!form.technology_type) { toast.error("Choose a technology"); return; }
    const capex = parseFloat(form.capex) || 0;
    upsert.mutate(
      {
        id: editingId ?? undefined,
        institution_id: institutionId,
        programme_id: programmeId,
        technology_type: form.technology_type,
        capex,
        monthly_opex: parseFloat(form.monthly_opex) || 0,
        current_monthly_fuel_cost: parseFloat(form.current_monthly_fuel_cost) || 0,
        residual_risk: form.residual_risk.trim() || null,
        methodology_version: form.methodology_version.trim() || null,
      },
      {
        onSuccess: (d) => {
          toast.success(`Scenario saved — payback ${fmtPayback(d.payback_months)}`);
          setOpen(false); setEditingId(null); setForm(emptyForm);
        },
        onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Failed to save scenario"),
      },
    );
  };

  const markRecommended = (s: TransitionScenario) => {
    if (benchmarkSet.has(s.technology_type)) {
      toast.error(`${techLabel(s.technology_type)} is a benchmark only and cannot be recommended`);
      return;
    }
    if (s.status !== "approved") {
      toast.error("Only an approved scenario can be recommended");
      return;
    }
    setRecommended.mutate({ id: s.id, institution_id: institutionId });
  };

  return (
    <Card>
      <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base flex items-center gap-2">
          <Calculator className="h-4 w-4 text-primary" /> Transition Scenarios
        </CardTitle>
        {canEdit && (
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditingId(null); setForm(emptyForm); } }}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" onClick={openAdd}><Plus className="h-4 w-4 mr-1" /> Add scenario</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editingId ? "Edit scenario" : "Add costed scenario"}</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Technology *</Label>
                  <Select value={form.technology_type} onValueChange={(v) => setForm((f) => ({ ...f, technology_type: v }))}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Choose a technology" /></SelectTrigger>
                    <SelectContent>
                      {techOptions.map((t) => (
                        <SelectItem key={t} value={t}>
                          {techLabel(t)}{benchmarkSet.has(t) ? " (benchmark)" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Capex (KSh) *</Label><Input type="number" className="mt-1" value={form.capex} onChange={(e) => setForm((f) => ({ ...f, capex: e.target.value }))} /></div>
                  <div><Label>Monthly opex (KSh)</Label><Input type="number" className="mt-1" value={form.monthly_opex} onChange={(e) => setForm((f) => ({ ...f, monthly_opex: e.target.value }))} /></div>
                </div>
                <div>
                  <Label>Current monthly fuel cost (KSh)</Label>
                  <Input type="number" className="mt-1" value={form.current_monthly_fuel_cost} onChange={(e) => setForm((f) => ({ ...f, current_monthly_fuel_cost: e.target.value }))} placeholder="Status-quo spend this displaces" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Residual risk</Label><Input className="mt-1" value={form.residual_risk} onChange={(e) => setForm((f) => ({ ...f, residual_risk: e.target.value }))} placeholder="e.g. feedstock supply" /></div>
                  <div><Label>Methodology ver.</Label><Input className="mt-1" value={form.methodology_version} onChange={(e) => setForm((f) => ({ ...f, methodology_version: e.target.value }))} placeholder="e.g. tco-v1" /></div>
                </div>
                <p className="text-[11px] text-muted-foreground">Payback, ROI and monthly saving are computed automatically from these inputs.</p>
                <Button onClick={submit} disabled={upsert.isPending} className="w-full">
                  {upsert.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}{editingId ? "Save changes" : "Add scenario"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : !scenarios.length ? (
          <p className="text-sm text-muted-foreground text-center py-8">No costed scenarios yet.</p>
        ) : (
          <div className="space-y-2">
            {scenarios.map((s) => {
              const isBench = benchmarkSet.has(s.technology_type);
              const next = NEXT_STATUS[s.status];
              return (
                <div key={s.id} className={`rounded-lg border px-4 py-3 ${s.is_recommended ? "border-primary bg-primary/5" : "border-border"}`}>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      {s.is_recommended && <Star className="h-4 w-4 text-primary fill-primary" />}
                      <span className="font-medium text-sm">{techLabel(s.technology_type)}</span>
                      {isBench && <Badge variant="outline" className="text-[10px]">benchmark</Badge>}
                      <Badge className={`text-[10px] ${STATUS_TONE[s.status]}`}>{s.status}</Badge>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Capex <span className="text-foreground font-medium">{fmtKsh(s.capex)}</span></span>
                      <span>Payback <span className="text-foreground font-medium">{fmtPayback(s.payback_months)}</span></span>
                      <span>ROI <span className="text-foreground font-medium">{s.roi_percentage != null ? `${s.roi_percentage}%` : "—"}</span></span>
                    </div>
                  </div>
                  {(s.residual_risk || s.methodology_version) && (
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground mt-1">
                      {s.residual_risk && <span>Risk: {s.residual_risk}</span>}
                      {s.methodology_version && <span>Method: {s.methodology_version}</span>}
                    </div>
                  )}
                  {canEdit && (
                    <div className="flex items-center gap-2 mt-2">
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => openEdit(s)}>Edit</Button>
                      {next && (
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => review.mutate({ id: s.id, institution_id: institutionId, status: next })}>
                          <ShieldCheck className="h-3 w-3 mr-1" /> Mark {next}
                        </Button>
                      )}
                      {!s.is_recommended && !isBench && (
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => markRecommended(s)}>
                          <Star className="h-3 w-3 mr-1" /> Recommend
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
