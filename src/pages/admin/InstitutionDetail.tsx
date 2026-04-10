import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Building2, MapPin, Flame, Users, Loader2 } from "lucide-react";

export default function InstitutionDetail() {
  const { id } = useParams<{ id: string }>();

  const { data: institution, isLoading } = useQuery({
    queryKey: ["institution", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("institutions").select("*").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: scores } = useQuery({
    queryKey: ["readiness_scores", id],
    queryFn: async () => {
      const { data } = await supabase.from("readiness_scores").select("*").eq("institution_id", id!).order("calculated_at", { ascending: false }).limit(1);
      return data?.[0] ?? null;
    },
    enabled: !!id,
  });

  if (isLoading) return <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!institution) return <div className="text-center py-16"><p>Institution not found</p></div>;

  const scoreDims = scores ? [
    { label: "Infrastructure", value: Number(scores.infrastructure_score) },
    { label: "Financial", value: Number(scores.financial_score) },
    { label: "Operational", value: Number(scores.operational_score) },
    { label: "Technical", value: Number(scores.technical_score) },
    { label: "Social", value: Number(scores.social_score) },
  ] : [];

  return (
    <div className="space-y-6">
      <Link to="/admin/institutions" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to institutions
      </Link>

      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center">
            <Building2 className="h-7 w-7 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold">{institution.name}</h1>
            <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
              <span className="capitalize">{institution.institution_type}</span>
              <span>•</span>
              <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{institution.county}{institution.sub_county ? `, ${institution.sub_county}` : ""}</span>
            </div>
          </div>
        </div>
        <Badge variant="secondary" className="capitalize">{institution.pipeline_stage}</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Info card */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-card">
          <h2 className="font-display font-bold mb-4">Details</h2>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between"><dt className="text-muted-foreground">Meals/Day</dt><dd className="font-medium">{institution.meals_per_day}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Current Fuel</dt><dd className="font-medium capitalize">{institution.current_fuel}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Students</dt><dd className="font-medium">{institution.number_of_students}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Staff</dt><dd className="font-medium">{institution.number_of_staff}</dd></div>
            {institution.contact_person && <div className="flex justify-between"><dt className="text-muted-foreground">Contact</dt><dd className="font-medium">{institution.contact_person}</dd></div>}
            {institution.contact_phone && <div className="flex justify-between"><dt className="text-muted-foreground">Phone</dt><dd className="font-medium">{institution.contact_phone}</dd></div>}
          </dl>
        </div>

        {/* Readiness score */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-card md:col-span-2">
          <h2 className="font-display font-bold mb-4">Readiness Score</h2>
          {scores ? (
            <div>
              <div className="flex items-center gap-4 mb-6">
                <div className="h-20 w-20 rounded-full border-4 border-primary flex items-center justify-center">
                  <span className="text-2xl font-display font-bold">{Number(scores.overall_score).toFixed(0)}</span>
                </div>
                <p className="text-sm text-muted-foreground">Overall readiness score out of 100</p>
              </div>
              <div className="space-y-3">
                {scoreDims.map(dim => (
                  <div key={dim.label} className="flex items-center gap-3">
                    <span className="text-sm w-28 shrink-0">{dim.label}</span>
                    <div className="flex-1 bg-muted rounded-full h-3 overflow-hidden">
                      <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${dim.value}%` }} />
                    </div>
                    <span className="text-sm font-medium w-10 text-right">{dim.value.toFixed(0)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">No assessment scored yet. Complete an assessment to generate a readiness score.</p>
          )}
        </div>
      </div>

      {institution.notes && (
        <div className="bg-card border border-border rounded-xl p-6 shadow-card">
          <h2 className="font-display font-bold mb-2">Notes</h2>
          <p className="text-sm text-muted-foreground">{institution.notes}</p>
        </div>
      )}
    </div>
  );
}
