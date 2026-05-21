import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePersistedState, clearPersisted } from "@/hooks/usePersistedForm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { calculateAssessmentScore, loadReadinessWeights } from "@/lib/assessmentScoring";
import { deriveStoredImpact } from "@/lib/institutionDerived";
import { sendEmail, emailInstitutionWelcome } from "@/lib/emailService";
import CountyCombobox from "@/components/CountyCombobox";
import { TRANSITION_TARGETS } from "@/components/institution/TransitionTarget";
import { Checkbox } from "@/components/ui/checkbox";

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

// Pre-filled needs an institution can tick. "Other" reveals a free-text
// box so anything not in this list can still be captured.
const TRANSITION_NEEDS_OPTIONS = [
  "Equipment (stove / cooker / digester)",
  "Installation support",
  "Staff training",
  "Maintenance contract",
  "Kitchen renovation / extension",
  "Financing assistance (loan / grant)",
  "Energy audit & assessment",
  "Carbon credit registration",
  "Fuel supply contract",
];

export default function InstitutionSetup() {
  const navigate = useNavigate();
  const { user, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  // If setup already done, skip to dashboard
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("institutions")
        .select("id, setup_completed")
        .eq("created_by", user.id)
        .limit(1)
        .maybeSingle();
      if (data?.setup_completed) {
        navigate("/institution/dashboard", { replace: true });
      } else {
        setChecking(false);
      }
    })();
  }, [user, navigate]);

  // Per-user draft key so switching accounts on the same machine doesn't
  // pull up a stranger's half-filled form.
  const draftKey = `institution-setup-draft:${user?.id ?? "anon"}`;
  const [name, setName] = usePersistedState(`${draftKey}:name`, "");
  const [county, setCounty] = usePersistedState(`${draftKey}:county`, "");
  const [subCounty, setSubCounty] = usePersistedState(`${draftKey}:subCounty`, "");
  const [ownershipType, setOwnershipType] = usePersistedState(`${draftKey}:ownershipType`, "");
  const [institutionCategory, setInstitutionCategory] = usePersistedState(`${draftKey}:institutionCategory`, "");
  const [schoolType, setSchoolType] = usePersistedState(`${draftKey}:schoolType`, "");
  const [mealsPerDay, setMealsPerDay] = usePersistedState(`${draftKey}:mealsPerDay`, "");
  const [fuelType, setFuelType] = usePersistedState(`${draftKey}:fuelType`, "");
  const [consumption, setConsumption] = usePersistedState(`${draftKey}:consumption`, "");
  const [cookingTimeHours, setCookingTimeHours] = usePersistedState(`${draftKey}:cookingTimeHours`, "");
  const [contactPerson, setContactPerson] = usePersistedState(`${draftKey}:contactPerson`, "");
  const [contactPhone, setContactPhone] = usePersistedState(`${draftKey}:contactPhone`, "");
  const [contactEmail, setContactEmail] = usePersistedState(`${draftKey}:contactEmail`, "");
  const [numberOfStaff, setNumberOfStaff] = usePersistedState(`${draftKey}:numberOfStaff`, "");
  // Transition target — preferred clean fuel to switch to
  const [transitionTarget, setTransitionTarget] = usePersistedState(`${draftKey}:transitionTarget`, "");
  // Transition needs — checkbox set + optional manual text. Saved as a
  // single semicolon-joined string in the existing transition_needs column.
  const [transitionNeedsChoices, setTransitionNeedsChoices] = usePersistedState<string[]>(`${draftKey}:transitionNeedsChoices`, []);
  const [transitionNeedsOther, setTransitionNeedsOther] = usePersistedState(`${draftKey}:transitionNeedsOther`, "");
  // Assessment scoring fields
  const [numberOfStudents, setNumberOfStudents] = usePersistedState(`${draftKey}:numberOfStudents`, "");
  const [monthlyFuelSpend, setMonthlyFuelSpend] = usePersistedState(`${draftKey}:monthlyFuelSpend`, "");
  const [hasDedicatedKitchen, setHasDedicatedKitchen] = usePersistedState(`${draftKey}:hasDedicatedKitchen`, "");
  const [kitchenCondition, setKitchenCondition] = usePersistedState(`${draftKey}:kitchenCondition`, "");
  const [financingPreference, setFinancingPreference] = usePersistedState(`${draftKey}:financingPreference`, "");
  const [financialDecisionMaker, setFinancialDecisionMaker] = usePersistedState(`${draftKey}:financialDecisionMaker`, "");

  const clearDraft = () => {
    [
      "name", "county", "subCounty", "ownershipType", "institutionCategory",
      "schoolType", "mealsPerDay", "fuelType", "consumption", "cookingTimeHours",
      "contactPerson", "contactPhone", "contactEmail", "numberOfStaff",
      "transitionTarget", "transitionNeedsChoices", "transitionNeedsOther",
      "numberOfStudents", "monthlyFuelSpend", "hasDedicatedKitchen",
      "kitchenCondition", "financingPreference", "financialDecisionMaker",
    ].forEach((field) => clearPersisted(`${draftKey}:${field}`));
  };

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
        // profile.organisation_id stores the institution's primary key
        const { data: existing } = await supabase
          .from("institutions")
          .select("id")
          .eq("id", profile.organisation_id)
          .maybeSingle();
        institutionId = existing?.id ?? null;
      }

      // Also try by created_by if not found via profile
      if (!institutionId) {
        const { data: byCreator } = await supabase
          .from("institutions")
          .select("id")
          .eq("created_by", user.id)
          .limit(1)
          .maybeSingle();
        institutionId = byCreator?.id ?? null;
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
      const weights = await loadReadinessWeights();
      const { score, category } = calculateAssessmentScore(scoringInput, weights);

      const derived = deriveStoredImpact({
        current_fuel: fuelType || null,
        monthly_fuel_spend: monthlyFuelSpend ? parseFloat(monthlyFuelSpend) : null,
        consumption_per_term: consumption ? parseFloat(consumption) : null,
      });

      const institutionData = {
        name: name.trim(),
        county,
        sub_county: subCounty || null,
        ownership_type: ownershipType,
        meals_per_day: parseInt(mealsPerDay),
        school_type: schoolType || null,
        current_fuel: fuelType as any,
        consumption_per_term: parseFloat(consumption),
        consumption_unit: unit,
        cooking_time_minutes: cookingTimeHours ? Math.round(parseFloat(cookingTimeHours) * 60) : null,
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
        transition_target_fuel: transitionTarget || null,
        transition_needs: (() => {
          const parts = [...transitionNeedsChoices];
          if (transitionNeedsOther.trim()) parts.push(transitionNeedsOther.trim());
          return parts.length ? parts.join("; ") : null;
        })(),
        assessment_score: score,
        assessment_category: category,
        annual_savings_ksh: derived.annual_savings_ksh,
        co2_reduction_tonnes_pa: derived.co2_reduction_tonnes_pa,
        recommended_solution: derived.recommended_solution,
        setup_completed: true,
        created_by: user.id,
      };

      // The DB trigger assigns institution_code on INSERT. We read it back so
      // we can show it to the user (toast) and include it in the welcome email.
      let assignedCode: string | null = null;
      if (institutionId) {
        const { data: updated, error: updateErr } = await supabase
          .from("institutions")
          .update(institutionData)
          .eq("id", institutionId)
          .select("institution_code")
          .single();
        if (updateErr) throw new Error(updateErr.message);
        assignedCode = updated?.institution_code ?? null;
        // Ensure profile is linked
        if (!profile?.organisation_id) {
          await supabase.from("profiles").update({ organisation_id: institutionId }).eq("user_id", user.id);
        }
      } else {
        const instType = institutionCategory === "school" ? "school"
          : institutionCategory === "hospital" ? "hospital"
          : institutionCategory === "correctional" ? "prison"
          : "other";
        const { data: newInst, error: insertErr } = await supabase
          .from("institutions")
          .insert({ ...institutionData, institution_type: instType as any })
          .select("id, institution_code")
          .single();
        if (insertErr) throw new Error(insertErr.message);
        assignedCode = newInst?.institution_code ?? null;
        // Link profile to this institution so dashboard can always find it
        if (newInst?.id) {
          await supabase.from("profiles").update({ organisation_id: newInst.id }).eq("user_id", user.id);
        }
      }

      await refreshProfile();

      // Send welcome email
      const recipientEmail = contactEmail || user.email;
      if (recipientEmail) {
        await sendEmail({
          to: recipientEmail,
          subject: "We see you registered on CleanCookIQ",
          html: emailInstitutionWelcome(
            user.user_metadata?.full_name || contactPerson || "",
            name.trim(),
            fuelType,
            assignedCode,
          ),
        });
      }

      if (assignedCode) {
        toast.success(`Institution setup complete! Your code: ${assignedCode}`, {
          description: "Save this code — quote it in any email or support ticket so we can find your record instantly.",
          duration: 10000,
        });
      } else {
        toast.success("Institution setup complete!");
      }
      clearDraft();
      setTimeout(() => navigate("/institution/dashboard"), 100);
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    } finally {
      setLoading(false);
    }
  };

  if (checking) return null;

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
              <CountyCombobox value={county} onValueChange={setCounty} />
            </div>

            {/* Field 3 — Ownership Type */}
            <div>
              <Label>Ownership Type</Label>
              <Select value={ownershipType} onValueChange={setOwnershipType}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select ownership type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="private">Private</SelectItem>
                  <SelectItem value="government">Government</SelectItem>
                  <SelectItem value="faith_based">Faith-based</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Field 3b — Institution Category */}
            <div>
              <Label>Institution Type</Label>
              <Select value={institutionCategory} onValueChange={(v) => { setInstitutionCategory(v); setSchoolType(""); }}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select institution type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="school">School</SelectItem>
                  <SelectItem value="hospital">Hospital</SelectItem>
                  <SelectItem value="correctional">Correctional</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Field 3c — School Type (conditional) */}
            {institutionCategory === "school" && (
              <div>
                <Label>School Type</Label>
                <Select value={schoolType} onValueChange={setSchoolType}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select school type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">Day</SelectItem>
                    <SelectItem value="boarding">Boarding</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Field 4 — Number of Students */}
            <div>
              <Label htmlFor="num-students">Number of Students / Residents Fed Daily</Label>
              <Input id="num-students" type="number" min="0" value={numberOfStudents} onChange={e => setNumberOfStudents(e.target.value)} placeholder="e.g. 500" className="mt-1" />
            </div>

            {/* Field 4b — Number of Staff */}
            <div>
              <Label htmlFor="num-staff">Number of Staff</Label>
              <Input id="num-staff" type="number" min="0" value={numberOfStaff} onChange={e => setNumberOfStaff(e.target.value)} placeholder="e.g. 30" className="mt-1" />
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

            {/* Field 9 — Cooking Time */}
            <div>
              <Label htmlFor="cooking-time">Cooking Time Per Session (Hours)</Label>
              <Input id="cooking-time" type="number" step="0.5" min="0" value={cookingTimeHours} onChange={e => setCookingTimeHours(e.target.value)} placeholder="e.g. 2" className="mt-1" />
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

            {/* Transition Target + Needs */}
            <div className="pt-2 border-t space-y-4">
              <p className="text-sm font-semibold text-muted-foreground">Transition Plan</p>

              {/* Transition Target — dropdown */}
              <div>
                <Label>Preferred clean-cooking option you're transitioning to</Label>
                <Select value={transitionTarget} onValueChange={setTransitionTarget}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Pick a transition method (or 'Undecided')" /></SelectTrigger>
                  <SelectContent>
                    {TRANSITION_TARGETS.map(t => (
                      <SelectItem key={t.value} value={t.value}>
                        <div className="flex flex-col">
                          <span className="font-medium">{t.label}</span>
                          <span className="text-xs text-muted-foreground">{t.desc}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Transition Needs — checkbox group + other-with-text-fallback */}
              <div>
                <Label>What support do you need? <span className="text-muted-foreground font-normal">(tick all that apply)</span></Label>
                <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {TRANSITION_NEEDS_OPTIONS.map((opt) => {
                    const checked = transitionNeedsChoices.includes(opt);
                    return (
                      <label
                        key={opt}
                        className={`flex items-start gap-2 rounded-lg border p-3 cursor-pointer transition-colors ${
                          checked ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40"
                        }`}
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(v) => {
                            setTransitionNeedsChoices((curr) =>
                              v === true ? [...curr, opt] : curr.filter((x) => x !== opt)
                            );
                          }}
                          className="mt-0.5"
                        />
                        <span className="text-sm leading-snug">{opt}</span>
                      </label>
                    );
                  })}
                </div>
                <div className="mt-3">
                  <Label htmlFor="needs-other" className="text-xs text-muted-foreground font-normal">
                    Something else? Type it here:
                  </Label>
                  <Textarea
                    id="needs-other"
                    value={transitionNeedsOther}
                    onChange={e => setTransitionNeedsOther(e.target.value)}
                    placeholder="e.g. We have an existing biogas digester that needs upgrading…"
                    rows={2}
                    className="mt-1"
                  />
                </div>
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
