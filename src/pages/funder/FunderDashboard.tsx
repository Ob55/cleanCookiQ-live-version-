import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, MapPin, Flame, BarChart3, Droplets, Banknote, Link2, Unlink, Search } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { notifyAdmins } from "@/lib/notifications";

const FUEL_LABELS: Record<string, string> = {
  firewood: "Firewood", charcoal: "Charcoal", lpg: "LPG",
  biogas: "Biogas", electric: "Electric (Induction)", other: "Biomass Pellets",
};

async function notifyInstitutionOwner(institutionId: string, title: string, body: string) {
  const { data: inst } = await supabase
    .from("institutions")
    .select("created_by")
    .eq("id", institutionId)
    .maybeSingle();
  if (inst?.created_by) {
    await supabase.from("notifications").insert({ user_id: inst.created_by, title, body });
  }
}

export default function FunderDashboard() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");

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

  // Fetch ALL links (not just mine) to hide already-linked institutions
  const { data: allLinks } = useQuery({
    queryKey: ["all-funder-links"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("funder_institution_links")
        .select("institution_id, funder_id");
      if (error) throw error;
      return data || [];
    },
  });

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

  const { data: myLinks } = useQuery({
    queryKey: ["funder-links", funderProfile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("funder_institution_links")
        .select("id, institution_id")
        .eq("funder_id", funderProfile!.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!funderProfile?.id,
  });

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

      const inst = institutions?.find(i => i.id === institutionId);
      if (inst) {
        await notifyAdmins(
          "Funder Linked to Institution",
          `${funderProfile.organisation_name} has expressed interest in funding ${inst.name} in ${inst.county}. Funding Type: ${funderProfile.funding_type}. Please review and create an opportunity for this institution.`
        );
        await notifyInstitutionOwner(
          institutionId,
          "A Funder Has Linked to Your Institution",
          `${funderProfile.organisation_name} has linked to ${inst.name} and is interested in supporting your clean cooking transition. Log in to view details.`
        );
      }
    },
    onSuccess: () => {
      toast.success("You have been linked to this institution!");
      queryClient.invalidateQueries({ queryKey: ["funder-links"] });
      queryClient.invalidateQueries({ queryKey: ["all-funder-links"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const unlinkMutation = useMutation({
    mutationFn: async (institutionId: string) => {
      if (!funderProfile) throw new Error("No funder profile");
      const link = myLinks?.find(l => l.institution_id === institutionId);
      if (!link) throw new Error("Link not found");

      const { error } = await supabase
        .from("funder_institution_links")
        .delete()
        .eq("id", link.id);
      if (error) throw error;

      const inst = institutions?.find(i => i.id === institutionId);
      if (inst) {
        await notifyAdmins(
          "Funder Unlinked from Institution",
          `${funderProfile.organisation_name} has unlinked from ${inst.name} in ${inst.county}. The institution no longer has a linked funder.`
        );
        await notifyInstitutionOwner(
          institutionId,
          "A Funder Has Unlinked from Your Institution",
          `${funderProfile.organisation_name} has unlinked from ${inst.name}. You may receive interest from other funders in the future.`
        );
      }
    },
    onSuccess: () => {
      toast.success("You have been unlinked from this institution.");
      queryClient.invalidateQueries({ queryKey: ["funder-links"] });
      queryClient.invalidateQueries({ queryKey: ["all-funder-links"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const getScore = (id: string) => {
    const s = scores?.find(s => s.institution_id === id);
    return s?.overall_score;
  };

  const isLinked = (id: string) => myLinks?.some(l => l.institution_id === id);
  const isLinkedByAnother = (id: string) => {
    if (!allLinks || !funderProfile) return false;
    return allLinks.some(l => l.institution_id === id && l.funder_id !== funderProfile.id);
  };

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


  const filteredInstitutions = institutions
    ?.filter((inst: any) => !isLinkedByAnother(inst.id))
    .filter((inst: any) => {
      if (!searchTerm) return true;
      const q = searchTerm.toLowerCase();
      return inst.name?.toLowerCase().includes(q) || inst.county?.toLowerCase().includes(q);
    });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">Funder Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Welcome, {funderProfile.organisation_name}. Browse institutions ready for clean cooking transition.
        </p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search institutions..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9" />
      </div>

      {!filteredInstitutions?.length ? (
        <p className="text-muted-foreground">No institutions found.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredInstitutions.map((inst: any) => {
            const score = inst.assessment_score || getScore(inst.id);
            const linked = isLinked(inst.id);
            const isReady = inst.transition_interest === "yes";
            return (
              <Card key={inst.id} className={`flex flex-col transition-all ${
                linked ? "ring-2 ring-primary/50" : ""
              } ${isReady ? "ring-2 ring-emerald-400/60 shadow-lg shadow-emerald-500/20" : ""}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{inst.name}</CardTitle>
                    {linked && <Badge className="bg-primary/20 text-primary text-xs">Linked</Badge>}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" /> {inst.county}
                  </div>
                </CardHeader>
                <CardContent className="flex-1 space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Flame className="h-4 w-4 text-primary" />
                    <span>{inst.current_fuel ? FUEL_LABELS[inst.current_fuel] || inst.current_fuel : "—"}</span>
                  </div>
                  {score != null && score > 0 && (
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
                    <span>Steam: {inst.transition_interest === "yes" ? (inst.wishes_to_transition_steam ? "Yes" : "No") : "Pending"}</span>
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

                  {linked ? (
                    <Button
                      variant="outline"
                      className="w-full mt-2 text-destructive border-destructive/30 hover:bg-destructive/10"
                      disabled={unlinkMutation.isPending}
                      onClick={() => unlinkMutation.mutate(inst.id)}
                    >
                      {unlinkMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                        <><Unlink className="h-4 w-4 mr-2" /> Unlink</>
                      )}
                    </Button>
                  ) : (
                    <Button
                      className="w-full mt-2"
                      disabled={linkMutation.isPending}
                      onClick={() => linkMutation.mutate(inst.id)}
                    >
                      {linkMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                        <><Link2 className="h-4 w-4 mr-2" /> Fund This Institution</>
                      )}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
