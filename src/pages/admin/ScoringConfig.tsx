import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Save, RotateCcw } from "lucide-react";
import { useState, useEffect } from "react";
import {
  DEFAULT_READINESS_WEIGHTS,
  READINESS_WEIGHT_KEYS,
  type ReadinessWeights,
} from "@/lib/assessmentScoring";

const INPUT_LABELS: Record<keyof ReadinessWeights, { label: string; desc: string }> = {
  current_fuel: { label: "Current cooking fuel", desc: "Electric scores highest, firewood lowest" },
  consumption_per_term: { label: "Consumption per term", desc: "Higher fuel use → larger payoff to switching" },
  has_dedicated_kitchen: { label: "Kitchen exists", desc: "Whether the institution has a dedicated kitchen at all" },
  kitchen_condition: { label: "Kitchen condition", desc: "Clean-and-ready vs. needs major work" },
  financing_preference: { label: "Financing preference", desc: "Open to a loan vs. grant-only" },
  number_of_students: { label: "Number of students", desc: "Bigger institutions score higher (economies of scale)" },
  monthly_fuel_spend: { label: "Monthly fuel spend", desc: "Higher spend means a bigger payoff to switching" },
  financial_decision_maker: { label: "Financial decision maker", desc: "Head teacher who can sign vs. waiting on the county" },
};

const DEFAULT_AS_PERCENT: Record<keyof ReadinessWeights, number> = Object.fromEntries(
  READINESS_WEIGHT_KEYS.map((k) => [k, Math.round(DEFAULT_READINESS_WEIGHTS[k] * 100)]),
) as Record<keyof ReadinessWeights, number>;

export default function ScoringConfig() {
  const queryClient = useQueryClient();
  const [weights, setWeights] = useState<Record<string, number>>(DEFAULT_AS_PERCENT);

  const { data: config, isLoading } = useQuery({
    queryKey: ["scoring-config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("system_config")
        .select("*")
        .eq("config_key", "readiness_input_weights")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (config?.config_value) {
      setWeights(config.config_value as Record<string, number>);
    }
  }, [config]);

  const saveWeights = useMutation({
    mutationFn: async () => {
      const total = Object.values(weights).reduce((s, v) => s + v, 0);
      if (total !== 100) throw new Error(`Weights must sum to 100 (currently ${total})`);
      const { error } = await supabase
        .from("system_config")
        .upsert(
          {
            config_key: "readiness_input_weights",
            config_value: weights as any,
            description: "Readiness input weights — must sum to 100",
          },
          { onConflict: "config_key" },
        );
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Readiness weights saved — new institutions will be scored with these weights");
      queryClient.invalidateQueries({ queryKey: ["scoring-config"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const total = Object.values(weights).reduce((s, v) => s + (Number(v) || 0), 0);

  if (isLoading) return <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-display font-bold">Readiness Score Weights</h1>
        <p className="text-sm text-muted-foreground">
          Configure the weight given to each readiness input. Weights must sum to 100. Changes apply to scores computed after save.
        </p>
      </div>

      <div className="bg-card border border-border rounded-xl p-6 shadow-card space-y-4">
        {READINESS_WEIGHT_KEYS.map((k) => (
          <div key={k} className="flex items-center gap-4">
            <div className="flex-1">
              <Label className="font-medium">{INPUT_LABELS[k].label}</Label>
              <p className="text-xs text-muted-foreground">{INPUT_LABELS[k].desc}</p>
            </div>
            <div className="w-20">
              <Input
                type="number"
                min={0}
                max={100}
                value={weights[k] ?? 0}
                onChange={e => setWeights(w => ({ ...w, [k]: Number(e.target.value) }))}
                className="text-center"
              />
            </div>
            <span className="text-xs text-muted-foreground w-8">%</span>
          </div>
        ))}

        <div className="border-t border-border pt-4 flex items-center justify-between">
          <div>
            <span className="text-sm font-medium">Total: </span>
            <span className={`text-sm font-bold ${total === 100 ? "text-primary" : "text-destructive"}`}>
              {total}%
            </span>
            {total !== 100 && <span className="text-xs text-destructive ml-2">(must be 100%)</span>}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() =>
                setWeights(
                  config?.config_value
                    ? (config.config_value as Record<string, number>)
                    : DEFAULT_AS_PERCENT,
                )
              }
            >
              <RotateCcw className="h-4 w-4 mr-2" /> Reset
            </Button>
            <Button onClick={() => saveWeights.mutate()} disabled={total !== 100 || saveWeights.isPending}>
              {saveWeights.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Save Weights
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
