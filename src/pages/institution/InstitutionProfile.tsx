import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Building2, Pencil, Save, X, Loader2, Users, UserCheck, Clock, Camera, Banknote, ChefHat, Landmark, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { calculateAssessmentScore } from "@/lib/assessmentScoring";
import TransitionNeedsSection from "@/components/institution/TransitionNeedsSection";

const FUEL_LABELS: Record<string, string> = {
  firewood: "Firewood", charcoal: "Charcoal", lpg: "LPG",
  biogas: "Biogas", electric: "Electric (Induction)", other: "Biomass Pellets",
};

const KITCHEN_CONDITION_LABELS: Record<string, string> = {
  clean_ready: "Clean and ready",
  minor_renovation: "Minor renovation needed",
  major_renovation: "Major renovation needed",
};

const FINANCING_LABELS: Record<string, string> = {
  loan: "Loan acceptable",
  partial: "Partial grant + partial loan",
  grant: "Full grant only",
  not_sure: "Not sure",
};

const DECISION_MAKER_LABELS: Record<string, string> = {
  head_teacher: "Head Teacher / Principal",
  board_of_governors: "Board of Governors",
  religious_body: "Religious Sponsoring Body",
  pta: "Parent Teacher Association",
  county_government: "County Government / Ministry",
};

interface InstitutionData {
  id: string;
  name: string;
  county: string;
  ownership_type: string | null;
  meals_per_day: number | null;
  current_fuel: string | null;
  consumption_per_term: number | null;
  consumption_unit: string | null;
  number_of_students: number | null;
  number_of_staff: number | null;
  cooking_time_minutes: number | null;
  kitchen_photo_url: string | null;
  contact_person: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  monthly_fuel_spend: number | null;
  has_dedicated_kitchen: boolean | null;
  kitchen_condition: string | null;
  financing_preference: string | null;
  financial_decision_maker: string | null;
  transition_needs: string | null;
}

export default function InstitutionProfile() {
  const { user } = useAuth();
  const [institution, setInstitution] = useState<InstitutionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Editable fields
  const [numStudents, setNumStudents] = useState("");
  const [numStaff, setNumStaff] = useState("");
  const [cookingTimeHours, setCookingTimeHours] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [contactPerson, setContactPerson] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [monthlyFuelSpend, setMonthlyFuelSpend] = useState("");
  const [hasDedicatedKitchen, setHasDedicatedKitchen] = useState("");
  const [kitchenCondition, setKitchenCondition] = useState("");
  const [financingPreference, setFinancingPreference] = useState("");
  const [financialDecisionMaker, setFinancialDecisionMaker] = useState("");
  const [transitionNeeds, setTransitionNeeds] = useState("");

  useEffect(() => {
    if (!user) return;
    (async () => {
      let { data } = await supabase
        .from("institutions")
        .select("*")
        .eq("created_by", user.id)
        .limit(1)
        .maybeSingle();

      if (!data) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("organisation_id")
          .eq("user_id", user.id)
          .single();
        if (profile?.organisation_id) {
          const { data: orgInst } = await supabase
            .from("institutions")
            .select("*")
            .eq("organisation_id", profile.organisation_id)
            .limit(1)
            .maybeSingle();
          data = orgInst;
        }
      }
      if (data) {
        const inst = data as unknown as InstitutionData;
        setInstitution(inst);
        populateFields(inst);
      }
      setLoading(false);
    })();
  }, [user]);

  const populateFields = (inst: InstitutionData) => {
    setNumStudents(inst.number_of_students?.toString() || "");
    setNumStaff(inst.number_of_staff?.toString() || "");
    setCookingTimeHours(inst.cooking_time_minutes ? (inst.cooking_time_minutes / 60).toString() : "");
    setPhotoPreview(inst.kitchen_photo_url || null);
    setContactPerson(inst.contact_person || "");
    setContactPhone(inst.contact_phone || "");
    setContactEmail(inst.contact_email || "");
    setMonthlyFuelSpend(inst.monthly_fuel_spend?.toString() || "");
    setHasDedicatedKitchen(inst.has_dedicated_kitchen === true ? "yes" : inst.has_dedicated_kitchen === false ? "no" : "");
    setKitchenCondition(inst.kitchen_condition || "");
    setFinancingPreference(inst.financing_preference || "");
    setFinancialDecisionMaker(inst.financial_decision_maker || "");
    setTransitionNeeds(inst.transition_needs || "");
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleSave = async () => {
    if (!institution) return;
    setSaving(true);
    try {
      let kitchenPhotoUrl = institution.kitchen_photo_url;

      if (photoFile) {
        const ext = photoFile.name.split(".").pop();
        const path = `kitchen-photos/${institution.id}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from("institution-assets")
          .upload(path, photoFile, { upsert: true });
        if (!uploadErr) {
          const { data: urlData } = supabase.storage
            .from("institution-assets")
            .getPublicUrl(path);
          kitchenPhotoUrl = urlData.publicUrl;
        }
      }

      const kitchenBool = hasDedicatedKitchen === "yes" ? true : hasDedicatedKitchen === "no" ? false : null;

      // Recalculate assessment score
      const { score, category } = calculateAssessmentScore({
        current_fuel: institution.current_fuel,
        consumption_per_term: institution.consumption_per_term,
        has_dedicated_kitchen: kitchenBool,
        kitchen_condition: kitchenCondition || null,
        financing_preference: financingPreference || null,
        number_of_students: numStudents ? parseInt(numStudents) : null,
        monthly_fuel_spend: monthlyFuelSpend ? parseFloat(monthlyFuelSpend) : null,
        financial_decision_maker: financialDecisionMaker || null,
      });

      const updateData = {
        number_of_students: numStudents ? parseInt(numStudents) : null,
        number_of_staff: numStaff ? parseInt(numStaff) : null,
        cooking_time_minutes: cookingTimeHours ? Math.round(parseFloat(cookingTimeHours) * 60) : null,
        kitchen_photo_url: kitchenPhotoUrl,
        contact_person: contactPerson || null,
        contact_phone: contactPhone || null,
        contact_email: contactEmail || null,
        monthly_fuel_spend: monthlyFuelSpend ? parseFloat(monthlyFuelSpend) : null,
        has_dedicated_kitchen: kitchenBool,
        kitchen_condition: kitchenCondition || null,
        financing_preference: financingPreference || null,
        financial_decision_maker: financialDecisionMaker || null,
        transition_needs: transitionNeeds || null,
        assessment_score: score,
        assessment_category: category,
      };

      const { error } = await supabase
        .from("institutions")
        .update(updateData)
        .eq("id", institution.id);

      if (error) throw error;

      setInstitution(prev => prev ? { ...prev, ...updateData } : null);
      setPhotoFile(null);
      setEditing(false);
      toast.success("Profile updated! Your readiness score has been recalculated.");
    } catch (err: any) {
      toast.error(err.message || "Failed to update");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (institution) populateFields(institution);
    setPhotoFile(null);
    setEditing(false);
  };

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display font-bold">My Institution</h1>
        {!editing ? (
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            <Pencil className="h-4 w-4 mr-2" />
            Edit Details
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={handleCancel}>
              <X className="h-4 w-4 mr-1" /> Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
              Save
            </Button>
          </div>
        )}
      </div>

      {/* Setup Details (read-only) */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-3">
          <Building2 className="h-5 w-5 text-primary" />
          <div>
            <CardTitle>{institution.name}</CardTitle>
            <CardDescription>Setup details from registration</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">County</p>
              <p className="font-medium">{institution.county}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Institution Type</p>
              <p className="font-medium capitalize">{institution.ownership_type || "—"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Meals Per Day</p>
              <p className="font-medium">{institution.meals_per_day || "—"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Current Fuel</p>
              <Badge variant="secondary">
                {institution.current_fuel ? FUEL_LABELS[institution.current_fuel] || institution.current_fuel : "—"}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Consumption Per Term</p>
              <p className="font-medium">
                {institution.consumption_per_term ?? "—"} {institution.consumption_unit || ""}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contact Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Contact Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div>
              <Label className="text-sm text-muted-foreground">Contact Person</Label>
              {editing ? (
                <Input value={contactPerson} onChange={e => setContactPerson(e.target.value)} placeholder="e.g. Jane Wanjiku" className="mt-1" />
              ) : (
                <p className="text-sm font-medium mt-1">{institution.contact_person || "Not set"}</p>
              )}
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Phone</Label>
              {editing ? (
                <Input value={contactPhone} onChange={e => setContactPhone(e.target.value)} placeholder="e.g. 0712345678" className="mt-1" />
              ) : (
                <p className="text-sm font-medium mt-1">{institution.contact_phone || "Not set"}</p>
              )}
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Email</Label>
              {editing ? (
                <Input type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder="e.g. info@school.ac.ke" className="mt-1" />
              ) : (
                <p className="text-sm font-medium mt-1">{institution.contact_email || "Not set"}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Editable Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Operational Details</CardTitle>
          <CardDescription>
            {editing ? "Update your institution's information" : "Operational information about your institution"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <Label className="text-sm text-muted-foreground">Number of Students</Label>
                {editing ? (
                  <Input type="number" min="0" value={numStudents} onChange={e => setNumStudents(e.target.value)} placeholder="e.g. 500" className="mt-1" />
                ) : (
                  <p className="text-lg font-semibold">{institution.number_of_students || "Not set"}</p>
                )}
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                <UserCheck className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <Label className="text-sm text-muted-foreground">Number of Staff</Label>
                {editing ? (
                  <Input type="number" min="0" value={numStaff} onChange={e => setNumStaff(e.target.value)} placeholder="e.g. 30" className="mt-1" />
                ) : (
                  <p className="text-lg font-semibold">{institution.number_of_staff || "Not set"}</p>
                )}
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <Label className="text-sm text-muted-foreground">Cooking Time (hours/session)</Label>
                {editing ? (
                  <Input type="number" step="0.5" min="0" value={cookingTimeHours} onChange={e => setCookingTimeHours(e.target.value)} placeholder="e.g. 2" className="mt-1" />
                ) : (
                  <p className="text-lg font-semibold">{institution.cooking_time_minutes ? `${(institution.cooking_time_minutes / 60).toFixed(1)} hrs` : "Not set"}</p>
                )}
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                <Banknote className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <Label className="text-sm text-muted-foreground">Monthly Fuel Spend (KSh)</Label>
                {editing ? (
                  <Input type="number" min="0" value={monthlyFuelSpend} onChange={e => setMonthlyFuelSpend(e.target.value)} placeholder="e.g. 50000" className="mt-1" />
                ) : (
                  <p className="text-lg font-semibold">{institution.monthly_fuel_spend ? `KSh ${institution.monthly_fuel_spend.toLocaleString()}` : "Not set"}</p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Kitchen & Assessment Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Kitchen & Readiness Assessment</CardTitle>
          <CardDescription>
            {editing ? "Update your kitchen and readiness details — your score will be recalculated on save" : "These details feed into your readiness score"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Dedicated Kitchen */}
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                <ChefHat className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <Label className="text-sm text-muted-foreground">Dedicated Kitchen</Label>
                {editing ? (
                  <RadioGroup value={hasDedicatedKitchen} onValueChange={setHasDedicatedKitchen} className="flex gap-4 mt-2">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="yes" id="dk-yes" />
                      <Label htmlFor="dk-yes" className="font-normal">Yes</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="no" id="dk-no" />
                      <Label htmlFor="dk-no" className="font-normal">No</Label>
                    </div>
                  </RadioGroup>
                ) : (
                  <p className="text-lg font-semibold">{institution.has_dedicated_kitchen === true ? "Yes" : institution.has_dedicated_kitchen === false ? "No" : "Not set"}</p>
                )}
              </div>
            </div>

            {/* Kitchen Condition */}
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <Label className="text-sm text-muted-foreground">Kitchen Condition</Label>
                {editing ? (
                  <Select value={kitchenCondition} onValueChange={setKitchenCondition}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select condition" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="clean_ready">Clean and ready</SelectItem>
                      <SelectItem value="minor_renovation">Minor renovation needed</SelectItem>
                      <SelectItem value="major_renovation">Major renovation needed</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-lg font-semibold">{institution.kitchen_condition ? KITCHEN_CONDITION_LABELS[institution.kitchen_condition] || institution.kitchen_condition : "Not set"}</p>
                )}
              </div>
            </div>

            {/* Financing Preference */}
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                <CreditCard className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <Label className="text-sm text-muted-foreground">Financing Preference</Label>
                {editing ? (
                  <Select value={financingPreference} onValueChange={setFinancingPreference}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select preference" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="loan">Loan acceptable</SelectItem>
                      <SelectItem value="partial">Partial grant + partial loan</SelectItem>
                      <SelectItem value="grant">Full grant only</SelectItem>
                      <SelectItem value="not_sure">Not sure</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-lg font-semibold">{institution.financing_preference ? FINANCING_LABELS[institution.financing_preference] || institution.financing_preference : "Not set"}</p>
                )}
              </div>
            </div>

            {/* Financial Decision Maker */}
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                <Landmark className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <Label className="text-sm text-muted-foreground">Financial Decision Maker</Label>
                {editing ? (
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
                ) : (
                  <p className="text-lg font-semibold">{institution.financial_decision_maker ? DECISION_MAKER_LABELS[institution.financial_decision_maker] || institution.financial_decision_maker : "Not set"}</p>
                )}
              </div>
            </div>
          </div>

          {/* Kitchen Photo */}
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-1">
              <Camera className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <Label className="text-sm text-muted-foreground">Kitchen Photo</Label>
              {editing ? (
                <div className="mt-1">
                  <Input type="file" accept="image/*" onChange={handlePhotoChange} />
                  {photoPreview && (
                    <img src={photoPreview} alt="Kitchen preview" className="mt-2 rounded-lg max-h-40 object-cover" />
                  )}
                </div>
              ) : (
                photoPreview ? (
                  <img src={photoPreview} alt="Kitchen" className="mt-1 rounded-lg max-h-40 object-cover" />
                ) : (
                  <p className="text-lg font-semibold text-muted-foreground">No photo uploaded</p>
                )
              )}
            </div>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
