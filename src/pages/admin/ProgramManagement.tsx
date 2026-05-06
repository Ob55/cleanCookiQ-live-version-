import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { FolderKanban, Loader2, Plus, FileText, CheckCircle, XCircle } from "lucide-react";
import { useState } from "react";
import { DownloadReportButton, dateColumn } from "@/components/admin/DownloadReportButton";

const programmeStatusColors: Record<string, string> = {
  planning: "bg-muted text-muted-foreground",
  procurement: "bg-blue-100 text-blue-700",
  active: "bg-green-100 text-green-700",
  completed: "bg-emerald-100 text-emerald-800",
};

const rfqStatusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  published: "bg-blue-100 text-blue-700",
  closed: "bg-amber-100 text-amber-700",
  awarded: "bg-green-100 text-green-700",
};

export default function ProgramManagement() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showAddProgramme, setShowAddProgramme] = useState(false);
  const [showAddRfq, setShowAddRfq] = useState(false);
  const [selectedProgramme, setSelectedProgramme] = useState<string | null>(null);
  const [newProgramme, setNewProgramme] = useState({ name: "", description: "", target_institution_count: "", total_budget_ksh: "" });
  const [newRfq, setNewRfq] = useState({ title: "", scope_description: "", submission_deadline: "" });

  const { data: programmes, isLoading } = useQuery({
    queryKey: ["programmes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("programmes").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: rfqs } = useQuery({
    queryKey: ["rfqs", selectedProgramme],
    queryFn: async () => {
      if (!selectedProgramme) return [];
      const { data, error } = await supabase
        .from("procurement_rfqs")
        .select("*, rfq_responses(*, providers(name))")
        .eq("programme_id", selectedProgramme)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!selectedProgramme,
  });

  const createProgramme = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("programmes").insert({
        name: newProgramme.name,
        description: newProgramme.description,
        programme_manager_id: user?.id,
        target_institution_count: parseInt(newProgramme.target_institution_count) || 0,
        total_budget_ksh: parseFloat(newProgramme.total_budget_ksh) || 0,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Programme created");
      setShowAddProgramme(false);
      setNewProgramme({ name: "", description: "", target_institution_count: "", total_budget_ksh: "" });
      queryClient.invalidateQueries({ queryKey: ["programmes"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const createRfq = useMutation({
    mutationFn: async () => {
      if (!selectedProgramme) return;
      const { error } = await supabase.from("procurement_rfqs").insert({
        programme_id: selectedProgramme,
        title: newRfq.title,
        scope_description: newRfq.scope_description,
        submission_deadline: newRfq.submission_deadline || null,
        status: "draft" as any,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("RFQ created");
      setShowAddRfq(false);
      setNewRfq({ title: "", scope_description: "", submission_deadline: "" });
      queryClient.invalidateQueries({ queryKey: ["rfqs"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const publishRfq = useMutation({
    mutationFn: async (rfqId: string) => {
      const { error } = await supabase.from("procurement_rfqs").update({
        status: "published" as any,
        published_at: new Date().toISOString(),
      }).eq("id", rfqId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("RFQ published");
      queryClient.invalidateQueries({ queryKey: ["rfqs"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateResponseStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("rfq_responses").update({ status: status as any }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Response status updated");
      queryClient.invalidateQueries({ queryKey: ["rfqs"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <FolderKanban className="h-6 w-6 text-primary" /> Program Management
          </h1>
          <p className="text-sm text-muted-foreground">Manage programmes, procurement RFQs, and provider responses</p>
        </div>
        <div className="flex gap-2">
          <DownloadReportButton
            rows={programmes ?? []}
            columns={[
              { key: "name", label: "Programme" },
              { key: "description", label: "Description" },
              { key: "status", label: "Status" },
              { key: "target_institution_count", label: "Target Institutions" },
              { key: "total_budget_ksh", label: "Budget (KSh)" },
              dateColumn("created_at", "Created"),
            ]}
            title="Programmes"
            filename="programmes"
          />
          <Dialog open={showAddProgramme} onOpenChange={setShowAddProgramme}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" /> New Programme</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Programme</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Programme Name *</Label><Input value={newProgramme.name} onChange={e => setNewProgramme(p => ({ ...p, name: e.target.value }))} className="mt-1" /></div>
              <div><Label>Description</Label><Textarea value={newProgramme.description} onChange={e => setNewProgramme(p => ({ ...p, description: e.target.value }))} className="mt-1" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Target Institutions</Label><Input type="number" value={newProgramme.target_institution_count} onChange={e => setNewProgramme(p => ({ ...p, target_institution_count: e.target.value }))} className="mt-1" /></div>
                <div><Label>Budget (KSh)</Label><Input type="number" value={newProgramme.total_budget_ksh} onChange={e => setNewProgramme(p => ({ ...p, total_budget_ksh: e.target.value }))} className="mt-1" /></div>
              </div>
              <Button onClick={() => createProgramme.mutate()} disabled={!newProgramme.name || createProgramme.isPending} className="w-full">
                {createProgramme.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Create Programme
              </Button>
            </div>
          </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Programme List */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Programmes</h3>
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : (
            programmes?.map(p => (
              <button
                key={p.id}
                onClick={() => setSelectedProgramme(p.id)}
                className={`w-full text-left bg-card border rounded-lg p-4 shadow-card transition-colors ${
                  selectedProgramme === p.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium">{p.name}</p>
                  <Badge className={`text-[10px] ${programmeStatusColors[p.status]}`}>{p.status}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{p.target_institution_count} institutions · KSh {Number(p.total_budget_ksh).toLocaleString()}</p>
              </button>
            ))
          )}
          {!isLoading && !programmes?.length && (
            <p className="text-sm text-muted-foreground text-center py-4">No programmes yet</p>
          )}
        </div>

        {/* RFQ & Responses */}
        <div className="lg:col-span-2">
          {selectedProgramme ? (
            <Tabs defaultValue="rfqs">
              <div className="flex items-center justify-between mb-4">
                <TabsList>
                  <TabsTrigger value="rfqs">RFQs</TabsTrigger>
                  <TabsTrigger value="responses">Responses</TabsTrigger>
                </TabsList>
                <Dialog open={showAddRfq} onOpenChange={setShowAddRfq}>
                  <DialogTrigger asChild><Button size="sm"><Plus className="h-3 w-3 mr-1" /> Create RFQ</Button></DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Create RFQ</DialogTitle></DialogHeader>
                    <div className="space-y-3">
                      <div><Label>Title *</Label><Input value={newRfq.title} onChange={e => setNewRfq(r => ({ ...r, title: e.target.value }))} className="mt-1" /></div>
                      <div><Label>Scope Description</Label><Textarea value={newRfq.scope_description} onChange={e => setNewRfq(r => ({ ...r, scope_description: e.target.value }))} className="mt-1" /></div>
                      <div><Label>Submission Deadline</Label><Input type="datetime-local" value={newRfq.submission_deadline} onChange={e => setNewRfq(r => ({ ...r, submission_deadline: e.target.value }))} className="mt-1" /></div>
                      <Button onClick={() => createRfq.mutate()} disabled={!newRfq.title || createRfq.isPending} className="w-full">
                        {createRfq.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Create RFQ
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              <TabsContent value="rfqs" className="space-y-3">
                {rfqs?.map(rfq => (
                  <div key={rfq.id} className="bg-card border border-border rounded-lg p-4 shadow-card">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary" />
                        <p className="text-sm font-medium">{rfq.title}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={`text-xs ${rfqStatusColors[rfq.status]}`}>{rfq.status}</Badge>
                        {rfq.status === "draft" && (
                          <Button size="sm" variant="outline" onClick={() => publishRfq.mutate(rfq.id)}>Publish</Button>
                        )}
                      </div>
                    </div>
                    {rfq.scope_description && <p className="text-xs text-muted-foreground">{rfq.scope_description}</p>}
                    {rfq.submission_deadline && (
                      <p className="text-xs text-muted-foreground mt-1">Deadline: {new Date(rfq.submission_deadline).toLocaleDateString()}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">{(rfq as any).rfq_responses?.length || 0} responses</p>
                  </div>
                ))}
                {!rfqs?.length && <p className="text-sm text-muted-foreground text-center py-8">No RFQs for this programme</p>}
              </TabsContent>

              <TabsContent value="responses" className="space-y-3">
                {rfqs?.flatMap(rfq => ((rfq as any).rfq_responses || []).map((resp: any) => (
                  <div key={resp.id} className="bg-card border border-border rounded-lg p-4 shadow-card">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="text-sm font-medium">{resp.providers?.name || "Unknown Provider"}</p>
                        <p className="text-xs text-muted-foreground">RFQ: {rfq.title}</p>
                      </div>
                      <Badge variant="secondary" className="text-xs">{resp.status}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{resp.proposal_summary || "No summary"}</p>
                    <p className="text-sm font-medium mt-2">KSh {Number(resp.proposed_value_ksh).toLocaleString()}</p>
                    <div className="flex gap-2 mt-3">
                      {resp.status === "submitted" && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => updateResponseStatus.mutate({ id: resp.id, status: "shortlisted" })}>
                            <CheckCircle className="h-3 w-3 mr-1" /> Shortlist
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => updateResponseStatus.mutate({ id: resp.id, status: "rejected" })}>
                            <XCircle className="h-3 w-3 mr-1" /> Reject
                          </Button>
                        </>
                      )}
                      {resp.status === "shortlisted" && (
                        <Button size="sm" onClick={() => updateResponseStatus.mutate({ id: resp.id, status: "awarded" })}>
                          Award Contract
                        </Button>
                      )}
                    </div>
                  </div>
                )))}
                {(!rfqs?.length || rfqs.every(r => !(r as any).rfq_responses?.length)) && (
                  <p className="text-sm text-muted-foreground text-center py-8">No responses yet</p>
                )}
              </TabsContent>
            </Tabs>
          ) : (
            <div className="flex items-center justify-center h-64 bg-card border border-dashed border-border rounded-xl">
              <p className="text-sm text-muted-foreground">Select a programme to view RFQs and responses</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
