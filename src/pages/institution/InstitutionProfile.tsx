import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Building2, Pencil, Save, X, Loader2, Users, UserCheck, Clock, Camera } from "lucide-react";
import { toast } from "sonner";

const FUEL_LABELS: Record<string, string> = {
  firewood: "Firewood", charcoal: "Charcoal", lpg: "LPG",
  biogas: "Biogas", electric: "Electric (Induction)", other: "Biomass Pellets",
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
  const [cookingTime, setCookingTime] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("institutions")
        .select("*")
        .eq("created_by", user.id)
        .maybeSingle();
      if (data) {
        const inst = data as unknown as InstitutionData;
        setInstitution(inst);
        setNumStudents(inst.number_of_students?.toString() || "");
        setNumStaff(inst.number_of_staff?.toString() || "");
        setCookingTime((inst.cooking_time_minutes as number)?.toString() || "");
        setPhotoPreview(inst.kitchen_photo_url || null);
      }
      setLoading(false);
    })();
  }, [user]);

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

      // Upload photo if changed
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

      const { error } = await supabase
        .from("institutions")
        .update({
          number_of_students: numStudents ? parseInt(numStudents) : null,
          number_of_staff: numStaff ? parseInt(numStaff) : null,
          cooking_time_minutes: cookingTime ? parseInt(cookingTime) : null,
          kitchen_photo_url: kitchenPhotoUrl,
        })
        .eq("id", institution.id);

      if (error) throw error;

      setInstitution(prev => prev ? {
        ...prev,
        number_of_students: numStudents ? parseInt(numStudents) : null,
        number_of_staff: numStaff ? parseInt(numStaff) : null,
        cooking_time_minutes: cookingTime ? parseInt(cookingTime) : null,
        kitchen_photo_url: kitchenPhotoUrl,
      } : null);

      setPhotoFile(null);
      setEditing(false);
      toast.success("Institution updated successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to update");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (institution) {
      setNumStudents(institution.number_of_students?.toString() || "");
      setNumStaff(institution.number_of_staff?.toString() || "");
      setCookingTime((institution.cooking_time_minutes as number)?.toString() || "");
      setPhotoPreview(institution.kitchen_photo_url || null);
      setPhotoFile(null);
    }
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

      {/* Editable Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Additional Details</CardTitle>
          <CardDescription>
            {editing ? "Update your institution's additional information" : "Extra information about your institution"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Number of Students */}
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <Label className="text-sm text-muted-foreground">Number of Students</Label>
                {editing ? (
                  <Input
                    type="number" min="0" value={numStudents}
                    onChange={e => setNumStudents(e.target.value)}
                    placeholder="e.g. 500" className="mt-1"
                  />
                ) : (
                  <p className="text-lg font-semibold">{institution.number_of_students || "Not set"}</p>
                )}
              </div>
            </div>

            {/* Number of Staff */}
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                <UserCheck className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <Label className="text-sm text-muted-foreground">Number of Staff</Label>
                {editing ? (
                  <Input
                    type="number" min="0" value={numStaff}
                    onChange={e => setNumStaff(e.target.value)}
                    placeholder="e.g. 30" className="mt-1"
                  />
                ) : (
                  <p className="text-lg font-semibold">{institution.number_of_staff || "Not set"}</p>
                )}
              </div>
            </div>

            {/* Cooking Time */}
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <Label className="text-sm text-muted-foreground">Time Spent Cooking (minutes per session)</Label>
                {editing ? (
                  <Input
                    type="number" min="0" value={cookingTime}
                    onChange={e => setCookingTime(e.target.value)}
                    placeholder="e.g. 120" className="mt-1"
                  />
                ) : (
                  <p className="text-lg font-semibold">
                    {institution.cooking_time_minutes ? `${institution.cooking_time_minutes} mins` : "Not set"}
                  </p>
                )}
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
          </div>
        </CardContent>
      </Card>
      {/* Transition Needs */}
      <TransitionNeedsSection institutionId={institution.id} />
    </div>
  );
}
