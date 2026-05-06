import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Wrench, Plus, Pencil, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { sbAny as supabase } from "@/lib/sbAny";
import { DownloadReportButton, dateColumn, listColumn } from "@/components/admin/DownloadReportButton";

type Crew = {
  id: string;
  organisation_id: string | null;
  provider_id: string | null;
  name: string;
  lead_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  certifications: string[];
  insurance_valid_until: string | null;
  counties_served: string[];
  technology_types: string[];
  active_jobs_capacity: number;
  rating: number | null;
  is_active: boolean;
};

type FormState = {
  id?: string;
  provider_id: string;
  name: string;
  lead_name: string;
  contact_phone: string;
  contact_email: string;
  certifications_csv: string;
  insurance_valid_until: string;
  counties_served_csv: string;
  technology_types_csv: string;
  active_jobs_capacity: number;
  rating: string;
  is_active: boolean;
};

const EMPTY: FormState = {
  provider_id: "", name: "", lead_name: "",
  contact_phone: "", contact_email: "",
  certifications_csv: "", insurance_valid_until: "",
  counties_served_csv: "", technology_types_csv: "",
  active_jobs_capacity: 5, rating: "", is_active: true,
};

const csvToArr = (s: string) => s.split(",").map(x => x.trim()).filter(Boolean);

export default function AdminInstallationCrews() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-installation-crews"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("installation_crews")
        .select("*, providers(name)")
        .order("name");
      if (error) throw error;
      return (data ?? []) as (Crew & { providers: { name: string } | null })[];
    },
  });

  const { data: providers } = useQuery({
    queryKey: ["providers-list"],
    queryFn: async () => {
      const { data } = await supabase.from("providers").select("id, name").order("name");
      return (data ?? []) as { id: string; name: string }[];
    },
  });

  const upsert = useMutation({
    mutationFn: async (values: FormState) => {
      const payload = {
        provider_id: values.provider_id || null,
        name: values.name,
        lead_name: values.lead_name || null,
        contact_phone: values.contact_phone || null,
        contact_email: values.contact_email || null,
        certifications: csvToArr(values.certifications_csv),
        insurance_valid_until: values.insurance_valid_until || null,
        counties_served: csvToArr(values.counties_served_csv),
        technology_types: csvToArr(values.technology_types_csv),
        active_jobs_capacity: values.active_jobs_capacity,
        rating: values.rating ? Number(values.rating) : null,
        is_active: values.is_active,
      };
      if (values.id) {
        const { error } = await supabase.from("installation_crews").update(payload).eq("id", values.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("installation_crews").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-installation-crews"] }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("installation_crews").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-installation-crews"] }),
  });

  const startEdit = (row: Crew) => {
    setForm({
      id: row.id,
      provider_id: row.provider_id ?? "",
      name: row.name,
      lead_name: row.lead_name ?? "",
      contact_phone: row.contact_phone ?? "",
      contact_email: row.contact_email ?? "",
      certifications_csv: (row.certifications ?? []).join(", "),
      insurance_valid_until: row.insurance_valid_until ?? "",
      counties_served_csv: (row.counties_served ?? []).join(", "),
      technology_types_csv: (row.technology_types ?? []).join(", "),
      active_jobs_capacity: row.active_jobs_capacity,
      rating: row.rating != null ? String(row.rating) : "",
      is_active: row.is_active,
    });
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Crew name is required"); return; }
    try {
      await upsert.mutateAsync(form);
      toast.success(form.id ? "Crew updated" : "Crew created");
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this crew?")) return;
    try { await del.mutateAsync(id); toast.success("Deleted"); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Delete failed"); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <Wrench className="h-6 w-6 text-primary" /> Installation Crews
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Registered installer teams with certifications, coverage, and capacity. Used for delivery assignment.
          </p>
        </div>
        <div className="flex gap-2">
          <DownloadReportButton
            rows={data ?? []}
            columns={[
              { key: "name", label: "Crew Name" },
              { key: "providers", label: "Provider", format: (r: any) => r.providers?.name ?? "" },
              { key: "lead_name", label: "Lead" },
              { key: "contact_phone", label: "Phone" },
              { key: "contact_email", label: "Email" },
              listColumn("certifications", "Certifications"),
              dateColumn("insurance_valid_until", "Insurance Valid Until"),
              listColumn("counties_served", "Counties Served"),
              listColumn("technology_types", "Technologies"),
              { key: "active_jobs_capacity", label: "Capacity" },
              { key: "rating", label: "Rating" },
              { key: "is_active", label: "Active" },
            ]}
            title="Installation Crews"
            filename="installation-crews"
          />
          <Button onClick={() => { setForm(EMPTY); setOpen(true); }}><Plus className="h-4 w-4 mr-1" /> New crew</Button>
        </div>
      </div>

      {isLoading ? <Skeleton className="h-32 w-full" /> : (data ?? []).length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No crews registered.</CardContent></Card>
      ) : (
        <Card>
          <CardHeader><CardTitle className="text-base">All crews</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground border-b">
                <tr>
                  <th className="text-left py-2 px-3">Name</th>
                  <th className="text-left py-2 px-3">Provider</th>
                  <th className="text-left py-2 px-3">Lead</th>
                  <th className="text-left py-2 px-3">Counties</th>
                  <th className="text-left py-2 px-3">Tech</th>
                  <th className="text-right py-2 px-3">Capacity</th>
                  <th className="text-right py-2 px-3">Rating</th>
                  <th className="text-right py-2 px-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(data ?? []).map((row) => (
                  <tr key={row.id} className="border-b last:border-0">
                    <td className="py-2 px-3 font-medium">{row.name}</td>
                    <td className="py-2 px-3 text-xs text-muted-foreground">{row.providers?.name ?? "—"}</td>
                    <td className="py-2 px-3">{row.lead_name ?? "—"}</td>
                    <td className="py-2 px-3 text-xs">{(row.counties_served ?? []).slice(0, 3).join(", ")}{(row.counties_served ?? []).length > 3 ? `, +${row.counties_served.length - 3}` : ""}</td>
                    <td className="py-2 px-3 text-xs">{(row.technology_types ?? []).join(", ") || "—"}</td>
                    <td className="py-2 px-3 text-right">{row.active_jobs_capacity}</td>
                    <td className="py-2 px-3 text-right">{row.rating != null ? row.rating.toFixed(2) : "—"}</td>
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
          <DialogHeader><DialogTitle>{form.id ? "Edit crew" : "New installation crew"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[70vh] overflow-y-auto pr-1">
            <div className="sm:col-span-2"><Label className="text-xs">Crew name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="sm:col-span-2">
              <Label className="text-xs">Provider</Label>
              <select value={form.provider_id} onChange={(e) => setForm({ ...form, provider_id: e.target.value })} className="w-full text-sm rounded-md border border-input bg-background px-2 py-1.5">
                <option value="">— None / Independent —</option>
                {(providers ?? []).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div><Label className="text-xs">Lead name</Label><Input value={form.lead_name} onChange={(e) => setForm({ ...form, lead_name: e.target.value })} /></div>
            <div><Label className="text-xs">Contact phone</Label><Input value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} placeholder="+254 7XX XXX XXX" /></div>
            <div className="sm:col-span-2"><Label className="text-xs">Contact email</Label><Input type="email" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} /></div>
            <div className="sm:col-span-2"><Label className="text-xs">Certifications (comma-separated)</Label><Input value={form.certifications_csv} onChange={(e) => setForm({ ...form, certifications_csv: e.target.value })} placeholder="EPRA Class C, GIZ-trained, KEBS-certified" /></div>
            <div><Label className="text-xs">Insurance valid until</Label><Input type="date" value={form.insurance_valid_until} onChange={(e) => setForm({ ...form, insurance_valid_until: e.target.value })} /></div>
            <div><Label className="text-xs">Active jobs capacity</Label><Input type="number" min={1} value={form.active_jobs_capacity} onChange={(e) => setForm({ ...form, active_jobs_capacity: Number(e.target.value) })} /></div>
            <div className="sm:col-span-2"><Label className="text-xs">Counties served (comma-separated)</Label><Input value={form.counties_served_csv} onChange={(e) => setForm({ ...form, counties_served_csv: e.target.value })} placeholder="Nairobi, Kiambu, Machakos" /></div>
            <div className="sm:col-span-2"><Label className="text-xs">Technology types (comma-separated)</Label><Input value={form.technology_types_csv} onChange={(e) => setForm({ ...form, technology_types_csv: e.target.value })} placeholder="lpg, biogas, electric" /></div>
            <div><Label className="text-xs">Rating (0–5)</Label><Input type="number" step="0.01" min={0} max={5} value={form.rating} onChange={(e) => setForm({ ...form, rating: e.target.value })} /></div>
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
              Active (eligible for new jobs)
            </label>
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
