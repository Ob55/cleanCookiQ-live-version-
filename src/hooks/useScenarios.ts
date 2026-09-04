import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { sbAny } from "@/lib/sbAny";
import { computeScenarioDerived } from "@/lib/scenarioTco";

// Transition Scenario data access — the costed pathway per institution.
// Scenarios live on the existing `cost_models` table (extended by
// 20260811100100_transition_scenarios.sql). Those new columns aren't in the
// generated types yet, so reads/writes go through sbAny (see usePrograms.ts).

const STALE_MS = 1000 * 60 * 5;

export type ScenarioStatus = "draft" | "reviewed" | "approved";

export type TransitionScenario = {
  id: string;
  institution_id: string;
  programme_id: string | null;
  technology_type: string;
  capex: number | null;
  monthly_opex: number | null;
  current_monthly_fuel_cost: number | null;
  projected_monthly_savings: number | null;
  payback_months: number | null;
  roi_percentage: number | null;
  assumptions: Record<string, unknown> | null;
  status: ScenarioStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  is_recommended: boolean;
  residual_risk: string | null;
  methodology_version: string | null;
  assumptions_ref: string | null;
  created_at: string;
  updated_at: string;
};

// Per-programme technology config (config-not-code). `benchmark_only` techs
// may be modelled for comparison but can never be the recommended pathway.
export type ScenarioTechnologies = {
  allowed: string[];
  excluded: string[];
  benchmark_only: string[];
};

const DEFAULT_TECHNOLOGIES: ScenarioTechnologies = {
  allowed: ["biogas", "electric", "biomass_pellets", "briquettes", "ethanol", "lpg"],
  excluded: [],
  benchmark_only: ["ics"],
};

export function useScenarios(institutionId: string | undefined) {
  return useQuery({
    queryKey: ["scenarios", institutionId],
    enabled: Boolean(institutionId),
    staleTime: STALE_MS,
    queryFn: async (): Promise<TransitionScenario[]> => {
      const { data, error } = await sbAny
        .from("cost_models")
        .select("*")
        .eq("institution_id", institutionId!)
        .order("is_recommended", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as TransitionScenario[];
    },
  });
}

// Read the allowed/excluded/benchmark technology set for a programme, with the
// same fallback ladder as assessmentScoring.loadReadinessWeights():
// scenario_technologies:<pid> → :default → code default.
export function useScenarioTechnologies(programmeId: string | undefined) {
  return useQuery({
    queryKey: ["scenario_technologies", programmeId],
    staleTime: STALE_MS,
    queryFn: async (): Promise<ScenarioTechnologies> => {
      const keys = [
        programmeId ? `scenario_technologies:${programmeId}` : null,
        "scenario_technologies:default",
      ].filter(Boolean) as string[];
      const { data } = await supabase
        .from("system_config")
        .select("config_key, config_value")
        .in("config_key", keys);
      const byKey = new Map((data ?? []).map((r) => [r.config_key, r.config_value]));
      const raw =
        (programmeId && byKey.get(`scenario_technologies:${programmeId}`)) ||
        byKey.get("scenario_technologies:default");
      if (!raw || typeof raw !== "object") return DEFAULT_TECHNOLOGIES;
      const v = raw as Partial<ScenarioTechnologies>;
      return {
        allowed: v.allowed ?? DEFAULT_TECHNOLOGIES.allowed,
        excluded: v.excluded ?? [],
        benchmark_only: v.benchmark_only ?? [],
      };
    },
  });
}

// The recommended scenario per institution across a whole programme, in one
// query — powers the "payback" column on the programme Overview roster.
export function useProgrammeRecommendedScenarios(programmeId: string | undefined) {
  return useQuery({
    queryKey: ["programme_recommended_scenarios", programmeId],
    enabled: Boolean(programmeId),
    staleTime: STALE_MS,
    queryFn: async (): Promise<Record<string, TransitionScenario>> => {
      const { data, error } = await sbAny
        .from("cost_models")
        .select("*")
        .eq("programme_id", programmeId!)
        .eq("is_recommended", true);
      if (error) throw error;
      const byInstitution: Record<string, TransitionScenario> = {};
      for (const r of (data ?? []) as TransitionScenario[]) byInstitution[r.institution_id] = r;
      return byInstitution;
    },
  });
}

export type ScenarioUpsert = {
  id?: string;
  institution_id: string;
  programme_id: string | null;
  technology_type: string;
  capex: number;
  monthly_opex: number;
  current_monthly_fuel_cost: number;
  residual_risk?: string | null;
  methodology_version?: string | null;
  assumptions_ref?: string | null;
  assumptions?: Record<string, unknown> | null;
};

// Insert/update a scenario. Payback / ROI / monthly savings are DERIVED here
// via the TCO engine before write, never hand-entered.
export function useUpsertScenario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: ScenarioUpsert) => {
      const derived = computeScenarioDerived({
        capex: input.capex,
        monthly_opex: input.monthly_opex,
        current_monthly_fuel_cost: input.current_monthly_fuel_cost,
        assumptions: input.assumptions ?? null,
      });
      const row = {
        institution_id: input.institution_id,
        programme_id: input.programme_id,
        technology_type: input.technology_type,
        capex: input.capex,
        monthly_opex: input.monthly_opex,
        current_monthly_fuel_cost: input.current_monthly_fuel_cost,
        residual_risk: input.residual_risk ?? null,
        methodology_version: input.methodology_version ?? null,
        assumptions_ref: input.assumptions_ref ?? null,
        assumptions: input.assumptions ?? {},
        projected_monthly_savings: derived.projected_monthly_savings,
        payback_months: derived.payback_months,
        roi_percentage: derived.roi_percentage,
      };
      if (input.id) {
        const { error } = await sbAny.from("cost_models").update(row).eq("id", input.id);
        if (error) throw error;
      } else {
        const { error } = await sbAny.from("cost_models").insert(row);
        if (error) throw error;
      }
      return derived;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["scenarios", vars.institution_id] });
    },
  });
}

// Mark one scenario as the recommended pathway. Only an approved scenario may
// be recommended (gates on Wilson's methodology sign-off). The DB partial-
// unique index enforces one-per-institution; we clear the prior flag first so
// the switch never trips it.
export function useSetRecommendedScenario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; institution_id: string }) => {
      await sbAny
        .from("cost_models")
        .update({ is_recommended: false })
        .eq("institution_id", input.institution_id);
      const { error } = await sbAny
        .from("cost_models")
        .update({ is_recommended: true })
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["scenarios", vars.institution_id] });
    },
  });
}

export function useReviewScenario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; institution_id: string; status: ScenarioStatus }) => {
      const { data: auth } = await supabase.auth.getUser();
      const { error } = await sbAny
        .from("cost_models")
        .update({
          status: input.status,
          reviewed_by: auth.user?.id ?? null,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["scenarios", vars.institution_id] });
    },
  });
}
