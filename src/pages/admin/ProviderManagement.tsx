import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Factory, Check, X, Loader2, Plus, Search, Shield, Star, MapPin } from "lucide-react";
import { useState } from "react";

export default function ProviderManagement() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterVerified, setFilterVerified] = useState<string>("all");
  const [showAdd, setShowAdd] = useState(false);
  const [newProvider, setNewProvider] = useState({
    name: "", contact_person: "", contact_email: "", contact_phone: "",
    website: "", services: [] as string[], technology_types: [] as string[],
    counties_served: [] as string[],
  });

  const { data: providers, isLoading } = useQuery({
    queryKey: ["admin-providers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("providers").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const updateVerified = useMutation({
    mutationFn: async ({ id, verified }: { id: string; verified: boolean }) => {
      const { error } = await supabase.from("providers").update({ verified }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Provider status updated");
      queryClient.invalidateQueries({ queryKey: ["admin-providers"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const createProvider = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("providers").insert({
        name: newProvider.name,
        contact_person: newProvider.contact_person,
        contact_email: newProvider.contact_email,
        contact_phone: newProvider.contact_phone,
        website: newProvider.website,
        services: newProvider.services.length ? newProvider.services : null,
        technology_types: newProvider.technology_types.length ? newProvider.technology_types : null,
        counties_served: newProvider.counties_served.length ? newProvider.counties_served : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Provider created");
      setShowAdd(false);
      setNewProvider({ name: "", contact_person: "", contact_email: "", contact_phone: "", website: "", services: [], technology_types: [], counties_served: [] });
      queryClient.invalidateQueries({ queryKey: ["admin-providers"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = providers?.filter(p => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.contact_person?.toLowerCase().includes(search.toLowerCase());
    const matchVerified = filterVerified === "all" || (filterVerified === "verified" ? p.verified : !p.verified);
    return matchSearch && matchVerified;
  });

  const serviceOptions = ["equipment_supply", "installation", "maintenance", "fuel_supply", "financing", "training"];
  const techOptions = ["biogas", "electric", "lpg", "briquettes", "solar_thermal"];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Provider Management</h1>
          <p className="text-sm text-muted-foreground">Manage providers, vetting queue, and approvals</p>
        </div>
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Add Provider</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Add New Provider</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Company Name *</Label><Input value={newProvider.name} onChange={e => setNewProvider(p => ({ ...p, name: e.target.value }))} className="mt-1" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Contact Person</Label><Input value={newProvider.contact_person} onChange={e => setNewProvider(p => ({ ...p, contact_person: e.target.value }))} className="mt-1" /></div>
                <div><Label>Phone</Label><Input value={newProvider.contact_phone} onChange={e => setNewProvider(p => ({ ...p, contact_phone: e.target.value }))} className="mt-1" /></div>
              </div>
              <div><Label>Email</Label><Input value={newProvider.contact_email} onChange={e => setNewProvider(p => ({ ...p, contact_email: e.target.value }))} className="mt-1" /></div>
              <div><Label>Website</Label><Input value={newProvider.website} onChange={e => setNewProvider(p => ({ ...p, website: e.target.value }))} className="mt-1" /></div>
              <div>
                <Label>Service Categories</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {serviceOptions.map(s => (
                    <Badge key={s} variant={newProvider.services.includes(s) ? "default" : "outline"} className="cursor-pointer"
                      onClick={() => setNewProvider(p => ({ ...p, services: p.services.includes(s) ? p.services.filter(x => x !== s) : [...p.services, s] }))}>
                      {s.replace(/_/g, " ")}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <Label>Technology Types</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {techOptions.map(t => (
                    <Badge key={t} variant={newProvider.technology_types.includes(t) ? "default" : "outline"} className="cursor-pointer"
                      onClick={() => setNewProvider(p => ({ ...p, technology_types: p.technology_types.includes(t) ? p.technology_types.filter(x => x !== t) : [...p.technology_types, t] }))}>
                      {t.replace(/_/g, " ")}
                    </Badge>
                  ))}
                </div>
              </div>
              <Button onClick={() => createProvider.mutate()} disabled={!newProvider.name || createProvider.isPending} className="w-full">
                {createProvider.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Create Provider
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search providers..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterVerified} onValueChange={setFilterVerified}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="verified">Verified</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
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
                <th className="text-left text-xs font-medium text-muted-foreground p-3">Provider</th>
                <th className="text-left text-xs font-medium text-muted-foreground p-3">Services</th>
                <th className="text-left text-xs font-medium text-muted-foreground p-3">Rating</th>
                <th className="text-left text-xs font-medium text-muted-foreground p-3">Status</th>
                <th className="text-left text-xs font-medium text-muted-foreground p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered?.map(p => (
                <tr key={p.id} className="border-b border-border/50 hover:bg-muted/30">
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Factory className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{p.contact_person || "—"} · {p.contact_email || ""}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1">
                      {p.technology_types?.slice(0, 3).map((t: string) => (
                        <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>
                      ))}
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-1">
                      <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                      <span className="text-sm">{p.rating || 0}</span>
                    </div>
                  </td>
                  <td className="p-3">
                    <Badge variant={p.verified ? "default" : "secondary"} className={p.verified ? "bg-primary/20 text-primary" : "bg-amber-500/20 text-amber-600"}>
                      {p.verified ? "Verified" : "Pending"}
                    </Badge>
                  </td>
                  <td className="p-3">
                    <div className="flex gap-1">
                      {!p.verified && (
                        <Button size="sm" variant="ghost" onClick={() => updateVerified.mutate({ id: p.id, verified: true })}>
                          <Check className="h-4 w-4 text-primary" />
                        </Button>
                      )}
                      {p.verified && (
                        <Button size="sm" variant="ghost" onClick={() => updateVerified.mutate({ id: p.id, verified: false })}>
                          <X className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!filtered?.length && (
                <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No providers found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
