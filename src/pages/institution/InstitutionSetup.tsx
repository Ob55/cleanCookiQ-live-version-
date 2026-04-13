import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const COUNTIES = [
  "Baringo","Bomet","Bungoma","Busia","Elgeyo-Marakwet","Embu","Garissa","Homa Bay",
  "Isiolo","Kajiado","Kakamega","Kericho","Kiambu","Kilifi","Kirinyaga","Kisii","Kisumu",
  "Kitui","Kwale","Laikipia","Lamu","Machakos","Makueni","Mandera","Marsabit","Meru",
  "Migori","Mombasa","Murang'a","Nairobi","Nakuru","Nandi","Narok","Nyamira","Nyandarua",
  "Nyeri","Samburu","Siaya","Taita-Taveta","Tana River","Tharaka-Nithi","Trans Nzoia",
  "Turkana","Uasin Gishu","Vihiga","Wajir","West Pokot"
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

const OWNERSHIP_MAP: Record<string, string> = {
  firewood: "firewood",
  charcoal: "charcoal",
  lpg: "lpg",
  biogas: "biogas",
  electric: "electric",
  other: "other",
};

export default function InstitutionSetup() {
  const navigate = useNavigate();
  const { user, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState("");
  const [county, setCounty] = useState("");
  const [ownershipType, setOwnershipType] = useState("");
  const [mealsPerDay, setMealsPerDay] = useState("");
  const [fuelType, setFuelType] = useState("");
  const [consumption, setConsumption] = useState("");
  const unit = fuelType ? FUEL_UNITS[fuelType] : null;

  const isValid = name.trim() && county && ownershipType && mealsPerDay && fuelType && consumption;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || !user) return;
    setLoading(true);

    try {
      // Find institution linked to user's profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("organisation_id")
        .eq("user_id", user.id)
        .single();

      // Check if user already has an institution via organisation
      let institutionId: string | null = null;

      if (profile?.organisation_id) {
        const { data: existing } = await supabase
          .from("institutions")
          .select("id")
          .eq("organisation_id", profile.organisation_id)
          .maybeSingle();
        institutionId = existing?.id ?? null;
      }

      const institutionData = {
        name: name.trim(),
        county,
        ownership_type: ownershipType,
        meals_per_day: parseInt(mealsPerDay),
        current_fuel: OWNERSHIP_MAP[fuelType] as any,
        consumption_per_term: parseFloat(consumption),
        consumption_unit: unit,
        wishes_to_transition_steam: steamTransition,
        setup_completed: true,
        created_by: user.id,
      };

      if (institutionId) {
        await supabase.from("institutions").update(institutionData).eq("id", institutionId);
      } else {
        await supabase.from("institutions").insert({
          ...institutionData,
          institution_type: "school" as any,
        });
      }

      await refreshProfile();
      toast.success("Institution setup complete!");
      navigate("/institution/dashboard");
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 bg-background">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-display font-bold text-lg">C</span>
            </div>
          </div>
          <CardTitle className="text-2xl font-display">Set Up Your Institution</CardTitle>
          <CardDescription>Tell us about your institution to get started</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Field 1 — Name */}
            <div>
              <Label htmlFor="inst-name">Institution Name</Label>
              <Input id="inst-name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Nairobi Girls Secondary School" className="mt-1" required />
            </div>

            {/* Field 2 — County */}
            <div>
              <Label>County</Label>
              <Select value={county} onValueChange={setCounty}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select county" /></SelectTrigger>
                <SelectContent>
                  {COUNTIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Field 3 — Institution Type */}
            <div>
              <Label>Institution Type</Label>
              <Select value={ownershipType} onValueChange={setOwnershipType}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="private">Private</SelectItem>
                  <SelectItem value="government">Government</SelectItem>
                  <SelectItem value="catholic">Catholic</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Field 4 — Meals Per Day */}
            <div>
              <Label>Meals Served Per Day</Label>
              <Select value={mealsPerDay} onValueChange={setMealsPerDay}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select meals per day" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 meal per day</SelectItem>
                  <SelectItem value="2">2 meals per day</SelectItem>
                  <SelectItem value="3">3 meals per day</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Field 5 — Current Fuel */}
            <div>
              <Label>Current Fuel Used for Cooking</Label>
              <Select value={fuelType} onValueChange={setFuelType}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select fuel type" /></SelectTrigger>
                <SelectContent>
                  {FUEL_TYPES.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Field 6 — Consumption Per Term */}
            <div>
              <Label>Consumption Per Term</Label>
              <div className="flex items-center gap-2 mt-1">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={consumption}
                  onChange={e => setConsumption(e.target.value)}
                  placeholder={fuelType ? "Enter amount" : "Select fuel type first"}
                  disabled={!fuelType}
                  required
                />
                <span className="text-sm text-muted-foreground whitespace-nowrap">
                  {unit ? `(${unit})` : "(select fuel type first)"}
                </span>
              </div>
            </div>

            {/* Field 7 — Steam Transition */}
            <div>
              <Label>Do you wish to transition to steam cooking?</Label>
              <div className="flex gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => setSteamTransition(true)}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-semibold border-2 transition-colors ${
                    steamTransition === true
                      ? "text-white border-transparent"
                      : "border-[#00712D] text-[#00712D] bg-white hover:bg-[#00712D]/5"
                  }`}
                  style={steamTransition === true ? { backgroundColor: "#00712D" } : {}}
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => setSteamTransition(false)}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-semibold border-2 transition-colors ${
                    steamTransition === false
                      ? "text-white border-transparent"
                      : "border-[#00712D] text-[#00712D] bg-white hover:bg-[#0A400C]/5"
                  }`}
                  style={steamTransition === false ? { backgroundColor: "#0A400C" } : {}}
                >
                  No
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full min-h-[44px]" disabled={!isValid || loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Save &amp; Continue to Dashboard
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
