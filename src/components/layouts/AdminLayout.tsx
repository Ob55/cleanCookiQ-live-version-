import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Building2, Users, ClipboardCheck,
  BarChart3, FileText, TrendingUp, Factory, Menu, X, LogOut,
  Briefcase, Ticket, FlaskConical, Upload, HelpCircle, ScrollText,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import NotificationBell from "@/components/NotificationBell";
import cleancookIqLogo from "@/assets/cleancookiq-logo.png";


const adminNav = [
  { section: "Operations" },
  { label: "Pipeline", href: "/admin/pipeline", icon: TrendingUp },
  { label: "Assessments", href: "/admin/assessments", icon: ClipboardCheck },
  { label: "Opportunities", href: "/admin/opportunities", icon: FileText },

  { section: "Organisations" },
  { label: "Institutions", href: "/admin/institutions", icon: Building2 },
  { label: "Import Institutions", href: "/admin/institutions/import", icon: Upload },
  { label: "Providers", href: "/admin/providers", icon: Factory },

  { section: "Finance" },
  { label: "BD Dashboard", href: "/admin/bd", icon: BarChart3 },
  { label: "Portfolio", href: "/admin/portfolio", icon: Briefcase },
  { label: "Portfolio Aggregation", href: "/admin/portfolio-aggregation", icon: BarChart3 },

  { section: "Agreements" },
  { label: "MOU & IPA", href: "/admin/mou-ipa", icon: ScrollText },

  { section: "People" },
  { label: "Researchers", href: "/admin/researchers", icon: FlaskConical },
  { label: "Others", href: "/admin/others", icon: HelpCircle },
  { label: "Subscribers", href: "/admin/subscribers", icon: Users },
  { label: "Users", href: "/admin/users", icon: Users },

  { section: "Support" },
  { label: "Tickets", href: "/admin/tickets", icon: Ticket },
] as const;

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, profile } = useAuth();
  

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
        <p className="text-xs text-sidebar-foreground/60 mt-1">Admin Console</p>
      </div>

      <nav className="flex-1 p-3 overflow-y-auto space-y-0.5">
        {adminNav.map((item, i) => {
          if ("section" in item) {
            return (
              <p key={`section-${i}`} className="px-3 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40 first:pt-1">
                {item.section}
              </p>
            );
          }
          const isActive =
            location.pathname === item.href ||
            (location.pathname.startsWith(item.href + "/") && !adminNav.some(
              (other) => "href" in other && other !== item && other.href.startsWith(item.href + "/") && location.pathname.startsWith(other.href),
            ));
          return (
            <Link
              key={item.href}
              to={item.href}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
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
