import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ClipboardList, Plus, Pencil, Trash2, X } from "lucide-react";
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
import { DownloadReportButton } from "@/components/admin/DownloadReportButton";

type ChecklistItem = { key: string; label: string; required: boolean; evidence_type?: string };

type Template = {
  id: string;
  slug: string;
  name: string;
  fuel_type: string | null;
  description: string | null;
  items: ChecklistItem[];
  is_active: boolean;
};

type FormState = Omit<Template, "id"> & { id?: string };

const EMPTY: FormState = {
  slug: "", name: "", fuel_type: "", description: "",
  items: [], is_active: true,
};

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export default function AdminCommissioningTemplates() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-commissioning-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("commissioning_checklist_templates")
        .select("*")
        .order("name");
      if (error) throw error;
      return (data ?? []) as Template[];
    },
  });

  const upsert = useMutation({
    mutationFn: async (values: FormState) => {
      const payload = {
        slug: values.slug || slugify(values.name),
        name: values.name,
        fuel_type: values.fuel_type || null,
        description: values.description || null,
        items: values.items,
        is_active: values.is_active,
      };
      if (values.id) {
        const { error } = await supabase.from("commissioning_checklist_templates").update(payload).eq("id", values.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("commissioning_checklist_templates").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-commissioning-templates"] }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("commissioning_checklist_templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-commissioning-templates"] }),
  });

  const startEdit = (row: Template) => {
    setForm({
      id: row.id, slug: row.slug, name: row.name,
      fuel_type: row.fuel_type ?? "",
      description: row.description ?? "",
      items: row.items ?? [],
      is_active: row.is_active,
    });
    setOpen(true);
  };

  const addItem = () => {
    setForm(f => ({ ...f, items: [...f.items, { key: "", label: "", required: true, evidence_type: "photo" }] }));
  };

  const updateItem = (i: number, patch: Partial<ChecklistItem>) => {
    setForm(f => ({ ...f, items: f.items.map((it, idx) => idx === i ? { ...it, ...patch } : it) }));
  };

  const removeItem = (i: number) => {
    setForm(f => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }));
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    if (form.items.some(it => !it.key.trim() || !it.label.trim())) {
      toast.error("Every checklist item needs a key and label"); return;
    }
    try {
      await upsert.mutateAsync(form);
      toast.success(form.id ? "Template updated" : "Template created");
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this template?")) return;
    try { await del.mutateAsync(id); toast.success("Deleted"); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Delete failed"); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-primary" /> Commissioning Templates
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Per-fuel checklists used at delivery sign-off (LPG, biogas, electric, improved biomass).
          </p>
        </div>
        <div className="flex gap-2">
          <DownloadReportButton
            rows={data ?? []}
            columns={[
              { key: "name", label: "Template" },
              { key: "slug", label: "Slug" },
              { key: "fuel_type", label: "Fuel Type" },
              { key: "description", label: "Description" },
              { key: "items", label: "Items Count", format: (r) => r.items?.length ?? 0 },
              { key: "items", label: "Required Items", format: (r) => r.items?.filter((i: ChecklistItem) => i.required).length ?? 0 },
              { key: "is_active", label: "Active" },
            ]}
            title="Commissioning Templates"
            filename="commissioning-templates"
          />
          <Button onClick={() => { setForm(EMPTY); setOpen(true); }}><Plus className="h-4 w-4 mr-1" /> New template</Button>
        </div>
      </div>

      {isLoading ? <Skeleton className="h-32 w-full" /> : (data ?? []).length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No templates yet.</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {(data ?? []).map((row) => (
            <Card key={row.id}>
              <CardHeader className="flex-row items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-base">{row.name}</CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">{row.fuel_type ?? "All fuels"} · {row.items?.length ?? 0} items</p>
                </div>
                <div className="flex items-center gap-1">
                  {row.is_active ? <Badge>Active</Badge> : <Badge variant="outline">Inactive</Badge>}
                  <Button size="sm" variant="ghost" onClick={() => startEdit(row)}><Pencil className="h-3 w-3" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(row.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                </div>
              </CardHeader>
              <CardContent>
                {row.description && <p className="text-sm text-muted-foreground mb-2">{row.description}</p>}
                <ul className="text-sm space-y-1">
                  {(row.items ?? []).map((it, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground font-mono">{it.key}</span>
                      <span>{it.label}</span>
                      {it.required && <Badge variant="outline" className="text-[10px]">required</Badge>}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>{form.id ? "Edit template" : "New template"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[70vh] overflow-y-auto pr-1">
            <div className="sm:col-span-2"><Label className="text-xs">Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label className="text-xs">Slug (auto if blank)</Label><Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} /></div>
            <div>
              <Label className="text-xs">Fuel type</Label>
              <select value={form.fuel_type ?? ""} onChange={(e) => setForm({ ...form, fuel_type: e.target.value })} className="w-full text-sm rounded-md border border-input bg-background px-2 py-1.5">
                <option value="">All fuels</option>
                {["lpg", "biogas", "electric", "improved_biomass", "ethanol", "solar"].map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2"><Label className="text-xs">Description</Label><Textarea rows={2} value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div className="sm:col-span-2">
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs">Checklist items</Label>
                <Button size="sm" variant="outline" onClick={addItem}><Plus className="h-3 w-3 mr-1" /> Add item</Button>
              </div>
              <div className="space-y-2">
                {form.items.map((it, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-center p-2 rounded border border-border">
                    <Input placeholder="key" value={it.key} onChange={(e) => updateItem(i, { key: e.target.value })} className="col-span-3 font-mono text-xs" />
                    <Input placeholder="Label" value={it.label} onChange={(e) => updateItem(i, { label: e.target.value })} className="col-span-5" />
                    <select value={it.evidence_type ?? "photo"} onChange={(e) => updateItem(i, { evidence_type: e.target.value })} className="col-span-2 text-xs rounded-md border border-input bg-background px-2 py-1.5">
                      {["photo", "video", "document", "signature", "none"].map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <label className="col-span-1 flex items-center gap-1 text-xs">
                      <input type="checkbox" checked={it.required} onChange={(e) => updateItem(i, { required: e.target.checked })} />
                      req
                    </label>
                    <Button size="sm" variant="ghost" onClick={() => removeItem(i)} className="col-span-1"><X className="h-3 w-3 text-destructive" /></Button>
                  </div>
                ))}
                {form.items.length === 0 && <p className="text-xs text-muted-foreground italic">No items yet. Click "Add item" above.</p>}
              </div>
            </div>
            <label className="sm:col-span-2 flex items-center gap-2 text-xs text-muted-foreground">
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
