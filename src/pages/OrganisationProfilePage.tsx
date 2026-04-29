import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Building2, ArrowLeft, Loader2, Save, Image as ImageIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type Organisation = {
  id: string;
  name: string;
  org_type: string;
  county: string | null;
  address: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  logo_url: string | null;
};

type FormState = {
  name: string;
  county: string;
  address: string;
  contact_email: string;
  contact_phone: string;
  logo_url: string;
};

const EMPTY: FormState = {
  name: "", county: "", address: "",
  contact_email: "", contact_phone: "", logo_url: "",
};

export default function OrganisationProfilePage() {
  const { profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const orgId = profile?.organisation_id ?? null;
  const [form, setForm] = useState<FormState>(EMPTY);

  const { data: org, isLoading } = useQuery({
    queryKey: ["organisation-self", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organisations")
        .select("*")
        .eq("id", orgId!)
        .maybeSingle();
      if (error) throw error;
      return data as Organisation | null;
    },
  });

  useEffect(() => {
    if (!org) return;
    setForm({
      name: org.name,
      county: org.county ?? "",
      address: org.address ?? "",
      contact_email: org.contact_email ?? "",
      contact_phone: org.contact_phone ?? "",
      logo_url: org.logo_url ?? "",
    });
  }, [org]);

  const save = useMutation({
    mutationFn: async (values: FormState) => {
      if (!orgId) throw new Error("No organisation linked to your profile");
      const payload = {
        name: values.name.trim(),
        county: values.county || null,
        address: values.address || null,
        contact_email: values.contact_email || null,
        contact_phone: values.contact_phone || null,
        logo_url: values.logo_url || null,
      };
      const { error } = await supabase.from("organisations").update(payload).eq("id", orgId);
      if (error) throw error;
    },
    onSuccess: async () => {
      qc.invalidateQueries({ queryKey: ["organisation-self", orgId] });
      await refreshProfile?.();
      toast.success("Organisation updated");
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Save failed"),
  });

  const handleSave = () => {
    if (!form.name.trim()) { toast.error("Organisation name is required"); return; }
    save.mutate(form);
  };

  if (!orgId) {
    return (
      <div className="space-y-4 max-w-2xl">
        <h1 className="text-2xl font-display font-bold">Organisation</h1>
        <Card><CardContent className="py-8 text-center text-muted-foreground">
          Your account is not linked to an organisation yet. Complete onboarding to manage organisation details here.
        </CardContent></Card>
      </div>
    );
  }

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
      </div>

      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" /> Manage organisation
          </h1>
          <p className="text-muted-foreground text-sm mt-1 capitalize">
            {org?.org_type ?? "—"} · {org?.name ?? ""}
          </p>
        </div>
        <Button onClick={handleSave} disabled={save.isPending}>
          {save.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          Save changes
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Identity</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Label className="text-xs">Organisation name *</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1" />
          </div>
          <div className="sm:col-span-2">
            <Label className="text-xs flex items-center gap-1"><ImageIcon className="h-3 w-3" /> Logo URL</Label>
            <Input value={form.logo_url} onChange={(e) => setForm({ ...form, logo_url: e.target.value })} placeholder="https://..." className="mt-1" />
            {form.logo_url && (
              <img src={form.logo_url} alt="Logo preview" className="mt-2 h-16 w-16 object-contain rounded border border-border" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Contact</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs">Contact email</Label>
            <Input type="email" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} placeholder="info@example.co.ke" className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">Contact phone</Label>
            <Input value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} placeholder="+254 7XX XXX XXX" className="mt-1" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Location</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs">County</Label>
            <Input value={form.county} onChange={(e) => setForm({ ...form, county: e.target.value })} placeholder="e.g. Nairobi" className="mt-1" />
          </div>
          <div className="sm:col-span-2">
            <Label className="text-xs">Address</Label>
            <Textarea rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="mt-1" />
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Need to change your organisation type or merge with another? <Link to="/auth/login" className="text-primary hover:underline">Contact support</Link>.
      </p>
    </div>
  );
}
