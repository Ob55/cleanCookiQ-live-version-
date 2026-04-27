import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { CarbonSummary, MonitoringLatest, RiskRow } from "@/lib/risk";

const STALE_MS = 1000 * 60 * 5;

type AnyTable = {
  from: (t: string) => {
    select: (s: string) => {
      eq: (col: string, v: unknown) => unknown;
      order: (col: string, opts?: { ascending?: boolean }) => unknown;
    };
  };
};
const sb = () => supabase as unknown as AnyTable;

export function useRiskRegister() {
  return useQuery({
    queryKey: ["v_risk_summary"],
    staleTime: STALE_MS,
    queryFn: async (): Promise<RiskRow[]> => {
      const { data, error } = (await (sb()
        .from("v_risk_summary")
        .select("*")
        .order("risk_score", { ascending: false }) as unknown as Promise<{
        data: RiskRow[] | null;
        error: unknown;
      }>));
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useMonitoringLatest() {
  return useQuery({
    queryKey: ["v_monitoring_latest"],
    staleTime: STALE_MS,
    queryFn: async (): Promise<MonitoringLatest[]> => {
      const { data, error } = (await (sb()
        .from("v_monitoring_latest")
        .select("*")
        .order("period_end", { ascending: false }) as unknown as Promise<{
        data: MonitoringLatest[] | null;
        error: unknown;
      }>));
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCarbonSummary() {
  return useQuery({
    queryKey: ["v_carbon_summary"],
    staleTime: STALE_MS,
    queryFn: async (): Promise<CarbonSummary[]> => {
      const { data, error } = (await (sb()
        .from("v_carbon_summary")
        .select("*")
        .order("total_verified_tco2e", { ascending: false }) as unknown as Promise<{
        data: CarbonSummary[] | null;
        error: unknown;
      }>));
      if (error) throw error;
      return data ?? [];
    },
  });
}
