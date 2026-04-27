import { Link } from "react-router-dom";
import { LogIn } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

interface SignInWallProps {
  /** Action being gated (used in the prompt copy). E.g. "request a quote", "download this resource". */
  action: string;
  /** Path to return to after signup/login. Defaults to current path. */
  redirectTo?: string;
  /** Render the children when the user is authenticated. */
  children: React.ReactNode;
  /** Optional richer description shown above the buttons. */
  description?: string;
}

/**
 * Renders `children` when the user is signed in. Otherwise shows a
 * friendly inline prompt with Sign Up + Log In buttons that preserve
 * the destination URL via the `?redirect=` query parameter.
 */
export function SignInWall({ action, redirectTo, children, description }: SignInWallProps) {
  const { user } = useAuth();
  if (user) return <>{children}</>;

  const dest = redirectTo ?? (typeof window !== "undefined" ? window.location.pathname : "/");
  const search = `?redirect=${encodeURIComponent(dest)}`;

  return (
    <Card className="border-dashed border-primary/40 bg-primary/5">
      <CardContent className="pt-6 space-y-3 text-center">
        <LogIn className="h-6 w-6 text-primary mx-auto" />
        <p className="text-sm font-medium">Sign up or log in to {action}</p>
        {description && <p className="text-xs text-muted-foreground max-w-md mx-auto">{description}</p>}
        <div className="flex items-center justify-center gap-2 pt-2">
          <Link to={`/auth/register${search}`}>
            <Button size="sm">Sign up</Button>
          </Link>
          <Link to={`/auth/login${search}`}>
            <Button size="sm" variant="outline">Log in</Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
