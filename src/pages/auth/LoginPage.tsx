import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff } from "lucide-react";
import cleancookIqLogo from "@/assets/cleancookiq-logo.png";
import BrandedLoader from "@/components/BrandedLoader";
import AuthBackButton from "@/components/auth/AuthBackButton";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [wrongPassword, setWrongPassword] = useState(false);
  const navigate = useNavigate();

  // Auto-redirect if user is already signed in (e.g. after clicking verification email)
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return;
      await redirectUser(session.user.id, session.user);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const redirectUser = async (userId: string, user: any) => {
    const [{ data: rolesData }, { data: profileData }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", userId),
      supabase.from("profiles").select("org_type, organisation_id, approval_status").eq("user_id", userId).maybeSingle(),
    ]);

    const roles = rolesData?.map((r: any) => r.role) ?? [];
    const orgType = profileData?.org_type ?? user?.user_metadata?.org_type ?? null;
    const approvalStatus = profileData?.approval_status ?? "pending";

    const isAdmin = roles.some((r: string) => ["admin", "manager", "field_agent"].includes(r));
    if (isAdmin) { setRedirecting(true); navigate("/admin/pipeline"); return; }

    if (approvalStatus === "pending") { setRedirecting(true); navigate("/auth/pending"); return; }
    if (approvalStatus === "rejected") { toast.error("Your account has not been approved. Contact support."); return; }

    const isInstitution = roles.some((r: string) => ["institution_admin", "institution_user"].includes(r)) || orgType === "institution";
    const isSupplier = roles.some((r: string) => r === "ta_provider") || orgType === "supplier";
    const isFunder = roles.some((r: string) => r === "financing_partner") || orgType === "funder";
    const isResearcher = orgType === "researcher";

    setRedirecting(true);
    if (isInstitution) {
      // Use profile.organisation_id as the source of truth — it's set only after setup completes
      navigate(profileData?.organisation_id ? "/institution/dashboard" : "/institution/setup");
    } else if (isSupplier) {
      navigate(profileData?.organisation_id ? "/supplier/dashboard" : "/supplier/setup");
    } else if (isFunder) {
      navigate("/funder/dashboard");
    } else if (isResearcher) {
      navigate("/researcher/dashboard");
    } else {
      navigate("/auth/pending");
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data: authData, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setLoading(false);
      const isCredError = error.message.toLowerCase().includes("invalid login credentials") ||
        error.message.toLowerCase().includes("invalid credentials");
      if (isCredError) {
        setWrongPassword(true);
        toast.error("Wrong password. Use 'Forgot password?' below to reset it.");
      } else {
        toast.error(error.message);
      }
      return;
    }
    setWrongPassword(false);

    const userId = authData.user?.id;
    if (!userId) {
      setLoading(false);
      toast.error("Login failed");
      return;
    }

    toast.success("Logged in successfully");
    setLoading(false);
    await redirectUser(userId, authData.user);
  };

  if (redirecting) return <BrandedLoader message="Preparing your dashboard…" />;

  return (
    <div className="relative min-h-screen flex items-center justify-center py-12 px-4">
      <AuthBackButton />
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <img src={cleancookIqLogo} alt="cleancookIQ" className="h-12 w-auto" />
            <span className="font-display font-bold text-xl">cleancookIQ</span>
          </Link>
          <h1 className="text-2xl font-display font-bold">Welcome back</h1>
          <p className="text-sm text-muted-foreground mt-1">Log in to your cleancookIQ account</p>
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
            {wrongPassword && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/30 p-3 text-sm text-destructive">
                Wrong password.{" "}
                <Link to="/auth/forgot-password" className="font-semibold underline">
                  Click here to reset it
                </Link>
                {" "}— a link will be emailed to you instantly.
              </div>
            )}
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

        </div>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Don't have an account?{" "}
          <Link to="/auth/register" className="text-primary font-medium hover:underline">Create one</Link>
        </p>
      </div>
    </div>
  );
}
