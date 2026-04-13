import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Package, Wrench, FileCheck, Bell, Building2 } from "lucide-react";
import { toast } from "sonner";

interface InstitutionNeed {
  id: string;
  description: string;
  technology_type: string | null;
  status: string;
  created_at: string;
  institution_id: string;
  institutions?: { name: string; county: string } | null;
}

export default function SupplierDashboard() {
  const { user, profile } = useAuth();
  const [needs, setNeeds] = useState<InstitutionNeed[]>([]);
  const [providerId, setProviderId] = useState<string | null>(null);
  const [myInterests, setMyInterests] = useState<Set<string>>(new Set());
  const [stats, setStats] = useState({ products: 0, services: 0, documents: 0 });

  useEffect(() => {
    if (!user || !profile) return;
    const load = async () => {
      // Find provider linked to user's organisation
      if (profile.organisation_id) {
        const { data: prov } = await supabase
          .from("providers")
          .select("id")
          .eq("organisation_id", profile.organisation_id)
          .maybeSingle();
        if (prov) {
          setProviderId(prov.id);

          // Get stats
          const [{ count: pc }, { count: sc }, { count: dc }] = await Promise.all([
            supabase.from("provider_products").select("*", { count: "exact", head: true }).eq("provider_id", prov.id),
            supabase.from("provider_services").select("*", { count: "exact", head: true }).eq("provider_id", prov.id),
            supabase.from("provider_documents").select("*", { count: "exact", head: true }).eq("provider_id", prov.id),
          ]);
          setStats({ products: pc ?? 0, services: sc ?? 0, documents: dc ?? 0 });

          // Get my expressed interests
          const { data: interests } = await supabase
            .from("supplier_interest")
            .select("need_id")
            .eq("provider_id", prov.id);
          setMyInterests(new Set(interests?.map(i => i.need_id) ?? []));
        }
      }

      // Get open institution needs
      const { data: needsData } = await supabase
        .from("institution_needs")
        .select("*, institutions(name, county)")
        .eq("status", "open")
        .order("created_at", { ascending: false });
      setNeeds((needsData as any) ?? []);
    };
    load();
  }, [user, profile]);

  const expressInterest = async (needId: string) => {
    if (!providerId || !user) return;
    const { error } = await supabase.from("supplier_interest").insert({
      need_id: needId,
      provider_id: providerId,
      user_id: user.id,
    });
    if (error) {
      if (error.code === "23505") toast.info("Already expressed interest");
      else toast.error(error.message);
      return;
    }
    setMyInterests(prev => new Set([...prev, needId]));
    toast.success("Interest expressed! Admin has been notified.");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">Supplier Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Overview of your products, services, and opportunities</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <Package className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.products}</p>
              <p className="text-sm text-muted-foreground">Products</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-green-500/10 flex items-center justify-center">
              <Wrench className="h-6 w-6 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.services}</p>
              <p className="text-sm text-muted-foreground">Services</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-orange-500/10 flex items-center justify-center">
              <FileCheck className="h-6 w-6 text-orange-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.documents}</p>
              <p className="text-sm text-muted-foreground">Documents</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Institution Needs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-accent" />
            Institution Needs
          </CardTitle>
        </CardHeader>
        <CardContent>
          {needs.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No open opportunities right now. Check back soon!</p>
          ) : (
            <div className="space-y-3">
              {needs.map((need) => (
                <div key={need.id} className="border border-border rounded-lg p-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="font-semibold text-sm truncate">
                        {(need as any).institutions?.name ?? "Institution"}
                      </span>
                      <Badge variant="outline" className="text-xs shrink-0">
                        {(need as any).institutions?.county ?? "—"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{need.description}</p>
                    {need.technology_type && (
                      <Badge className="mt-1 text-xs" variant="secondary">{need.technology_type}</Badge>
                    )}
                  </div>
                  <div className="shrink-0">
                    {myInterests.has(need.id) ? (
                      <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Interest Expressed</Badge>
                    ) : (
                      <Button size="sm" onClick={() => expressInterest(need.id)}>
                        Express Interest
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
