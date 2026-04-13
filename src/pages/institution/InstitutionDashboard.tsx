import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Flame, Utensils, Zap, Activity, Loader2 } from "lucide-react";

interface InstitutionRecord {
  name: string;
  county: string;
  ownership_type: string | null;
  meals_per_day: number | null;
  current_fuel: string | null;
  consumption_per_term: number | null;
  consumption_unit: string | null;
  wishes_to_transition_steam: boolean | null;
  setup_completed: boolean | null;
}

const FUEL_LABELS: Record<string, string> = {
  firewood: "Firewood",
  charcoal: "Charcoal",
  lpg: "LPG",
  biogas: "Biogas",
  electric: "Electric (Induction)",
  other: "Biomass Pellets",
};

export default function InstitutionDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [institution, setInstitution] = useState<InstitutionRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from("institutions")
        .select("name, county, ownership_type, meals_per_day, current_fuel, consumption_per_term, consumption_unit, wishes_to_transition_steam, setup_completed")
        .eq("created_by", user.id)
        .eq("setup_completed", true)
        .limit(1)
        .maybeSingle();

      if (!data) {
        navigate("/institution/setup", { replace: true });
        return;
      }
      setInstitution(data as InstitutionRecord);
      setLoading(false);
    };
    load();
  }, [user, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: "#00712D" }} />
      </div>
    );
  }

  if (!institution) return null;

  // Calculate completeness
  const fields = [institution.name, institution.county, institution.ownership_type, institution.meals_per_day, institution.current_fuel, institution.consumption_per_term, institution.wishes_to_transition_steam];
  const filled = fields.filter((f) => f !== null && f !== undefined && f !== "").length;
  const completeness = Math.round((filled / fields.length) * 100);

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold" style={{ fontFamily: "Georgia, serif", color: "#0A400C" }}>
          Welcome, {institution.name}
        </h1>
        <div className="flex items-center gap-2 mt-2">
          <Badge className="uppercase text-xs font-semibold rounded-full px-3" style={{ backgroundColor: "#00712D", color: "white" }}>
            {institution.county}
          </Badge>
          {institution.ownership_type && (
            <Badge variant="outline" className="uppercase text-xs font-semibold rounded-full px-3" style={{ borderColor: "#00712D", color: "#00712D" }}>
              {institution.ownership_type}
            </Badge>
          )}
        </div>

        {/* Progress */}
        <div className="mt-4 bg-white rounded-lg p-4" style={{ border: "1px solid #DDDDDD" }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium" style={{ fontFamily: "'DM Sans', system-ui, sans-serif", color: "#333" }}>
              Your profile is {completeness}% complete
            </span>
            <span className="text-sm font-bold" style={{ color: "#00712D" }}>{completeness}%</span>
          </div>
          <Progress value={completeness} className="h-2" />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 — Current Fuel */}
        <div className="bg-white rounded-xl p-5" style={{ border: "1px solid #DDDDDD" }}>
          <div className="flex items-center gap-2 mb-3">
            <div className="h-9 w-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#FFF3E0" }}>
              <Flame className="h-5 w-5" style={{ color: "#E65100" }} />
            </div>
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#999", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
              Current Fuel
            </span>
          </div>
          <p className="text-lg font-bold" style={{ fontFamily: "Georgia, serif", color: "#0A400C" }}>
            {FUEL_LABELS[institution.current_fuel || ""] || institution.current_fuel || "—"}
          </p>
          {institution.consumption_per_term != null && (
            <p className="text-sm mt-1" style={{ color: "#666" }}>
              {institution.consumption_per_term} {institution.consumption_unit} / term
            </p>
          )}
        </div>

        {/* Card 2 — Meals Per Day */}
        <div className="bg-white rounded-xl p-5" style={{ border: "1px solid #DDDDDD" }}>
          <div className="flex items-center gap-2 mb-3">
            <div className="h-9 w-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#E8F5E9" }}>
              <Utensils className="h-5 w-5" style={{ color: "#2E7D32" }} />
            </div>
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#999", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
              Meals Per Day
            </span>
          </div>
          <p className="text-lg font-bold" style={{ fontFamily: "Georgia, serif", color: "#0A400C" }}>
            {institution.meals_per_day || "—"}
          </p>
          <p className="text-sm mt-1" style={{ color: "#666" }}>
            meal{(institution.meals_per_day ?? 0) !== 1 ? "s" : ""} served daily
          </p>
        </div>

        {/* Card 3 — Transition Interest */}
        <div className="bg-white rounded-xl p-5" style={{ border: "1px solid #DDDDDD" }}>
          <div className="flex items-center gap-2 mb-3">
            <div className="h-9 w-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#E3F2FD" }}>
              <Zap className="h-5 w-5" style={{ color: "#1565C0" }} />
            </div>
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#999", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
              Transition Interest
            </span>
          </div>
          <p className="text-lg font-bold" style={{ fontFamily: "Georgia, serif", color: "#0A400C" }}>
            Steam transition: {institution.wishes_to_transition_steam ? "Yes" : "No"}
          </p>
        </div>

        {/* Card 4 — Readiness Score */}
        <div className="bg-white rounded-xl p-5" style={{ border: "1px solid #DDDDDD" }}>
          <div className="flex items-center gap-2 mb-3">
            <div className="h-9 w-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#F3E5F5" }}>
              <Activity className="h-5 w-5" style={{ color: "#7B1FA2" }} />
            </div>
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#999", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
              Readiness Score
            </span>
          </div>
          <p className="text-lg font-bold" style={{ fontFamily: "Georgia, serif", color: "#999" }}>
            Pending assessment
          </p>
        </div>
      </div>
    </div>
  );
}
