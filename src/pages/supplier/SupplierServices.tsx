import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Plus, Wrench, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Service {
  id: string;
  name: string;
  details: string | null;
}

export default function SupplierServices() {
  const { user, profile } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [providerId, setProviderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", details: "" });

  useEffect(() => {
    if (!profile?.organisation_id) return;
    const load = async () => {
      const { data: prov } = await supabase.from("providers").select("id").eq("organisation_id", profile.organisation_id!).maybeSingle();
      if (prov) {
        setProviderId(prov.id);
        const { data } = await supabase.from("provider_services").select("*").eq("provider_id", prov.id).order("created_at", { ascending: false });
        setServices(data ?? []);
      }
      setLoading(false);
    };
    load();
  }, [profile]);

  const handleAdd = async () => {
    if (!providerId || !user || !form.name.trim()) return;
    setSaving(true);
    const { data, error } = await supabase.from("provider_services").insert({
      provider_id: providerId,
      name: form.name.trim(),
      details: form.details || null,
      created_by: user.id,
    }).select().single();
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    setServices(prev => [data, ...prev]);
    setForm({ name: "", details: "" });
    setDialogOpen(false);
    toast.success("Service added!");
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("provider_services").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    setServices(prev => prev.filter(s => s.id !== id));
    toast.success("Service removed");
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Services</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage the services you offer</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Add Service</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Service</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Service Name</Label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Stove Installation" className="mt-1" />
              </div>
              <div>
                <Label>Details</Label>
                <Textarea value={form.details} onChange={e => setForm({ ...form, details: e.target.value })} placeholder="Describe the service..." className="mt-1" rows={4} />
              </div>
              <Button onClick={handleAdd} className="w-full" disabled={saving || !form.name.trim()}>
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Add Service
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {services.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-border rounded-xl">
          <Wrench className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground font-medium">No services yet</p>
          <p className="text-sm text-muted-foreground mt-1">Add your first service offering</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {services.map((service) => (
            <Card key={service.id} className="group relative">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <Wrench className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{service.name}</h3>
                      {service.details && (
                        <p className="text-sm text-muted-foreground mt-1">{service.details}</p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(service.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
