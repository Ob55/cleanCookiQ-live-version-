import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import cleancookIqLogo from "@/assets/cleancookiq-logo.png";

const navLinks = [
  { label: "Map", href: "/map" },
  { label: "Intelligence", href: "/intelligence" },
  { label: "Marketing Analysis", href: "/marketing" },
  { label: "About", href: "/about" },
];

export default function PublicLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut, isAdmin } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-lg">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src={cleancookIqLogo} alt="cleancookIQ logo" className="h-8 w-8 rounded-lg object-contain" />
            <span className="font-display font-bold text-lg text-foreground">cleancookIQ</span>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  location.pathname === link.href ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <>
                {isAdmin && (
                  <Link to="/admin/pipeline">
                    <Button variant="ghost" size="sm">Admin</Button>
                  </Link>
                )}
                <Button variant="ghost" size="sm" onClick={handleSignOut}>Sign Out</Button>
              </>
            ) : (
              <>
                <Link to="/auth/login"><Button variant="ghost" size="sm">Log in</Button></Link>
                <Link to="/auth/register">
                  <Button size="sm" className="bg-accent text-accent-foreground hover:bg-amber-light">Join the Platform</Button>
                </Link>
              </>
            )}
          </div>

          <button className="md:hidden" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {mobileOpen && (
          <div className="md:hidden border-t border-border bg-background p-4 space-y-3">
            {navLinks.map((link) => (
              <Link key={link.href} to={link.href} className="block py-2 text-sm font-medium text-muted-foreground hover:text-primary" onClick={() => setMobileOpen(false)}>
                {link.label}
              </Link>
            ))}
            <div className="flex gap-2 pt-2">
              {user ? (
                <Button variant="outline" size="sm" className="w-full" onClick={handleSignOut}>Sign Out</Button>
              ) : (
                <>
                  <Link to="/auth/login" className="flex-1"><Button variant="outline" size="sm" className="w-full">Log in</Button></Link>
                  <Link to="/auth/register" className="flex-1"><Button size="sm" className="w-full bg-accent text-accent-foreground hover:bg-amber-light">Join</Button></Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      <main className="flex-1"><Outlet /></main>

      <footer className="border-t border-border bg-foreground text-primary-foreground">
        <div className="container py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <img src={cleancookIqLogo} alt="cleancookIQ logo" className="h-8 w-8 rounded-lg object-contain" />
                <span className="font-display font-bold text-lg">cleancookIQ</span>
              </div>
              <p className="text-sm text-primary-foreground/60">Orchestrating Kenya's transition to clean institutional cooking.</p>
            </div>
            <div>
              <h4 className="font-display font-semibold mb-3 text-sm text-primary-foreground">Platform</h4>
              <div className="space-y-2">
                <Link to="/map" className="block text-sm text-primary-foreground/60 hover:text-accent">National Map</Link>
                <Link to="/intelligence" className="block text-sm text-primary-foreground/60 hover:text-accent">Intelligence</Link>
                <Link to="/providers" className="block text-sm text-primary-foreground/60 hover:text-accent">Provider Directory</Link>
              </div>
            </div>
            <div>
              <h4 className="font-display font-semibold mb-3 text-sm text-primary-foreground">Company</h4>
              <div className="space-y-2">
                <Link to="/about" className="block text-sm text-primary-foreground/60 hover:text-accent">About cleancookIQ</Link>
              </div>
            </div>
            <div>
              <h4 className="font-display font-semibold mb-3 text-sm text-primary-foreground">Legal</h4>
              <div className="space-y-2">
                <span className="block text-sm text-primary-foreground/60">Privacy Policy</span>
                <span className="block text-sm text-primary-foreground/60">Terms of Service</span>
              </div>
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-primary-foreground/20 text-center text-xs text-primary-foreground/60">
            © {new Date().getFullYear()} cleancookIQ. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
