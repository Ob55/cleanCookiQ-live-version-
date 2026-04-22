import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ClipboardCheck, Loader2, Eye, Check } from "lucide-react";
import { useState } from "react";

export default function AssessmentQueue() {
  const queryClient = useQueryClient();
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");

  // Fetch assessments from the assessments table
  const { data: assessments } = useQuery({
    queryKey: ["admin-assessments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assessments")
        .select("*, institutions(name, county, institution_type)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  // Fetch institutions that have been assessed (pipeline_stage = assessed/scored)
  // and don't already have an entry in the assessments table
  const { data: assessedInstitutions, isLoading } = useQuery({
    queryKey: ["assessed-institutions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("institutions")
        .select("id, name, county, institution_type, pipeline_stage, assessment_score, updated_at, created_at")
        .in("pipeline_stage", ["assessed", "scored"])
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: string; notes?: string }) => {
      const { error } = await supabase.from("assessments").update({
        status: status as any,
        reviewer_notes: notes || null,
        reviewed_at: new Date().toISOString(),
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Assessment updated");
      setReviewingId(null);
      setReviewNotes("");
      queryClient.invalidateQueries({ queryKey: ["admin-assessments"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  // IDs of institutions already in assessments table
  const assessedIds = new Set(assessments?.map(a => a.institution_id));

  // Institutions assessed via pipeline but not yet in the assessments table
  const pipelineAssessed = (assessedInstitutions ?? []).filter(i => !assessedIds.has(i.id));

  // Merge: formal assessment records + pipeline-assessed institutions
  const combined: Array<{
    id: string;
    source: "assessment" | "pipeline";
    name: string;
    county: string;
    institution_type: string;
    status: string;
    submitted_at: string | null;
    reviewer_notes: string | null;
    pipeline_stage?: string;
    assessment_score?: number | null;
    cooking_patterns?: any;
    energy_consumption?: any;
    infrastructure_condition?: any;
  }> = [
    ...(assessments ?? []).map(a => ({
      id: a.id,
      source: "assessment" as const,
      name: (a as any).institutions?.name ?? "Unknown",
      county: (a as any).institutions?.county ?? "—",
      institution_type: (a as any).institutions?.institution_type ?? "",
      status: a.status,
      submitted_at: a.submitted_at,
      reviewer_notes: a.reviewer_notes,
      cooking_patterns: a.cooking_patterns,
      energy_consumption: a.energy_consumption,
      infrastructure_condition: a.infrastructure_condition,
    })),
    ...pipelineAssessed.map(i => ({
      id: i.id,
      source: "pipeline" as const,
      name: i.name,
      county: i.county ?? "—",
      institution_type: i.institution_type ?? "",
      status: "submitted",
      submitted_at: i.updated_at ?? i.created_at,
      reviewer_notes: null,
      pipeline_stage: i.pipeline_stage,
      assessment_score: i.assessment_score,
    })),
  ];

  const filtered = combined.filter(a =>
    filterStatus === "all" || a.status === filterStatus
  );

  const statusColors: Record<string, string> = {
    draft: "bg-muted text-muted-foreground",
    submitted: "bg-amber-500/20 text-amber-600",
    reviewed: "bg-blue-500/20 text-blue-600",
    approved: "bg-primary/20 text-primary",
  };

  const counts = {
    all: combined.length,
    submitted: combined.filter(a => a.status === "submitted").length,
    reviewed: combined.filter(a => a.status === "reviewed").length,
    approved: combined.filter(a => a.status === "approved").length,
  };

  const reviewing = combined.find(a => a.id === reviewingId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">Assessment Review Queue</h1>
        <p className="text-sm text-muted-foreground">Review and approve institution assessments</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total", value: counts.all, color: "bg-card" },
          { label: "Pending Review", value: counts.submitted, color: "bg-amber-500/10" },
          { label: "Reviewed", value: counts.reviewed, color: "bg-blue-500/10" },
          { label: "Approved", value: counts.approved, color: "bg-primary/10" },
        ].map(s => (
          <div key={s.label} className={`${s.color} border border-border rounded-xl p-4`}>
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className="text-2xl font-bold mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="submitted">Submitted</SelectItem>
            <SelectItem value="reviewed">Reviewed</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-card">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left text-xs font-medium text-muted-foreground p-3">Institution</th>
                <th className="text-left text-xs font-medium text-muted-foreground p-3">County</th>
                <th className="text-left text-xs font-medium text-muted-foreground p-3">Status</th>
                <th className="text-left text-xs font-medium text-muted-foreground p-3">Score</th>
                <th className="text-left text-xs font-medium text-muted-foreground p-3">Assessed</th>
                <th className="text-left text-xs font-medium text-muted-foreground p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(a => (
                <tr key={a.id} className="border-b border-border/50 hover:bg-muted/30">
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <ClipboardCheck className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{a.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">{a.institution_type}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-3 text-sm">{a.county}</td>
                  <td className="p-3">
                    <Badge variant="secondary" className={statusColors[a.status] || ""}>{a.status}</Badge>
                  </td>
                  <td className="p-3 text-sm">
                    {(a as any).assessment_score != null
                      ? <span className="font-medium text-primary">{(a as any).assessment_score}</span>
                      : "—"}
                  </td>
                  <td className="p-3 text-sm text-muted-foreground">
                    {a.submitted_at ? new Date(a.submitted_at).toLocaleDateString() : "—"}
                  </td>
                  <td className="p-3">
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => { setReviewingId(a.id); setReviewNotes(a.reviewer_notes || ""); }}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      {a.status === "submitted" && a.source === "assessment" && (
                        <Button size="sm" variant="ghost" onClick={() => updateStatus.mutate({ id: a.id, status: "approved" })}>
                          <Check className="h-4 w-4 text-primary" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!filtered.length && (
                <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No assessments found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Review Dialog */}
      <Dialog open={!!reviewingId} onOpenChange={() => setReviewingId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Review Assessment</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {reviewing && (
              <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
                <p><span className="font-medium">Institution:</span> {reviewing.name}</p>
                <p><span className="font-medium">County:</span> {reviewing.county}</p>
                {(reviewing as any).assessment_score != null && (
                  <p><span className="font-medium">Assessment Score:</span> {(reviewing as any).assessment_score}</p>
                )}
                {(reviewing as any).pipeline_stage && (
                  <p><span className="font-medium">Pipeline Stage:</span> {(reviewing as any).pipeline_stage}</p>
                )}
                {reviewing.source === "assessment" && (
                  <>
                    <p><span className="font-medium">Cooking Patterns:</span> {JSON.stringify(reviewing.cooking_patterns || {}).slice(0, 100)}</p>
                    <p><span className="font-medium">Energy:</span> {JSON.stringify(reviewing.energy_consumption || {}).slice(0, 100)}</p>
                    <p><span className="font-medium">Infrastructure:</span> {JSON.stringify(reviewing.infrastructure_condition || {}).slice(0, 100)}</p>
                  </>
                )}
              </div>
            )}
            {reviewing?.source === "assessment" && (
              <>
                <div>
                  <p className="text-sm font-medium mb-1">Reviewer Notes</p>
                  <Textarea value={reviewNotes} onChange={e => setReviewNotes(e.target.value)} placeholder="Add review notes..." />
                </div>
                <div className="flex gap-2">
                  <Button className="flex-1" onClick={() => updateStatus.mutate({ id: reviewingId!, status: "approved", notes: reviewNotes })}>
                    <Check className="h-4 w-4 mr-2" /> Approve
                  </Button>
                  <Button variant="destructive" className="flex-1" onClick={() => updateStatus.mutate({ id: reviewingId!, status: "reviewed", notes: reviewNotes })}>
                    Request Changes
                  </Button>
                </div>
              </>
            )}
            {reviewing?.source === "pipeline" && (
              <p className="text-xs text-muted-foreground">This institution was assessed via the field pipeline. Open the institution profile to take further action.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
