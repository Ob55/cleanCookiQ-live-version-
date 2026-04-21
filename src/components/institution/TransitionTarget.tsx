import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Leaf } from "lucide-react";
import { notifyAdmins } from "@/lib/notifications";

interface Props {
  institutionId: string;
  institutionName: string;
  county: string;
  currentTarget: string | null;
  onUpdate: (value: string) => void;
}

export const TRANSITION_TARGETS: { value: string; label: string; desc: string }[] = [
  { value: "steam", label: "Steam Cooking", desc: "Central steam boiler for large kitchens" },
  { value: "lpg", label: "LPG", desc: "Liquefied petroleum gas" },
  { value: "biogas", label: "Biogas", desc: "On-site biogas digester" },
  { value: "electric", label: "Electric / Induction", desc: "Grid or solar-powered induction cookers" },
  { value: "ethanol", label: "Ethanol", desc: "Liquid bioethanol stoves" },
  { value: "biomass_pellets", label: "Biomass Pellets", desc: "Compressed clean biomass pellets" },
  { value: "solar_hybrid", label: "Solar Hybrid", desc: "Solar + electric/LPG hybrid" },
  { value: "other", label: "Other / Undecided", desc: "I'd like the CleanCookiQ team to advise" },
];

export const TRANSITION_TARGET_LABELS: Record<string, string> = Object.fromEntries(
  TRANSITION_TARGETS.map(t => [t.value, t.label])
);

export default function TransitionTarget({ institutionId, institutionName, county, currentTarget, onUpdate }: Props) {
  const [selected, setSelected] = useState<string>(currentTarget ?? "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!selected) { toast.error("Pick a transition option first"); return; }
    setSaving(true);
    const { error } = await supabase
      .from("institutions")
      .update({ transition_target_fuel: selected } as any)
      .eq("id", institutionId);

    if (error) {
      toast.error(error.message);
      setSaving(false);
      return;
    }

    const label = TRANSITION_TARGET_LABELS[selected] ?? selected;
    await notifyAdmins(
      "Institution Picked a Transition Target",
      `${institutionName} in ${county} selected "${label}" as their preferred clean-cooking transition. Review and match them with relevant providers.`
    );

    toast.success(`Saved — you chose ${label}`);
    onUpdate(selected);
    setSaving(false);
  };

  const currentLabel = currentTarget ? TRANSITION_TARGET_LABELS[currentTarget] ?? currentTarget : null;
  const chosen = TRANSITION_TARGETS.find(t => t.value === selected);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Leaf className="h-5 w-5 text-primary" /> Preferred Transition Method
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Which clean-cooking solution do you want to transition to? Admin and matched providers will see this selection.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <Select value={selected} onValueChange={setSelected}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Select a transition method" />
            </SelectTrigger>
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
          <Button onClick={save} disabled={saving || !selected || selected === currentTarget} className="bg-primary text-primary-foreground">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {currentTarget ? "Update" : "Save"}
          </Button>
        </div>
        {chosen && (
          <p className="text-xs text-muted-foreground">
            {chosen.desc}
          </p>
        )}
        {currentLabel && (
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
            <span className="text-muted-foreground">Current choice on record: </span>
            <strong className="text-primary">{currentLabel}</strong>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
