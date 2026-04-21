import { Link } from "react-router-dom";
import { Clock, Phone } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function PendingApprovalPage() {
  const { profile } = useAuth();
  const isOther = profile?.org_type === "other";

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md text-center">
        <div className="h-16 w-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-6">
          {isOther ? <Phone className="h-8 w-8 text-accent" /> : <Clock className="h-8 w-8 text-accent" />}
        </div>
        <h1 className="text-2xl font-display font-bold mb-2">
          {isOther ? "We've Received Your Interest!" : "Account Pending Approval"}
        </h1>
        <p className="text-muted-foreground mb-6">
          {isOther
            ? "Thank you for showing interest in CleanCook IQ. Our team is preparing your account."
            : "Your account has been created and is awaiting admin verification. You'll receive an email once approved."}
        </p>
        <div className="bg-card border border-border rounded-xl p-6 shadow-card text-left">
          <h3 className="font-semibold text-sm mb-3">What happens next?</h3>
          {isOther ? (
            <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
              <li>Our team reviews your organisation details</li>
              <li>An agent will call you for further assistance</li>
              <li>We prepare a personalised dashboard for you</li>
              <li>You receive an email once your account is ready</li>
            </ol>
          ) : (
            <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
              <li>Our team reviews your registration</li>
              <li>We verify your organisation details</li>
              <li>You receive an approval email with login access</li>
            </ol>
          )}
        </div>
        {isOther && (
          <p className="text-xs text-muted-foreground mt-4">
            Questions? Email us at{" "}
            <a href="mailto:info@ignis-innovation.com" className="text-primary hover:underline">
              info@ignis-innovation.com
            </a>
          </p>
        )}
        <Link to="/" className="inline-block mt-6 text-sm text-primary hover:underline">
          Return to homepage
        </Link>
      </div>
    </div>
  );
}
