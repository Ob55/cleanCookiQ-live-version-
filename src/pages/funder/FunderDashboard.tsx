import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, MapPin, Flame, BarChart3, Droplets, Banknote } from "lucide-react";
import { toast } from "sonner";
import { notifyAdmins } from "@/lib/notifications";

const FUEL_LABELS: Record<string, string> = {
  firewood: "Firewood", charcoal: "Charcoal", lpg: "LPG",
  biogas: "Biogas", electric: "Electric (Induction)", other: "Biomass Pellets",
};

export default function FunderDashboard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Get funder profile
  const { data: funderProfile, isLoading: fpLoading } = useQuery({
    queryKey: ["funder-profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("funder_profiles")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Get institutions with transition_interest = yes or maybe
  const { data: institutions, isLoading: instLoading } = useQuery({
    queryKey: ["funder-institutions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("institutions")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as any[];
    },
  });

  // Get existing links
  const { data: myLinks } = useQuery({
    queryKey: ["funder-links", funderProfile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("funder_institution_links")
        .select("institution_id")
        .eq("funder_id", funderProfile!.id);
      if (error) throw error;
      return data?.map(l => l.institution_id) || [];
    },
    enabled: !!funderProfile?.id,
  });

  // Get readiness scores
  const { data: scores } = useQuery({
    queryKey: ["readiness-scores"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("readiness_scores")
        .select("institution_id, overall_score");
      if (error) throw error;
      return data;
    },
  });

  const linkMutation = useMutation({
    mutationFn: async (institutionId: string) => {
      if (!funderProfile) throw new Error("No funder profile");
      const { error } = await supabase.from("funder_institution_links").insert({
        funder_id: funderProfile.id,
        institution_id: institutionId,
      });
      if (error) throw error;

      // Find institution name
      const inst = institutions?.find(i => i.id === institutionId);
      if (inst) {
        await notifyAdmins(
          "Funder Linked to Institution",
          `${funderProfile.organisation_name} has expressed interest in funding ${inst.name} in ${inst.county}. Funding Type: ${funderProfile.funding_type}. Please review and create an opportunity for this institution.`
        );
      }
    },
    onSuccess: () => {
      toast.success("You have been linked to this institution!");
      queryClient.invalidateQueries({ queryKey: ["funder-links"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const getScore = (id: string) => {
    const s = scores?.find(s => s.institution_id === id);
    return s?.overall_score;
  };

  const isLinked = (id: string) => myLinks?.includes(id);

  if (fpLoading || instLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!funderProfile) {
    return <p className="text-muted-foreground">Funder profile not found. Please complete registration.</p>;
  }

  const scoreCategoryColor: Record<string, string> = {
    "Ready Now": "bg-emerald-500/20 text-emerald-600",
    "Ready with Minor Actions": "bg-amber-500/20 text-amber-600",
    "Needs Enabling Support": "bg-orange-500/20 text-orange-600",
    "Longer-Term Opportunity": "bg-muted text-muted-foreground",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">Funder Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Welcome, {funderProfile.organisation_name}. Browse institutions ready for clean cooking transition.
        </p>
      </div>

      {!institutions?.length ? (
        <p className="text-muted-foreground">No institutions are currently seeking transition support.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {institutions.map((inst: any) => {
            const score = inst.assessment_score || getScore(inst.id);
            const linked = isLinked(inst.id);
            return (
              <Card key={inst.id} className="flex flex-col">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{inst.name}</CardTitle>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" /> {inst.county}
                  </div>
                </CardHeader>
                <CardContent className="flex-1 space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Flame className="h-4 w-4 text-primary" />
                    <span>{inst.current_fuel ? FUEL_LABELS[inst.current_fuel] || inst.current_fuel : "—"}</span>
                  </div>
                  {score != null && (
                    <div className="flex items-center gap-2 text-sm">
                      <BarChart3 className="h-4 w-4 text-primary" />
                      <span>Score: {score}%</span>
                      {inst.assessment_category && (
                        <Badge variant="secondary" className={`text-xs ${scoreCategoryColor[inst.assessment_category] || ""}`}>
                          {inst.assessment_category}
                        </Badge>
                      )}
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm">
                    <Droplets className="h-4 w-4 text-primary" />
                    <span>Steam: {inst.wishes_to_transition_steam ? "Yes" : "No"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Banknote className="h-4 w-4 text-primary" />
                    <Badge variant="secondary" className={
                      inst.transition_interest === "yes" ? "bg-emerald-500/20 text-emerald-600" 
                      : inst.transition_interest === "maybe" ? "bg-amber-500/20 text-amber-600"
                      : "bg-muted text-muted-foreground"
                    }>
                      Interest: {inst.transition_interest ? inst.transition_interest.toUpperCase() : "NOT SET"}
                    </Badge>
                  </div>

                  <Button
                    className="w-full mt-2"
                    disabled={linked || linkMutation.isPending}
                    onClick={() => linkMutation.mutate(inst.id)}
                  >
                    {linked ? "✓ Linked" : linkMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Fund This Institution"}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
