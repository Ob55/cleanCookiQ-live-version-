import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { calculateAssessmentScore } from "@/lib/assessmentScoring";

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

export default function InstitutionSetup() {
  const navigate = useNavigate();
  const { user, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState("");
  const [county, setCounty] = useState("");
  const [subCounty, setSubCounty] = useState("");
  const [ownershipType, setOwnershipType] = useState("");
  const [mealsPerDay, setMealsPerDay] = useState("");
  const [fuelType, setFuelType] = useState("");
  const [consumption, setConsumption] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [numberOfStaff, setNumberOfStaff] = useState("");
  const [transitionNeeds, setTransitionNeeds] = useState("");
  // Assessment scoring fields
  const [numberOfStudents, setNumberOfStudents] = useState("");
  const [monthlyFuelSpend, setMonthlyFuelSpend] = useState("");
  const [hasDedicatedKitchen, setHasDedicatedKitchen] = useState("");
  const [kitchenCondition, setKitchenCondition] = useState("");
  const [financingPreference, setFinancingPreference] = useState("");
  const [financialDecisionMaker, setFinancialDecisionMaker] = useState("");

  const unit = fuelType ? FUEL_UNITS[fuelType] : null;

  const isValid = name.trim() && county && ownershipType && mealsPerDay && fuelType && consumption;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || !user) return;
    setLoading(true);

    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("organisation_id")
        .eq("user_id", user.id)
        .single();

      let institutionId: string | null = null;

      if (profile?.organisation_id) {
        const { data: existing } = await supabase
          .from("institutions")
          .select("id")
          .eq("organisation_id", profile.organisation_id)
          .maybeSingle();
        institutionId = existing?.id ?? null;
      }

      // Calculate assessment score
      const kitchenBool = hasDedicatedKitchen === "yes" ? true : hasDedicatedKitchen === "no" ? false : null;
      const scoringInput = {
        current_fuel: fuelType || null,
        consumption_per_term: consumption ? parseFloat(consumption) : null,
        has_dedicated_kitchen: kitchenBool,
        kitchen_condition: kitchenCondition || null,
        financing_preference: financingPreference || null,
        number_of_students: numberOfStudents ? parseInt(numberOfStudents) : null,
        monthly_fuel_spend: monthlyFuelSpend ? parseFloat(monthlyFuelSpend) : null,
        financial_decision_maker: financialDecisionMaker || null,
      };
      const { score, category } = calculateAssessmentScore(scoringInput);

      const institutionData = {
        name: name.trim(),
        county,
        sub_county: subCounty || null,
        ownership_type: ownershipType,
        meals_per_day: parseInt(mealsPerDay),
        current_fuel: fuelType as any,
        consumption_per_term: parseFloat(consumption),
        consumption_unit: unit,
        contact_person: contactPerson || null,
        contact_phone: contactPhone || null,
        contact_email: contactEmail || null,
        number_of_students: numberOfStudents ? parseInt(numberOfStudents) : null,
        number_of_staff: numberOfStaff ? parseInt(numberOfStaff) : null,
        monthly_fuel_spend: monthlyFuelSpend ? parseFloat(monthlyFuelSpend) : null,
        has_dedicated_kitchen: kitchenBool,
        kitchen_condition: kitchenCondition || null,
        financing_preference: financingPreference || null,
        financial_decision_maker: financialDecisionMaker || null,
        assessment_score: score,
        assessment_category: category,
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

            {/* Field 4 — Number of Students */}
            <div>
              <Label htmlFor="num-students">Number of Students / Residents Fed Daily</Label>
              <Input id="num-students" type="number" min="0" value={numberOfStudents} onChange={e => setNumberOfStudents(e.target.value)} placeholder="e.g. 500" className="mt-1" />
            </div>

            {/* Field 5 — Meals Per Day */}
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

            {/* Field 6 — Current Fuel */}
            <div>
              <Label>Current Fuel Used for Cooking</Label>
              <Select value={fuelType} onValueChange={setFuelType}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select fuel type" /></SelectTrigger>
                <SelectContent>
                  {FUEL_TYPES.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Field 7 — Consumption Per Term */}
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

            {/* Field 8 — Monthly Fuel Spend */}
            <div>
              <Label htmlFor="monthly-spend">Monthly Fuel Spend (KSh)</Label>
              <Input id="monthly-spend" type="number" min="0" value={monthlyFuelSpend} onChange={e => setMonthlyFuelSpend(e.target.value)} placeholder="e.g. 50000" className="mt-1" />
            </div>

            {/* Assessment Fields */}
            <div className="pt-2 border-t">
              <p className="text-sm font-semibold text-muted-foreground mb-3">Readiness Assessment</p>

              {/* Dedicated Kitchen */}
              <div className="space-y-4">
                <div>
                  <Label>Do you have a dedicated kitchen?</Label>
                  <RadioGroup value={hasDedicatedKitchen} onValueChange={setHasDedicatedKitchen} className="flex gap-4 mt-2">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="yes" id="kitchen-yes" />
                      <Label htmlFor="kitchen-yes" className="font-normal">Yes</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="no" id="kitchen-no" />
                      <Label htmlFor="kitchen-no" className="font-normal">No</Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* Kitchen Condition */}
                <div>
                  <Label>Kitchen Condition</Label>
                  <Select value={kitchenCondition} onValueChange={setKitchenCondition}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select condition" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="clean_ready">Clean and ready</SelectItem>
                      <SelectItem value="minor_renovation">Minor renovation needed</SelectItem>
                      <SelectItem value="major_renovation">Major renovation needed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Financing Preference */}
                <div>
                  <Label>Financing Preference</Label>
                  <Select value={financingPreference} onValueChange={setFinancingPreference}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select preference" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="loan">Loan acceptable</SelectItem>
                      <SelectItem value="partial">Partial grant + partial loan</SelectItem>
                      <SelectItem value="grant">Full grant only</SelectItem>
                      <SelectItem value="not_sure">Not sure</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Financial Decision Maker */}
                <div>
                  <Label>Who makes the financial decisions?</Label>
                  <Select value={financialDecisionMaker} onValueChange={setFinancialDecisionMaker}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select decision maker" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="head_teacher">Head Teacher / Principal</SelectItem>
                      <SelectItem value="board_of_governors">Board of Governors</SelectItem>
                      <SelectItem value="religious_body">Religious Sponsoring Body</SelectItem>
                      <SelectItem value="pta">Parent Teacher Association</SelectItem>
                      <SelectItem value="county_government">County Government / Ministry</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="pt-2 border-t">
              <p className="text-sm font-semibold text-muted-foreground mb-3">Contact Information</p>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="contact-person">Contact Person</Label>
                  <Input id="contact-person" value={contactPerson} onChange={e => setContactPerson(e.target.value)} placeholder="e.g. Jane Wanjiku" className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="contact-phone">Phone</Label>
                  <Input id="contact-phone" value={contactPhone} onChange={e => setContactPhone(e.target.value)} placeholder="e.g. 0712345678" className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="contact-email">Email</Label>
                  <Input id="contact-email" type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder="e.g. info@school.ac.ke" className="mt-1" />
                </div>
              </div>
            </div>

            {/* Location */}
            <div className="pt-2 border-t">
              <p className="text-sm font-semibold text-muted-foreground mb-3">Location</p>
              <div>
                <Label htmlFor="sub-county">Sub-County</Label>
                <Input id="sub-county" value={subCounty} onChange={e => setSubCounty(e.target.value)} placeholder="e.g. Isiolo Central" className="mt-1" />
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
