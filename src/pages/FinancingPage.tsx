import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Banknote, Loader2, Plus, Building2, Clock, CheckCircle, AlertCircle, Lock } from "lucide-react";
import { useState } from "react";

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  submitted: "bg-blue-100 text-blue-700",
  under_review: "bg-amber-100 text-amber-700",
  approved: "bg-green-100 text-green-700",
  disbursed: "bg-emerald-100 text-emerald-800",
  rejected: "bg-red-100 text-red-700",
};

export default function FinancingPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showApply, setShowApply] = useState(false);
  const [selectedInstitution, setSelectedInstitution] = useState("");
  const [amount, setAmount] = useState("");

  const { data: applications, isLoading } = useQuery({
    queryKey: ["financing-apps"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financing_applications")
        .select("*, institutions(name, county)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: institutions } = useQuery({
    queryKey: ["financing-institutions"],
    queryFn: async () => {
      const { data } = await supabase.from("institutions").select("id, name, county");
      return data ?? [];
    },
  });

  const applyMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("financing_applications").insert({
        institution_id: selectedInstitution,
        financing_type: "grant" as any,
        amount_requested_ksh: parseFloat(amount) || 0,
        status: "submitted" as any,
        submitted_at: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Grant application submitted");
      setShowApply(false);
      setSelectedInstitution("");
      setAmount("");
      queryClient.invalidateQueries({ queryKey: ["financing-apps"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const grantApps = applications?.filter(a => a.financing_type === "grant") ?? [];

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <Banknote className="h-6 w-6 text-primary" /> Financing Platform
          </h1>
          <p className="text-sm text-muted-foreground">Apply for grants and financing for clean cooking transitions</p>
        </div>
      </div>

      <Tabs defaultValue="grants">
        <TabsList>
          <TabsTrigger value="grants">Grants (Phase 1)</TabsTrigger>
          <TabsTrigger value="debt" disabled>Debt</TabsTrigger>
          <TabsTrigger value="equity" disabled>Equity</TabsTrigger>
        </TabsList>

        <TabsContent value="grants" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-card border border-border rounded-lg p-4 shadow-card">
                <p className="text-2xl font-display font-bold">{grantApps.length}</p>
                <p className="text-xs text-muted-foreground">Total Applications</p>
              </div>
              <div className="bg-card border border-border rounded-lg p-4 shadow-card">
                <p className="text-2xl font-display font-bold text-green-600">
                  {grantApps.filter(a => a.status === "approved" || a.status === "disbursed").length}
                </p>
                <p className="text-xs text-muted-foreground">Approved</p>
              </div>
              <div className="bg-card border border-border rounded-lg p-4 shadow-card">
                <p className="text-2xl font-display font-bold">
                  KSh {grantApps.reduce((s, a) => s + (Number(a.amount_requested_ksh) || 0), 0).toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">Total Requested</p>
              </div>
            </div>

            <Dialog open={showApply} onOpenChange={setShowApply}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-2" /> Apply for Grant</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Grant Application</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Institution</Label>
                    <Select value={selectedInstitution} onValueChange={setSelectedInstitution}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Select institution" /></SelectTrigger>
                      <SelectContent>
                        {institutions?.map(i => (
                          <SelectItem key={i.id} value={i.id}>{i.name} — {i.county}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Amount Requested (KSh)</Label>
                    <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="e.g. 500000" className="mt-1" />
                  </div>
                  <Button onClick={() => applyMutation.mutate()} disabled={!selectedInstitution || !amount || applyMutation.isPending} className="w-full">
                    {applyMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Submit Application
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : (
            <div className="bg-card border border-border rounded-xl overflow-hidden shadow-card">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left text-xs font-medium text-muted-foreground p-3">Institution</th>
                    <th className="text-left text-xs font-medium text-muted-foreground p-3">Type</th>
                    <th className="text-left text-xs font-medium text-muted-foreground p-3">Amount (KSh)</th>
                    <th className="text-left text-xs font-medium text-muted-foreground p-3">Status</th>
                    <th className="text-left text-xs font-medium text-muted-foreground p-3">Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {grantApps.map(app => (
                    <tr key={app.id} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-primary" />
                          <span className="text-sm font-medium">{(app as any).institutions?.name || "—"}</span>
                        </div>
                      </td>
                      <td className="p-3"><Badge variant="secondary" className="text-xs capitalize">{app.financing_type}</Badge></td>
                      <td className="p-3 text-sm font-medium">{Number(app.amount_requested_ksh).toLocaleString()}</td>
                      <td className="p-3">
                        <Badge className={`text-xs ${statusColors[app.status] || ""}`}>
                          {app.status.replace(/_/g, " ")}
                        </Badge>
                      </td>
                      <td className="p-3 text-xs text-muted-foreground">
                        {app.submitted_at ? new Date(app.submitted_at).toLocaleDateString() : "—"}
                      </td>
                    </tr>
                  ))}
                  {!grantApps.length && (
                    <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No grant applications yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="debt">
          <div className="bg-card border border-border rounded-xl p-12 text-center shadow-card mt-4">
            <Lock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-display font-bold mb-2">Concessional Debt — Coming Soon</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Debt financing instruments will be available in Phase 2. Connect with financing partners for concessional lending to verified institutions.
            </p>
          </div>
        </TabsContent>

        <TabsContent value="equity">
          <div className="bg-card border border-border rounded-xl p-12 text-center shadow-card mt-4">
            <Lock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-display font-bold mb-2">Equity — Coming Soon</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Equity investment pathways will be available in Phase 3 for large-scale institutional transitions.
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
