import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Layers, Plus, Building2, Leaf, DollarSign, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Portfolio {
  id: string;
  name: string;
  description: string | null;
  institution_ids: string[];
  created_at: string;
}

const FUEL_LABELS: Record<string, string> = {
  firewood: "Firewood", charcoal: "Charcoal", lpg: "LPG",
  biogas: "Biogas", electric: "Electric", other: "Biomass Pellets",
};

export default function PortfolioAggregation() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Portfolio | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Portfolio | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const { data: institutions, isLoading: loadingInst } = useQuery({
    queryKey: ["all-institutions-portfolio"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("institutions")
        .select("id, name, county, institution_type, current_fuel, number_of_students, monthly_fuel_spend, annual_savings_ksh, co2_reduction_tonnes_pa, recommended_solution")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: portfolios, isLoading: loadingPort } = useQuery({
    queryKey: ["portfolios"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("portfolios")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Portfolio[];
    },
  });

  const openCreate = () => {
    setEditing(null);
    setName("");
    setDescription("");
    setSelectedIds([]);
    setDialogOpen(true);
  };

  const openEdit = (p: Portfolio) => {
    setEditing(p);
    setName(p.name);
    setDescription(p.description ?? "");
    setSelectedIds(p.institution_ids ?? []);
    setDialogOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error("Enter a portfolio name");
      if (!selectedIds.length) throw new Error("Select at least one institution");
      if (editing) {
        const { error } = await supabase
          .from("portfolios")
          .update({ name: name.trim(), description: description.trim() || null, institution_ids: selectedIds })
          .eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("portfolios").insert({
          name: name.trim(),
          description: description.trim() || null,
          institution_ids: selectedIds,
          created_by: user?.id ?? null,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Portfolio updated" : "Portfolio created");
      queryClient.invalidateQueries({ queryKey: ["portfolios"] });
      setDialogOpen(false);
    },
    onError: (err: any) => toast.error(err.message || "Save failed"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("portfolios").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Portfolio deleted");
      queryClient.invalidateQueries({ queryKey: ["portfolios"] });
      setDeleteTarget(null);
    },
    onError: (err: any) => toast.error(err.message || "Delete failed"),
  });

  const toggleId = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const getPortfolioInstitutions = (ids: string[]) =>
    institutions?.filter(i => ids.includes(i.id)) || [];

  if (loadingInst || loadingPort) return <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <Layers className="h-6 w-6 text-primary" /> Portfolio Aggregation
          </h1>
          <p className="text-sm text-muted-foreground">Group institutions into transition portfolios</p>
        </div>
        <Button className="bg-accent text-accent-foreground hover:bg-amber-light" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" /> Create Portfolio
        </Button>
      </div>

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Portfolio" : "Create Portfolio"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input placeholder="Portfolio Name" value={name} onChange={e => setName(e.target.value)} />
            <Textarea placeholder="Description (optional)" value={description} onChange={e => setDescription(e.target.value)} rows={2} />
            <p className="text-sm font-medium">Select Institutions ({selectedIds.length} selected)</p>
            <div className="space-y-2 max-h-[40vh] overflow-y-auto border rounded-lg p-3">
              {institutions?.map(inst => (
                <label key={inst.id} className="flex items-center gap-3 p-2 rounded hover:bg-muted/50 cursor-pointer">
                  <Checkbox checked={selectedIds.includes(inst.id)} onCheckedChange={() => toggleId(inst.id)} />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{inst.name}</p>
                    <p className="text-xs text-muted-foreground">{inst.county} · {inst.current_fuel ? FUEL_LABELS[inst.current_fuel] || inst.current_fuel : "No fuel data"}</p>
                  </div>
                </label>
              ))}
            </div>
            <Button onClick={() => saveMutation.mutate()} className="w-full" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {editing ? "Save Changes" : "Create Portfolio"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              The portfolio grouping will be removed. The institutions themselves are not deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">All Institutions ({institutions?.length ?? 0})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="bg-muted/30 rounded-lg p-4 text-center">
              <Building2 className="h-6 w-6 text-primary mx-auto mb-1" />
              <p className="text-2xl font-bold">{institutions?.length ?? 0}</p>
              <p className="text-xs text-muted-foreground">Total Institutions</p>
            </div>
            <div className="bg-muted/30 rounded-lg p-4 text-center">
              <DollarSign className="h-6 w-6 text-primary mx-auto mb-1" />
              <p className="text-2xl font-bold">
                KSh {((institutions?.reduce((s, i) => s + (Number(i.annual_savings_ksh) || 0), 0) ?? 0) / 1000000).toFixed(1)}M
              </p>
              <p className="text-xs text-muted-foreground">Total Annual Savings Potential</p>
            </div>
            <div className="bg-muted/30 rounded-lg p-4 text-center">
              <Leaf className="h-6 w-6 text-primary mx-auto mb-1" />
              <p className="text-2xl font-bold">
                {(institutions?.reduce((s, i) => s + (Number(i.co2_reduction_tonnes_pa) || 0), 0) ?? 0).toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">Total CO₂ Reduction (t/yr)</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Created Portfolios */}
      {portfolios?.map(portfolio => {
        const pInsts = getPortfolioInstitutions(portfolio.institution_ids);
        const totalSavings = pInsts.reduce((s, i) => s + (Number(i.annual_savings_ksh) || 0), 0);
        const totalCo2 = pInsts.reduce((s, i) => s + (Number(i.co2_reduction_tonnes_pa) || 0), 0);
        return (
          <Card key={portfolio.id}>
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span>{portfolio.name}</span>
                  <Badge variant="secondary">{pInsts.length} institutions</Badge>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(portfolio)} title="Edit">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(portfolio)} title="Delete" className="text-destructive hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardTitle>
              {portfolio.description && <p className="text-xs text-muted-foreground">{portfolio.description}</p>}
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                <div className="bg-primary/5 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold">{pInsts.length}</p>
                  <p className="text-xs text-muted-foreground">Institutions</p>
                </div>
                <div className="bg-primary/5 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold">KSh {(totalSavings / 1000).toFixed(0)}K</p>
                  <p className="text-xs text-muted-foreground">Annual Savings</p>
                </div>
                <div className="bg-primary/5 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold">{totalCo2.toLocaleString()} t</p>
                  <p className="text-xs text-muted-foreground">CO₂ Reduction/yr</p>
                </div>
              </div>
              <div className="space-y-2">
                {pInsts.map(inst => (
                  <div key={inst.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 border border-border/50">
                    <div>
                      <p className="text-sm font-medium">{inst.name}</p>
                      <p className="text-xs text-muted-foreground">{inst.county} · {inst.current_fuel ? FUEL_LABELS[inst.current_fuel] || inst.current_fuel : "—"}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">{inst.recommended_solution || "Pending"}</p>
                      <p className="text-xs text-muted-foreground">
                        {inst.annual_savings_ksh ? `KSh ${Number(inst.annual_savings_ksh).toLocaleString()}/yr` : "—"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {!portfolios?.length && (
        <Card>
          <CardContent className="py-12 text-center">
            <Layers className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
            <p className="text-muted-foreground">No portfolios created yet. Click "Create Portfolio" to group institutions.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
