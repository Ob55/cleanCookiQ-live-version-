import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const STALE_MS = 1000 * 60 * 30;

type AnyTable = {
  from: (t: string) => {
    select: (s: string) => {
      eq: (col: string, v: unknown) => unknown;
      order: (col: string, opts?: { ascending?: boolean }) => unknown;
    };
  };
};
const sb = () => supabase as unknown as AnyTable;

export interface TechnologyProfile {
  id: string;
  slug: string;
  name: string;
  fuel_type: string;
  description: string | null;
  capex_low: number;
  capex_high: number;
  capex_currency: string;
  opex_per_meal: number | null;
  opex_per_unit: number | null;
  opex_unit: string | null;
  lifetime_years: number;
  maintenance_annual: number;
  salvage_fraction: number;
  install_cost_pct: number;
  efficiency_pct: number | null;
  emission_metric_key: string | null;
  applicable_to_org_types: string[];
  source_id: string | null;
  display_order: number;
  is_active: boolean;
}

export interface FinancingInstrument {
  id: string;
  slug: string;
  name: string;
  instrument_type: string;
  description: string | null;
  default_terms: Record<string, unknown>;
  bearer_org_types: string[];
  best_for: string | null;
  risk_notes: string | null;
  source_id: string | null;
  display_order: number;
  is_active: boolean;
}

export function useTechnologyProfiles() {
  return useQuery({
    queryKey: ["technology_profiles"],
    staleTime: STALE_MS,
    queryFn: async (): Promise<TechnologyProfile[]> => {
      const { data, error } = (await (sb()
        .from("technology_profiles")
        .select("*")
        .order("display_order", { ascending: true }) as unknown as Promise<{
        data: TechnologyProfile[] | null;
        error: unknown;
      }>));
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useFinancingInstruments() {
  return useQuery({
    queryKey: ["financing_instruments"],
    staleTime: STALE_MS,
    queryFn: async (): Promise<FinancingInstrument[]> => {
      const { data, error } = (await (sb()
        .from("financing_instruments")
        .select("*")
        .order("display_order", { ascending: true }) as unknown as Promise<{
        data: FinancingInstrument[] | null;
        error: unknown;
      }>));
      if (error) throw error;
      return data ?? [];
    },
  });
}
