import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePersistedState, clearPersisted } from "@/hooks/usePersistedForm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Zap } from "lucide-react";

export default function KPLCSetup() {
  const navigate = useNavigate();
  const { user, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const draftKey = `kplc-setup-draft:${user?.id ?? "anon"}`;
  const [depotName, setDepotName] = usePersistedState(`${draftKey}:depotName`, "");

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("kplc_depots")
        .select("id, setup_completed")
        .eq("created_by", user.id)
        .limit(1)
        .maybeSingle();
      if (data?.setup_completed) {
        navigate("/kplc/dashboard", { replace: true });
      } else {
        setChecking(false);
      }
    })();
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!depotName.trim() || !user) return;
    setLoading(true);

    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("organisation_id, org_name")
        .eq("user_id", user.id)
        .single();

      // Create organisation record
      const { data: org, error: orgErr } = await supabase
        .from("organisations")
        .insert({
          name: depotName.trim(),
          org_type: "kplc_depot" as any,
          contact_email: user.email || "",
        })
        .select("id")
        .single();
      if (orgErr) throw new Error(orgErr.message);

      // Get the registration data from profile metadata
      const meta = user.user_metadata || {};

      // Create depot record
      const { data: depot, error: depotErr } = await supabase
        .from("kplc_depots")
        .insert({
          organisation_id: org.id,
          depot_name: depotName.trim(),
          depot_type: meta.depot_type || "service_depot",
          kplc_license_number: meta.kplc_license_number || "",
          branch_manager_name: meta.branch_manager_name || meta.full_name || "",
          county: meta.county || "Nairobi",
          setup_completed: true,
          created_by: user.id,
        } as any)
        .select("id")
        .single();
      if (depotErr) throw new Error(depotErr.message);

      // Link profile to organisation
      await supabase.from("profiles").update({ organisation_id: org.id }).eq("user_id", user.id);
      await refreshProfile();

      toast.success("Depot setup complete!");
      clearPersisted(`${draftKey}:depotName`);
      setTimeout(() => navigate("/kplc/dashboard"), 100);
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    } finally {
      setLoading(false);
    }
  };

  if (checking) return null;

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 bg-background">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
              <Zap className="h-5 w-5 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl font-display">Set Up Your KPLC Depot</CardTitle>
          <CardDescription>Enter your depot name to get started</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <Label htmlFor="depot-name">Depot Name</Label>
              <Input
                id="depot-name"
                value={depotName}
                onChange={e => setDepotName(e.target.value)}
                placeholder='e.g. "KPLC Westlands Depot"'
                className="mt-1"
                required
              />
            </div>

            <Button type="submit" className="w-full min-h-[44px]" disabled={!depotName.trim() || loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Continue
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
