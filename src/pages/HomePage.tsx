import { Link, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MapPin, BarChart3, Users, TrendingUp, Leaf, Building2, ArrowRight, Flame, Factory, Banknote, Briefcase, FolderKanban, GraduationCap, UserPlus, ClipboardCheck, Handshake, Rocket, Activity, ChevronRight } from "lucide-react";
import FuelOptionsSection from "@/components/institution/FuelOptionsSection";
import heroBg from "@/assets/hero-bg.jpg";
import partner1 from "@/assets/partners/partner1.png";
import partner2 from "@/assets/partners/partner2.png";
import partner3 from "@/assets/partners/partner3.png";
import partner4 from "@/assets/partners/partner4.png";
import partner5 from "@/assets/partners/partner5.png";
import partner6 from "@/assets/partners/partner6.png";
import partner7 from "@/assets/partners/partner7.png";
import { useAuth } from "@/contexts/AuthContext";
import AnimatedNumber from "@/components/AnimatedNumber";

const partners = [partner1, partner2, partner3, partner4, partner5, partner6, partner7];

const stats = [
  { label: "Institutions Tracked", num: 2847, suffix: "", decimals: 0, icon: Building2 },
  { label: "Institutions Assessed", num: 1234, suffix: "", decimals: 0, icon: BarChart3 },
  { label: "Projects in Delivery", num: 89, suffix: "", decimals: 0, icon: TrendingUp },
  { label: "Pipeline Value (KSh)", num: 4.2, suffix: "B", decimals: 1, icon: Flame },
  { label: "Tonnes CO₂ Avoided", num: 12450, suffix: "", decimals: 0, icon: Leaf },
];

const modules = [
  { title: "Pipeline Intelligence & Map", desc: "Interactive national map with institution-level transition data, readiness scores, and pipeline tracking from identification to monitored delivery.", icon: MapPin, color: "bg-primary" },
  { title: "Provider & Partner Registry", desc: "Vetted directory of equipment providers, installation technicians, logistics providers, and service partners — with NDA/MoU gating and category classification.", icon: Factory, color: "bg-accent" },
  { title: "Technical Assistance (TA)", desc: "Matching institutions needing capacity building, technical design, or training support with qualified TA providers by county and expertise.", icon: GraduationCap, color: "bg-emerald-light" },
  { title: "Financing Platform", desc: "Grant applications, concessional debt, and equity instruments — connecting institutions with verified pipeline data to funders and investors.", icon: Banknote, color: "bg-primary" },
  { title: "Portfolio Management", desc: "Post-installation monitoring with dMRV records, OPEX contract tracking, and support ticket management for active projects.", icon: Briefcase, color: "bg-accent" },
  { title: "Program Management", desc: "Multi-institution programme coordination with procurement RFQs, provider bidding, and financial due diligence workflows.", icon: FolderKanban, color: "bg-emerald-light" },
];

const failures = [
  { fail: "No verified demand data", fix: "Institution Demand Registry creates a scored pipeline of real buyers" },
  { fail: "No trusted supplier directory", fix: "Supply Registry onboards and vets providers with scored profiles" },
  { fail: "No financing coordination", fix: "Opportunity Layer matches funders to verified project opportunities" },
  { fail: "No transition pathway clarity", fix: "Least-Cost Engine computes optimal technology per institution" },
  { fail: "No coordinating actor", fix: "The platform is the trusted neutral coordinator — Ignis operates it commercially" },
];

const steps = [
  { step: "01", title: "Register", icon: UserPlus, desc: "Institutions register cooking data — fuel type, population, budget, location." },
  { step: "02", title: "Assess & Score", icon: ClipboardCheck, desc: "7-dimension readiness engine scores each institution and computes the least-cost pathway." },
  { step: "03", title: "Match & Finance", icon: Handshake, desc: "Verified providers matched to ready institutions. Funders connect to bankable opportunities." },
  { step: "04", title: "Deploy", icon: Rocket, desc: "Equipment installed and commissioned. Milestones tracked in real-time through the platform." },
  { step: "05", title: "Monitor & Verify", icon: Activity, desc: "Post-installation performance monitored. Data feeds carbon credit verification and impact reports." },
];

export default function HomePage() {
  const { user, profile, roles, loading } = useAuth();

  if (!loading && user) {
    if (roles.some(r => ["admin", "manager", "field_agent"].includes(r))) return <Navigate to="/admin/pipeline" replace />;
    if (profile?.org_type === "institution") return <Navigate to={profile?.organisation_id ? "/institution/dashboard" : "/institution/setup"} replace />;
    if (profile?.org_type === "supplier") return <Navigate to="/supplier/dashboard" replace />;
    if (profile?.org_type === "funder") return <Navigate to="/funder/dashboard" replace />;
  }

  return (
    <div>
      {/* Hero */}
      <section className="relative min-h-[85vh] flex items-center overflow-hidden">
        <div className="absolute inset-0">
          <img src={heroBg} alt="Clean cooking facility in rural Kenya" className="w-full h-full object-cover" width={1920} height={1080} />
          <div className="absolute inset-0 bg-gradient-to-r from-foreground/95 via-foreground/85 to-foreground/50" />
        </div>
        <div className="container relative z-10 py-20">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-accent/20 border border-accent/30 rounded-full px-4 py-1.5 mb-6 animate-fade-in" style={{ animationDelay: "0ms" }}>
              <Leaf className="h-4 w-4 text-accent" />
              <span className="text-xs font-medium text-accent">National Coordination Platform</span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-primary-foreground leading-tight mb-6 animate-fade-in" style={{ animationDelay: "150ms" }}>
              Powering Kenya's Clean Cooking Transition
            </h1>
            <p className="text-lg text-primary-foreground/80 mb-4 max-w-xl font-body animate-fade-in" style={{ animationDelay: "300ms" }}>
              CleanCookiQ converts fragmented demand, dispersed supply, and available financing into a structured, verified national transition pipeline.
            </p>
            <p className="text-sm text-primary-foreground/60 mb-8 max-w-xl font-body italic animate-fade-in" style={{ animationDelay: "400ms" }}>
              CleanCookiQ builds a transition pipeline per institution — displaying fuel of choice, meals served, recommended solution, and savings potential on an interactive national map.
            </p>
            <div className="flex flex-wrap gap-4 animate-fade-in" style={{ animationDelay: "500ms" }}>
              <Link to="/map">
                <Button size="lg" className="bg-accent text-accent-foreground hover:bg-amber-light font-semibold">
                  <MapPin className="mr-2 h-4 w-4" /> Explore the Map
                </Button>
              </Link>
              <Link to="/auth/register">
                <Button size="lg" className="bg-accent text-accent-foreground hover:bg-amber-light font-semibold">
                  Join the Platform <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Live Stats Bar */}
      <section className="bg-primary py-5">
        <div className="container">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {stats.map((stat) => (
              <div key={stat.label} className="flex items-center gap-3 text-primary-foreground">
                <stat.icon className="h-5 w-5 text-accent shrink-0" />
                <div>
                  <p className="text-lg md:text-xl font-display font-bold">
                    <AnimatedNumber value={stat.num} suffix={stat.suffix} decimals={stat.decimals} />
                  </p>
                  <p className="text-[11px] text-primary-foreground/70 leading-tight">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6 Modules */}
      <section className="py-20 lg:py-28 bg-background">
        <div className="container">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">6 First-Class Modules</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">From pipeline intelligence to post-installation monitoring — one integrated platform covering every layer of the clean cooking transition.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {modules.map((mod, i) => (
              <div key={mod.title} className="relative bg-card rounded-xl p-8 shadow-card border border-border hover:shadow-elevated transition-shadow">
                <div className="flex items-center gap-4 mb-5">
                  <div className={`h-12 w-12 rounded-xl ${mod.color} flex items-center justify-center`}>
                    <mod.icon className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <span className="text-sm font-bold text-muted-foreground font-body">Module {i + 1}</span>
                </div>
                <h3 className="font-display font-bold text-xl mb-3">{mod.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{mod.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Fuel Options */}
      <section className="py-20 lg:py-28 bg-background">
        <div className="container"><FuelOptionsSection /></div>
      </section>

      {/* Five Market Failures — two columns */}
      <section className="py-20 lg:py-28 bg-muted/20">
        <div className="container">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">Five Market Failures, One Solution</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">The institutional clean cooking market is broken. CleanCookiQ is the coordinating intelligence layer that fixes it.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 rounded-2xl overflow-hidden shadow-elevated">
            {/* Left — Failures */}
            <div className="p-8 lg:p-10" style={{ background: "linear-gradient(145deg, hsl(36,75%,25%) 0%, hsl(36,80%,36%) 100%)" }}>
              <div className="flex items-center gap-3 mb-8">
                <div className="h-8 w-8 rounded-lg bg-destructive/20 border border-destructive/30 flex items-center justify-center shrink-0">
                  <span className="text-destructive font-bold text-sm">✕</span>
                </div>
                <p className="text-destructive text-xs font-bold uppercase tracking-widest">Market Failures</p>
              </div>
              <ul className="space-y-6">
                {failures.map((item, i) => (
                  <li key={item.fail} className="flex items-start gap-4 animate-slide-up" style={{ animationDelay: `${i * 80}ms`, animationFillMode: "backwards" }}>
                    <div className="h-9 w-9 rounded-full bg-destructive/20 border border-destructive/30 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-destructive font-bold text-sm">{i + 1}</span>
                    </div>
                    <h4 className="font-display font-semibold text-black leading-snug pt-1.5">{item.fail}</h4>
                  </li>
                ))}
              </ul>
            </div>
            {/* Right — Solutions */}
            <div className="p-8 lg:p-10 bg-primary/5 border-l border-primary/10">
              <div className="flex items-center gap-3 mb-8">
                <div className="h-8 w-8 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0">
                  <ChevronRight className="h-4 w-4 text-primary" />
                </div>
                <p className="text-primary text-xs font-bold uppercase tracking-widest">Our Solution</p>
              </div>
              <ul className="space-y-6">
                {failures.map((item, i) => (
                  <li key={item.fix} className="flex items-start gap-4 animate-slide-up" style={{ animationDelay: `${i * 80 + 200}ms`, animationFillMode: "backwards" }}>
                    <div className="h-9 w-9 rounded-full bg-primary/15 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                      <ChevronRight className="h-4 w-4 text-primary" />
                    </div>
                    <p className="text-sm text-foreground leading-relaxed pt-1.5">{item.fix}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 lg:py-28 bg-background">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">How CleanCookiQ Works</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">A structured pipeline that takes institutions from registration to monitored clean kitchens.</p>
          </div>
          <div className="flex flex-col lg:flex-row items-start justify-center gap-0">
            {steps.map((item, i) => (
              <div key={item.step} className="flex items-center">
                <div
                  className="flex flex-col items-center text-center group w-48 animate-slide-up"
                  style={{ animationDelay: `${i * 120}ms`, animationFillMode: "backwards" }}
                >
                  <div className="h-24 w-24 rounded-full bg-primary flex items-center justify-center mb-5 shadow-lg shadow-primary/20 transition-all duration-300 group-hover:scale-110 group-hover:shadow-xl group-hover:shadow-primary/40">
                    <item.icon className="h-11 w-11 text-primary-foreground transition-transform duration-300 group-hover:scale-110" />
                  </div>
                  <span className="text-xs font-bold text-primary tracking-widest uppercase mb-2">Step {item.step}</span>
                  <h3 className="font-display font-bold text-xl mb-3">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed max-w-[160px]">{item.desc}</p>
                </div>
                {i < steps.length - 1 && (
                  <div className="hidden lg:flex items-center mx-1 mt-[-110px]">
                    <div className="w-8 h-0.5 bg-primary/30" />
                    <ChevronRight className="h-7 w-7 text-primary animate-arrow-pulse -ml-2" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Our Partners - animated marquee */}
      <section className="py-16 lg:py-20 bg-background border-t border-border">
        <div className="container">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-display font-bold mb-2">Our Partners</h2>
            <p className="text-sm text-muted-foreground">Trusted organisations powering Kenya's clean cooking transition.</p>
          </div>
        </div>
        <div className="relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
          <div className="flex w-max animate-marquee gap-16 items-center">
            {[...partners, ...partners].map((logo, i) => (
              <div key={i} className="h-20 w-40 flex items-center justify-center shrink-0">
                <img src={logo} alt={`Partner ${(i % partners.length) + 1}`} className="max-h-16 max-w-full object-contain" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-hero text-primary-foreground">
        <div className="container text-center">
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">Ready to Join the Transition?</h2>
          <p className="text-primary-foreground/80 max-w-xl mx-auto">Whether you're an institution, provider, funder, or researcher — there's a place for you on CleanCookiQ.</p>
        </div>
      </section>
    </div>
  );
}
