import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type {
  DealRow,
  FunderPreferences,
  PortfolioRow,
  PortfolioSummary,
} from "@/lib/funder";

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

export function useFunderDealFlow() {
  return useQuery({
    queryKey: ["v_funder_deal_flow"],
    staleTime: STALE_MS,
    queryFn: async (): Promise<DealRow[]> => {
      const { data, error } = (await (sb()
        .from("v_funder_deal_flow")
        .select("*")
        .order("project_title", { ascending: true }) as unknown as Promise<{
        data: DealRow[] | null;
        error: unknown;
      }>));
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useFunderPreferences(organisationId: string | undefined) {
  return useQuery({
    queryKey: ["funder_preferences", organisationId],
    enabled: Boolean(organisationId),
    staleTime: STALE_MS,
    queryFn: async (): Promise<FunderPreferences | null> => {
      const { data, error } = (await (sb()
        .from("funder_preferences")
        .select("*")
        .eq("organisation_id", organisationId!) as unknown as Promise<{
        data: FunderPreferences[] | null;
        error: unknown;
      }>));
      if (error) throw error;
      return data?.[0] ?? null;
    },
  });
}

export function useFunderPortfolio(organisationId: string | undefined) {
  return useQuery({
    queryKey: ["funder_portfolio", organisationId],
    enabled: Boolean(organisationId),
    staleTime: STALE_MS,
    queryFn: async (): Promise<PortfolioRow[]> => {
      const { data, error } = (await (sb()
        .from("funder_portfolio")
        .select("*")
        .eq("organisation_id", organisationId!)
        .order("committed_at", { ascending: false }) as unknown as Promise<{
        data: PortfolioRow[] | null;
        error: unknown;
      }>));
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useFunderPortfolioSummary(organisationId: string | undefined) {
  return useQuery({
    queryKey: ["v_funder_portfolio_summary", organisationId],
    enabled: Boolean(organisationId),
    staleTime: STALE_MS,
    queryFn: async (): Promise<PortfolioSummary | null> => {
      const { data, error } = (await (sb()
        .from("v_funder_portfolio_summary")
        .select("*")
        .eq("organisation_id", organisationId!) as unknown as Promise<{
        data: PortfolioSummary[] | null;
        error: unknown;
      }>));
      if (error) throw error;
      return data?.[0] ?? null;
    },
  });
}
