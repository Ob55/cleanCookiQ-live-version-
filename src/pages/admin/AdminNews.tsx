import { useState } from "react";
import { Newspaper, Plus, Pencil, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useNews } from "@/hooks/useKnowledge";
import { useDeleteContent, useUpsertContent } from "@/hooks/useContentMutations";
import { marketplaceSlug } from "@/lib/marketplace";
import type { NewsArticle } from "@/lib/knowledge";

type FormState = {
  id?: string;
  slug: string;
  title: string;
  summary: string;
  body_markdown: string;
  hero_image_url: string;
  author_name: string;
  status: "draft" | "published" | "archived";
  tags: string;
};

const EMPTY: FormState = {
  slug: "", title: "", summary: "", body_markdown: "",
  hero_image_url: "", author_name: "", status: "draft", tags: "",
};

export default function AdminNews() {
  const { data, isLoading } = useNews();
  const upsert = useUpsertContent({ table: "news_articles", invalidateKey: "news_articles" });
  const del = useDeleteContent({ table: "news_articles", invalidateKey: "news_articles" });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);

  const startEdit = (a: NewsArticle) => {
    setForm({
      id: a.id, slug: a.slug, title: a.title,
      summary: a.summary ?? "",
      body_markdown: a.body_markdown ?? "",
      hero_image_url: a.hero_image_url ?? "",
      author_name: a.author_name ?? "",
      status: a.status,
      tags: a.tags.join(", "),
    });
    setOpen(true);
  };
  const startCreate = () => { setForm(EMPTY); setOpen(true); };

  const handleSave = async () => {
    if (!form.title) { toast.error("Title is required."); return; }
    const slug = form.slug || marketplaceSlug(form.title);
    const tags = form.tags.split(",").map((t) => t.trim()).filter(Boolean);
    const values: Record<string, unknown> = {
      slug,
      title: form.title,
      summary: form.summary || null,
      body_markdown: form.body_markdown || null,
      hero_image_url: form.hero_image_url || null,
      author_name: form.author_name || null,
      status: form.status,
      tags,
      published_at: form.status === "published" ? new Date().toISOString() : null,
    };
    try {
      await upsert.mutateAsync({ id: form.id, values });
      toast.success(form.id ? "Article updated" : "Article created");
      setOpen(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this article?")) return;
    try { await del.mutateAsync({ id }); toast.success("Deleted"); }
    catch (err: unknown) { toast.error(err instanceof Error ? err.message : "Delete failed"); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <Newspaper className="h-6 w-6 text-primary" /> News articles
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Editorial content shown on the public /news page when status = published.
          </p>
        </div>
        <Button onClick={startCreate}><Plus className="h-4 w-4 mr-1" /> New article</Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : (data ?? []).length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No articles yet.</CardContent></Card>
      ) : (
        <Card>
          <CardHeader><CardTitle className="text-base">All articles</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground border-b">
                <tr>
                  <th className="text-left py-2 px-3">Title</th>
                  <th className="text-left py-2 px-3">Author</th>
                  <th className="text-left py-2 px-3">Status</th>
                  <th className="text-left py-2 px-3">Published</th>
                  <th className="text-right py-2 px-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(data ?? []).map((a) => (
                  <tr key={a.id} className="border-b last:border-0">
                    <td className="py-2 px-3 font-medium">{a.title}</td>
                    <td className="py-2 px-3 text-muted-foreground">{a.author_name ?? "—"}</td>
                    <td className="py-2 px-3"><Badge variant="outline" className="capitalize">{a.status}</Badge></td>
                    <td className="py-2 px-3 text-xs">{a.published_at ? new Date(a.published_at).toLocaleDateString() : "—"}</td>
                    <td className="py-2 px-3 text-right">
                      <Button size="sm" variant="ghost" onClick={() => startEdit(a)}><Pencil className="h-3 w-3" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(a.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
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
          <DialogHeader><DialogTitle>{form.id ? "Edit article" : "New article"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div><Label className="text-xs">Slug</Label><Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="auto-generated" /></div>
            <div><Label className="text-xs">Author</Label><Input value={form.author_name} onChange={(e) => setForm({ ...form, author_name: e.target.value })} /></div>
            <div><Label className="text-xs">Hero image URL</Label><Input value={form.hero_image_url} onChange={(e) => setForm({ ...form, hero_image_url: e.target.value })} /></div>
            <div><Label className="text-xs">Summary (1-2 sentences)</Label><Textarea rows={2} value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} /></div>
            <div><Label className="text-xs">Body (Markdown)</Label><Textarea rows={8} value={form.body_markdown} onChange={(e) => setForm({ ...form, body_markdown: e.target.value })} /></div>
            <div><Label className="text-xs">Tags (comma-separated)</Label><Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="lpg, schools, financing" /></div>
            <div>
              <Label className="text-xs">Status</Label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as FormState["status"] })} className="w-full text-sm rounded-md border border-input bg-background px-2 py-1.5">
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
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
