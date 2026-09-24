import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { sbAny } from "@/lib/sbAny";
import { fetchAllRows } from "@/lib/fetchAllRows";
import { KENYA_COUNTIES } from "@/lib/counties";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Building2, Plus, Search, Filter, Loader2, Lightbulb } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { DownloadReportButton, dateColumn, filterSubtitle } from "@/components/admin/DownloadReportButton";
import { InstitutionCard, type InstitutionCardData } from "@/components/admin/InstitutionCard";
import { runInstitutionValidation } from "@/lib/runInstitutionValidation";
import { proposeForInstitutions } from "@/lib/runRecommendation";

const institutionTypes = ["school", "hospital", "prison", "factory", "hotel", "restaurant", "other"];
const pipelineStages = ["identified", "assessed", "matched", "negotiation", "contracted", "installed", "monitoring"];
const fuelTypes = ["firewood", "charcoal", "lpg", "biogas", "electric", "other"];
const PAGE = 60;
const READINESS = ["all", "ready", "needs_method", "needs_funder"] as const;
const STATUS_LABELS: Record<string, string> = { verified: "Passed", flagged: "Flagged", unverified: "Not validated" };

type Row = InstitutionCardData & Record<string, any>;

export default function InstitutionManagement() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [countyFilter, setCountyFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [stageFilter, setStageFilter] = useState("all");
  const [readiness, setReadiness] = useState<(typeof READINESS)[number]>("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [shown, setShown] = useState(PAGE);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [proposing, setProposing] = useState(false);
  const queryClient = useQueryClient();

  // Every institution is listed; each card is labelled Passed / Flagged / Not validated.
  const { data: institutions, isLoading } = useQuery({
    queryKey: ["institutions", "all", countyFilter, typeFilter, stageFilter],
    queryFn: () =>
      fetchAllRows<Row>((from, to) => {
        let q = sbAny.from("institutions").select("*").order("created_at", { ascending: false });
        if (countyFilter !== "all") q = q.eq("county", countyFilter);
        if (typeFilter !== "all") q = q.eq("institution_type", typeFilter);
        if (stageFilter !== "all") q = q.eq("pipeline_stage", stageFilter);
        return q.range(from, to);
      }),
  });

  // Allocated funder per institution (one read for the whole roster).
  const { data: funderByInst } = useQuery({
    queryKey: ["institution-funder-map"],
    queryFn: async () => {
      const rows = await fetchAllRows<{ institution_id: string; funder_profiles: { organisation_name: string | null; full_name: string | null } | null }>(
        (from, to) => supabase.from("funder_institution_links")
          .select("institution_id, funder_profiles(organisation_name, full_name)")
          .eq("status", "active").range(from, to) as never);
      return new Map(rows.map((r) => [r.institution_id, r.funder_profiles?.organisation_name || r.funder_profiles?.full_name || "Funder"]));
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (institutions ?? []).filter((i) => {
      if (q && ![i.name, i.institution_code, i.county].some((v) => v?.toLowerCase().includes(q))) return false;
      if (statusFilter !== "all" && (i.verification_status ?? "unverified") !== statusFilter) return false;
      const funded = funderByInst?.has(i.id);
      if (readiness === "ready") return i.verification_status === "verified" && !!i.recommended_solution && funded;
      if (readiness === "needs_method") return !i.recommended_solution;
      if (readiness === "needs_funder") return !funded;
      return true;
    });
  }, [institutions, search, readiness, statusFilter, funderByInst]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { verified: 0, flagged: 0, unverified: 0, ready: 0 };
    for (const i of institutions ?? []) {
      const st = i.verification_status ?? "unverified";
      c[st] = (c[st] ?? 0) + 1;
      if (st === "verified" && i.recommended_solution && funderByInst?.has(i.id)) c.ready++;
    }
    return c;
  }, [institutions, funderByInst]);
  // Methods are only proposed for institutions that passed validation.
  const needMethod = (institutions ?? [])
    .filter((i) => i.verification_status === "verified" && !i.recommended_solution).map((i) => i.id);

  async function proposeMissing() {
    setProposing(true);
    try {
      const n = await proposeForInstitutions(needMethod);
      toast.success(`Proposed a cooking method for ${n} institutions`);
      queryClient.invalidateQueries({ queryKey: ["institutions"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to propose methods");
    } finally { setProposing(false); }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-display font-bold">Institutions</h1>
          <p className="text-sm text-muted-foreground">
            {(institutions?.length ?? 0).toLocaleString()} institutions · {counts.verified.toLocaleString()} passed ·{" "}
            {counts.flagged.toLocaleString()} flagged · {counts.unverified.toLocaleString()} not validated ·{" "}
            {counts.ready.toLocaleString()} ready for transition
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {needMethod.length > 0 && (
            <Button variant="outline" onClick={proposeMissing} disabled={proposing}>
              {proposing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Lightbulb className="h-4 w-4 mr-2" />}
              Propose methods ({needMethod.length.toLocaleString()})
            </Button>
          )}
          <DownloadReportButton
            rows={filtered}
            columns={[
              { key: "institution_code", label: "Code" },
              { key: "name", label: "Institution" },
              { key: "institution_type", label: "Type" },
              { key: "county", label: "County" },
              { key: "sub_county", label: "Sub-County" },
              { key: "current_fuel", label: "Current Fuel" },
              { key: "number_of_students", label: "Students" },
              { key: "meals_per_day", label: "Meals/Day" },
              { key: "monthly_fuel_spend", label: "Monthly Fuel Spend (KSh)" },
              { key: "pipeline_stage", label: "Pipeline Stage" },
              { key: "assessment_score", label: "Readiness Score" },
              { key: "annual_savings_ksh", label: "Annual Savings (KSh)" },
              { key: "co2_reduction_tonnes_pa", label: "CO₂ Reduction (t/yr)" },
              { key: "recommended_solution", label: "Proposed Method" },
              { key: "recommendation_reason", label: "Why" },
              { key: "contact_person", label: "Contact" },
              { key: "contact_phone", label: "Phone" },
              { key: "contact_email", label: "Email" },
              dateColumn("created_at", "Created"),
            ]}
            title="Institutions"
            filename="institutions"
            subtitle={filterSubtitle({ county: countyFilter, type: typeFilter, stage: stageFilter })}
          />
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary text-primary-foreground">
                <Plus className="h-4 w-4 mr-2" /> Add Institution
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="font-display">Add New Institution</DialogTitle>
              </DialogHeader>
              <InstitutionForm onSuccess={async (id) => {
                setDialogOpen(false);
                // New records go through the same checks as uploads.
                if (id) {
                  const r = await runInstitutionValidation([id]).catch(() => null);
                  if (r?.passed) await proposeForInstitutions([id]).catch(() => undefined);
                  if (r && !r.passed) toast.warning("Flagged by validation — see the Validation page");
                }
                queryClient.invalidateQueries({ queryKey: ["institutions"] });
              }} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name, code or county..." value={search}
            onChange={e => { setSearch(e.target.value); setShown(PAGE); }} className="pl-10" />
        </div>
        <Select value={countyFilter} onValueChange={(v) => { setCountyFilter(v); setShown(PAGE); }}>
          <SelectTrigger className="w-[160px]"><Filter className="h-4 w-4 mr-2" /><SelectValue placeholder="County" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Counties</SelectItem>
            {KENYA_COUNTIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setShown(PAGE); }}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {institutionTypes.map(t => <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={stageFilter} onValueChange={(v) => { setStageFilter(v); setShown(PAGE); }}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Stage" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stages</SelectItem>
            {pipelineStages.map(s => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setShown(PAGE); }}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {Object.entries(STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={readiness} onValueChange={(v) => { setReadiness(v as typeof readiness); setShown(PAGE); }}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All readiness</SelectItem>
            <SelectItem value="ready">Ready for transition</SelectItem>
            <SelectItem value="needs_method">Needs method</SelectItem>
            <SelectItem value="needs_funder">Needs funder</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No institutions found</p>
        </div>
      ) : (
        <>
          <div className="grid gap-2.5 grid-cols-[repeat(auto-fill,minmax(200px,1fr))]">
            {filtered.slice(0, shown).map((inst) => (
              <InstitutionCard key={inst.id} inst={inst} funderName={funderByInst?.get(inst.id)}
                onClick={() => navigate(`/admin/institutions/${inst.id}`)} />
            ))}
          </div>
          {shown < filtered.length && (
            <div className="text-center">
              <Button variant="outline" onClick={() => setShown((s) => s + PAGE)}>
                Show more ({(filtered.length - shown).toLocaleString()} left)
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export function InstitutionForm({ onSuccess, initial }: { onSuccess: (id?: string) => void; initial?: any }) {
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    institution_type: (initial?.institution_type ?? "school") as any,
    county: initial?.county ?? "",
    sub_county: initial?.sub_county ?? "",
    latitude: initial?.latitude?.toString() ?? "",
    longitude: initial?.longitude?.toString() ?? "",
    meals_per_day: initial?.meals_per_day?.toString() ?? "",
    current_fuel: (initial?.current_fuel ?? "firewood") as any,
    number_of_students: initial?.number_of_students?.toString() ?? "",
    number_of_staff: initial?.number_of_staff?.toString() ?? "",
    contact_person: initial?.contact_person ?? "",
    contact_phone: initial?.contact_phone ?? "",
    contact_email: initial?.contact_email ?? "",
    notes: initial?.notes ?? "",
  });
  const [loading, setLoading] = useState(false);
  const isEdit = !!initial?.id;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const payload = {
      name: form.name,
      institution_type: form.institution_type,
      county: form.county,
      sub_county: form.sub_county || null,
      latitude: form.latitude ? parseFloat(form.latitude) : null,
      longitude: form.longitude ? parseFloat(form.longitude) : null,
      meals_per_day: parseInt(form.meals_per_day) || 0,
      current_fuel: form.current_fuel,
      number_of_students: parseInt(form.number_of_students) || 0,
      number_of_staff: parseInt(form.number_of_staff) || 0,
      contact_person: form.contact_person || null,
      contact_phone: form.contact_phone || null,
      contact_email: form.contact_email || null,
      notes: form.notes || null,
    };
    let assignedCode: string | null = null;
    let newId: string | undefined;
    let errorMsg: string | null = null;
    if (isEdit) {
      const { error } = await supabase.from("institutions").update(payload).eq("id", initial.id);
      if (error) errorMsg = error.message;
    } else {
      const { data, error } = await supabase
        .from("institutions")
        .insert(payload)
        .select("id, institution_code")
        .single();
      if (error) errorMsg = error.message;
      else { assignedCode = data?.institution_code ?? null; newId = data?.id; }
    }
    setLoading(false);
    if (errorMsg) {
      toast.error(errorMsg);
      return;
    }
    if (isEdit) {
      toast.success("Institution updated");
    } else if (assignedCode) {
      toast.success(`Institution added — code ${assignedCode}`, {
        description: "The code is auto-assigned and immutable. Use it in tickets and reports.",
        duration: 8000,
      });
    } else {
      toast.success("Institution added");
    }
    onSuccess(isEdit ? initial.id : newId);
  };

  const set = (key: string, val: string) => setForm(prev => ({ ...prev, [key]: val }));

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Label>Institution Name *</Label>
          <Input value={form.name} onChange={e => set("name", e.target.value)} required className="mt-1" />
        </div>
        <div>
          <Label>Type *</Label>
          <Select value={form.institution_type} onValueChange={v => set("institution_type", v)}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              {institutionTypes.map(t => <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>County *</Label>
          <Input value={form.county} onChange={e => set("county", e.target.value)} required className="mt-1" />
        </div>
        <div>
          <Label>Sub-County</Label>
          <Input value={form.sub_county} onChange={e => set("sub_county", e.target.value)} className="mt-1" />
        </div>
        <div>
          <Label>Current Fuel</Label>
          <Select value={form.current_fuel} onValueChange={v => set("current_fuel", v)}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              {fuelTypes.map(f => <SelectItem key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Meals Per Day</Label>
          <Input type="number" value={form.meals_per_day} onChange={e => set("meals_per_day", e.target.value)} className="mt-1" />
        </div>
        <div>
          <Label>Students/Beneficiaries</Label>
          <Input type="number" value={form.number_of_students} onChange={e => set("number_of_students", e.target.value)} className="mt-1" />
        </div>
        <div>
          <Label>Staff Count</Label>
          <Input type="number" value={form.number_of_staff} onChange={e => set("number_of_staff", e.target.value)} className="mt-1" />
        </div>
        <div>
          <Label>Latitude</Label>
          <Input value={form.latitude} onChange={e => set("latitude", e.target.value)} placeholder="-1.2921" className="mt-1" />
        </div>
        <div>
          <Label>Longitude</Label>
          <Input value={form.longitude} onChange={e => set("longitude", e.target.value)} placeholder="36.8219" className="mt-1" />
        </div>
        <div>
          <Label>Contact Person</Label>
          <Input value={form.contact_person} onChange={e => set("contact_person", e.target.value)} className="mt-1" />
        </div>
        <div>
          <Label>Contact Phone</Label>
          <Input value={form.contact_phone} onChange={e => set("contact_phone", e.target.value)} className="mt-1" />
        </div>
        <div className="col-span-2">
          <Label>Contact Email</Label>
          <Input type="email" value={form.contact_email} onChange={e => set("contact_email", e.target.value)} className="mt-1" />
        </div>
      </div>
      <Button type="submit" className="w-full bg-primary text-primary-foreground" disabled={loading}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
        {isEdit ? "Save Changes" : "Add Institution"}
      </Button>
    </form>
  );
}
