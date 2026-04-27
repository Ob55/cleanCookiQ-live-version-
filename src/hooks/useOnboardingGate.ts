import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Redirect users to a journey-specific onboarding page if they have not
 * yet completed it. No-op while auth/profile is loading or when the user
 * is already on the onboarding page itself.
 */
export function useOnboardingGate(journey: string, onboardingPath: string) {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["onboarding_progress", user?.id, journey],
    enabled: Boolean(user?.id) && !loading,
    queryFn: async (): Promise<{ is_complete: boolean } | null> => {
      const { data: rows, error } = (await (supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            eq: (col: string, v: unknown) => {
              eq: (col: string, v: unknown) => Promise<{
                data: Array<{ is_complete: boolean }> | null;
                error: unknown;
              }>;
            };
          };
        };
      })
        .from("onboarding_progress")
        .select("is_complete")
        .eq("user_id", user!.id)
        .eq("journey", journey));
      if (error) throw error;
      return rows?.[0] ?? null;
    },
  });

  useEffect(() => {
    if (loading || isLoading) return;
    if (!user || !profile) return;
    if (typeof window !== "undefined" && window.location.pathname === onboardingPath) return;
    if (data === null || data.is_complete === false) {
      navigate(onboardingPath);
    }
  }, [user, profile, loading, isLoading, data, navigate, onboardingPath]);
}
