import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  type DataPoint,
  type DataPointQuery,
  type FuelKey,
  resolveDataPoint,
} from "@/lib/dataPoints";

const STALE_MS = 1000 * 60 * 30; // 30 min — reference data changes slowly

/**
 * Fetch all currently-valid data points for a set of metric keys.
 * Pulled from the `v_active_data_points` view (filters out superseded
 * and out-of-validity entries server-side).
 */
export function useActiveDataPoints(metricKeys: string[]) {
  const sortedKeys = [...metricKeys].sort();
  return useQuery({
    queryKey: ["data_points", "active", sortedKeys],
    enabled: sortedKeys.length > 0,
    staleTime: STALE_MS,
    queryFn: async (): Promise<DataPoint[]> => {
      const { data, error } = await (supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            in: (col: string, vals: string[]) => Promise<{ data: DataPoint[] | null; error: unknown }>;
          };
        };
      })
        .from("v_active_data_points")
        .select("*")
        .in("metric_key", sortedKeys);

      if (error) throw error;
      return data ?? [];
    },
  });
}

/**
 * Resolve a single (metric, fuel?, county?) triple to its best-matching
 * data point. Returns the data point + a typed numeric accessor.
 */
export function useResolvedDataPoint(query: DataPointQuery) {
  const { data: candidates = [], isLoading, error } = useActiveDataPoints([
    query.metricKey,
  ]);
  const point = resolveDataPoint(candidates, query);
  return {
    point,
    value: point?.value_numeric ?? null,
    unit: point?.unit ?? null,
    isLoading,
    error,
  };
}

/**
 * Bulk fuel-scoped lookup: takes a metric key + a list of fuel keys and
 * returns a `Record<fuel, DataPoint>` for the requested set. Used by
 * components that need many fuel values at once (e.g. CookingAlchemy).
 */
export function useFuelScopedDataPoints(
  metricKey: string,
  fuels: FuelKey[],
  countyId?: string | null,
) {
  const { data: candidates = [], isLoading, error } = useActiveDataPoints([
    metricKey,
  ]);
  const byFuel: Partial<Record<FuelKey, DataPoint>> = {};
  for (const fuel of fuels) {
    const dp = resolveDataPoint(candidates, {
      metricKey,
      fuel,
      countyId: countyId ?? null,
    });
    if (dp) byFuel[fuel] = dp;
  }
  return { byFuel, isLoading, error };
}
