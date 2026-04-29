import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Banknote, Plus, Pencil, Trash2 } from "lucide-react";
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

const INSTRUMENT_TYPES = [
  "cash", "concessional_loan", "lease_to_own", "paygo", "rbf",
  "carbon_finance", "blended", "revolving_fund", "group_purchase", "grant",
] as const;
type InstrumentType = typeof INSTRUMENT_TYPES[number];

const ORG_TYPES = ["institution", "supplier", "funder", "researcher", "other"] as const;

type Instrument = {
  id: string;
  slug: string;
  name: string;
  instrument_type: InstrumentType;
  description: string | null;
  default_terms: Record<string, unknown>;
  bearer_org_types: string[];
  best_for: string | null;
  risk_notes: string | null;
  source_id: string | null;
  display_order: number;
  is_active: boolean;
};

type FormState = {
  id?: string;
  slug: string;
  name: string;
  instrument_type: InstrumentType;
  description: string;
  default_terms_json: string;
  bearer_org_types: string[];
  best_for: string;
  risk_notes: string;
  source_id: string;
  display_order: number;
  is_active: boolean;
};

const EMPTY: FormState = {
  slug: "", name: "", instrument_type: "grant", description: "",
  default_terms_json: "{}", bearer_org_types: [], best_for: "",
  risk_notes: "", source_id: "", display_order: 100, is_active: true,
};

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export default function AdminFinancingInstruments() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-financing-instruments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financing_instruments")
        .select("*")
        .order("display_order");
      if (error) throw error;
      return (data ?? []) as Instrument[];
    },
  });

  const { data: sources } = useQuery({
    queryKey: ["data-sources-active"],
    queryFn: async () => {
      const { data } = await supabase.from("data_sources").select("id, title").eq("is_active", true).order("title");
      return (data ?? []) as { id: string; title: string }[];
    },
  });

  const upsert = useMutation({
    mutationFn: async (values: FormState) => {
      let parsedTerms: unknown = {};
      try { parsedTerms = JSON.parse(values.default_terms_json || "{}"); }
      catch { throw new Error("default_terms must be valid JSON"); }
      const payload = {
        slug: values.slug || slugify(values.name),
        name: values.name,
        instrument_type: values.instrument_type,
        description: values.description || null,
        default_terms: parsedTerms,
        bearer_org_types: values.bearer_org_types,
        best_for: values.best_for || null,
        risk_notes: values.risk_notes || null,
        source_id: values.source_id || null,
        display_order: values.display_order,
        is_active: values.is_active,
      };
      if (values.id) {
        const { error } = await supabase.from("financing_instruments").update(payload).eq("id", values.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("financing_instruments").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-financing-instruments"] }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("financing_instruments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-financing-instruments"] }),
  });

  const startEdit = (row: Instrument) => {
    setForm({
      id: row.id, slug: row.slug, name: row.name,
      instrument_type: row.instrument_type,
      description: row.description ?? "",
      default_terms_json: JSON.stringify(row.default_terms ?? {}, null, 2),
      bearer_org_types: row.bearer_org_types ?? [],
      best_for: row.best_for ?? "",
      risk_notes: row.risk_notes ?? "",
      source_id: row.source_id ?? "",
      display_order: row.display_order,
      is_active: row.is_active,
    });
    setOpen(true);
  };

  const toggleOrgType = (t: string) => {
    setForm(f => ({
      ...f,
      bearer_org_types: f.bearer_org_types.includes(t)
        ? f.bearer_org_types.filter(x => x !== t)
        : [...f.bearer_org_types, t],
    }));
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    try {
      await upsert.mutateAsync(form);
      toast.success(form.id ? "Instrument updated" : "Instrument created");
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this financing instrument?")) return;
    try { await del.mutateAsync(id); toast.success("Deleted"); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Delete failed"); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <Banknote className="h-6 w-6 text-primary" /> Financing Instruments
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Catalogue of financing options (grants, loans, lease-to-own, RBF, carbon, blended) used by the Financing Modeller.
          </p>
        </div>
        <Button onClick={() => { setForm(EMPTY); setOpen(true); }}><Plus className="h-4 w-4 mr-1" /> New instrument</Button>
      </div>

      {isLoading ? <Skeleton className="h-32 w-full" /> : (data ?? []).length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No instruments yet.</CardContent></Card>
      ) : (
        <Card>
          <CardHeader><CardTitle className="text-base">All instruments</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground border-b">
                <tr>
                  <th className="text-left py-2 px-3">Name</th>
                  <th className="text-left py-2 px-3">Type</th>
                  <th className="text-left py-2 px-3">Best for</th>
                  <th className="text-left py-2 px-3">Bearers</th>
                  <th className="text-right py-2 px-3">Order</th>
                  <th className="text-left py-2 px-3">Status</th>
                  <th className="text-right py-2 px-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(data ?? []).map((row) => (
                  <tr key={row.id} className="border-b last:border-0">
                    <td className="py-2 px-3 font-medium">{row.name}</td>
                    <td className="py-2 px-3"><Badge variant="outline">{row.instrument_type}</Badge></td>
                    <td className="py-2 px-3 text-xs text-muted-foreground max-w-[200px] truncate">{row.best_for ?? "—"}</td>
                    <td className="py-2 px-3 text-xs">{(row.bearer_org_types ?? []).join(", ") || "—"}</td>
                    <td className="py-2 px-3 text-right">{row.display_order}</td>
                    <td className="py-2 px-3">{row.is_active ? <Badge>Active</Badge> : <Badge variant="outline">Inactive</Badge>}</td>
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
          <DialogHeader><DialogTitle>{form.id ? "Edit instrument" : "New instrument"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[70vh] overflow-y-auto pr-1">
            <div className="sm:col-span-2"><Label className="text-xs">Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label className="text-xs">Slug (auto if blank)</Label><Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} /></div>
            <div>
              <Label className="text-xs">Instrument type *</Label>
              <select value={form.instrument_type} onChange={(e) => setForm({ ...form, instrument_type: e.target.value as InstrumentType })} className="w-full text-sm rounded-md border border-input bg-background px-2 py-1.5">
                {INSTRUMENT_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2"><Label className="text-xs">Description</Label><Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div className="sm:col-span-2"><Label className="text-xs">Best for</Label><Input value={form.best_for} onChange={(e) => setForm({ ...form, best_for: e.target.value })} placeholder="e.g. Schools with verified savings, MFI-backed cohorts" /></div>
            <div className="sm:col-span-2"><Label className="text-xs">Risk notes</Label><Textarea rows={2} value={form.risk_notes} onChange={(e) => setForm({ ...form, risk_notes: e.target.value })} /></div>
            <div className="sm:col-span-2">
              <Label className="text-xs">Bearer org types (who carries the obligation)</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {ORG_TYPES.map(t => (
                  <label key={t} className="flex items-center gap-1.5 text-xs px-2 py-1 rounded border border-input">
                    <input type="checkbox" checked={form.bearer_org_types.includes(t)} onChange={() => toggleOrgType(t)} />
                    {t}
                  </label>
                ))}
              </div>
            </div>
            <div className="sm:col-span-2">
              <Label className="text-xs">Source</Label>
              <select value={form.source_id} onChange={(e) => setForm({ ...form, source_id: e.target.value })} className="w-full text-sm rounded-md border border-input bg-background px-2 py-1.5">
                <option value="">— None —</option>
                {(sources ?? []).map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2"><Label className="text-xs">Default terms (JSON)</Label><Textarea rows={4} className="font-mono text-xs" value={form.default_terms_json} onChange={(e) => setForm({ ...form, default_terms_json: e.target.value })} placeholder='{"interest_rate_pct": 8, "tenor_months": 60}' /></div>
            <div><Label className="text-xs">Display order</Label><Input type="number" value={form.display_order} onChange={(e) => setForm({ ...form, display_order: Number(e.target.value) })} /></div>
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
              Active
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
