import { Link, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MapPin, BarChart3, Users, TrendingUp, Leaf, Building2, ArrowRight, Flame, Factory, Banknote, Briefcase, FolderKanban, GraduationCap, UserPlus, ClipboardCheck, Handshake, Rocket, Activity, ChevronRight } from "lucide-react";
import FuelOptionsSection from "@/components/institution/FuelOptionsSection";
import heroBg from "@/assets/hero-bg.jpg";
import { useAuth } from "@/contexts/AuthContext";

const stats = [
  { label: "Institutions Tracked", value: "2,847", icon: Building2 },
  { label: "Institutions Assessed", value: "1,234", icon: BarChart3 },
  { label: "Projects in Delivery", value: "89", icon: TrendingUp },
  { label: "Pipeline Value (KSh)", value: "4.2B", icon: Flame },
  { label: "Tonnes CO₂ Avoided", value: "12,450", icon: Leaf },
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
    if (roles.includes("admin")) return <Navigate to="/admin/pipeline" replace />;
    if (profile?.org_type === "institution") return <Navigate to="/institution/dashboard" replace />;
    if (profile?.org_type === "supplier") return <Navigate to="/supplier/dashboard" replace />;
    if (profile?.org_type === "funder") return <Navigate to="/funder/dashboard" replace />;
  }

  return (
    <div>
      {/* Hero */}
      <section className="relative min-h-[85vh] flex items-center overflow-hidden">
        <div className="absolute inset-0">
          <img src={heroBg} alt="Clean cooking facility in rural Kenya" className="w-full h-full object-cover" width={1920} height={1080} />
          <div className="absolute inset-0 bg-gradient-to-r from-foreground/90 via-foreground/70 to-foreground/30" />
        </div>
        <div className="container relative z-10 py-20">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-accent/20 border border-accent/30 rounded-full px-4 py-1.5 mb-6">
              <Leaf className="h-4 w-4 text-accent" />
              <span className="text-xs font-medium text-accent">National Coordination Platform</span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-primary-foreground leading-tight mb-6">
              Orchestrating Kenya's Clean Cooking Transition
            </h1>
            <p className="text-lg text-primary-foreground/80 mb-4 max-w-xl font-body">
              CleanCookIQ converts fragmented demand, dispersed supply, and available financing into a structured, verified national transition pipeline.
            </p>
            <p className="text-sm text-primary-foreground/60 mb-8 max-w-xl font-body italic">
              CleanCookIQ builds a transition pipeline per institution — displaying fuel of choice, meals served, recommended solution, and savings potential on an interactive national map.
            </p>
            <div className="flex flex-wrap gap-4">
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
      <section className="bg-primary py-4">
        <div className="container">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {stats.map((stat) => (
              <div key={stat.label} className="flex items-center gap-3 text-primary-foreground">
                <stat.icon className="h-5 w-5 text-accent shrink-0" />
                <div>
                  <p className="text-lg md:text-xl font-display font-bold">{stat.value}</p>
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

      {/* Five Market Failures — split layout */}
      <section className="py-20 lg:py-28 bg-card">
        <div className="container">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">Five Market Failures, One Solution</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">The institutional clean cooking market is broken. CleanCookIQ is the coordinating intelligence layer that fixes it.</p>
          </div>
          <div className="space-y-4">
            {failures.map((item, i) => (
              <div key={item.fail} className="grid grid-cols-1 md:grid-cols-2 rounded-xl overflow-hidden border border-border shadow-card">
                {/* Failure - dark side */}
                <div className="bg-foreground p-6 flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-destructive/20 flex items-center justify-center shrink-0">
                    <span className="text-destructive font-bold text-sm">{i + 1}</span>
                  </div>
                  <div>
                    <p className="text-destructive text-xs font-bold uppercase tracking-wider mb-1">Market Failure</p>
                    <h4 className="font-display font-semibold text-primary-foreground">{item.fail}</h4>
                  </div>
                </div>
                {/* Solution - light side */}
                <div className="bg-primary/5 p-6 flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                    <ChevronRight className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-primary text-xs font-bold uppercase tracking-wider mb-1">Our Solution</p>
                    <p className="text-sm text-foreground">{item.fix}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works - with arrows and hover */}
      <section className="py-20 lg:py-28 bg-background">
        <div className="container">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">How CleanCookIQ Works</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">A structured pipeline that takes institutions from registration to monitored clean kitchens.</p>
          </div>
          <div className="flex flex-col lg:flex-row items-center justify-center gap-0">
            {steps.map((item, i) => (
              <div key={item.step} className="flex items-center">
                <div className="flex flex-col items-center text-center group w-44">
                  <div className="h-16 w-16 rounded-full bg-primary flex items-center justify-center mb-4 transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-primary/30">
                    <item.icon className="h-7 w-7 text-primary-foreground transition-transform duration-300 group-hover:scale-110" />
                  </div>
                  <span className="text-xs font-bold text-primary tracking-wider uppercase mb-1">Step {item.step}</span>
                  <h3 className="font-display font-bold text-lg mb-2">{item.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
                {i < steps.length - 1 && (
                  <div className="hidden lg:flex items-center mx-2 mt-[-80px]">
                    <div className="w-8 h-0.5 bg-primary/40" />
                    <ChevronRight className="h-5 w-5 text-primary -ml-1" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-hero text-primary-foreground">
        <div className="container text-center">
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">Ready to Join the Transition?</h2>
          <p className="text-primary-foreground/80 max-w-xl mx-auto mb-8">Whether you're an institution, provider, funder, or researcher — there's a place for you on CleanCookIQ.</p>
          <div className="flex justify-center">
            <Link to="/auth/register">
              <Button size="lg" className="bg-accent text-accent-foreground hover:bg-amber-light font-semibold">Create an Account</Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
