import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Save, RotateCcw, Settings } from "lucide-react";
import { useState, useEffect } from "react";

const DIMENSIONS = [
  { key: "financial", label: "Financial Readiness", desc: "Budget availability, fuel spend, willingness to invest" },
  { key: "technical", label: "Technical Readiness", desc: "Infrastructure quality, electricity access, kitchen condition" },
  { key: "operational", label: "Operational Readiness", desc: "Management capacity, staff capability, operational discipline" },
  { key: "infrastructure", label: "Infrastructure", desc: "Kitchen size, electricity reliability, gas/water access" },
  { key: "social", label: "Social & Community", desc: "Community support, stakeholder buy-in, cultural acceptance" },
  { key: "supply_chain", label: "Supply Chain Access", desc: "Provider availability in county, fuel supply reliability" },
  { key: "data_quality", label: "Data Quality", desc: "Completeness and verification status of institution data" },
];

export default function ScoringConfig() {
  const queryClient = useQueryClient();
  const [weights, setWeights] = useState<Record<string, number>>({});

  const { data: config, isLoading } = useQuery({
    queryKey: ["scoring-config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("system_config")
        .select("*")
        .eq("config_key", "scoring_weights")
        .single();
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
        .update({ config_value: weights as any })
        .eq("config_key", "scoring_weights");
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Scoring weights saved");
      queryClient.invalidateQueries({ queryKey: ["scoring-config"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const total = Object.values(weights).reduce((s, v) => s + (Number(v) || 0), 0);

  if (isLoading) return <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-display font-bold">Scoring Weight Configuration</h1>
        <p className="text-sm text-muted-foreground">Configure the readiness scoring dimension weights. Weights must sum to 100.</p>
      </div>

      <div className="bg-card border border-border rounded-xl p-6 shadow-card space-y-4">
        {DIMENSIONS.map(d => (
          <div key={d.key} className="flex items-center gap-4">
            <div className="flex-1">
              <Label className="font-medium">{d.label}</Label>
              <p className="text-xs text-muted-foreground">{d.desc}</p>
            </div>
            <div className="w-20">
              <Input
                type="number"
                min={0}
                max={100}
                value={weights[d.key] || 0}
                onChange={e => setWeights(w => ({ ...w, [d.key]: Number(e.target.value) }))}
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
            <Button variant="outline" onClick={() => config?.config_value && setWeights(config.config_value as Record<string, number>)}>
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
