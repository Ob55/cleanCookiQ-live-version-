import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { LayoutDashboard, Building2, Route, FileText, LifeBuoy, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useInactivityLogout } from "@/hooks/useInactivityLogout";

const navItems = [
  { label: "Dashboard", path: "/institution/dashboard", icon: LayoutDashboard },
  { label: "My Institution", path: "/institution/profile", icon: Building2 },
  { label: "My Pathway", path: "/institution/pathway", icon: Route },
  { label: "Documents", path: "/institution/documents", icon: FileText },
  { label: "Support", path: "/institution/support", icon: LifeBuoy },
];

export default function InstitutionLayout() {
  const { signOut, profile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  useInactivityLogout();

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth/login");
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F9F6F1" }}>
      {/* Top Navigation */}
      <nav className="sticky top-0 z-50 shadow-md" style={{ backgroundColor: "#0A400C" }}>
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-14">
          <Link to="/institution/dashboard" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#00712D" }}>
              <span className="text-white font-bold text-sm" style={{ fontFamily: "Georgia, serif" }}>C</span>
            </div>
            <span className="text-white font-bold text-lg" style={{ fontFamily: "Georgia, serif" }}>
              CleanCook<span style={{ color: "#D4A843" }}>IQ</span>
            </span>
          </Link>

          <div className="flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm transition-colors ${
                    isActive
                      ? "bg-white/20 text-white font-semibold"
                      : "text-white/70 hover:text-white hover:bg-white/10"
                  }`}
                  style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-white/70 text-sm" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
              {profile?.full_name || "Institution User"}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="text-white/70 hover:text-white hover:bg-white/10"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
