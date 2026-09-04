import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePrograms, useDeleteProgramme } from "@/hooks/usePrograms";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { FolderKanban, Loader2, Plus, Building2, Users, Trash2 } from "lucide-react";
import { useState } from "react";
import { DownloadReportButton, dateColumn } from "@/components/admin/DownloadReportButton";

const programmeStatusColors: Record<string, string> = {
  planning: "bg-muted text-muted-foreground",
  procurement: "bg-blue-100 text-blue-700",
  active: "bg-green-100 text-green-700",
  completed: "bg-emerald-100 text-emerald-800",
};

export default function ProgramManagement() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: programmes, isLoading } = usePrograms();
  const deleteProgramme = useDeleteProgramme();
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);
  const [showAddProgramme, setShowAddProgramme] = useState(false);
  const [newProgramme, setNewProgramme] = useState({
    name: "",
    description: "",
    target_institution_count: "",
    total_budget_ksh: "",
    institution_name: "",
    institution_county: "",
  });

  const createProgramme = useMutation({
    mutationFn: async () => {
      const { data: created, error } = await supabase.from("programmes").insert({
        name: newProgramme.name,
        description: newProgramme.description,
        programme_manager_id: user?.id,
        target_institution_count: parseInt(newProgramme.target_institution_count) || 0,
        total_budget_ksh: parseFloat(newProgramme.total_budget_ksh) || 0,
      }).select("id").single();
      if (error) throw error;

      // Optionally seed the project with a first institution, linked to it.
      const instName = newProgramme.institution_name.trim();
      if (instName && created?.id) {
        const { error: instErr } = await supabase.from("institutions").insert({
          name: instName,
          county: newProgramme.institution_county.trim() || "Unspecified",
          created_by: user?.id,
          programme_id: created.id,
        } as never);
        if (instErr) throw instErr;
      }
    },
    onSuccess: () => {
      toast.success("Programme created");
      setShowAddProgramme(false);
      setNewProgramme({ name: "", description: "", target_institution_count: "", total_budget_ksh: "", institution_name: "", institution_county: "" });
      queryClient.invalidateQueries({ queryKey: ["programmes_overview"] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Failed to create programme"),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <FolderKanban className="h-6 w-6 text-primary" /> Programmes
          </h1>
          <p className="text-sm text-muted-foreground">
            Programmes &amp; advisory engagements — each is a scoped tenant with its own members, institutions and pipeline
          </p>
        </div>
        <div className="flex gap-2">
          <DownloadReportButton
            rows={programmes ?? []}
            columns={[
              { key: "name", label: "Programme" },
              { key: "description", label: "Description" },
              { key: "status", label: "Status" },
              { key: "institution_count", label: "Institutions" },
              { key: "member_count", label: "Members" },
              { key: "total_budget_ksh", label: "Budget (KSh)" },
              dateColumn("created_at", "Created"),
            ]}
            title="Programmes"
            filename="programmes"
          />
          <Dialog open={showAddProgramme} onOpenChange={setShowAddProgramme}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" /> New Programme</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create Programme</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Programme Name *</Label>
                  <Input value={newProgramme.name} onChange={e => setNewProgramme(p => ({ ...p, name: e.target.value }))} className="mt-1" placeholder="e.g. IRENA – Taita Taveta" />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea value={newProgramme.description} onChange={e => setNewProgramme(p => ({ ...p, description: e.target.value }))} className="mt-1" />
                </div>
                <div>
                  <Label>Target Institutions</Label>
                  <Input type="number" value={newProgramme.target_institution_count} onChange={e => setNewProgramme(p => ({ ...p, target_institution_count: e.target.value }))} className="mt-1" />
                </div>
                <div className="border-t border-border pt-3">
                  <Label className="text-xs uppercase tracking-wide text-muted-foreground">First institution (optional)</Label>
                  <div className="grid grid-cols-2 gap-3 mt-1">
                    <Input placeholder="Institution name" value={newProgramme.institution_name} onChange={e => setNewProgramme(p => ({ ...p, institution_name: e.target.value }))} />
                    <Input placeholder="County" value={newProgramme.institution_county} onChange={e => setNewProgramme(p => ({ ...p, institution_county: e.target.value }))} />
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">Adds one institution to this programme's pipeline. You can add more later.</p>
                </div>
                <Button onClick={() => createProgramme.mutate()} disabled={!newProgramme.name || createProgramme.isPending} className="w-full">
                  {createProgramme.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Create Programme
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : !programmes?.length ? (
        <div className="flex items-center justify-center h-48 bg-card border border-dashed border-border rounded-xl">
          <p className="text-sm text-muted-foreground">No programmes yet — create one to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {programmes.map(p => (
            <Link
              key={p.id}
              to={`/admin/programmes/${p.id}`}
              className="group relative bg-card border border-border rounded-xl p-5 shadow-card hover:border-primary/40 transition-colors"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <p className="font-medium leading-tight pr-6">{p.name}</p>
                <Badge className={`text-[10px] shrink-0 ${programmeStatusColors[p.status] ?? ""}`}>{p.status}</Badge>
              </div>
              {p.description && <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{p.description}</p>}
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Building2 className="h-3.5 w-3.5" />{p.institution_count} inst.</span>
                <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{p.member_count} members</span>
              </div>
              <button
                type="button"
                title="Delete programme"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setPendingDelete({ id: p.id, name: p.name });
                }}
                className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </Link>
          ))}
        </div>
      )}

      <AlertDialog open={!!pendingDelete} onOpenChange={(o) => { if (!o) setPendingDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{pendingDelete?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes the programme and its members, budget items and suppliers.
              Institutions assigned to it are kept, but unassigned from the programme. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (!pendingDelete) return;
                const id = pendingDelete.id;
                deleteProgramme.mutate(id, {
                  onSuccess: () => toast.success("Programme deleted"),
                  onError: (err: unknown) => toast.error(err instanceof Error ? err.message : "Failed to delete programme"),
                });
                setPendingDelete(null);
              }}
            >
              Delete programme
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
