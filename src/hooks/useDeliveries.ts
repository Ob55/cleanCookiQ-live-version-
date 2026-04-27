import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type {
  CommissioningChecklist,
  CommissioningTemplate,
  DeliverySummary,
} from "@/lib/delivery";

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

export function useDeliveries() {
  return useQuery({
    queryKey: ["v_delivery_summary"],
    staleTime: STALE_MS,
    queryFn: async (): Promise<DeliverySummary[]> => {
      const { data, error } = (await (sb()
        .from("v_delivery_summary")
        .select("*")
        .order("updated_at", { ascending: false }) as unknown as Promise<{
        data: DeliverySummary[] | null;
        error: unknown;
      }>));
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useDelivery(id: string | undefined) {
  return useQuery({
    queryKey: ["v_delivery_summary", id],
    enabled: Boolean(id),
    staleTime: STALE_MS,
    queryFn: async (): Promise<DeliverySummary | null> => {
      const { data, error } = (await (sb()
        .from("v_delivery_summary")
        .select("*")
        .eq("id", id!) as unknown as Promise<{
        data: DeliverySummary[] | null;
        error: unknown;
      }>));
      if (error) throw error;
      return data?.[0] ?? null;
    },
  });
}

export function useCommissioningTemplates() {
  return useQuery({
    queryKey: ["commissioning_checklist_templates"],
    staleTime: STALE_MS,
    queryFn: async (): Promise<CommissioningTemplate[]> => {
      const { data, error } = (await (sb()
        .from("commissioning_checklist_templates")
        .select("*")
        .order("name", { ascending: true }) as unknown as Promise<{
        data: CommissioningTemplate[] | null;
        error: unknown;
      }>));
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCommissioningChecklist(deliveryId: string | undefined) {
  return useQuery({
    queryKey: ["commissioning_checklists", deliveryId],
    enabled: Boolean(deliveryId),
    staleTime: STALE_MS,
    queryFn: async (): Promise<CommissioningChecklist | null> => {
      const { data, error } = (await (sb()
        .from("commissioning_checklists")
        .select("*")
        .eq("delivery_id", deliveryId!) as unknown as Promise<{
        data: CommissioningChecklist[] | null;
        error: unknown;
      }>));
      if (error) throw error;
      return data?.[0] ?? null;
    },
  });
}
