import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Zap, Trash2, CheckCircle } from "lucide-react";

interface KPLCDepot {
  id: string;
  depot_name: string;
  depot_type: string;
  kplc_license_number: string;
  branch_manager_name: string;
  county: string;
  setup_completed: boolean | null;
  created_at: string;
  created_by: string | null;
}

export default function AdminKPLCDepots() {
  const [depots, setDepots] = useState<KPLCDepot[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDepots = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("kplc_depots")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setDepots((data as KPLCDepot[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchDepots(); }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this KPLC depot?")) return;
    const { error } = await supabase.from("kplc_depots").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Depot deleted"); fetchDepots(); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <Zap className="h-6 w-6 text-primary" />
            KPLC Depots
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{depots.length} depot{depots.length !== 1 ? "s" : ""} registered</p>
        </div>
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm">Loading...</p>
      ) : depots.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">No KPLC depots registered yet.</CardContent></Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {depots.map(depot => (
            <Card key={depot.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base">{depot.depot_name}</CardTitle>
                  <Badge variant={depot.setup_completed ? "default" : "secondary"} className="text-xs">
                    {depot.setup_completed ? "Active" : "Pending Setup"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type</span>
                  <span className="capitalize">{depot.depot_type.replace("_", " ")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">License</span>
                  <span>{depot.kplc_license_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Manager</span>
                  <span>{depot.branch_manager_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">County</span>
                  <span>{depot.county}</span>
                </div>
                <div className="pt-2 flex gap-2">
                  <Button variant="destructive" size="sm" onClick={() => handleDelete(depot.id)}>
                    <Trash2 className="h-3 w-3 mr-1" /> Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
