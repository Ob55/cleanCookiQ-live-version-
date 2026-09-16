import { Link } from "react-router-dom";
import { usePrograms, useDeleteProgramme } from "@/hooks/usePrograms";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { FolderKanban, Loader2, Building2, Users, Trash2, FileUp } from "lucide-react";
import { lazy, Suspense, useState } from "react";
import { DownloadReportButton, dateColumn } from "@/components/admin/DownloadReportButton";

// Lazy so the heavy xlsx parser only loads when an admin actually opens the
// "New from file" flow, not on every Programmes-list visit.
const NewProgrammeFromFileDialog = lazy(() => import("@/components/programme/NewProgrammeFromFileDialog"));

const programmeStatusColors: Record<string, string> = {
  planning: "bg-muted text-muted-foreground",
  procurement: "bg-blue-100 text-blue-700",
  active: "bg-green-100 text-green-700",
  completed: "bg-emerald-100 text-emerald-800",
};

export default function ProgramManagement() {
  const { data: programmes, isLoading } = usePrograms();
  const deleteProgramme = useDeleteProgramme();
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string; institutionCount: number } | null>(null);
  const [showFromFile, setShowFromFile] = useState(false);

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
          <Button onClick={() => setShowFromFile(true)}>
            <FileUp className="h-4 w-4 mr-2" /> New from file
          </Button>
          {showFromFile && (
            <Suspense fallback={null}>
              <NewProgrammeFromFileDialog open={showFromFile} onOpenChange={setShowFromFile} />
            </Suspense>
          )}
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
                  setPendingDelete({ id: p.id, name: p.name, institutionCount: p.institution_count ?? 0 });
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
              This permanently deletes the programme, its members, budget items and suppliers, and
              {" "}<strong>all {(pendingDelete?.institutionCount ?? 0).toLocaleString()} of its institutions</strong>
              {" "}together with their assessments, deliveries, applications and related records.
              This cannot be undone.
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
