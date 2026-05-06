import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { GraduationCap, Loader2, Search, Building2, MapPin, Calendar, CheckCircle } from "lucide-react";
import { useState } from "react";
import { DownloadReportButton, listColumn, dateColumn } from "@/components/admin/DownloadReportButton";

const expertiseLabels: Record<string, string> = {
  capacity_building: "Capacity Building",
  technical_design: "Technical Design",
  monitoring_support: "Monitoring Support",
  training: "Training",
  other: "Other",
};

export default function TADashboard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [expertiseFilter, setExpertiseFilter] = useState("all");

  const { data: institutions, isLoading } = useQuery({
    queryKey: ["ta-institutions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("institutions")
        .select("*")
        .eq("ta_required", true);
      if (error) throw error;
      return data;
    },
  });

  const { data: taProfile } = useQuery({
    queryKey: ["ta-profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from("ta_providers")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const commitMutation = useMutation({
    mutationFn: async (institutionId: string) => {
      if (!taProfile) throw new Error("No TA profile found");
      const { error } = await supabase
        .from("ta_providers")
        .update({ availability_status: "committed" as any })
        .eq("id", taProfile.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Committed to institution");
      queryClient.invalidateQueries({ queryKey: ["ta-profile"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = institutions?.filter(inst => {
    if (search && !inst.name.toLowerCase().includes(search.toLowerCase()) && !inst.county.toLowerCase().includes(search.toLowerCase())) return false;
    const taTypes = (inst as any).ta_type_needed as string[] | null;
    if (expertiseFilter !== "all" && (!taTypes || !taTypes.includes(expertiseFilter))) return false;
    return true;
  });

  const getMatchScore = (inst: any): number => {
    if (!taProfile) return 0;
    let score = 0;
    const taTypes = inst.ta_type_needed as string[] | null;
    if (taTypes && taProfile.expertise_areas) {
      const matches = taTypes.filter((t: string) => (taProfile.expertise_areas as string[]).includes(t));
      score += (matches.length / Math.max(taTypes.length, 1)) * 50;
    }
    if (taProfile.counties_served && (taProfile.counties_served as string[]).includes(inst.county)) {
      score += 50;
    }
    return Math.round(score);
  };

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-primary" /> TA Provider Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">Institutions needing Technical Assistance, matched to your expertise and location.</p>
        </div>
        <DownloadReportButton
          rows={(filtered ?? []).map((inst: any) => ({
            ...inst,
            match_score: getMatchScore(inst),
          }))}
          columns={[
            { key: "name", label: "Institution" },
            { key: "county", label: "County" },
            { key: "institution_type", label: "Type" },
            listColumn("ta_type_needed", "TA Types Needed"),
            dateColumn("ta_resource_window_start", "Window Start"),
            dateColumn("ta_resource_window_end", "Window End"),
            { key: "match_score", label: "Match %" },
            { key: "current_fuel", label: "Current Fuel" },
            { key: "number_of_students", label: "Students" },
          ]}
          title="TA Dashboard"
          filename="ta-institutions"
          subtitle={`Filters — search: "${search || "—"}", expertise: ${expertiseFilter}`}
        />
      </div>

      {taProfile && (
        <div className="bg-card border border-border rounded-xl p-4 shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Your TA Profile</p>
              <p className="text-xs text-muted-foreground mt-1">
                Expertise: {(taProfile.expertise_areas as string[])?.map(e => expertiseLabels[e] || e).join(", ") || "None set"}
              </p>
              <p className="text-xs text-muted-foreground">
                Counties: {(taProfile.counties_served as string[])?.join(", ") || "None set"}
              </p>
            </div>
            <Badge variant={taProfile.availability_status === "available" ? "default" : "secondary"}>
              {taProfile.availability_status}
            </Badge>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by institution or county..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={expertiseFilter} onValueChange={setExpertiseFilter}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Filter by TA type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All TA Types</SelectItem>
            {Object.entries(expertiseLabels).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
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
                <th className="text-left text-xs font-medium text-muted-foreground p-3">Institution</th>
                <th className="text-left text-xs font-medium text-muted-foreground p-3">County</th>
                <th className="text-left text-xs font-medium text-muted-foreground p-3">TA Type Needed</th>
                <th className="text-left text-xs font-medium text-muted-foreground p-3">Resource Window</th>
                <th className="text-left text-xs font-medium text-muted-foreground p-3">Match</th>
                <th className="text-left text-xs font-medium text-muted-foreground p-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered?.map(inst => {
                const taTypes = (inst as any).ta_type_needed as string[] | null;
                const windowStart = (inst as any).ta_resource_window_start;
                const windowEnd = (inst as any).ta_resource_window_end;
                const matchScore = getMatchScore(inst);
                return (
                  <tr key={inst.id} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-primary shrink-0" />
                        <span className="text-sm font-medium">{inst.name}</span>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1 text-sm">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        {inst.county}
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1">
                        {taTypes?.map(t => (
                          <Badge key={t} variant="secondary" className="text-xs">{expertiseLabels[t] || t}</Badge>
                        )) || <span className="text-xs text-muted-foreground">—</span>}
                      </div>
                    </td>
                    <td className="p-3">
                      {windowStart && windowEnd ? (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {windowStart} → {windowEnd}
                        </div>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </td>
                    <td className="p-3">
                      <Badge variant={matchScore >= 75 ? "default" : matchScore >= 50 ? "secondary" : "outline"}>
                        {matchScore}%
                      </Badge>
                    </td>
                    <td className="p-3">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!taProfile || taProfile.availability_status === "committed" || commitMutation.isPending}
                        onClick={() => commitMutation.mutate(inst.id)}
                      >
                        <CheckCircle className="h-3 w-3 mr-1" /> Commit
                      </Button>
                    </td>
                  </tr>
                );
              })}
              {!filtered?.length && (
                <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No institutions requiring TA found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
