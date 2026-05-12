import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, FileText, MapPin, DollarSign, Calendar, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { DownloadReportButton, dateColumn } from "@/components/admin/DownloadReportButton";

export default function SupplierOpportunities() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();

  const { data: provider } = useQuery({
    queryKey: ["my-provider", profile?.organisation_id],
    queryFn: async () => {
      const { data } = await supabase
        .from("providers")
        .select("*")
        .eq("organisation_id", profile!.organisation_id!)
        .maybeSingle();
      return data;
    },
    enabled: !!profile?.organisation_id,
  });

  const { data: opportunities, isLoading } = useQuery({
    queryKey: ["supplier-opportunities"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("opportunities")
        .select("*, institutions(name, county)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const takeMutation = useMutation({
    mutationFn: async (oppId: string) => {
      if (!provider) throw new Error("No provider profile found");
      const { error } = await supabase
        .from("opportunities")
        .update({
          status: "awarded",
          awarded_provider_id: provider.id,
          awarded_provider_name: provider.name,
          awarded_provider_contact: provider.contact_email || provider.contact_phone || "",
        } as any)
        .eq("id", oppId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Opportunity taken successfully!");
      queryClient.invalidateQueries({ queryKey: ["supplier-opportunities"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (isLoading) return <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const openOpps = opportunities?.filter(o => o.status === "open") || [];
  const takenOpps = opportunities?.filter(o => o.status === "awarded" && (o as any).awarded_provider_id === provider?.id) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-display font-bold">Opportunities</h1>
          <p className="text-sm text-muted-foreground">Browse and take available project opportunities</p>
        </div>
        <DownloadReportButton
          rows={opportunities ?? []}
          columns={[
            { key: "title", label: "Title" },
            { key: "description", label: "Description" },
            { key: "institutions", label: "Institution", format: (r: any) => r.institutions?.name ?? "" },
            { key: "institutions", label: "County", format: (r: any) => r.institutions?.county ?? "" },
            { key: "technology_required", label: "Technology" },
            { key: "estimated_value", label: "Estimated Value (KSh)" },
            { key: "status", label: "Status" },
            { key: "awarded_provider_name", label: "Awarded To" },
            dateColumn("deadline", "Deadline"),
            dateColumn("created_at", "Created"),
          ]}
          title="Supplier Opportunities"
          filename="supplier-opportunities"
        />
      </div>

      {/* Open Opportunities */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Available Opportunities</h2>
        {openOpps.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-border rounded-xl">
            <FileText className="h-10 w-10 mx-auto text-muted-foreground/40 mb-2" />
            <p className="text-muted-foreground text-sm">No open opportunities at the moment</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {openOpps.map((opp) => (
              <Card key={opp.id}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{opp.title}</CardTitle>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" /> {(opp as any).institutions?.name}, {(opp as any).institutions?.county}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {opp.description && <p className="text-sm text-muted-foreground">{opp.description}</p>}
                  <div className="flex flex-wrap gap-3 text-sm">
                    {opp.technology_required && (
                      <Badge variant="secondary">{opp.technology_required}</Badge>
                    )}
                    {opp.estimated_value && (
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <DollarSign className="h-3 w-3" /> KSh {Number(opp.estimated_value).toLocaleString()}
                      </span>
                    )}
                    {opp.deadline && (
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Calendar className="h-3 w-3" /> {new Date(opp.deadline).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <Button
                    className="w-full"
                    disabled={takeMutation.isPending || !provider}
                    onClick={() => takeMutation.mutate(opp.id)}
                  >
                    {takeMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                    Take Opportunity
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* My Taken Opportunities */}
      {takenOpps.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">My Taken Opportunities</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {takenOpps.map((opp) => (
              <Card key={opp.id} className="border-emerald-500/30">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{opp.title}</CardTitle>
                    <Badge className="bg-emerald-500/20 text-emerald-600">Taken</Badge>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" /> {(opp as any).institutions?.name}
                  </div>
                </CardHeader>
                <CardContent>
                  {opp.description && <p className="text-sm text-muted-foreground">{opp.description}</p>}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}