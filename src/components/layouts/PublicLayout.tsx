import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { Menu, X, ChevronDown } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import cleancookIqLogo from "@/assets/cleancookiq-logo.png";

interface NavItem {
  label: string;
  href?: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

// Top-level groups in alphabetical order. Children are also alphabetised.
// "Book a Demo" is intentionally NOT in this list — it sits next to the
// auth buttons on the right.
const NAV_GROUPS: Array<NavItem | NavGroup> = [
  { label: "About", href: "/about" },
  {
    label: "Discover",
    items: [
      { label: "Counties", href: "/counties" },
      { label: "Events", href: "/events" },
      { label: "Map", href: "/map" },
      { label: "News", href: "/news" },
      { label: "Resources", href: "/resources" },
    ],
  },
  {
    label: "Insights",
    items: [
      { label: "Intelligence", href: "/intelligence" },
      { label: "Marketing Analysis", href: "/marketing" },
      { label: "Policy Library", href: "/policy" },
    ],
  },
  {
    label: "Marketplace",
    items: [
      { label: "Marketplace", href: "/marketplace" },
      { label: "Provider Directory", href: "/providers" },
    ],
  },
];

function isGroup(item: NavItem | NavGroup): item is NavGroup {
  return "items" in item && Array.isArray((item as NavGroup).items);
}

export default function PublicLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut, isAdmin } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const isActiveItem = (href?: string) => Boolean(href && location.pathname === href);
  const isActiveGroup = (g: NavGroup) =>
    g.items.some((it) => it.href && location.pathname === it.href);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-lg">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src={cleancookIqLogo} alt="cleancookIQ logo" className="h-8 w-8 rounded-lg object-contain" />
            <span className="font-display font-bold text-lg text-foreground">cleancookIQ</span>
          </Link>

          {/* Desktop nav with hover dropdowns */}
          <NavigationMenu className="hidden md:flex">
            <NavigationMenuList>
              {NAV_GROUPS.map((entry) =>
                isGroup(entry) ? (
                  <NavigationMenuItem key={entry.label}>
                    <NavigationMenuTrigger
                      className={cn(
                        navigationMenuTriggerStyle(),
                        "bg-transparent text-sm h-9 px-3",
                        isActiveGroup(entry) ? "text-primary" : "text-muted-foreground",
                      )}
                    >
                      {entry.label}
                    </NavigationMenuTrigger>
                    <NavigationMenuContent>
                      <ul className="w-48 p-1">
                        {entry.items.map((item) => (
                          <li key={item.href}>
                            <NavigationMenuLink asChild>
                              <Link
                                to={item.href ?? "#"}
                                className={cn(
                                  "block select-none rounded-md px-3 py-2 text-sm leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent",
                                  isActiveItem(item.href) && "bg-accent text-accent-foreground",
                                )}
                              >
                                {item.label}
                              </Link>
                            </NavigationMenuLink>
                          </li>
                        ))}
                      </ul>
                    </NavigationMenuContent>
                  </NavigationMenuItem>
                ) : (
                  <NavigationMenuItem key={entry.label}>
                    <NavigationMenuLink asChild>
                      <Link
                        to={entry.href ?? "#"}
                        className={cn(
                          navigationMenuTriggerStyle(),
                          "bg-transparent text-sm h-9 px-3",
                          isActiveItem(entry.href) ? "text-primary" : "text-muted-foreground",
                        )}
                      >
                        {entry.label}
                      </Link>
                    </NavigationMenuLink>
                  </NavigationMenuItem>
                ),
              )}
            </NavigationMenuList>
          </NavigationMenu>

          <div className="hidden md:flex items-center gap-2">
            <Link to="/book-demo">
              <Button variant="ghost" size="sm">Book a Demo</Button>
            </Link>
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

          <button className="md:hidden" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Toggle menu">
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile nav: groups become collapsible sections */}
        {mobileOpen && (
          <div className="md:hidden border-t border-border bg-background p-4 space-y-3 max-h-[calc(100vh-4rem)] overflow-y-auto">
            {NAV_GROUPS.map((entry) =>
              isGroup(entry) ? (
                <details key={entry.label} className="group">
                  <summary className="flex items-center justify-between py-2 text-sm font-medium text-foreground cursor-pointer">
                    {entry.label}
                    <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="pl-3 space-y-1 pb-2">
                    {entry.items.map((item) => (
                      <Link
                        key={item.href}
                        to={item.href ?? "#"}
                        onClick={() => setMobileOpen(false)}
                        className="block py-1.5 text-sm text-muted-foreground hover:text-primary"
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                </details>
              ) : (
                <Link
                  key={entry.label}
                  to={entry.href ?? "#"}
                  onClick={() => setMobileOpen(false)}
                  className="block py-2 text-sm font-medium text-muted-foreground hover:text-primary"
                >
                  {entry.label}
                </Link>
              ),
            )}
            <div className="border-t pt-3 space-y-2">
              <Link
                to="/book-demo"
                onClick={() => setMobileOpen(false)}
                className="block py-2 text-sm font-medium text-muted-foreground hover:text-primary"
              >
                Book a Demo
              </Link>
              <div className="flex gap-2">
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
              <h4 className="font-display font-semibold mb-3 text-sm text-primary-foreground">Marketplace</h4>
              <div className="space-y-2">
                <Link to="/marketplace" className="block text-sm text-primary-foreground/60 hover:text-accent">Browse products</Link>
                <Link to="/providers" className="block text-sm text-primary-foreground/60 hover:text-accent">Provider directory</Link>
              </div>
            </div>
            <div>
              <h4 className="font-display font-semibold mb-3 text-sm text-primary-foreground">Discover</h4>
              <div className="space-y-2">
                <Link to="/map" className="block text-sm text-primary-foreground/60 hover:text-accent">National map</Link>
                <Link to="/counties" className="block text-sm text-primary-foreground/60 hover:text-accent">County profiles</Link>
                <Link to="/resources" className="block text-sm text-primary-foreground/60 hover:text-accent">Resources</Link>
                <Link to="/events" className="block text-sm text-primary-foreground/60 hover:text-accent">Events</Link>
                <Link to="/news" className="block text-sm text-primary-foreground/60 hover:text-accent">News</Link>
                <Link to="/policy" className="block text-sm text-primary-foreground/60 hover:text-accent">Policy library</Link>
              </div>
            </div>
            <div>
              <h4 className="font-display font-semibold mb-3 text-sm text-primary-foreground">Company</h4>
              <div className="space-y-2">
                <Link to="/about" className="block text-sm text-primary-foreground/60 hover:text-accent">About</Link>
                <Link to="/intelligence" className="block text-sm text-primary-foreground/60 hover:text-accent">Intelligence</Link>
                <Link to="/book-demo" className="block text-sm text-primary-foreground/60 hover:text-accent">Book a demo</Link>
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
