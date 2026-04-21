import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { notifyAdmins, notifyFunders } from "@/lib/notifications";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface Props {
  institutionId: string;
  institutionName: string;
  county: string;
  institutionType: string | null;
  currentFuel: string | null;
  monthlySpend: number | null;
  studentsCount: number | null;
  currentInterest: string | null;
  onUpdate: (value: string) => void;
}

const FUEL_LABELS: Record<string, string> = {
  firewood: "Firewood", charcoal: "Charcoal", lpg: "LPG",
  biogas: "Biogas", electric: "Electric (Induction)", other: "Biomass Pellets",
};

export default function TransitionInterest({
  institutionId, institutionName, county, institutionType,
  currentFuel, monthlySpend, studentsCount, currentInterest, onUpdate,
}: Props) {
  const [selected, setSelected] = useState<string | null>(currentInterest);
  const [saving, setSaving] = useState(false);

  const handleSelect = async (value: string) => {
    setSelected(value);
    setSaving(true);

    try {
      const { error } = await supabase
        .from("institutions")
        .update({ transition_interest: value } as any)
        .eq("id", institutionId);
      if (error) throw error;

      const fuelLabel = currentFuel ? FUEL_LABELS[currentFuel] || currentFuel : "Unknown";
      const spendStr = monthlySpend ? `KSh ${monthlySpend.toLocaleString()}` : "Not specified";
      const studStr = studentsCount?.toLocaleString() || "Not specified";

      if (value === "yes") {
        await notifyAdmins(
          "Institution Ready to Transition",
          `${institutionName} in ${county} has confirmed they are willing to transition to clean cooking methods. Institution Type: ${institutionType || "N/A"}. Current Fuel: ${fuelLabel}. Monthly Spend: ${spendStr}. Students Fed: ${studStr}. Please review and create an opportunity.`
        );
        await notifyFunders(
          "New Transition Opportunity",
          `${institutionName} in ${county} is willing to transition to clean cooking. They are seeking funding support. Kindly reach out if you are willing to fund them.`
        );
        toast.success("Thank you! Your interest has been recorded and relevant parties have been notified.");
      } else if (value === "maybe") {
        await notifyAdmins(
          "Institution Showing Interest",
          `${institutionName} in ${county} has shown interest in transitioning to clean cooking but has not yet committed. Institution Type: ${institutionType || "N/A"}. Current Fuel: ${fuelLabel}. Monthly Spend: ${spendStr}. Students Fed: ${studStr}. Kindly reach out for more information.`
        );
        toast.success("Thank you! Your interest has been noted.");
      } else {
        toast("Thank you. You can update this at any time.");
      }

      onUpdate(value);
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const options = [
    { value: "yes", label: "YES", color: "bg-emerald-500 hover:bg-emerald-600 text-white" },
    { value: "maybe", label: "MAYBE", color: "bg-amber-500 hover:bg-amber-600 text-white" },
    { value: "no", label: "NO", color: "bg-muted hover:bg-muted/80 text-foreground" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Would you like to transition to clean cooking?</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-3">
          {options.map((opt) => (
            <Button
              key={opt.value}
              onClick={() => handleSelect(opt.value)}
              disabled={saving}
              className={`flex-1 h-12 text-base font-bold rounded-full transition-all ${
                selected === opt.value
                  ? `${opt.color} ring-2 ring-offset-2 ring-primary`
                  : `${opt.color} opacity-70`
              }`}
            >
              {saving && selected === opt.value ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                opt.label
              )}
            </Button>
          ))}
        </div>
        {selected && (
          <p className="text-xs text-muted-foreground mt-3 text-center">
            Your selection: <strong className="capitalize">{selected}</strong>. You can change this at any time.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
