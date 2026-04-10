import { Outlet, Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Building2, Users, ClipboardCheck, Settings,
  BarChart3, FileText, Shield, TrendingUp, Factory, Menu, X, LogOut, Bell
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const adminNav = [
  { label: "Pipeline", href: "/admin/pipeline", icon: TrendingUp },
  { label: "Institutions", href: "/admin/institutions", icon: Building2 },
  { label: "Providers", href: "/admin/providers", icon: Factory },
  { label: "Assessments", href: "/admin/assessments", icon: ClipboardCheck },
  { label: "Opportunities", href: "/admin/opportunities", icon: FileText },
  { label: "BD Dashboard", href: "/admin/bd", icon: BarChart3 },
  { label: "Users", href: "/admin/users", icon: Users },
  { label: "Scoring Config", href: "/admin/scoring/config", icon: Settings },
  { label: "Cost Tables", href: "/admin/engine/costs", icon: LayoutDashboard },
  { label: "Audit Log", href: "/admin/audit", icon: Shield },
];

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-5 border-b border-sidebar-border">
        <Link to="/" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-sidebar-primary flex items-center justify-center">
            <span className="font-display font-bold text-sm text-sidebar-primary-foreground">C</span>
          </div>
          <span className="font-display font-bold text-lg text-sidebar-foreground">
            CleanCook<span className="text-sidebar-primary">IQ</span>
          </span>
        </Link>
        <p className="text-xs text-sidebar-foreground/60 mt-1">Admin Console</p>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {adminNav.map((item) => {
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
        <Link
          to="/auth/login"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 flex-col fixed inset-y-0 left-0 bg-sidebar border-r border-sidebar-border z-30">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-charcoal/50" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 bg-sidebar">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 lg:ml-64">
        <header className="sticky top-0 z-20 h-14 border-b border-border bg-background/80 backdrop-blur-lg flex items-center justify-between px-4 lg:px-6">
          <button className="lg:hidden" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-4 w-4" />
              <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-accent" />
            </Button>
            <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
              <span className="text-xs font-bold text-primary-foreground">A</span>
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
