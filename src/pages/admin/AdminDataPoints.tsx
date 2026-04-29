import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Database, Plus, Pencil, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { sbAny as supabase } from "@/lib/sbAny";

type DataPoint = {
  id: string;
  metric_key: string;
  value_numeric: number | null;
  value_text: string | null;
  unit: string | null;
  fuel_type: string | null;
  county_id: string | null;
  source_id: string;
  valid_from: string;
  valid_until: string | null;
  notes: string | null;
};

type FormState = Omit<DataPoint, "id" | "value_numeric"> & {
  id?: string;
  value_numeric: string;
};

const EMPTY: FormState = {
  metric_key: "", value_numeric: "", value_text: "",
  unit: "", fuel_type: "", county_id: "",
  source_id: "", valid_from: new Date().toISOString().slice(0, 10),
  valid_until: "", notes: "",
};

export default function AdminDataPoints() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-data-points"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("data_points")
        .select("*, data_sources(title), counties(name)")
        .order("metric_key");
      if (error) throw error;
      return (data ?? []) as (DataPoint & { data_sources: { title: string } | null; counties: { name: string } | null })[];
    },
  });

  const { data: sources } = useQuery({
    queryKey: ["data-sources-active"],
    queryFn: async () => {
      const { data } = await supabase.from("data_sources").select("id, title").eq("is_active", true).order("title");
      return (data ?? []) as { id: string; title: string }[];
    },
  });

  const { data: counties } = useQuery({
    queryKey: ["counties-list"],
    queryFn: async () => {
      const { data } = await supabase.from("counties").select("id, name").order("name");
      return (data ?? []) as { id: string; name: string }[];
    },
  });

  const upsert = useMutation({
    mutationFn: async (values: FormState) => {
      if (!values.value_numeric && !values.value_text) {
        throw new Error("Either numeric or text value must be provided");
      }
      const payload = {
        metric_key: values.metric_key,
        value_numeric: values.value_numeric ? Number(values.value_numeric) : null,
        value_text: values.value_text || null,
        unit: values.unit || null,
        fuel_type: values.fuel_type || null,
        county_id: values.county_id || null,
        source_id: values.source_id,
        valid_from: values.valid_from,
        valid_until: values.valid_until || null,
        notes: values.notes || null,
      };
      if (values.id) {
        const { error } = await supabase.from("data_points").update(payload).eq("id", values.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("data_points").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-data-points"] }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("data_points").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-data-points"] }),
  });

  const startEdit = (row: DataPoint) => {
    setForm({
      id: row.id,
      metric_key: row.metric_key,
      value_numeric: row.value_numeric != null ? String(row.value_numeric) : "",
      value_text: row.value_text ?? "",
      unit: row.unit ?? "",
      fuel_type: row.fuel_type ?? "",
      county_id: row.county_id ?? "",
      source_id: row.source_id,
      valid_from: row.valid_from,
      valid_until: row.valid_until ?? "",
      notes: row.notes ?? "",
    });
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.metric_key.trim()) { toast.error("Metric key is required"); return; }
    if (!form.source_id) { toast.error("Source is required"); return; }
    try {
      await upsert.mutateAsync(form);
      toast.success(form.id ? "Data point updated" : "Data point created");
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this data point?")) return;
    try { await del.mutateAsync(id); toast.success("Deleted"); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Delete failed"); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <Database className="h-6 w-6 text-primary" /> Data Points
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Substantiable metrics (fuel costs, emissions factors, benchmarks) — every value must cite a source.
          </p>
        </div>
        <Button onClick={() => { setForm(EMPTY); setOpen(true); }}><Plus className="h-4 w-4 mr-1" /> New data point</Button>
      </div>

      {isLoading ? <Skeleton className="h-32 w-full" /> : (data ?? []).length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No data points yet. Add a Data Source first.</CardContent></Card>
      ) : (
        <Card>
          <CardHeader><CardTitle className="text-base">All data points</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground border-b">
                <tr>
                  <th className="text-left py-2 px-3">Metric</th>
                  <th className="text-left py-2 px-3">Value</th>
                  <th className="text-left py-2 px-3">Fuel</th>
                  <th className="text-left py-2 px-3">County</th>
                  <th className="text-left py-2 px-3">Source</th>
                  <th className="text-left py-2 px-3">Valid from</th>
                  <th className="text-right py-2 px-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(data ?? []).map((row) => (
                  <tr key={row.id} className="border-b last:border-0">
                    <td className="py-2 px-3 font-mono text-xs">{row.metric_key}</td>
                    <td className="py-2 px-3">{row.value_numeric ?? row.value_text} {row.unit ? <span className="text-xs text-muted-foreground">{row.unit}</span> : null}</td>
                    <td className="py-2 px-3">{row.fuel_type ? <Badge variant="outline">{row.fuel_type}</Badge> : "—"}</td>
                    <td className="py-2 px-3">{row.counties?.name ?? "—"}</td>
                    <td className="py-2 px-3 text-xs text-muted-foreground">{row.data_sources?.title ?? "—"}</td>
                    <td className="py-2 px-3">{row.valid_from}</td>
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
          <DialogHeader><DialogTitle>{form.id ? "Edit data point" : "New data point"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[70vh] overflow-y-auto pr-1">
            <div className="sm:col-span-2"><Label className="text-xs">Metric key *</Label><Input value={form.metric_key} onChange={(e) => setForm({ ...form, metric_key: e.target.value })} placeholder="e.g. lpg_price_ksh_per_kg" /></div>
            <div><Label className="text-xs">Numeric value</Label><Input type="number" step="any" value={form.value_numeric} onChange={(e) => setForm({ ...form, value_numeric: e.target.value })} /></div>
            <div><Label className="text-xs">Unit</Label><Input value={form.unit ?? ""} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="e.g. KSh/kg, tCO₂e" /></div>
            <div className="sm:col-span-2"><Label className="text-xs">Text value (if non-numeric)</Label><Input value={form.value_text ?? ""} onChange={(e) => setForm({ ...form, value_text: e.target.value })} /></div>
            <div>
              <Label className="text-xs">Fuel type</Label>
              <select value={form.fuel_type ?? ""} onChange={(e) => setForm({ ...form, fuel_type: e.target.value })} className="w-full text-sm rounded-md border border-input bg-background px-2 py-1.5">
                <option value="">—</option>
                {["firewood", "charcoal", "lpg", "biogas", "electric", "solar", "ethanol", "improved_biomass"].map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-xs">County</Label>
              <select value={form.county_id ?? ""} onChange={(e) => setForm({ ...form, county_id: e.target.value })} className="w-full text-sm rounded-md border border-input bg-background px-2 py-1.5">
                <option value="">National</option>
                {(counties ?? []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <Label className="text-xs">Source *</Label>
              <select value={form.source_id} onChange={(e) => setForm({ ...form, source_id: e.target.value })} className="w-full text-sm rounded-md border border-input bg-background px-2 py-1.5">
                <option value="">Select a source…</option>
                {(sources ?? []).map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
              </select>
            </div>
            <div><Label className="text-xs">Valid from *</Label><Input type="date" value={form.valid_from} onChange={(e) => setForm({ ...form, valid_from: e.target.value })} /></div>
            <div><Label className="text-xs">Valid until</Label><Input type="date" value={form.valid_until ?? ""} onChange={(e) => setForm({ ...form, valid_until: e.target.value })} /></div>
            <div className="sm:col-span-2"><Label className="text-xs">Notes</Label><Textarea rows={2} value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
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
