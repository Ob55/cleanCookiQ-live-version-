import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ShieldCheck, Plus, Pencil, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { sbAny as supabase } from "@/lib/sbAny";

type Verification = {
  id: string;
  carbon_project_id: string;
  verifier: string;
  verified_on: string;
  vintage_start: string;
  vintage_end: string;
  verified_tco2e: number;
  serial_range: string | null;
  evidence_url: string | null;
  notes: string | null;
};

type FormState = {
  id?: string;
  carbon_project_id: string;
  verifier: string;
  verified_on: string;
  vintage_start: string;
  vintage_end: string;
  verified_tco2e: string;
  serial_range: string;
  evidence_url: string;
  notes: string;
};

const EMPTY: FormState = {
  carbon_project_id: "", verifier: "",
  verified_on: new Date().toISOString().slice(0, 10),
  vintage_start: "", vintage_end: "",
  verified_tco2e: "", serial_range: "",
  evidence_url: "", notes: "",
};

export default function AdminCreditVerifications() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-credit-verifications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("credit_verifications")
        .select("*, carbon_projects(methodology, registry)")
        .order("verified_on", { ascending: false });
      if (error) throw error;
      return (data ?? []) as (Verification & { carbon_projects: { methodology: string | null; registry: string | null } | null })[];
    },
  });

  const { data: projects } = useQuery({
    queryKey: ["carbon-projects-list"],
    queryFn: async () => {
      const { data } = await supabase
        .from("carbon_projects")
        .select("id, methodology, registry, project_id")
        .order("created_at", { ascending: false });
      return (data ?? []) as { id: string; methodology: string | null; registry: string | null; project_id: string }[];
    },
  });

  const upsert = useMutation({
    mutationFn: async (values: FormState) => {
      if (new Date(values.vintage_end) < new Date(values.vintage_start)) {
        throw new Error("Vintage end must be after vintage start");
      }
      const payload = {
        carbon_project_id: values.carbon_project_id,
        verifier: values.verifier,
        verified_on: values.verified_on,
        vintage_start: values.vintage_start,
        vintage_end: values.vintage_end,
        verified_tco2e: Number(values.verified_tco2e),
        serial_range: values.serial_range || null,
        evidence_url: values.evidence_url || null,
        notes: values.notes || null,
      };
      if (values.id) {
        const { error } = await supabase.from("credit_verifications").update(payload).eq("id", values.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("credit_verifications").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-credit-verifications"] }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("credit_verifications").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-credit-verifications"] }),
  });

  const startEdit = (row: Verification) => {
    setForm({
      id: row.id,
      carbon_project_id: row.carbon_project_id,
      verifier: row.verifier,
      verified_on: row.verified_on,
      vintage_start: row.vintage_start,
      vintage_end: row.vintage_end,
      verified_tco2e: String(row.verified_tco2e),
      serial_range: row.serial_range ?? "",
      evidence_url: row.evidence_url ?? "",
      notes: row.notes ?? "",
    });
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.carbon_project_id) { toast.error("Carbon project is required"); return; }
    if (!form.verifier.trim()) { toast.error("Verifier (VVB) is required"); return; }
    if (!form.verified_tco2e || Number(form.verified_tco2e) <= 0) {
      toast.error("Verified tCO₂e must be a positive number"); return;
    }
    try {
      await upsert.mutateAsync(form);
      toast.success(form.id ? "Verification updated" : "Verification recorded");
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this verification record?")) return;
    try { await del.mutateAsync(id); toast.success("Deleted"); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Delete failed"); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" /> Credit Verifications
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Third-party VVB verification events that issue carbon credits against vintages.
          </p>
        </div>
        <Button onClick={() => { setForm(EMPTY); setOpen(true); }}><Plus className="h-4 w-4 mr-1" /> Record verification</Button>
      </div>

      {isLoading ? <Skeleton className="h-32 w-full" /> : (data ?? []).length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No verifications recorded yet.</CardContent></Card>
      ) : (
        <Card>
          <CardHeader><CardTitle className="text-base">All verifications</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground border-b">
                <tr>
                  <th className="text-left py-2 px-3">Verifier</th>
                  <th className="text-left py-2 px-3">Project</th>
                  <th className="text-left py-2 px-3">Verified</th>
                  <th className="text-left py-2 px-3">Vintage</th>
                  <th className="text-right py-2 px-3">tCO₂e</th>
                  <th className="text-left py-2 px-3">Serials</th>
                  <th className="text-right py-2 px-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(data ?? []).map((row) => (
                  <tr key={row.id} className="border-b last:border-0">
                    <td className="py-2 px-3 font-medium">{row.verifier}</td>
                    <td className="py-2 px-3 text-xs text-muted-foreground">{row.carbon_projects?.methodology ?? "—"} · {row.carbon_projects?.registry ?? "—"}</td>
                    <td className="py-2 px-3">{row.verified_on}</td>
                    <td className="py-2 px-3 text-xs">{row.vintage_start} → {row.vintage_end}</td>
                    <td className="py-2 px-3 text-right font-mono">{Number(row.verified_tco2e).toLocaleString()}</td>
                    <td className="py-2 px-3 text-xs font-mono text-muted-foreground">{row.serial_range ?? "—"}</td>
                    <td className="py-2 px-3 text-right">
                      <Button size="sm" variant="ghost" onClick={() => startEdit(row)}><Pencil className="h-3 w-3" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(row.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{form.id ? "Edit verification" : "Record new verification"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <Label className="text-xs">Carbon project *</Label>
              <select value={form.carbon_project_id} onChange={(e) => setForm({ ...form, carbon_project_id: e.target.value })} className="w-full text-sm rounded-md border border-input bg-background px-2 py-1.5">
                <option value="">Select carbon project…</option>
                {(projects ?? []).map(p => <option key={p.id} value={p.id}>{p.methodology ?? "Unset method"} · {p.registry ?? "—"}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2"><Label className="text-xs">Verifier (VVB) *</Label><Input value={form.verifier} onChange={(e) => setForm({ ...form, verifier: e.target.value })} placeholder="e.g. SCS Global Services, TÜV NORD" /></div>
            <div><Label className="text-xs">Verified on *</Label><Input type="date" value={form.verified_on} onChange={(e) => setForm({ ...form, verified_on: e.target.value })} /></div>
            <div><Label className="text-xs">Verified tCO₂e *</Label><Input type="number" step="0.01" min={0} value={form.verified_tco2e} onChange={(e) => setForm({ ...form, verified_tco2e: e.target.value })} /></div>
            <div><Label className="text-xs">Vintage start *</Label><Input type="date" value={form.vintage_start} onChange={(e) => setForm({ ...form, vintage_start: e.target.value })} /></div>
            <div><Label className="text-xs">Vintage end *</Label><Input type="date" value={form.vintage_end} onChange={(e) => setForm({ ...form, vintage_end: e.target.value })} /></div>
            <div className="sm:col-span-2"><Label className="text-xs">Serial range</Label><Input value={form.serial_range} onChange={(e) => setForm({ ...form, serial_range: e.target.value })} placeholder="e.g. KE-LPG-2026-000001 → KE-LPG-2026-001500" /></div>
            <div className="sm:col-span-2"><Label className="text-xs">Evidence URL</Label><Input type="url" value={form.evidence_url} onChange={(e) => setForm({ ...form, evidence_url: e.target.value })} placeholder="Link to verification report (PDF)" /></div>
            <div className="sm:col-span-2"><Label className="text-xs">Notes</Label><Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={upsert.isPending}>{upsert.isPending ? "Saving..." : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
