import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Package, Wrench, FileCheck, Menu, LogOut, FileText, Ticket, ScrollText
} from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import NotificationBell from "@/components/NotificationBell";
import cleancookIqLogo from "@/assets/cleancookiq-logo.png";

const supplierNav = [
  { label: "Dashboard", href: "/supplier/dashboard", icon: LayoutDashboard },
  { label: "Products", href: "/supplier/products", icon: Package },
  { label: "Services", href: "/supplier/services", icon: Wrench },
  { label: "Documents & Compliance", href: "/supplier/documents", icon: FileCheck },
  { label: "Opportunities", href: "/supplier/opportunities", icon: FileText },
  { label: "MOU", href: "/supplier/mou", icon: ScrollText },
  { label: "Tickets", href: "/supplier/support", icon: Ticket },
];

export default function SupplierLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [needsCount, setNeedsCount] = useState(0);
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, profile } = useAuth();

  useEffect(() => {
    const fetchNeeds = async () => {
      const { count } = await supabase
        .from("institution_needs")
        .select("*", { count: "exact", head: true })
        .eq("status", "open");
      setNeedsCount(count ?? 0);
    };
    fetchNeeds();
  }, [location.pathname]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth/login");
  };

  const initials = profile?.full_name
    ? profile.full_name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-5 border-b border-sidebar-border">
        <Link to="/" className="flex items-center gap-2">
          <img src={cleancookIqLogo} alt="cleancookIQ logo" className="h-8 w-8 rounded-lg object-contain" />
          <span className="font-display font-bold text-lg text-sidebar-foreground">cleancookIQ</span>
        </Link>
        <p className="text-xs text-sidebar-foreground/60 mt-1">Supplier Portal</p>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {supplierNav.map((item) => {
          const isActive = location.pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              to={item.href}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-sidebar-accent text-sidebar-primary"
                  : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
              }`}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
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
