import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Flag, Plus, Pencil, Trash2, CheckCircle2, Circle, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { sbAny as supabase } from "@/lib/sbAny";

type Milestone = {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  completed_at: string | null;
  status: string;
  sort_order: number;
};

type FormState = {
  id?: string;
  title: string;
  description: string;
  due_date: string;
  status: string;
  sort_order: number;
};

const EMPTY: FormState = {
  title: "", description: "", due_date: "",
  status: "pending", sort_order: 0,
};

const STATUSES = ["pending", "in_progress", "completed", "blocked", "cancelled"] as const;

export default function ProjectMilestonesSection({ projectId }: { projectId: string | null | undefined }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);

  const { data, isLoading } = useQuery({
    queryKey: ["project-milestones", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_milestones")
        .select("*")
        .eq("project_id", projectId)
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as Milestone[];
    },
  });

  const upsert = useMutation({
    mutationFn: async (values: FormState) => {
      const payload = {
        project_id: projectId,
        title: values.title,
        description: values.description || null,
        due_date: values.due_date || null,
        status: values.status,
        sort_order: values.sort_order,
        ...(values.status === "completed" ? { completed_at: new Date().toISOString() } : { completed_at: null }),
      };
      if (values.id) {
        const { error } = await supabase.from("project_milestones").update(payload).eq("id", values.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("project_milestones").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["project-milestones", projectId] }),
  });

  const toggleComplete = useMutation({
    mutationFn: async (m: Milestone) => {
      const isDone = m.status === "completed";
      const { error } = await supabase.from("project_milestones").update({
        status: isDone ? "pending" : "completed",
        completed_at: isDone ? null : new Date().toISOString(),
      }).eq("id", m.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["project-milestones", projectId] }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("project_milestones").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["project-milestones", projectId] }),
  });

  if (!projectId) return null;

  const startEdit = (m: Milestone) => {
    setForm({
      id: m.id, title: m.title,
      description: m.description ?? "",
      due_date: m.due_date ?? "",
      status: m.status,
      sort_order: m.sort_order,
    });
    setOpen(true);
  };

  const startCreate = () => {
    const nextOrder = data && data.length ? Math.max(...data.map(m => m.sort_order)) + 10 : 10;
    setForm({ ...EMPTY, sort_order: nextOrder });
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error("Title is required"); return; }
    try {
      await upsert.mutateAsync(form);
      toast.success(form.id ? "Milestone updated" : "Milestone added");
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this milestone?")) return;
    try { await del.mutateAsync(id); toast.success("Deleted"); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Delete failed"); }
  };

  const completed = (data ?? []).filter(m => m.status === "completed").length;
  const total = data?.length ?? 0;

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-2">
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            <Flag className="h-5 w-5 text-primary" /> Project milestones
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">{completed} / {total} complete</p>
        </div>
        <Button size="sm" onClick={startCreate}><Plus className="h-3 w-3 mr-1" /> Add</Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : total === 0 ? (
          <p className="text-sm text-muted-foreground italic">No milestones yet. Add one to track project delivery progress.</p>
        ) : (
          <ul className="space-y-2">
            {(data ?? []).map(m => (
              <li key={m.id} className="flex items-start gap-3 p-2 rounded-lg border border-border">
                <button onClick={() => toggleComplete.mutate(m)} className="mt-0.5 shrink-0" title="Toggle complete">
                  {m.status === "completed"
                    ? <CheckCircle2 className="h-4 w-4 text-primary" />
                    : <Circle className="h-4 w-4 text-muted-foreground" />}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-sm font-medium ${m.status === "completed" ? "line-through text-muted-foreground" : ""}`}>
                      {m.title}
                    </span>
                    {m.status !== "pending" && m.status !== "completed" && (
                      <Badge variant="outline" className="text-[10px] capitalize">{m.status.replace("_", " ")}</Badge>
                    )}
                  </div>
                  {m.description && <p className="text-xs text-muted-foreground mt-0.5">{m.description}</p>}
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {m.due_date ? `Due ${m.due_date}` : "No due date"}
                    {m.completed_at && ` · Completed ${new Date(m.completed_at).toLocaleDateString()}`}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="ghost" onClick={() => startEdit(m)}><Pencil className="h-3 w-3" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(m.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{form.id ? "Edit milestone" : "New milestone"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2"><Label className="text-xs">Title *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div className="sm:col-span-2"><Label className="text-xs">Description</Label><Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div><Label className="text-xs">Due date</Label><Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></div>
            <div>
              <Label className="text-xs">Status</Label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full text-sm rounded-md border border-input bg-background px-2 py-1.5">
                {STATUSES.map(s => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2"><Label className="text-xs">Sort order</Label><Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={upsert.isPending}>{upsert.isPending ? "Saving..." : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
