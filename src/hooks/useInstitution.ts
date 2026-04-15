import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useInstitutionId() {
  const { user } = useAuth();
  const [institutionId, setInstitutionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    (async () => {
      // Try created_by first
      const { data: direct } = await supabase
        .from("institutions")
        .select("id")
        .eq("created_by", user.id)
        .limit(1)
        .maybeSingle();

      if (direct?.id) {
        setInstitutionId(direct.id);
        setLoading(false);
        return;
      }

      // Try via profile organisation_id
      const { data: profile } = await supabase
        .from("profiles")
        .select("organisation_id")
        .eq("user_id", user.id)
        .single();

      if (profile?.organisation_id) {
        const { data: orgInst } = await supabase
          .from("institutions")
          .select("id")
          .eq("organisation_id", profile.organisation_id)
          .limit(1)
          .maybeSingle();
        if (orgInst?.id) {
          setInstitutionId(orgInst.id);
          setLoading(false);
          return;
        }
      }

      setLoading(false);
    })();
  }, [user]);

  return { institutionId, loading };
}
