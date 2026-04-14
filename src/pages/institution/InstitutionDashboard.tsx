import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Flame, UtensilsCrossed, Droplets, BarChart3, Loader2, User, Phone, Mail, MapPin } from "lucide-react";
import CookingAlchemySection from "@/components/institution/CookingAlchemySection";
import TransitionInterest from "@/components/institution/TransitionInterest";

const FUEL_LABELS: Record<string, string> = {
  firewood: "Firewood", charcoal: "Charcoal", lpg: "LPG",
  biogas: "Biogas", electric: "Electric (Induction)", other: "Biomass Pellets",
};

interface Institution {
  id: string;
  name: string;
  county: string;
  sub_county: string | null;
  ownership_type: string | null;
  institution_type: string | null;
  meals_per_day: number | null;
  current_fuel: string | null;
  consumption_per_term: number | null;
  consumption_unit: string | null;
  wishes_to_transition_steam: boolean | null;
  contact_person: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  number_of_students: number | null;
  number_of_staff: number | null;
  fuel_of_choice: string | null;
  recommended_solution: string | null;
  annual_savings_ksh: number | null;
  co2_reduction_tonnes_pa: number | null;
  latitude: number | null;
  longitude: number | null;
  monthly_fuel_spend: number | null;
  transition_interest: string | null;
  assessment_score: number | null;
  assessment_category: string | null;
}

function computeCompletion(inst: Institution): number {
  const fields = [
    inst.name, inst.county, inst.ownership_type, inst.meals_per_day,
    inst.current_fuel, inst.consumption_per_term, inst.wishes_to_transition_steam,
    inst.contact_person, inst.contact_email, inst.contact_phone,
    inst.number_of_students, inst.number_of_staff,
  ];
  const filled = fields.filter(f => f !== null && f !== undefined && f !== "" && f !== 0).length;
  return Math.round((filled / fields.length) * 100);
}

export default function InstitutionDashboard() {
  const { user } = useAuth();
  const [institution, setInstitution] = useState<Institution | null>(null);
  const [costModel, setCostModel] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("institutions")
        .select("*")
        .eq("created_by", user.id)
        .maybeSingle();
      const inst = data as any;
      setInstitution(inst as Institution | null);

      if (inst?.id) {
        const { data: cm } = await supabase
          .from("cost_models")
          .select("capex, monthly_opex, projected_monthly_savings")
          .eq("institution_id", inst.id)
          .maybeSingle();
        setCostModel(cm);
      }
      setLoading(false);
    })();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!institution) {
    return <p className="text-muted-foreground">No institution found. Please complete setup first.</p>;
  }

  const completion = computeCompletion(institution);

  const scoreCategoryColor: Record<string, string> = {
    "Ready Now": "bg-emerald-500/20 text-emerald-600",
    "Ready with Minor Actions": "bg-amber-500/20 text-amber-600",
    "Needs Enabling Support": "bg-orange-500/20 text-orange-600",
    "Longer-Term Opportunity": "bg-muted text-muted-foreground",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-display font-bold">
          Welcome back, {institution.name}
        </h1>
        <div className="flex items-center gap-2 mt-2">
          <Badge variant="secondary">{institution.county}</Badge>
          {institution.ownership_type && (
            <Badge variant="outline" className="capitalize">{institution.ownership_type}</Badge>
          )}
        </div>
        <div className="mt-4 max-w-md">
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-muted-foreground">Profile {completion}% complete</span>
          </div>
          <Progress value={completion} className="h-2.5" />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center gap-3 pb-2">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Flame className="h-5 w-5 text-primary" />
            </div>
            <CardTitle className="text-sm font-medium text-muted-foreground">Current Fuel</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">
              {institution.current_fuel ? FUEL_LABELS[institution.current_fuel] || institution.current_fuel : "—"}
            </p>
            <p className="text-sm text-muted-foreground">
              {institution.consumption_per_term ?? "—"} {institution.consumption_unit ?? ""} per term
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-3 pb-2">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <UtensilsCrossed className="h-5 w-5 text-primary" />
            </div>
            <CardTitle className="text-sm font-medium text-muted-foreground">Meals Per Day</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">
              {institution.meals_per_day ? `${institution.meals_per_day} meal(s) per day` : "—"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-3 pb-2">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Droplets className="h-5 w-5 text-primary" />
            </div>
            <CardTitle className="text-sm font-medium text-muted-foreground">Transition to Steam</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-lg font-semibold ${institution.wishes_to_transition_steam ? "text-primary" : "text-muted-foreground"}`}>
              {institution.wishes_to_transition_steam === true ? "Yes" : institution.wishes_to_transition_steam === false ? "No" : "—"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-3 pb-2">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <BarChart3 className="h-5 w-5 text-primary" />
            </div>
            <CardTitle className="text-sm font-medium text-muted-foreground">Readiness Score</CardTitle>
          </CardHeader>
          <CardContent>
            {institution.assessment_score && institution.assessment_score > 0 ? (
              <div>
                <p className="text-lg font-semibold">{institution.assessment_score}%</p>
                <Badge variant="secondary" className={scoreCategoryColor[institution.assessment_category || ""] || ""}>
                  {institution.assessment_category}
                </Badge>
              </div>
            ) : (
              <div>
                <p className="text-lg font-semibold text-muted-foreground">Pending Assessment</p>
                <p className="text-sm text-muted-foreground">Complete your profile to unlock</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Contact & Location */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <User className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Contact Person</p>
                <p className="text-sm font-medium">{institution.contact_person || "—"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Phone</p>
                <p className="text-sm font-medium">{institution.contact_phone || "—"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="text-sm font-medium">{institution.contact_email || "—"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Location</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">County</p>
                <p className="text-sm font-medium">{institution.county}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Sub-County</p>
                <p className="text-sm font-medium">{institution.sub_county || "—"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cooking Alchemy Section */}
      <CookingAlchemySection institution={institution} costModel={costModel} />

      {/* Fuel Options */}
      <FuelOptionsSection />

      {/* Transition Interest */}
      <TransitionInterest
        institutionId={institution.id}
        institutionName={institution.name}
        county={institution.county}
        institutionType={institution.institution_type}
        currentFuel={institution.current_fuel}
        monthlySpend={institution.monthly_fuel_spend}
        studentsCount={institution.number_of_students}
        currentInterest={institution.transition_interest}
        onUpdate={(val) => setInstitution(prev => prev ? { ...prev, transition_interest: val } : null)}
      />
    </div>
  );
}