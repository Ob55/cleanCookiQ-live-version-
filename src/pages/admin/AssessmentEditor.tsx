import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ClipboardCheck, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const STATUSES = ["draft", "submitted", "reviewed", "approved"] as const;
type Status = typeof STATUSES[number];

type JsonObject = Record<string, unknown>;

type AssessmentRow = {
  id: string;
  institution_id: string;
  assessor_id: string | null;
  status: Status;
  cooking_patterns: JsonObject | null;
  energy_consumption: JsonObject | null;
  infrastructure_condition: JsonObject | null;
  kitchen_details: JsonObject | null;
  documents: string[] | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  reviewer_notes: string | null;
  institutions?: { name: string; county: string | null; institution_type: string | null } | null;
};

type FormState = {
  status: Status;
  cooking_patterns_json: string;
  energy_consumption_json: string;
  infrastructure_condition_json: string;
  kitchen_details_json: string;
  documents_csv: string;
  reviewer_notes: string;
};

const stringify = (v: JsonObject | null) => JSON.stringify(v ?? {}, null, 2);

export default function AssessmentEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const isNew = id === "new";

  const [form, setForm] = useState<FormState>({
    status: "draft",
    cooking_patterns_json: "{}",
    energy_consumption_json: "{}",
    infrastructure_condition_json: "{}",
    kitchen_details_json: "{}",
    documents_csv: "",
    reviewer_notes: "",
  });
  const [institutionId, setInstitutionId] = useState("");

  const { data: assessment, isLoading } = useQuery({
    queryKey: ["assessment", id],
    enabled: !!id && !isNew,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assessments")
        .select("*, institutions(name, county, institution_type)")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data as AssessmentRow | null;
    },
  });

  const { data: institutions } = useQuery({
    queryKey: ["institutions-list-for-assessment"],
    enabled: isNew,
    queryFn: async () => {
      const { data } = await supabase
        .from("institutions")
        .select("id, name, county")
        .order("name");
      return (data ?? []) as { id: string; name: string; county: string | null }[];
    },
  });

  useEffect(() => {
    if (!assessment) return;
    setInstitutionId(assessment.institution_id);
    setForm({
      status: assessment.status,
      cooking_patterns_json: stringify(assessment.cooking_patterns),
      energy_consumption_json: stringify(assessment.energy_consumption),
      infrastructure_condition_json: stringify(assessment.infrastructure_condition),
      kitchen_details_json: stringify(assessment.kitchen_details),
      documents_csv: (assessment.documents ?? []).join(", "),
      reviewer_notes: assessment.reviewer_notes ?? "",
    });
  }, [assessment]);

  const save = useMutation({
    mutationFn: async () => {
      const parse = (s: string, label: string) => {
        try { return JSON.parse(s || "{}"); }
        catch { throw new Error(`${label} must be valid JSON`); }
      };
      const payload = {
        institution_id: institutionId,
        status: form.status,
        cooking_patterns: parse(form.cooking_patterns_json, "Cooking patterns"),
        energy_consumption: parse(form.energy_consumption_json, "Energy consumption"),
        infrastructure_condition: parse(form.infrastructure_condition_json, "Infrastructure condition"),
        kitchen_details: parse(form.kitchen_details_json, "Kitchen details"),
        documents: form.documents_csv.split(",").map(s => s.trim()).filter(Boolean),
        reviewer_notes: form.reviewer_notes || null,
        ...(form.status === "submitted" && !assessment?.submitted_at ? { submitted_at: new Date().toISOString() } : {}),
        ...(["reviewed", "approved"].includes(form.status) ? { reviewed_at: new Date().toISOString() } : {}),
      };
      if (isNew) {
        const { data, error } = await supabase.from("assessments").insert(payload).select("id").single();
        if (error) throw error;
        return data.id as string;
      }
      const { error } = await supabase.from("assessments").update(payload).eq("id", id!);
      if (error) throw error;
      return id!;
    },
    onSuccess: (savedId) => {
      toast.success(isNew ? "Assessment created" : "Assessment saved");
      qc.invalidateQueries({ queryKey: ["assessment", id] });
      qc.invalidateQueries({ queryKey: ["admin-assessments"] });
      if (isNew) navigate(`/admin/assessments/${savedId}/edit`, { replace: true });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Save failed"),
  });

  const handleSave = () => {
    if (!institutionId) { toast.error("Pick an institution"); return; }
    save.mutate();
  };

  if (!isNew && isLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link to="/admin/assessments" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to queue
        </Link>
      </div>

      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <ClipboardCheck className="h-6 w-6 text-primary" />
            {isNew ? "New assessment" : assessment?.institutions?.name ?? "Assessment"}
          </h1>
          {assessment?.institutions && (
            <p className="text-muted-foreground text-sm mt-1">
              {assessment.institutions.county ?? "—"} · {assessment.institutions.institution_type ?? "—"}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!isNew && <Badge variant="outline" className="capitalize">{form.status}</Badge>}
          <Button onClick={handleSave} disabled={save.isPending}>
            {save.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Save
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Meta</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {isNew && (
            <div className="sm:col-span-2">
              <Label className="text-xs">Institution *</Label>
              <select value={institutionId} onChange={(e) => setInstitutionId(e.target.value)} className="w-full mt-1 text-sm rounded-md border border-input bg-background px-2 py-1.5">
                <option value="">Select institution…</option>
                {(institutions ?? []).map(i => <option key={i.id} value={i.id}>{i.name} {i.county ? `· ${i.county}` : ""}</option>)}
              </select>
            </div>
          )}
          <div>
            <Label className="text-xs">Status</Label>
            <select value={form.status} onChange={(e) => setForm(f => ({ ...f, status: e.target.value as Status }))} className="w-full mt-1 text-sm rounded-md border border-input bg-background px-2 py-1.5">
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <Label className="text-xs">Documents (comma-separated URLs)</Label>
            <Input value={form.documents_csv} onChange={(e) => setForm(f => ({ ...f, documents_csv: e.target.value }))} placeholder="https://...,https://..." className="mt-1" />
          </div>
          <div className="sm:col-span-2">
            <Label className="text-xs">Reviewer notes</Label>
            <Textarea rows={3} value={form.reviewer_notes} onChange={(e) => setForm(f => ({ ...f, reviewer_notes: e.target.value }))} className="mt-1" />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <JsonCard label="Cooking patterns" value={form.cooking_patterns_json} onChange={(v) => setForm(f => ({ ...f, cooking_patterns_json: v }))} hint="meals_per_day, peak_hours, fuel_used, dishes" />
        <JsonCard label="Energy consumption" value={form.energy_consumption_json} onChange={(v) => setForm(f => ({ ...f, energy_consumption_json: v }))} hint="monthly_fuel_kg, monthly_electricity_kwh, monthly_spend_ksh" />
        <JsonCard label="Infrastructure condition" value={form.infrastructure_condition_json} onChange={(v) => setForm(f => ({ ...f, infrastructure_condition_json: v }))} hint="ventilation, gas_supply, electrical_capacity" />
        <JsonCard label="Kitchen details" value={form.kitchen_details_json} onChange={(v) => setForm(f => ({ ...f, kitchen_details_json: v }))} hint="size_sqm, num_burners, cook_count, layout_notes" />
      </div>
    </div>
  );
}

function JsonCard({ label, value, onChange, hint }: { label: string; value: string; onChange: (s: string) => void; hint: string }) {
  let valid = true;
  try { JSON.parse(value || "{}"); } catch { valid = false; }
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center justify-between">
          <span>{label}</span>
          {!valid && <Badge variant="destructive" className="text-[10px]">Invalid JSON</Badge>}
        </CardTitle>
        <p className="text-[11px] text-muted-foreground mt-0.5">Keys: {hint}</p>
      </CardHeader>
      <CardContent>
        <Textarea rows={10} className="font-mono text-xs" value={value} onChange={(e) => onChange(e.target.value)} />
      </CardContent>
    </Card>
  );
}
