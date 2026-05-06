import { useState } from "react";
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
import { useResources } from "@/hooks/useKnowledge";
import { useDeleteContent, useUpsertContent } from "@/hooks/useContentMutations";
import { marketplaceSlug } from "@/lib/marketplace";
import type { Resource, ResourceType } from "@/lib/knowledge";
import { DownloadReportButton, dateColumn, listColumn } from "@/components/admin/DownloadReportButton";

const TYPES: ResourceType[] = [
  "guide","standard","template","report","case_study","training_module","toolkit","dataset","presentation","other",
];
const AUDIENCES = ["institution","supplier","funder","researcher","public"];

type FormState = {
  id?: string;
  slug: string;
  title: string;
  resource_type: ResourceType;
  audience: string[];
  description: string;
  file_url: string;
  external_url: string;
  tags: string;
  requires_signin: boolean;
  is_published: boolean;
};

const EMPTY: FormState = {
  slug: "", title: "", resource_type: "guide", audience: [],
  description: "", file_url: "", external_url: "", tags: "",
  requires_signin: true, is_published: true,
};

export default function AdminResources() {
  const { data, isLoading } = useResources();
  const upsert = useUpsertContent({ table: "resources", invalidateKey: "resources" });
  const del = useDeleteContent({ table: "resources", invalidateKey: "resources" });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);

  const startEdit = (r: Resource) => {
    setForm({
      id: r.id, slug: r.slug, title: r.title, resource_type: r.resource_type,
      audience: r.audience, description: r.description ?? "",
      file_url: r.file_url ?? "", external_url: r.external_url ?? "",
      tags: r.tags.join(", "),
      requires_signin: r.requires_signin, is_published: r.is_published,
    });
    setOpen(true);
  };
  const startCreate = () => { setForm(EMPTY); setOpen(true); };

  const toggleAudience = (a: string) =>
    setForm((f) => ({
      ...f,
      audience: f.audience.includes(a) ? f.audience.filter((x) => x !== a) : [...f.audience, a],
    }));

  const handleSave = async () => {
    if (!form.title) { toast.error("Title is required."); return; }
    const slug = form.slug || marketplaceSlug(form.title);
    const tags = form.tags.split(",").map((t) => t.trim()).filter(Boolean);
    const values: Record<string, unknown> = {
      slug, title: form.title, resource_type: form.resource_type,
      audience: form.audience,
      description: form.description || null,
      file_url: form.file_url || null,
      external_url: form.external_url || null,
      tags,
      requires_signin: form.requires_signin,
      is_published: form.is_published,
      published_at: new Date().toISOString(),
    };
    try {
      await upsert.mutateAsync({ id: form.id, values });
      toast.success(form.id ? "Resource updated" : "Resource created");
      setOpen(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this resource?")) return;
    try { await del.mutateAsync({ id }); toast.success("Deleted"); }
    catch (err: unknown) { toast.error(err instanceof Error ? err.message : "Delete failed"); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <Library className="h-6 w-6 text-primary" /> Resources
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Library entries shown on /resources. Provide a file_url (Storage) or an external_url.
          </p>
        </div>
        <div className="flex gap-2">
          <DownloadReportButton
            rows={data ?? []}
            columns={[
              { key: "title", label: "Title" },
              { key: "resource_type", label: "Type" },
              listColumn("audience", "Audience"),
              { key: "description", label: "Description" },
              { key: "file_url", label: "File URL" },
              { key: "external_url", label: "External URL" },
              { key: "view_count", label: "Views" },
              { key: "download_count", label: "Downloads" },
              { key: "is_published", label: "Published" },
              { key: "requires_signin", label: "Sign-in Required" },
              listColumn("tags", "Tags"),
              dateColumn("published_at", "Published On"),
            ]}
            title="Resources"
            filename="resources"
          />
          <Button onClick={startCreate}><Plus className="h-4 w-4 mr-1" /> New resource</Button>
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : (data ?? []).length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No resources yet.</CardContent></Card>
      ) : (
        <Card>
          <CardHeader><CardTitle className="text-base">All resources</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground border-b">
                <tr>
                  <th className="text-left py-2 px-3">Title</th>
                  <th className="text-left py-2 px-3">Type</th>
                  <th className="text-left py-2 px-3">Audience</th>
                  <th className="text-right py-2 px-3">Downloads</th>
                  <th className="text-left py-2 px-3">Status</th>
                  <th className="text-right py-2 px-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(data ?? []).map((r) => (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="py-2 px-3 font-medium">{r.title}</td>
                    <td className="py-2 px-3 capitalize">{r.resource_type.replace("_", " ")}</td>
                    <td className="py-2 px-3 text-xs">{r.audience.join(", ") || "—"}</td>
                    <td className="py-2 px-3 text-right">{r.download_count}</td>
                    <td className="py-2 px-3"><Badge variant={r.is_published ? "secondary" : "outline"}>{r.is_published ? "Published" : "Hidden"}</Badge></td>
                    <td className="py-2 px-3 text-right">
                      <Button size="sm" variant="ghost" onClick={() => startEdit(r)}><Pencil className="h-3 w-3" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(r.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
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
          <DialogHeader><DialogTitle>{form.id ? "Edit resource" : "New resource"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div><Label className="text-xs">Slug</Label><Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="auto-generated" /></div>
            <div>
              <Label className="text-xs">Type</Label>
              <select value={form.resource_type} onChange={(e) => setForm({ ...form, resource_type: e.target.value as ResourceType })} className="w-full text-sm rounded-md border border-input bg-background px-2 py-1.5">
                {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-xs">Audience</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {AUDIENCES.map((a) => (
                  <button key={a} type="button" onClick={() => toggleAudience(a)}
                    className={`text-xs px-3 py-1.5 rounded-full border capitalize ${form.audience.includes(a) ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground"}`}>{a}</button>
                ))}
              </div>
            </div>
            <div><Label className="text-xs">Description</Label><Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div><Label className="text-xs">File URL (Storage public URL)</Label><Input value={form.file_url} onChange={(e) => setForm({ ...form, file_url: e.target.value })} /></div>
            <div><Label className="text-xs">External URL (alternative to file_url)</Label><Input value={form.external_url} onChange={(e) => setForm({ ...form, external_url: e.target.value })} /></div>
            <div><Label className="text-xs">Tags (comma-separated)</Label><Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} /></div>
            <div className="flex items-center gap-4 pt-2">
              <label className="inline-flex items-center gap-2 text-xs"><input type="checkbox" checked={form.requires_signin} onChange={(e) => setForm({ ...form, requires_signin: e.target.checked })} /> Requires sign-in to download</label>
              <label className="inline-flex items-center gap-2 text-xs"><input type="checkbox" checked={form.is_published} onChange={(e) => setForm({ ...form, is_published: e.target.checked })} /> Published</label>
            </div>
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
