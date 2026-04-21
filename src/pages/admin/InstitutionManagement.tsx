import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Building2, Plus, Search, Filter, MapPin, Loader2, Eye, Pencil, Trash2, Target } from "lucide-react";
import { Link } from "react-router-dom";
import { TRANSITION_TARGET_LABELS } from "@/components/institution/TransitionTarget";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const counties = ["Nairobi", "Mombasa", "Kisumu", "Nakuru", "Eldoret", "Nyeri", "Machakos", "Kiambu", "Uasin Gishu", "Kakamega", "Bungoma", "Kilifi", "Garissa", "Turkana", "Marsabit"];
const institutionTypes = ["school", "hospital", "prison", "factory", "hotel", "restaurant", "other"];
const pipelineStages = ["identified", "assessed", "matched", "negotiation", "contracted", "installed", "monitoring"];
const fuelTypes = ["firewood", "charcoal", "lpg", "biogas", "electric", "other"];

const stageColors: Record<string, string> = {
  identified: "bg-muted text-muted-foreground",
  assessed: "bg-sky/20 text-sky",
  matched: "bg-accent/20 text-accent",
  negotiation: "bg-amber/20 text-amber",
  contracted: "bg-primary/20 text-primary",
  installed: "bg-primary text-primary-foreground",
  monitoring: "bg-emerald-light/20 text-emerald-light",
};

export default function InstitutionManagement() {
  const [search, setSearch] = useState("");
  const [countyFilter, setCountyFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [stageFilter, setStageFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("institutions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Institution deleted");
      queryClient.invalidateQueries({ queryKey: ["institutions"] });
      setDeleteTarget(null);
    },
    onError: (err: any) => toast.error(err.message || "Failed to delete"),
  });

  const { data: institutions, isLoading } = useQuery({
    queryKey: ["institutions", countyFilter, typeFilter, stageFilter],
    queryFn: async () => {
      let q = supabase.from("institutions").select("*").order("created_at", { ascending: false });
      if (countyFilter !== "all") q = q.eq("county", countyFilter);
      if (typeFilter !== "all") q = q.eq("institution_type", typeFilter as any);
      if (stageFilter !== "all") q = q.eq("pipeline_stage", stageFilter as any);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  const filtered = institutions?.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    i.county.toLowerCase().includes(search.toLowerCase())
  ) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Institutions</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} institutions in pipeline</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary text-primary-foreground">
              <Plus className="h-4 w-4 mr-2" /> Add Institution
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-display">Add New Institution</DialogTitle>
            </DialogHeader>
            <InstitutionForm onSuccess={() => { setDialogOpen(false); queryClient.invalidateQueries({ queryKey: ["institutions"] }); }} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search institutions..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={countyFilter} onValueChange={setCountyFilter}>
          <SelectTrigger className="w-[160px]"><Filter className="h-4 w-4 mr-2" /><SelectValue placeholder="County" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Counties</SelectItem>
            {counties.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {institutionTypes.map(t => <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={stageFilter} onValueChange={setStageFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Stage" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stages</SelectItem>
            {pipelineStages.map(s => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No institutions found</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left text-xs font-medium text-muted-foreground p-3">Name</th>
                  <th className="text-left text-xs font-medium text-muted-foreground p-3">Type</th>
                  <th className="text-left text-xs font-medium text-muted-foreground p-3">County</th>
                  <th className="text-left text-xs font-medium text-muted-foreground p-3">Stage</th>
                  <th className="text-left text-xs font-medium text-muted-foreground p-3">Meals/Day</th>
                  <th className="text-left text-xs font-medium text-muted-foreground p-3">Fuel</th>
                  <th className="text-left text-xs font-medium text-muted-foreground p-3">Wants to Transition To</th>
                  <th className="text-right text-xs font-medium text-muted-foreground p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(inst => (
                  <tr key={inst.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Building2 className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{inst.name}</p>
                          {inst.contact_person && <p className="text-xs text-muted-foreground">{inst.contact_person}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-sm capitalize">{inst.institution_type}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-1 text-sm">
                        <MapPin className="h-3 w-3 text-muted-foreground" />{inst.county}
                      </div>
                    </td>
                    <td className="p-3">
                      <Badge variant="secondary" className={stageColors[inst.pipeline_stage] || ""}>
                        {inst.pipeline_stage}
                      </Badge>
                    </td>
                    <td className="p-3 text-sm">{inst.meals_per_day}</td>
                    <td className="p-3 text-sm capitalize">{inst.current_fuel}</td>
                    <td className="p-3">
                      {inst.transition_target_fuel ? (
                        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                          <Target className="h-3 w-3 mr-1" />
                          {TRANSITION_TARGET_LABELS[inst.transition_target_fuel] ?? inst.transition_target_fuel}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">not selected</span>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="flex justify-end gap-1">
                        <Link to={`/admin/institutions/${inst.id}`}>
                          <Button variant="ghost" size="sm" title="View"><Eye className="h-4 w-4" /></Button>
                        </Link>
                        <Button variant="ghost" size="sm" title="Edit" onClick={() => setEditing(inst)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" title="Delete" onClick={() => setDeleteTarget(inst)} className="text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">Edit Institution</DialogTitle>
          </DialogHeader>
          {editing && (
            <InstitutionForm
              initial={editing}
              onSuccess={() => { setEditing(null); queryClient.invalidateQueries({ queryKey: ["institutions"] }); }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this institution?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.name} will be permanently removed along with its assessments, pipeline history, and related records. This cannot be undone.
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
    </div>
  );
}

function InstitutionForm({ onSuccess, initial }: { onSuccess: () => void; initial?: any }) {
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    institution_type: (initial?.institution_type ?? "school") as any,
    county: initial?.county ?? "",
    sub_county: initial?.sub_county ?? "",
    latitude: initial?.latitude?.toString() ?? "",
    longitude: initial?.longitude?.toString() ?? "",
    meals_per_day: initial?.meals_per_day?.toString() ?? "",
    current_fuel: (initial?.current_fuel ?? "firewood") as any,
    number_of_students: initial?.number_of_students?.toString() ?? "",
    number_of_staff: initial?.number_of_staff?.toString() ?? "",
    contact_person: initial?.contact_person ?? "",
    contact_phone: initial?.contact_phone ?? "",
    contact_email: initial?.contact_email ?? "",
    notes: initial?.notes ?? "",
  });
  const [loading, setLoading] = useState(false);
  const isEdit = !!initial?.id;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const payload = {
      name: form.name,
      institution_type: form.institution_type,
      county: form.county,
      sub_county: form.sub_county || null,
      latitude: form.latitude ? parseFloat(form.latitude) : null,
      longitude: form.longitude ? parseFloat(form.longitude) : null,
      meals_per_day: parseInt(form.meals_per_day) || 0,
      current_fuel: form.current_fuel,
      number_of_students: parseInt(form.number_of_students) || 0,
      number_of_staff: parseInt(form.number_of_staff) || 0,
      contact_person: form.contact_person || null,
      contact_phone: form.contact_phone || null,
      contact_email: form.contact_email || null,
      notes: form.notes || null,
    };
    const { error } = isEdit
      ? await supabase.from("institutions").update(payload).eq("id", initial.id)
      : await supabase.from("institutions").insert(payload);
    setLoading(false);
    if (error) toast.error(error.message);
    else { toast.success(isEdit ? "Institution updated" : "Institution added"); onSuccess(); }
  };

  const set = (key: string, val: string) => setForm(prev => ({ ...prev, [key]: val }));

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Label>Institution Name *</Label>
          <Input value={form.name} onChange={e => set("name", e.target.value)} required className="mt-1" />
        </div>
        <div>
          <Label>Type *</Label>
          <Select value={form.institution_type} onValueChange={v => set("institution_type", v)}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              {institutionTypes.map(t => <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>County *</Label>
          <Input value={form.county} onChange={e => set("county", e.target.value)} required className="mt-1" />
        </div>
        <div>
          <Label>Sub-County</Label>
          <Input value={form.sub_county} onChange={e => set("sub_county", e.target.value)} className="mt-1" />
        </div>
        <div>
          <Label>Current Fuel</Label>
          <Select value={form.current_fuel} onValueChange={v => set("current_fuel", v)}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              {fuelTypes.map(f => <SelectItem key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Meals Per Day</Label>
          <Input type="number" value={form.meals_per_day} onChange={e => set("meals_per_day", e.target.value)} className="mt-1" />
        </div>
        <div>
          <Label>Students/Beneficiaries</Label>
          <Input type="number" value={form.number_of_students} onChange={e => set("number_of_students", e.target.value)} className="mt-1" />
        </div>
        <div>
          <Label>Staff Count</Label>
          <Input type="number" value={form.number_of_staff} onChange={e => set("number_of_staff", e.target.value)} className="mt-1" />
        </div>
        <div>
          <Label>Latitude</Label>
          <Input value={form.latitude} onChange={e => set("latitude", e.target.value)} placeholder="-1.2921" className="mt-1" />
        </div>
        <div>
          <Label>Longitude</Label>
          <Input value={form.longitude} onChange={e => set("longitude", e.target.value)} placeholder="36.8219" className="mt-1" />
        </div>
        <div>
          <Label>Contact Person</Label>
          <Input value={form.contact_person} onChange={e => set("contact_person", e.target.value)} className="mt-1" />
        </div>
        <div>
          <Label>Contact Phone</Label>
          <Input value={form.contact_phone} onChange={e => set("contact_phone", e.target.value)} className="mt-1" />
        </div>
        <div className="col-span-2">
          <Label>Contact Email</Label>
          <Input type="email" value={form.contact_email} onChange={e => set("contact_email", e.target.value)} className="mt-1" />
        </div>
      </div>
      <Button type="submit" className="w-full bg-primary text-primary-foreground" disabled={loading}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
        {isEdit ? "Save Changes" : "Add Institution"}
      </Button>
    </form>
  );
}
