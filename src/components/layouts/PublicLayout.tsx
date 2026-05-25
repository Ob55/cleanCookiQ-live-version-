import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Menu, X, ChevronDown, Flame, ArrowUpRight } from "lucide-react";
import { useState, useEffect } from "react";
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
      { label: "Market Insights", href: "/marketing" },
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

function NavGroupDropdown({
  group, isActive, isActiveItem,
}: {
  group: NavGroup;
  isActive: boolean;
  isActiveItem: (href?: string) => boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
          className={cn(
            "inline-flex items-center gap-1 h-9 px-3.5 rounded-full text-[13px] font-medium transition-colors",
            isActive || open ? "text-foreground" : "text-foreground/65 hover:text-primary",
          )}
        >
          {group.label}
          <ChevronDown className={cn("h-3 w-3 transition-transform opacity-70", open && "rotate-180")} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={8}
        className="w-52 p-1 liquid-glass-strong rounded-2xl border border-border bg-white shadow-lg text-foreground"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
      >
        {group.items.map((item) => (
          <Link
            key={item.href}
            to={item.href ?? "#"}
            onClick={() => setOpen(false)}
            className={cn(
              "block select-none rounded-xl px-3 py-2 text-sm leading-none transition-colors hover:bg-ignis/15 hover:text-ignis-bright",
              isActiveItem(item.href) && "bg-ignis/20 text-primary font-medium",
            )}
          >
            {item.label}
          </Link>
        ))}
      </PopoverContent>
    </Popover>
  );
}

export default function PublicLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut, isAdmin } = useAuth();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Lock body scroll while mobile menu is open
  useEffect(() => {
    if (mobileOpen) {
      const original = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = original; };
    }
  }, [mobileOpen]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const isActiveItem = (href?: string) => Boolean(href && location.pathname === href);
  const isActiveGroup = (g: NavGroup) =>
    g.items.some((it) => it.href && location.pathname === it.href);

  return (
    <div className="theme-ignis min-h-screen flex flex-col bg-background text-foreground">
      <header
        className={cn(
          "fixed top-4 left-1/2 -translate-x-1/2 z-50 transition-all duration-300",
          "w-[calc(100%-1.5rem)] max-w-[1180px]",
        )}
      >
        <div
          className={cn(
            "liquid-glass-strong rounded-full transition-all",
            scrolled ? "bg-black/75" : "bg-black/45",
          )}
        >
          <div className="flex h-14 items-center justify-between gap-3 pl-5 pr-2">
            <Link to="/" className="flex items-center gap-2.5 group">
              <span className="relative h-9 w-9 rounded-xl bg-gradient-ignis flex items-center justify-center shadow-ignis">
                <Flame className="h-4.5 w-4.5 text-white" strokeWidth={2.5} />
                <span className="absolute inset-0 rounded-xl bg-gradient-ignis opacity-50 blur-md -z-10 group-hover:opacity-80 transition-opacity" />
              </span>
              <span className="font-display font-bold text-base text-foreground tracking-tight">CleanCookIQ</span>
            </Link>

            <nav className="hidden lg:flex items-center gap-0.5">
              {NAV_GROUPS.map((entry) =>
                isGroup(entry) ? (
                  <NavGroupDropdown
                    key={entry.label}
                    group={entry}
                    isActive={isActiveGroup(entry)}
                    isActiveItem={isActiveItem}
                  />
                ) : (
                  <Link
                    key={entry.label}
                    to={entry.href ?? "#"}
                    className={cn(
                      "inline-flex items-center h-9 px-3.5 rounded-full text-[13px] font-medium transition-colors",
                      isActiveItem(entry.href) ? "text-foreground" : "text-foreground/65 hover:text-primary",
                    )}
                  >
                    {entry.label}
                  </Link>
                ),
              )}
            </nav>

            <div className="hidden lg:flex items-center gap-1.5">
              {user ? (
                <>
                  {isAdmin && (
                    <Link to="/admin/pipeline">
                      <button className="h-9 px-4 rounded-full text-[13px] font-medium text-foreground/70 hover:text-primary transition-colors">Admin</button>
                    </Link>
                  )}
                  <button
                    onClick={handleSignOut}
                    className="h-9 px-4 rounded-full text-[13px] font-medium text-foreground/70 hover:text-primary transition-colors"
                  >
                    Sign Out
                  </button>
                  <Link to="/book-demo">
                    <button className="h-9 pl-4 pr-4 rounded-full text-[13px] font-semibold bg-white text-hunter-green hover:bg-ignis hover:text-white transition-all inline-flex items-center gap-1">
                      Book a Demo <ArrowUpRight className="h-3.5 w-3.5" />
                    </button>
                  </Link>
                </>
              ) : (
                <>
                  <Link to="/auth/login">
                    <button className="h-9 px-4 rounded-full text-[13px] font-medium text-foreground/70 hover:text-primary transition-colors">Log in</button>
                  </Link>
                  <Link to="/auth/register">
                    <button className="h-9 pl-4 pr-4 rounded-full text-[13px] font-semibold bg-white text-hunter-green hover:bg-ignis hover:text-white transition-all inline-flex items-center gap-1">
                      Join <ArrowUpRight className="h-3.5 w-3.5" />
                    </button>
                  </Link>
                </>
              )}
            </div>

            <button
              className="lg:hidden h-9 w-9 mr-1 rounded-full inline-flex items-center justify-center text-foreground hover:bg-primary/5 transition-colors"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle menu"
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile menu — full-screen overlay panel anchored below the pill */}
      {mobileOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <div className="lg:hidden fixed top-[5.25rem] left-3 right-3 z-50 max-h-[calc(100vh-6.5rem)] overflow-y-auto rounded-3xl bg-white border border-border shadow-lg animate-in slide-in-from-top-4 fade-in duration-200">
            <nav className="p-2">
              {NAV_GROUPS.map((entry) =>
                isGroup(entry) ? (
                  <details key={entry.label} className="group/details rounded-2xl">
                    <summary className="flex items-center justify-between px-4 h-12 text-[15px] font-medium text-foreground cursor-pointer list-none rounded-2xl hover:bg-muted active:bg-muted transition-colors">
                      <span>{entry.label}</span>
                      <ChevronDown className="h-4 w-4 text-foreground/60 transition-transform group-open/details:rotate-180" />
                    </summary>
                    <div className="pl-3 pr-2 pb-1.5 space-y-0.5">
                      {entry.items.map((item) => (
                        <Link
                          key={item.href}
                          to={item.href ?? "#"}
                          onClick={() => setMobileOpen(false)}
                          className={cn(
                            "flex items-center px-4 h-11 text-[14px] rounded-xl transition-colors",
                            isActiveItem(item.href)
                              ? "bg-ignis/15 text-primary font-medium"
                              : "text-foreground/70 hover:text-primary hover:bg-muted active:bg-muted",
                          )}
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
                    className={cn(
                      "flex items-center px-4 h-12 text-[15px] font-medium rounded-2xl transition-colors",
                      isActiveItem(entry.href)
                        ? "bg-ignis/15 text-primary"
                        : "text-foreground hover:bg-muted active:bg-muted",
                    )}
                  >
                    {entry.label}
                  </Link>
                ),
              )}
            </nav>
            <div className="border-t border-border p-3 space-y-2.5">
              <Link
                to="/book-demo"
                onClick={() => setMobileOpen(false)}
                className="flex items-center justify-center gap-1.5 h-11 rounded-full bg-white text-hunter-green text-[14px] font-semibold hover:bg-ignis hover:text-white transition-colors"
              >
                Book a Demo <ArrowUpRight className="h-4 w-4" />
              </Link>
              {user ? (
                <div className="flex gap-2">
                  {isAdmin && (
                    <Link to="/admin/pipeline" onClick={() => setMobileOpen(false)} className="flex-1">
                      <Button variant="outline" size="default" className="w-full rounded-full border-border text-foreground bg-transparent hover:bg-muted">Admin</Button>
                    </Link>
                  )}
                  <Button
                    variant="outline"
                    size="default"
                    className="flex-1 rounded-full border-border text-foreground bg-transparent hover:bg-muted"
                    onClick={() => { setMobileOpen(false); handleSignOut(); }}
                  >
                    Sign Out
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Link to="/auth/login" onClick={() => setMobileOpen(false)} className="flex-1">
                    <Button variant="outline" size="default" className="w-full rounded-full border-border text-foreground bg-transparent hover:bg-muted">Log in</Button>
                  </Link>
                  <Link to="/auth/register" onClick={() => setMobileOpen(false)} className="flex-1">
                    <Button size="default" className="w-full rounded-full bg-gradient-ignis text-white border-0 hover:opacity-95">Join</Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      <main className="flex-1"><Outlet /></main>

      <footer className="relative overflow-hidden bg-background text-foreground border-t border-border">
        {/* ambient glow */}
        <div className="pointer-events-none absolute inset-x-0 -top-40 h-80 bg-gradient-to-b from-ignis/10 via-transparent to-transparent" />
        <div className="pointer-events-none absolute -left-32 top-1/3 h-72 w-72 rounded-full bg-rich-emerald/15 blur-3xl animate-glow-pulse" />
        <div className="pointer-events-none absolute -right-32 bottom-0 h-72 w-72 rounded-full bg-ignis/10 blur-3xl animate-glow-pulse" style={{ animationDelay: "1.5s" }} />

        <div className="relative max-w-[1600px] mx-auto px-6 lg:px-12 pt-16 pb-10">
          {/* Link grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-14">
            <div>
              <div className="flex items-center gap-2 mb-5">
                <span className="h-8 w-8 rounded-lg bg-gradient-ignis flex items-center justify-center shadow-ignis">
                  <Flame className="h-4 w-4 text-white" strokeWidth={2.5} />
                </span>
                <span className="font-display font-bold text-base text-foreground">CleanCookIQ</span>
              </div>
              <p className="text-sm text-foreground/55 leading-relaxed">
                The coordination and intelligence layer for clean institutional cooking.
              </p>
            </div>
            <div>
              <h4 className="text-[11px] uppercase tracking-[0.18em] text-primary mb-4 font-medium">Marketplace</h4>
              <div className="space-y-2.5">
                <Link to="/marketplace" className="block text-sm text-foreground/65 hover:text-primary transition-colors">Browse products</Link>
                <Link to="/providers" className="block text-sm text-foreground/65 hover:text-primary transition-colors">Provider directory</Link>
              </div>
            </div>
            <div>
              <h4 className="text-[11px] uppercase tracking-[0.18em] text-primary mb-4 font-medium">Discover</h4>
              <div className="space-y-2.5">
                <Link to="/map" className="block text-sm text-foreground/65 hover:text-primary transition-colors">National map</Link>
                <Link to="/counties" className="block text-sm text-foreground/65 hover:text-primary transition-colors">County profiles</Link>
                <Link to="/resources" className="block text-sm text-foreground/65 hover:text-primary transition-colors">Resources</Link>
                <Link to="/events" className="block text-sm text-foreground/65 hover:text-primary transition-colors">Events</Link>
                <Link to="/news" className="block text-sm text-foreground/65 hover:text-primary transition-colors">News</Link>
                <Link to="/policy" className="block text-sm text-foreground/65 hover:text-primary transition-colors">Policy library</Link>
              </div>
            </div>
            <div>
              <h4 className="text-[11px] uppercase tracking-[0.18em] text-primary mb-4 font-medium">Company</h4>
              <div className="space-y-2.5">
                <Link to="/about" className="block text-sm text-foreground/65 hover:text-primary transition-colors">About</Link>
                <Link to="/intelligence" className="block text-sm text-foreground/65 hover:text-primary transition-colors">Intelligence</Link>
                <Link to="/book-demo" className="block text-sm text-foreground/65 hover:text-primary transition-colors">Book a demo</Link>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-6 border-t border-border text-xs text-foreground/45">
            <p>© {new Date().getFullYear()} CleanCookIQ. All rights reserved.</p>
            <p>Built with intention in Nairobi.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
