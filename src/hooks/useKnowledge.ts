import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type {
  EventSummary,
  NewsArticle,
  Policy,
  Resource,
} from "@/lib/knowledge";

const STALE_MS = 1000 * 60 * 10;

type AnyTable = {
  from: (t: string) => {
    select: (s: string) => {
      eq: (col: string, v: unknown) => unknown;
      order: (col: string, opts?: { ascending?: boolean }) => unknown;
    };
    insert: (rows: unknown) => unknown;
  };
};
const sb = () => supabase as unknown as AnyTable;

export function usePolicies() {
  return useQuery({
    queryKey: ["policies"],
    staleTime: STALE_MS,
    queryFn: async (): Promise<Policy[]> => {
      const { data, error } = (await (sb()
        .from("policies")
        .select("*")
        .order("effective_date", { ascending: false }) as unknown as Promise<{
        data: Policy[] | null;
        error: unknown;
      }>));
      if (error) throw error;
      return (data ?? []).filter((p) => p.is_active);
    },
  });
}

export function useResources() {
  return useQuery({
    queryKey: ["resources"],
    staleTime: STALE_MS,
    queryFn: async (): Promise<Resource[]> => {
      const { data, error } = (await (sb()
        .from("resources")
        .select("*")
        .order("published_at", { ascending: false }) as unknown as Promise<{
        data: Resource[] | null;
        error: unknown;
      }>));
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useNews() {
  return useQuery({
    queryKey: ["news_articles"],
    staleTime: STALE_MS,
    queryFn: async (): Promise<NewsArticle[]> => {
      const { data, error } = (await (sb()
        .from("news_articles")
        .select("*")
        .order("published_at", { ascending: false }) as unknown as Promise<{
        data: NewsArticle[] | null;
        error: unknown;
      }>));
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useEvents() {
  return useQuery({
    queryKey: ["v_event_summary"],
    staleTime: STALE_MS,
    queryFn: async (): Promise<EventSummary[]> => {
      const { data, error } = (await (sb()
        .from("v_event_summary")
        .select("*")
        .order("start_at", { ascending: false }) as unknown as Promise<{
        data: EventSummary[] | null;
        error: unknown;
      }>));
      if (error) throw error;
      return (data ?? []).filter((e) => e.is_published);
    },
  });
}

export interface RegisterEventInput {
  eventId: string;
  userId: string;
  fullName: string;
  email: string;
  organisation?: string | null;
  role?: string | null;
}

export function useRegisterEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: RegisterEventInput) => {
      const { data, error } = (await (sb()
        .from("event_registrations")
        .insert({
          event_id: input.eventId,
          user_id: input.userId,
          full_name: input.fullName,
          email: input.email,
          organisation: input.organisation ?? null,
          role: input.role ?? null,
        }) as unknown as Promise<{ data: unknown; error: unknown }>));
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["v_event_summary"] });
      qc.invalidateQueries({ queryKey: ["event_registrations"] });
    },
  });
}

/** Log a download for analytics; failure is non-fatal so the user still gets the file. */
export function useLogResourceDownload() {
  return useMutation({
    mutationFn: async ({ resourceId, userId }: { resourceId: string; userId: string | null }) => {
      try {
        await (sb()
          .from("resource_downloads")
          .insert({
            resource_id: resourceId,
            user_id: userId,
            user_agent: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 200) : null,
          }) as unknown as Promise<{ data: unknown; error: unknown }>);
      } catch {
        /* swallow; download must not block on telemetry */
      }
    },
  });
}
