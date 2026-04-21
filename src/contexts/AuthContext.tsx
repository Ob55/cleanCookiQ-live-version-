import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  phone: string | null;
  org_type: string | null;
  organisation_id: string | null;
  approval_status: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  roles: string[];
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  isAdmin: boolean;
  isApproved: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  // loading covers both initial auth check AND profile/roles fetch
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .single();
    setProfile(data as Profile | null);
  };

  const fetchRoles = async (userId: string) => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    setRoles(data?.map((r: any) => r.role) ?? []);
  };

  const refreshProfile = async () => {
    if (user) {
      await Promise.all([fetchProfile(user.id), fetchRoles(user.id)]);
    }
  };

  useEffect(() => {
    let initialized = false;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, sess) => {
      // Redirect to reset-password page when user clicks a recovery link
      if (event === "PASSWORD_RECOVERY") {
        if (!window.location.pathname.includes("/auth/reset-password")) {
          window.location.replace("/auth/reset-password" + window.location.hash);
        }
        return;
      }

      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) {
        setLoading(true);
        Promise.all([fetchProfile(sess.user.id), fetchRoles(sess.user.id)]).then(() => {
          setLoading(false);
        });
      } else {
        setProfile(null);
        setRoles([]);
        if (initialized) setLoading(false);
      }
    });

    // Initial session bootstrap
    supabase.auth.getSession().then(async ({ data: { session: sess } }) => {
      // onAuthStateChange already fired for this session — let it handle things
      if (!sess) {
        setLoading(false);
      }
      initialized = true;
    });

    return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setRoles([]);
  };

  const isAdmin = roles.some(r => ["admin", "manager", "field_agent"].includes(r));
  const isApproved = profile?.approval_status === "approved";

  return (
    <AuthContext.Provider value={{ user, session, profile, roles, loading, signOut, refreshProfile, isAdmin, isApproved }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
