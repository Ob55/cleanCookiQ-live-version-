import { Link } from "react-router-dom";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function VerifyEmailPage() {
  const [resending, setResending] = useState(false);

  const handleResend = async () => {
    setResending(true);
    const { error } = await supabase.auth.resend({ type: "signup", email: "" });
    setResending(false);
    if (error) toast.error("Please try signing up again");
    else toast.success("Verification email resent");
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md text-center">
        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
          <Mail className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-2xl font-display font-bold mb-2">Check your email</h1>
        <p className="text-muted-foreground mb-6">
          We've sent a verification link to your email address. Click the link to verify your account.
        </p>
        <div className="bg-card border border-border rounded-xl p-6 shadow-card mb-6">
          <p className="text-sm text-muted-foreground">
            Didn't receive the email? Check your spam folder or
          </p>
          <Button variant="link" className="text-primary p-0 h-auto mt-1" onClick={handleResend} disabled={resending}>
            Resend verification email
          </Button>
        </div>
        <Link to="/auth/login" className="text-sm text-primary hover:underline">
          Back to login
        </Link>
      </div>
    </div>
  );
}
