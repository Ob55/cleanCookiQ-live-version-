import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { FileText, Plus, Loader2, Search, DollarSign, Calendar } from "lucide-react";
import { useState } from "react";
import { notifyInstitutionOwner, notifyFunders } from "@/lib/notifications";

export default function OpportunityManagement() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    title: "", description: "", technology_required: "", estimated_value: "",
    institution_id: "", deadline: "",
  });

  const { data: opportunities, isLoading } = useQuery({
    queryKey: ["admin-opportunities"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("opportunities")
        .select("*, institutions(name, county)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: institutions } = useQuery({
    queryKey: ["institutions-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("institutions").select("id, name, county").order("name");
      if (error) throw error;
      return data;
    },
  });

  const createOpp = useMutation({
    mutationFn: async () => {
      const createdByName = profile?.full_name || "Admin";
      const { error } = await supabase.from("opportunities").insert({
        title: form.title,
        description: form.description,
        technology_required: form.technology_required || null,
        estimated_value: form.estimated_value ? Number(form.estimated_value) : null,
        institution_id: form.institution_id,
        deadline: form.deadline ? new Date(form.deadline).toISOString() : null,
        created_by_name: createdByName,
      } as any);
      if (error) throw error;

      // Notify institution
      const inst = institutions?.find(i => i.id === form.institution_id);
      if (inst) {
        await notifyInstitutionOwner(
          form.institution_id,
          "A New Opportunity Has Been Created For You",
          `A new opportunity has been created for ${inst.name}. Opportunity: ${form.title}. Details: ${form.description || "N/A"}. Created by: ${createdByName}. Please log in to review this opportunity.`
        );
      }

      // Notify funders
      await notifyFunders(
        "New Funding Opportunity Available",
        "A new opportunity has been created on CleanCookIQ. An institution is ready for clean cooking transition and requires funding support. Log in to view the details and express your interest."
      );
    },
    onSuccess: () => {
      toast.success("Opportunity created");
      setShowAdd(false);
      setForm({ title: "", description: "", technology_required: "", estimated_value: "", institution_id: "", deadline: "" });
      queryClient.invalidateQueries({ queryKey: ["admin-opportunities"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("opportunities").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Status updated");
      queryClient.invalidateQueries({ queryKey: ["admin-opportunities"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = opportunities?.filter(o => {
    const matchSearch = !search || o.title.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || o.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const totalValue = opportunities?.reduce((sum, o) => sum + (Number(o.estimated_value) || 0), 0) || 0;

  const statusColors: Record<string, string> = {
    open: "bg-primary/20 text-primary",
    closed: "bg-muted text-muted-foreground",
    awarded: "bg-emerald-500/20 text-emerald-600",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Opportunity Management</h1>
          <p className="text-sm text-muted-foreground">Create and manage project opportunities</p>
        </div>
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Create Opportunity</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Create New Opportunity</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Title *</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="mt-1" /></div>
              <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="mt-1" /></div>
              <div>
                <Label>Institution *</Label>
                <Select value={form.institution_id} onValueChange={v => setForm(f => ({ ...f, institution_id: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select institution" /></SelectTrigger>
                  <SelectContent>
                    {institutions?.map(i => (
                      <SelectItem key={i.id} value={i.id}>{i.name} ({i.county})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Technology Required</Label><Input value={form.technology_required} onChange={e => setForm(f => ({ ...f, technology_required: e.target.value }))} className="mt-1" placeholder="e.g. biogas" /></div>
                <div><Label>Estimated Value (KSh)</Label><Input type="number" value={form.estimated_value} onChange={e => setForm(f => ({ ...f, estimated_value: e.target.value }))} className="mt-1" /></div>
              </div>
              <div><Label>Deadline</Label><Input type="date" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} className="mt-1" /></div>
              <Button onClick={() => createOpp.mutate()} disabled={!form.title || !form.institution_id || createOpp.isPending} className="w-full">
                {createOpp.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Create
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Total Opportunities</p>
          <p className="text-2xl font-bold mt-1">{opportunities?.length || 0}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Open</p>
          <p className="text-2xl font-bold mt-1 text-primary">{opportunities?.filter(o => o.status === "open").length || 0}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Awarded</p>
          <p className="text-2xl font-bold mt-1 text-emerald-600">{opportunities?.filter(o => o.status === "awarded").length || 0}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Pipeline Value</p>
          <p className="text-2xl font-bold mt-1">KSh {(totalValue / 1_000_000).toFixed(1)}M</p>
        </div>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search opportunities..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
            <SelectItem value="awarded">Awarded</SelectItem>
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
                <th className="text-left text-xs font-medium text-muted-foreground p-3">Opportunity</th>
                <th className="text-left text-xs font-medium text-muted-foreground p-3">Institution</th>
                <th className="text-left text-xs font-medium text-muted-foreground p-3">Value</th>
                <th className="text-left text-xs font-medium text-muted-foreground p-3">Status</th>
                <th className="text-left text-xs font-medium text-muted-foreground p-3">Deadline</th>
                <th className="text-left text-xs font-medium text-muted-foreground p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered?.map(o => (
                <tr key={o.id} className="border-b border-border/50 hover:bg-muted/30">
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <FileText className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{o.title}</p>
                        <p className="text-xs text-muted-foreground">{o.technology_required || "Any"}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-3 text-sm">{(o as any).institutions?.name || "—"}</td>
                  <td className="p-3 text-sm font-medium">
                    {o.estimated_value ? `KSh ${Number(o.estimated_value).toLocaleString()}` : "—"}
                  </td>
                  <td className="p-3">
                    <Badge variant="secondary" className={statusColors[o.status] || ""}>{o.status}</Badge>
                  </td>
                  <td className="p-3 text-sm text-muted-foreground">
                    {o.deadline ? new Date(o.deadline).toLocaleDateString() : "—"}
                  </td>
                  <td className="p-3">
                    <Select value={o.status} onValueChange={v => updateStatus.mutate({ id: o.id, status: v })}>
                      <SelectTrigger className="h-8 w-28 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                        <SelectItem value="awarded">Awarded</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                </tr>
              ))}
              {!filtered?.length && (
                <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No opportunities found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
