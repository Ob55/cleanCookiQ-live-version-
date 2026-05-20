import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Building2, FlaskConical, FileText, LifeBuoy, Menu, LogOut,
  Ticket, ScrollText, Factory, Lock,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import NotificationBell from "@/components/NotificationBell";
import cleancookIqLogo from "@/assets/cleancookiq-logo.png";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { sbAny } from "@/lib/sbAny";


const institutionNav = [
  { label: "Dashboard", href: "/institution/dashboard", icon: LayoutDashboard },
  { label: "My Institution", href: "/institution/profile", icon: Building2 },
  { label: "Cooking Counting", href: "/institution/alchemy", icon: FlaskConical },
  { label: "Documents", href: "/institution/documents", icon: FileText },
  { label: "IPA", href: "/institution/ipa", icon: ScrollText },
  { label: "Supplier Details", href: "/institution/supplier-details", icon: Factory, gated: true as const },
  { label: "Tickets", href: "/institution/support", icon: Ticket },
];

export default function InstitutionLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, profile, user } = useAuth();

  // Count of supplier links shared with this institution — drives the
  // "Supplier Details" nav item's enabled state.
  const { data: supplierLinkCount = 0 } = useQuery({
    queryKey: ["my-supplier-link-count", user?.id],
    enabled: !!user,
    refetchInterval: 30_000,
    queryFn: async () => {
      if (!user) return 0;
      // Resolve institution id the same way the page does.
      const { data: byCreator } = await supabase
        .from("institutions")
        .select("id")
        .eq("created_by", user.id)
        .limit(1)
        .maybeSingle();
      let instId = byCreator?.id as string | null;
      if (!instId) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("organisation_id")
          .eq("user_id", user.id)
          .maybeSingle();
        instId = (prof?.organisation_id as string | null) ?? null;
      }
      if (!instId) return 0;
      const { count } = await sbAny
        .from("institution_supplier_links")
        .select("id", { count: "exact", head: true })
        .eq("institution_id", instId);
      return count ?? 0;
    },
  });

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const initials = profile?.full_name
    ? profile.full_name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-5 border-b border-sidebar-border">
        <Link to="/" className="flex items-center gap-2">
          <img src={cleancookIqLogo} alt="CleanCookIQ logo" className="h-8 w-8 rounded-lg object-contain" />
          <span className="font-display font-bold text-lg text-sidebar-foreground">CleanCookIQ</span>
        </Link>
        <p className="text-xs text-sidebar-foreground/60 mt-1">Institution Portal</p>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {institutionNav.map((item) => {
          const isActive = location.pathname.startsWith(item.href);
          // Gated items (e.g. Supplier Details) are disabled until admin
          // shares something with this institution. Render as a non-clickable
          // chip showing a lock so the user knows it exists and what unlocks it.
          const isGated = "gated" in item && item.gated;
          const isDisabled = isGated && supplierLinkCount === 0;

          if (isDisabled) {
            return (
              <div
                key={item.href}
                title="Admin hasn't shared a supplier with your institution yet. This unlocks automatically when they do."
                className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/35 cursor-not-allowed select-none"
                aria-disabled="true"
              >
                <span className="flex items-center gap-3">
                  <item.icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </span>
                <Lock className="h-3 w-3 shrink-0" />
              </div>
            );
          }
          return (
            <Link
              key={item.href}
              to={item.href}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-sidebar-accent text-sidebar-primary"
                  : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
              }`}
            >
              <span className="flex items-center gap-3">
                <item.icon className="h-4 w-4 shrink-0" />
                {item.label}
              </span>
              {isGated && supplierLinkCount > 0 && (
                <span className="rounded-full bg-accent text-accent-foreground text-[10px] font-bold px-1.5">
                  {supplierLinkCount}
                </span>
              )}
            </Link>
          );
        })}
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
            <Link to="/institution/account/organisation" title="Manage organisation" className="h-8 w-8 rounded-full bg-primary flex items-center justify-center hover:ring-2 hover:ring-primary/30 transition">
              <span className="text-xs font-bold text-primary-foreground">{initials}</span>
            </Link>
          </div>
        </header>

        <main className="p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
