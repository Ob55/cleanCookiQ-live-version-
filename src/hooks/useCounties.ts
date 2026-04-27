import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  type County,
  type CountyFuelPrice,
  type CountyIntelligenceSummary,
  type CountyPolicy,
  countySlug,
} from "@/lib/counties";

const STALE_MS = 1000 * 60 * 30;

// Narrow helper to escape the auto-generated Database types for new tables.
type AnyTable = {
  from: (t: string) => {
    select: (s: string) => {
      eq: (col: string, v: unknown) => unknown;
      order: (col: string, opts?: { ascending?: boolean }) => unknown;
    };
  };
};
const sb = () => supabase as unknown as AnyTable;

export function useCounties() {
  return useQuery({
    queryKey: ["counties"],
    staleTime: STALE_MS,
    queryFn: async (): Promise<County[]> => {
      const { data, error } = (await (sb()
        .from("counties")
        .select("id,code,name,region,capital,population,area_km2") as unknown as Promise<{
        data: County[] | null;
        error: unknown;
      }>));
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCountyIntelligence() {
  return useQuery({
    queryKey: ["v_county_intelligence_summary"],
    staleTime: STALE_MS,
    queryFn: async (): Promise<CountyIntelligenceSummary[]> => {
      const { data, error } = (await (sb()
        .from("v_county_intelligence_summary")
        .select("*") as unknown as Promise<{
        data: CountyIntelligenceSummary[] | null;
        error: unknown;
      }>));
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** Look up one county + its summary metrics by URL slug. */
export function useCountyBySlug(slug: string | undefined) {
  const intel = useCountyIntelligence();
  const summary =
    intel.data?.find((c) => countySlug(c.county_name) === slug) ?? null;
  return { ...intel, summary };
}

export function useCountyFuelPrices(countyId: string | undefined) {
  return useQuery({
    queryKey: ["v_latest_county_fuel_prices", countyId],
    enabled: Boolean(countyId),
    staleTime: STALE_MS,
    queryFn: async (): Promise<CountyFuelPrice[]> => {
      const { data, error } = (await (sb()
        .from("v_latest_county_fuel_prices")
        .select("*")
        .eq("county_id", countyId!) as unknown as Promise<{
        data: CountyFuelPrice[] | null;
        error: unknown;
      }>));
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCountyPolicies(countyId: string | undefined) {
  return useQuery({
    queryKey: ["county_policies", countyId],
    enabled: Boolean(countyId),
    staleTime: STALE_MS,
    queryFn: async (): Promise<CountyPolicy[]> => {
      const { data, error } = (await (sb()
        .from("county_policies")
        .select("*")
        .eq("county_id", countyId!)
        .order("effective_date", { ascending: false }) as unknown as Promise<{
        data: CountyPolicy[] | null;
        error: unknown;
      }>));
      if (error) throw error;
      return (data ?? []).filter((p) => p.is_active);
    },
  });
}
