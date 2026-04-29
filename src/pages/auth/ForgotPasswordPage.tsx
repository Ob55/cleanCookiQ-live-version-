import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import AuthBackButton from "@/components/auth/AuthBackButton";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${import.meta.env.VITE_APP_URL || window.location.origin}/auth/reset-password`,
    });
    setLoading(false);
    if (error) toast.error(error.message);
    else { setSent(true); toast.success("Reset link sent"); }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center py-12 px-4">
      <AuthBackButton />
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-display font-bold">Reset your password</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {sent ? "Check your email for the reset link" : "Enter your email and we'll send a reset link"}
          </p>
        </div>
        {!sent && (
          <div className="bg-card border border-border rounded-xl p-6 shadow-card">
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@organisation.co.ke" className="mt-1" required />
              </div>
              <Button type="submit" className="w-full bg-primary text-primary-foreground" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Send Reset Link
              </Button>
            </form>
          </div>
        )}
        <p className="text-center text-sm text-muted-foreground mt-6">
          <Link to="/auth/login" className="text-primary hover:underline">Back to login</Link>
        </p>
      </div>
    </div>
  );
}
