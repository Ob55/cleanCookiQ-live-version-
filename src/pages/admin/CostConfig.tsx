import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Save, RotateCcw } from "lucide-react";
import { useState, useEffect } from "react";

interface TechParams {
  capex_per_student: number;
  opex_monthly_per_student: number;
  co2_factor: number;
}

const TECHNOLOGIES = [
  { key: "biogas", label: "Biogas", icon: "🌿" },
  { key: "electric", label: "Electric Cookers", icon: "⚡" },
  { key: "lpg", label: "LPG", icon: "🔥" },
  { key: "briquettes", label: "Briquettes", icon: "🪵" },
  { key: "solar_thermal", label: "Solar Thermal", icon: "☀️" },
];

export default function CostConfig() {
  const queryClient = useQueryClient();
  const [params, setParams] = useState<Record<string, TechParams>>({});

  const { data: config, isLoading } = useQuery({
    queryKey: ["cost-config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("system_config")
        .select("*")
        .eq("config_key", "cost_parameters")
        .single();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (config?.config_value) {
      setParams(config.config_value as Record<string, TechParams>);
    }
  }, [config]);

  const saveParams = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("system_config")
        .update({ config_value: params as any })
        .eq("config_key", "cost_parameters");
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Cost parameters saved");
      queryClient.invalidateQueries({ queryKey: ["cost-config"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateParam = (tech: string, field: keyof TechParams, value: number) => {
    setParams(p => ({ ...p, [tech]: { ...p[tech], [field]: value } }));
  };

  if (isLoading) return <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">Cost Table Configuration</h1>
        <p className="text-sm text-muted-foreground">Configure technology cost parameters for the least-cost transition engine</p>
      </div>

      <div className="grid gap-4">
        {TECHNOLOGIES.map(t => (
          <div key={t.key} className="bg-card border border-border rounded-xl p-5 shadow-card">
            <h3 className="font-display font-semibold mb-3">
              <span className="mr-2">{t.icon}</span>{t.label}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">CapEx per Student (KSh)</Label>
                <Input
                  type="number"
                  value={params[t.key]?.capex_per_student || 0}
                  onChange={e => updateParam(t.key, "capex_per_student", Number(e.target.value))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Monthly OpEx per Student (KSh)</Label>
                <Input
                  type="number"
                  value={params[t.key]?.opex_monthly_per_student || 0}
                  onChange={e => updateParam(t.key, "opex_monthly_per_student", Number(e.target.value))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">CO₂ Factor (tonnes/student/yr)</Label>
                <Input
                  type="number"
                  step="0.0001"
                  value={params[t.key]?.co2_factor || 0}
                  onChange={e => updateParam(t.key, "co2_factor", Number(e.target.value))}
                  className="mt-1"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={() => config?.config_value && setParams(config.config_value as Record<string, TechParams>)}>
          <RotateCcw className="h-4 w-4 mr-2" /> Reset
        </Button>
        <Button onClick={() => saveParams.mutate()} disabled={saveParams.isPending}>
          {saveParams.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          Save Parameters
        </Button>
      </div>
    </div>
  );
}
