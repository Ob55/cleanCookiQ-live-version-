import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff } from "lucide-react";
import ignisLogo from "@/assets/ignis-logo.png";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data: authData, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setLoading(false);
      toast.error(error.message);
      return;
    }

    const userId = authData.user?.id;
    if (!userId) {
      setLoading(false);
      toast.error("Login failed");
      return;
    }

    const [{ data: rolesData }, { data: profileData }] = await Promise.all([
      supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId),
      supabase
        .from("profiles")
        .select("org_type, organisation_id")
        .eq("user_id", userId)
        .maybeSingle(),
    ]);

    const roles = rolesData?.map((r: { role: string }) => r.role) ?? [];
    const profileOrgType = profileData?.org_type ?? null;
    const metadataOrgType = authData.user?.user_metadata?.org_type ?? null;

    const isAdmin = roles.some((r: string) =>
      ["admin", "manager", "field_agent"].includes(r)
    );
    const isInstitutionUser =
      roles.some((r: string) => ["institution_admin", "institution_user"].includes(r)) ||
      profileOrgType === "institution" ||
      metadataOrgType === "institution";
    const isSupplier =
      roles.some((r: string) => ["ta_provider"].includes(r)) ||
      profileOrgType === "supplier" ||
      metadataOrgType === "supplier";

    setLoading(false);
    toast.success("Logged in successfully");

    // Admin roles take priority
    if (isAdmin) {
      navigate("/admin/pipeline");
      return;
    }

    if (isInstitutionUser) {
      const { data: inst } = await supabase
        .from("institutions")
        .select("setup_completed")
        .eq("created_by", userId)
        .limit(1)
        .single();

      navigate(inst?.setup_completed ? "/institution/dashboard" : "/institution/setup");
      return;
    }

    if (isSupplier) {
      if (profileData?.organisation_id) {
        navigate("/supplier/dashboard");
      } else {
        navigate("/supplier/setup");
      }
      return;
    }

    // Funder routing
    const isFunder =
      roles.some((r: string) => r === "financing_partner") ||
      profileOrgType === "funder" ||
      metadataOrgType === "funder";

    if (isFunder) {
      navigate("/funder/dashboard");
      return;
    }

    navigate("/admin/pipeline");
  };

  const handleMagicLink = async () => {
    if (!email) { toast.error("Enter your email first"); return; }
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin } });
    setLoading(false);
    if (error) toast.error(error.message);
    else toast.success("Magic link sent — check your email");
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <img src={ignisLogo} alt="CleanCookIQ" className="h-12 w-auto" />
            <span className="font-display font-bold text-xl">
              CleanCook<span className="text-accent">IQ</span>
            </span>
          </Link>
          <h1 className="text-2xl font-display font-bold">Welcome back</h1>
          <p className="text-sm text-muted-foreground mt-1">Log in to your CleanCookIQ account</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-6 shadow-card">
          <form className="space-y-4" onSubmit={handleLogin}>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@organisation.co.ke" className="mt-1" required />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <div className="relative mt-1">
                <Input id="password" type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="Your password" className="pr-10" required />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="rounded border-input" />
                Remember me
              </label>
              <Link to="/auth/forgot-password" className="text-sm text-primary hover:underline">
                Forgot password?
              </Link>
            </div>
            <Button type="submit" className="w-full bg-primary text-primary-foreground" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Log in
            </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
            <div className="relative flex justify-center text-xs"><span className="bg-card px-2 text-muted-foreground">or</span></div>
          </div>

          <Button variant="outline" className="w-full" onClick={handleMagicLink} disabled={loading}>
            Send Magic Link Instead
          </Button>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Don't have an account?{" "}
          <Link to="/auth/register" className="text-primary font-medium hover:underline">Create one</Link>
        </p>
      </div>
    </div>
  );
}
