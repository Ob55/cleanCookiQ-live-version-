import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, LogOut, Menu, Building2, FileText, Ticket } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import NotificationBell from "@/components/NotificationBell";
import cleancookIqLogo from "@/assets/cleancookiq-logo.png";

export default function FunderLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, profile, user } = useAuth();

  const { data: funderProfile } = useQuery({
    queryKey: ["funder-profile-nav", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("funder_profiles")
        .select("id")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: linkedInstitutions } = useQuery({
    queryKey: ["funder-linked-nav", funderProfile?.id],
    queryFn: async () => {
      const { data: links } = await supabase
        .from("funder_institution_links")
        .select("institution_id")
        .eq("funder_id", funderProfile!.id);
      if (!links?.length) return [];
      const ids = links.map(l => l.institution_id);
      const { data: insts } = await supabase
        .from("institutions")
        .select("id, name")
        .in("id", ids)
        .order("name");
      return insts || [];
    },
    enabled: !!funderProfile?.id,
  });

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth/login");
  };

  const initials = profile?.full_name
    ? profile.full_name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
    : "F";

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-5 border-b border-sidebar-border">
        <Link to="/" className="flex items-center gap-2">
          <img src={cleancookIqLogo} alt="cleancookIQ logo" className="h-8 w-8 rounded-lg object-contain" />
          <span className="font-display font-bold text-lg text-sidebar-foreground">cleancookIQ</span>
        </Link>
        <p className="text-xs text-sidebar-foreground/60 mt-1">Funder Portal</p>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {/* Dashboard Link */}
        {(() => {
          const isActive = location.pathname === "/funder/dashboard";
          return (
            <Link
              to="/funder/dashboard"
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-sidebar-accent text-sidebar-primary"
                  : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
              }`}
            >
              <LayoutDashboard className="h-4 w-4 shrink-0" />
              Dashboard
            </Link>
          );
        })()}

        {/* Documents Link */}
        {(() => {
          const isActive = location.pathname === "/funder/documents";
          return (
            <Link
              to="/funder/documents"
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-sidebar-accent text-sidebar-primary"
                  : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
              }`}
            >
              <FileText className="h-4 w-4 shrink-0" />
              Documents
            </Link>
          );
        })()}

        {/* Tickets Link */}
        {(() => {
          const isActive = location.pathname === "/funder/support";
          return (
            <Link
              to="/funder/support"
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-sidebar-accent text-sidebar-primary"
                  : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
              }`}
            >
              <Ticket className="h-4 w-4 shrink-0" />
              Tickets
            </Link>
          );
        })()}

        {/* Linked Institutions */}
        {linkedInstitutions && linkedInstitutions.length > 0 && (
          <div className="pt-3">
            <p className="px-3 text-xs font-semibold text-sidebar-foreground/40 uppercase tracking-wider mb-2">
              My Institutions
            </p>
            {linkedInstitutions.map((inst: any) => {
              const href = `/funder/institution/${inst.id}`;
              const isActive = location.pathname === href;
              return (
                <Link
                  key={inst.id}
                  to={href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-sidebar-accent text-sidebar-primary"
                      : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                  }`}
                >
                  <Building2 className="h-4 w-4 shrink-0" />
                  <span className="truncate">{inst.name}</span>
                </Link>
              );
            })}
          </div>
        )}
      </nav>

      <div className="p-3 border-t border-sidebar-border">
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors w-full"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="hidden lg:flex w-64 flex-col fixed inset-y-0 left-0 bg-sidebar border-r border-sidebar-border z-30">
        <SidebarContent />
      </aside>

      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-foreground/50" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 bg-sidebar">
            <SidebarContent />
          </aside>
        </div>
      )}

      <div className="flex-1 lg:ml-64">
        <header className="sticky top-0 z-20 h-14 border-b border-border bg-background/80 backdrop-blur-lg flex items-center justify-between px-4 lg:px-6">
          <button className="lg:hidden" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-3">
            <NotificationBell />
            <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
              <span className="text-xs font-bold text-primary-foreground">{initials}</span>
            </div>
          </div>
        </header>

        <main className="p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
