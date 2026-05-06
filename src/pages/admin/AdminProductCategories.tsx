import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tag, Plus, Pencil, Trash2 } from "lucide-react";
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

type Category = {
  id: string;
  slug: string;
  name: string;
  parent_id: string | null;
  description: string | null;
  display_order: number;
  is_active: boolean;
};

type FormState = Omit<Category, "id"> & { id?: string };

const EMPTY: FormState = {
  slug: "", name: "", parent_id: null,
  description: "", display_order: 100, is_active: true,
};

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export default function AdminProductCategories() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-product-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_categories")
        .select("*")
        .order("display_order");
      if (error) throw error;
      return (data ?? []) as Category[];
    },
  });

  const upsert = useMutation({
    mutationFn: async (values: FormState) => {
      const payload = {
        slug: values.slug || slugify(values.name),
        name: values.name,
        parent_id: values.parent_id || null,
        description: values.description || null,
        display_order: values.display_order,
        is_active: values.is_active,
      };
      if (values.id) {
        const { error } = await supabase.from("product_categories").update(payload).eq("id", values.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("product_categories").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-product-categories"] }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("product_categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-product-categories"] }),
  });

  const startEdit = (row: Category) => {
    setForm({
      id: row.id, slug: row.slug, name: row.name,
      parent_id: row.parent_id,
      description: row.description ?? "",
      display_order: row.display_order,
      is_active: row.is_active,
    });
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    if (form.parent_id && form.parent_id === form.id) { toast.error("A category cannot be its own parent"); return; }
    try {
      await upsert.mutateAsync(form);
      toast.success(form.id ? "Category updated" : "Category created");
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this category? Products using it will lose their category.")) return;
    try { await del.mutateAsync(id); toast.success("Deleted"); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Delete failed"); }
  };

  const parentName = (id: string | null) => (data ?? []).find(c => c.id === id)?.name;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <Tag className="h-6 w-6 text-primary" /> Product Categories
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Marketplace taxonomy (Biogas, LPG, Electric, Solar, Improved Biomass) with optional sub-categories.
          </p>
        </div>
        <div className="flex gap-2">
          <DownloadReportButton
            rows={data ?? []}
            columns={[
              { key: "name", label: "Name" },
              { key: "slug", label: "Slug" },
              { key: "parent_id", label: "Parent", format: (r) => parentName(r.parent_id) ?? "" },
              { key: "description", label: "Description" },
              { key: "display_order", label: "Order" },
              { key: "is_active", label: "Active" },
            ]}
            title="Product Categories"
            filename="product-categories"
          />
          <Button onClick={() => { setForm(EMPTY); setOpen(true); }}><Plus className="h-4 w-4 mr-1" /> New category</Button>
        </div>
      </div>

      {isLoading ? <Skeleton className="h-32 w-full" /> : (data ?? []).length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No categories yet.</CardContent></Card>
      ) : (
        <Card>
          <CardHeader><CardTitle className="text-base">All categories</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground border-b">
                <tr>
                  <th className="text-left py-2 px-3">Name</th>
                  <th className="text-left py-2 px-3">Slug</th>
                  <th className="text-left py-2 px-3">Parent</th>
                  <th className="text-right py-2 px-3">Order</th>
                  <th className="text-left py-2 px-3">Status</th>
                  <th className="text-right py-2 px-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(data ?? []).map((row) => (
                  <tr key={row.id} className="border-b last:border-0">
                    <td className="py-2 px-3 font-medium">{row.name}</td>
                    <td className="py-2 px-3 font-mono text-xs">{row.slug}</td>
                    <td className="py-2 px-3 text-muted-foreground">{parentName(row.parent_id) ?? "—"}</td>
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
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{form.id ? "Edit category" : "New category"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2"><Label className="text-xs">Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label className="text-xs">Slug (auto if blank)</Label><Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} /></div>
            <div><Label className="text-xs">Display order</Label><Input type="number" value={form.display_order} onChange={(e) => setForm({ ...form, display_order: Number(e.target.value) })} /></div>
            <div className="sm:col-span-2">
              <Label className="text-xs">Parent category</Label>
              <select value={form.parent_id ?? ""} onChange={(e) => setForm({ ...form, parent_id: e.target.value || null })} className="w-full text-sm rounded-md border border-input bg-background px-2 py-1.5">
                <option value="">— Top level —</option>
                {(data ?? []).filter(c => c.id !== form.id).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2"><Label className="text-xs">Description</Label><Textarea rows={2} value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
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
