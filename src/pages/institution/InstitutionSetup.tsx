import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";

const KENYA_COUNTIES = [
  "Baringo","Bomet","Bungoma","Busia","Elgeyo-Marakwet","Embu","Garissa","Homa Bay",
  "Isiolo","Kajiado","Kakamega","Kericho","Kiambu","Kilifi","Kirinyaga","Kisii",
  "Kisumu","Kitui","Kwale","Laikipia","Lamu","Machakos","Makueni","Mandera","Marsabit",
  "Meru","Migori","Mombasa","Murang'a","Nairobi","Nakuru","Nandi","Narok","Nyamira",
  "Nyandarua","Nyeri","Samburu","Siaya","Taita-Taveta","Tana River","Tharaka-Nithi",
  "Trans-Nzoia","Turkana","Uasin Gishu","Vihiga","Wajir","West Pokot"
];

const FUEL_TYPES = [
  { value: "firewood", label: "Firewood" },
  { value: "charcoal", label: "Charcoal" },
  { value: "lpg", label: "LPG" },
  { value: "biogas", label: "Biogas" },
  { value: "electric", label: "Electric (Induction)" },
  { value: "other", label: "Biomass Pellets" },
];

const FUEL_UNITS: Record<string, string> = {
  firewood: "tonnes",
  charcoal: "kg",
  lpg: "kg",
  biogas: "m³",
  electric: "kWh",
  other: "kg",
};

const INSTITUTION_TYPES = [
  { value: "private", label: "Private" },
  { value: "government", label: "Government" },
  { value: "catholic", label: "Catholic" },
];

const MEALS_OPTIONS = [
  { value: "1", label: "1 meal per day" },
  { value: "2", label: "2 meals per day" },
  { value: "3", label: "3 meals per day" },
];

export default function InstitutionSetup() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState("");
  const [county, setCounty] = useState("");
  const [ownershipType, setOwnershipType] = useState("");
  const [mealsPerDay, setMealsPerDay] = useState("");
  const [currentFuel, setCurrentFuel] = useState("");
  const [consumptionPerTerm, setConsumptionPerTerm] = useState("");
  const [wishesTransition, setWishesTransition] = useState<boolean | null>(null);

  const unit = currentFuel ? FUEL_UNITS[currentFuel] : "";
  const isValid = name && county && ownershipType && mealsPerDay && currentFuel && consumptionPerTerm && wishesTransition !== null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || !user) return;
    setLoading(true);

    const { error } = await supabase.from("institutions").insert({
      name,
      county,
      ownership_type: ownershipType,
      institution_type: "school" as any,
      meals_per_day: parseInt(mealsPerDay),
      current_fuel: currentFuel as any,
      consumption_per_term: parseFloat(consumptionPerTerm),
      consumption_unit: unit,
      wishes_to_transition_steam: wishesTransition,
      setup_completed: true,
      created_by: user.id,
    });

    setLoading(false);
    if (error) {
      toast.error("Failed to save: " + error.message);
    } else {
      toast.success("Institution profile saved!");
      navigate("/institution/dashboard");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12" style={{ backgroundColor: "#F9F6F1" }}>
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#00712D" }}>
              <span className="text-white font-bold text-lg" style={{ fontFamily: "Georgia, serif" }}>C</span>
            </div>
            <span className="font-bold text-xl" style={{ fontFamily: "Georgia, serif" }}>
              CleanCook<span style={{ color: "#D4A843" }}>IQ</span>
            </span>
          </div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "Georgia, serif", color: "#0A400C" }}>
            Set Up Your Institution Profile
          </h1>
          <p className="text-sm mt-1" style={{ color: "#666", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
            Complete this form to get started on your clean cooking journey.
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-xl p-6 md:p-8" style={{ border: "1px solid #DDDDDD" }}>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Field 1 — Institution Name */}
            <div>
              <Label style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>Institution Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Nairobi Girls Secondary School"
                className="mt-1"
                required
              />
            </div>

            {/* Field 2 — County */}
            <div>
              <Label style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>County</Label>
              <Select value={county} onValueChange={setCounty}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select county" /></SelectTrigger>
                <SelectContent>
                  {KENYA_COUNTIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Field 3 — Institution Type */}
            <div>
              <Label style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>Institution Type</Label>
              <Select value={ownershipType} onValueChange={setOwnershipType}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  {INSTITUTION_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Field 4 — Meals Per Day */}
            <div>
              <Label style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>Meals Served Per Day</Label>
              <Select value={mealsPerDay} onValueChange={setMealsPerDay}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select meals" /></SelectTrigger>
                <SelectContent>
                  {MEALS_OPTIONS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Field 5 — Current Fuel Type */}
            <div>
              <Label style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>Current Fuel Used for Cooking</Label>
              <Select value={currentFuel} onValueChange={setCurrentFuel}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select fuel type" /></SelectTrigger>
                <SelectContent>
                  {FUEL_TYPES.map((f) => (
                    <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Field 6 — Consumption Per Term (dynamic) */}
            {currentFuel && (
              <div>
                <Label style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                  Consumption Per Term ({unit})
                </Label>
                <div className="relative mt-1">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={consumptionPerTerm}
                    onChange={(e) => setConsumptionPerTerm(e.target.value)}
                    placeholder="Enter amount"
                    className="pr-16"
                    required
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: "#999" }}>
                    {unit}
                  </span>
                </div>
              </div>
            )}

            {/* Field 7 — Transition to Steam */}
            <div>
              <Label style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                Do you wish to transition to steam cooking?
              </Label>
              <div className="flex gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => setWishesTransition(true)}
                  className={`flex-1 py-3 rounded-full text-sm font-semibold transition-all border-2 ${
                    wishesTransition === true
                      ? "text-white border-transparent"
                      : "bg-white border-gray-300 text-gray-600 hover:border-gray-400"
                  }`}
                  style={wishesTransition === true ? { backgroundColor: "#00712D", borderColor: "#00712D" } : {}}
                >
                  YES
                </button>
                <button
                  type="button"
                  onClick={() => setWishesTransition(false)}
                  className={`flex-1 py-3 rounded-full text-sm font-semibold transition-all border-2 ${
                    wishesTransition === false
                      ? "text-white border-transparent"
                      : "bg-white border-gray-300 text-gray-600 hover:border-gray-400"
                  }`}
                  style={wishesTransition === false ? { backgroundColor: "#00712D", borderColor: "#00712D" } : {}}
                >
                  NO
                </button>
              </div>
            </div>

            {/* Submit */}
            <Button
              type="submit"
              disabled={!isValid || loading}
              className="w-full text-white font-semibold"
              style={{ backgroundColor: "#00712D", height: "44px", fontFamily: "'DM Sans', system-ui, sans-serif" }}
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Save & Continue to Dashboard
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
