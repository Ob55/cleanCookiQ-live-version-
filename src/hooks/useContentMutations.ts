import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type AnyTable = {
  from: (t: string) => {
    insert: (rows: unknown) => Promise<{ data: unknown; error: unknown }>;
    update: (vals: unknown) => {
      eq: (col: string, v: unknown) => Promise<{ data: unknown; error: unknown }>;
    };
    delete: () => {
      eq: (col: string, v: unknown) => Promise<{ data: unknown; error: unknown }>;
    };
  };
};
const sb = () => supabase as unknown as AnyTable;

export interface ContentMutationConfig {
  table: string;
  invalidateKey: string;
}

export function useUpsertContent({ table, invalidateKey }: ContentMutationConfig) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, values }: { id?: string; values: Record<string, unknown> }) => {
      if (id) {
        const { error } = await sb().from(table).update(values).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await sb().from(table).insert(values);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [invalidateKey] });
    },
  });
}

export function useDeleteContent({ table, invalidateKey }: ContentMutationConfig) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const { error } = await sb().from(table).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [invalidateKey] });
    },
  });
}
