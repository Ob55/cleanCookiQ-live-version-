import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Resolve the code that identifies the current user's organisation/record.
 *
 * Looks at the user's profile.org_type and pulls the matching code from the
 * right table:
 *   institution → institutions.institution_code
 *   supplier    → providers.provider_code
 *   funder/csr/researcher → organisations.org_code
 *   (ta provider is not surfaced here — there's no signup path yet)
 *
 * Returns null when no code is available (e.g. user is admin, pre-trigger row).
 */
export function useMyActorCode() {
  const { user, profile } = useAuth();
  const orgType = profile?.org_type;
  const orgId = profile?.organisation_id;

  return useQuery({
    queryKey: ["my-actor-code", user?.id, orgType, orgId],
    enabled: Boolean(user?.id && orgType),
    staleTime: 1000 * 60 * 30,
    queryFn: async (): Promise<string | null> => {
      if (!user?.id || !orgType) return null;

      // Institution: code lives on the institutions row, not the org row.
      if (orgType === "institution" && orgId) {
        const { data } = await supabase
          .from("institutions")
          .select("institution_code")
          .eq("id", orgId)
          .maybeSingle();
        return data?.institution_code ?? null;
      }

      // Supplier: code lives on the providers row tied to this org.
      if (orgType === "supplier" && orgId) {
        const { data } = await supabase
          .from("providers")
          .select("provider_code")
          .eq("organisation_id", orgId)
          .maybeSingle();
        return data?.provider_code ?? null;
      }

      // Funder / CSR / Researcher: code lives on the organisations row.
      if ((orgType === "funder" || orgType === "csr" || orgType === "researcher") && orgId) {
        const { data } = await supabase
          .from("organisations")
          .select("org_code")
          .eq("id", orgId)
          .maybeSingle();
        return data?.org_code ?? null;
      }

      return null;
    },
  });
}
