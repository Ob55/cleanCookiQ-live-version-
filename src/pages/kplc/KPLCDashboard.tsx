import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap, Building2, MapPin } from "lucide-react";
import { Link } from "react-router-dom";

export default function KPLCDashboard() {
  const { user, profile } = useAuth();
  const [depot, setDepot] = useState<any>(null);
  const [institutionCount, setInstitutionCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("kplc_depots")
        .select("*")
        .eq("created_by", user.id)
        .limit(1)
        .maybeSingle();
      setDepot(data);

      // Count institutions in the same county
      if (data?.county) {
        const { count } = await supabase
          .from("institutions")
          .select("id", { count: "exact", head: true })
          .eq("county", data.county);
        setInstitutionCount(count || 0);
      }
    })();
  }, [user]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold flex items-center gap-2">
          <Zap className="h-6 w-6 text-primary" />
          {depot?.depot_name || "KPLC Depot"}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {depot?.depot_type?.replace("_", " ")} &middot; {depot?.county}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Depot Type</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold capitalize">{depot?.depot_type?.replace("_", " ") || "-"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">KPLC License</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">{depot?.kplc_license_number || "-"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Branch Manager</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">{depot?.branch_manager_name || "-"}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Nearby Institutions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">{institutionCount}</p>
          <p className="text-sm text-muted-foreground mt-1">
            Institutions in {depot?.county || "your county"}
          </p>
          <Link
            to="/kplc/institutions"
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline mt-3"
          >
            <MapPin className="h-4 w-4" />
            View on map
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
