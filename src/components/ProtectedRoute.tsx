import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

interface Props {
  children: React.ReactNode;
  requireAdmin?: boolean;
  allowedRoles?: string[];
  allowedOrgTypes?: string[];
}

export default function ProtectedRoute({
  children,
  requireAdmin = false,
  allowedRoles,
  allowedOrgTypes,
}: Props) {
  const { user, loading, isAdmin, roles, profile } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  const hasAllowedRole = !allowedRoles?.length || roles.some((role) => allowedRoles.includes(role));
  const hasAllowedOrgType = !allowedOrgTypes?.length || (!!profile?.org_type && allowedOrgTypes.includes(profile.org_type));

  if (!requireAdmin && (!hasAllowedRole || !hasAllowedOrgType)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
