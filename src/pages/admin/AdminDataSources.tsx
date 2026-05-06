import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Library, Plus, Pencil, Trash2 } from "lucide-react";
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
import { DownloadReportButton, dateColumn } from "@/components/admin/DownloadReportButton";

type DataSource = {
  id: string;
  slug: string;
  title: string;
  publisher: string | null;
  authors: string | null;
  published_date: string | null;
  accessed_date: string;
  url: string | null;
  document_url: string | null;
  methodology_notes: string | null;
  confidence_level: "high" | "medium" | "modeled" | "preliminary";
  geographic_scope: string | null;
  validity_until: string | null;
  is_active: boolean;
};

type FormState = Omit<DataSource, "id"> & { id?: string };

const EMPTY: FormState = {
  slug: "", title: "", publisher: "", authors: "",
  published_date: "", accessed_date: new Date().toISOString().slice(0, 10),
  url: "", document_url: "", methodology_notes: "",
  confidence_level: "medium", geographic_scope: "", validity_until: "",
  is_active: true,
};

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 64);

export default function AdminDataSources() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-data-sources"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("data_sources")
        .select("*")
        .order("title");
      if (error) throw error;
      return (data ?? []) as DataSource[];
    },
  });

  const upsert = useMutation({
    mutationFn: async (values: FormState) => {
      const payload = {
        slug: values.slug || slugify(values.title),
        title: values.title,
        publisher: values.publisher || null,
        authors: values.authors || null,
        published_date: values.published_date || null,
        accessed_date: values.accessed_date,
        url: values.url || null,
        document_url: values.document_url || null,
        methodology_notes: values.methodology_notes || null,
        confidence_level: values.confidence_level,
        geographic_scope: values.geographic_scope || null,
        validity_until: values.validity_until || null,
        is_active: values.is_active,
      };
      if (values.id) {
        const { error } = await supabase.from("data_sources").update(payload).eq("id", values.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("data_sources").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-data-sources"] });
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("data_sources").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-data-sources"] }),
  });

  const startEdit = (row: DataSource) => {
    setForm({
      id: row.id,
      slug: row.slug,
      title: row.title,
      publisher: row.publisher ?? "",
      authors: row.authors ?? "",
      published_date: row.published_date ?? "",
      accessed_date: row.accessed_date,
      url: row.url ?? "",
      document_url: row.document_url ?? "",
      methodology_notes: row.methodology_notes ?? "",
      confidence_level: row.confidence_level,
      geographic_scope: row.geographic_scope ?? "",
      validity_until: row.validity_until ?? "",
      is_active: row.is_active,
    });
    setOpen(true);
  };

  const startCreate = () => { setForm(EMPTY); setOpen(true); };

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error("Title is required"); return; }
    try {
      await upsert.mutateAsync(form);
      toast.success(form.id ? "Source updated" : "Source created");
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this source? Data points referencing it will block deletion.")) return;
    try {
      await del.mutateAsync(id);
      toast.success("Source deleted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <Library className="h-6 w-6 text-primary" /> Data Sources
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Citable references (EPRA, IPCC, FAO, CCA benchmarks) backing every data point on the platform.
          </p>
        </div>
        <div className="flex gap-2">
          <DownloadReportButton
            rows={data ?? []}
            columns={[
              { key: "title", label: "Title" },
              { key: "slug", label: "Slug" },
              { key: "publisher", label: "Publisher" },
              { key: "authors", label: "Authors" },
              { key: "confidence_level", label: "Confidence" },
              { key: "geographic_scope", label: "Scope" },
              dateColumn("published_date", "Published"),
              dateColumn("accessed_date", "Accessed"),
              dateColumn("validity_until", "Valid Until"),
              { key: "url", label: "URL" },
              { key: "document_url", label: "Document URL" },
              { key: "is_active", label: "Active" },
            ]}
            title="Data Sources"
            filename="data-sources"
          />
          <Button onClick={startCreate}><Plus className="h-4 w-4 mr-1" /> New source</Button>
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : (data ?? []).length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No data sources yet.</CardContent></Card>
      ) : (
        <Card>
          <CardHeader><CardTitle className="text-base">All sources</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground border-b">
                <tr>
                  <th className="text-left py-2 px-3">Title</th>
                  <th className="text-left py-2 px-3">Publisher</th>
                  <th className="text-left py-2 px-3">Confidence</th>
                  <th className="text-left py-2 px-3">Scope</th>
                  <th className="text-left py-2 px-3">Accessed</th>
                  <th className="text-left py-2 px-3">Status</th>
                  <th className="text-right py-2 px-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(data ?? []).map((row) => (
                  <tr key={row.id} className="border-b last:border-0">
                    <td className="py-2 px-3">
                      <div className="font-medium">{row.title}</div>
                      <div className="text-xs text-muted-foreground">{row.slug}</div>
                    </td>
                    <td className="py-2 px-3">{row.publisher ?? "—"}</td>
                    <td className="py-2 px-3"><Badge variant="outline" className="capitalize">{row.confidence_level}</Badge></td>
                    <td className="py-2 px-3 text-muted-foreground">{row.geographic_scope ?? "—"}</td>
                    <td className="py-2 px-3">{row.accessed_date}</td>
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
          <DialogHeader><DialogTitle>{form.id ? "Edit data source" : "New data source"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[70vh] overflow-y-auto pr-1">
            <div className="sm:col-span-2"><Label className="text-xs">Title *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div><Label className="text-xs">Slug (auto if blank)</Label><Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="auto-generated" /></div>
            <div>
              <Label className="text-xs">Confidence level</Label>
              <select value={form.confidence_level} onChange={(e) => setForm({ ...form, confidence_level: e.target.value as FormState["confidence_level"] })} className="w-full text-sm rounded-md border border-input bg-background px-2 py-1.5">
                {(["high", "medium", "modeled", "preliminary"] as const).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div><Label className="text-xs">Publisher</Label><Input value={form.publisher ?? ""} onChange={(e) => setForm({ ...form, publisher: e.target.value })} placeholder="e.g. EPRA, IPCC" /></div>
            <div><Label className="text-xs">Authors</Label><Input value={form.authors ?? ""} onChange={(e) => setForm({ ...form, authors: e.target.value })} /></div>
            <div><Label className="text-xs">Published date</Label><Input type="date" value={form.published_date ?? ""} onChange={(e) => setForm({ ...form, published_date: e.target.value })} /></div>
            <div><Label className="text-xs">Accessed date *</Label><Input type="date" value={form.accessed_date} onChange={(e) => setForm({ ...form, accessed_date: e.target.value })} /></div>
            <div><Label className="text-xs">Validity until</Label><Input type="date" value={form.validity_until ?? ""} onChange={(e) => setForm({ ...form, validity_until: e.target.value })} /></div>
            <div><Label className="text-xs">Geographic scope</Label><Input value={form.geographic_scope ?? ""} onChange={(e) => setForm({ ...form, geographic_scope: e.target.value })} placeholder="Kenya / East Africa / Global" /></div>
            <div className="sm:col-span-2"><Label className="text-xs">Source URL</Label><Input type="url" value={form.url ?? ""} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://..." /></div>
            <div className="sm:col-span-2"><Label className="text-xs">Document URL (PDF/file)</Label><Input type="url" value={form.document_url ?? ""} onChange={(e) => setForm({ ...form, document_url: e.target.value })} /></div>
            <div className="sm:col-span-2"><Label className="text-xs">Methodology notes</Label><Textarea rows={3} value={form.methodology_notes ?? ""} onChange={(e) => setForm({ ...form, methodology_notes: e.target.value })} /></div>
            <label className="sm:col-span-2 flex items-center gap-2 text-xs text-muted-foreground">
              <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
              Active (available for citation)
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
