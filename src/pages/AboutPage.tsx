import {
  Building2,
  Users,
  Leaf,
  Factory,
  Rocket,
  Banknote,
  Landmark,
  Layers,
  LineChart,
  Zap,
  Check,
  X,
  MapPin,
} from "lucide-react";
import heroBg from "@/assets/hero-bg.jpg";

const challenges = [
  "Fragmented project pipelines",
  "Limited visibility for financiers",
  "Weak coordination between stakeholders",
  "Lack of standardized data and performance tracking",
  "Difficulty in scaling proven solutions across regions",
];

const approachPillars = [
  {
    icon: Layers,
    title: "1. Pipeline Aggregation",
    body: "We bring together institutional clean cooking opportunities — like schools, hospitals, and other large-scale energy users — into a structured, visible pipeline.",
  },
  {
    icon: Users,
    title: "2. Ecosystem Coordination",
    body: "The platform connects project developers, solution providers, technology partners, and governments and implementing agencies — ensuring the right solutions meet the right demand efficiently.",
  },
  {
    icon: Banknote,
    title: "3. Financing Enablement",
    body: "By structuring projects and improving visibility, CleanCookIQ helps unlock impact investment, carbon finance opportunities, and blended finance mechanisms — making projects more attractive, bankable, and scalable.",
  },
  {
    icon: LineChart,
    title: "4. Data & Intelligence Layer",
    body: "Through integrated data systems, the platform supports performance tracking, Monitoring, Reporting, and Verification (MRV/dMRV), and decision-making insights for stakeholders — creating transparency and accountability across the ecosystem.",
  },
];

const howItWorksSteps = [
  { step: "01", title: "Onboard Demand", desc: "Institutions and projects are registered onto the platform." },
  { step: "02", title: "Match Solutions", desc: "Appropriate technologies and providers are connected to each opportunity." },
  { step: "03", title: "Enable Financing", desc: "Projects are structured and presented to financiers and partners." },
  { step: "04", title: "Track & Optimize", desc: "Data systems monitor performance, impact, and scalability." },
];

const stakeholders = [
  { icon: Building2, title: "Institutions", desc: "Access clean, reliable, and scalable cooking solutions." },
  { icon: Rocket, title: "Project Developers", desc: "Build and scale pipelines with structured support." },
  { icon: Factory, title: "Solution Providers", desc: "Reach verified demand and deploy technologies effectively." },
  { icon: Banknote, title: "Financiers & Investors", desc: "Access curated, de-risked, and data-backed opportunities." },
  { icon: Landmark, title: "Governments & Ecosystem Partners", desc: "Drive coordinated, large-scale transition efforts." },
];

const inflectionPoints = [
  "Increasing climate and health urgency",
  "Growing interest in carbon markets and results-based financing",
  "Rapid innovation in electric and clean cooking technologies",
  "Strong policy momentum across African markets",
];

const notList = [
  "A single technology solution",
  "A project developer",
  "A standalone initiative",
];

const isList = [
  "A platform that connects the ecosystem",
  "A pipeline engine for clean cooking markets",
  "A data and coordination layer enabling scale",
];

export default function AboutPage() {
  return (
    <div>
      {/* Hero */}
      <section className="relative py-24 lg:py-32 overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={heroBg}
            alt="Clean cooking facility in rural Kenya"
            className="w-full h-full object-cover"
            width={1920}
            height={1080}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-foreground/90 via-foreground/85 to-foreground/95" />
        </div>
        <div className="container relative z-10 text-center">
          <div className="inline-flex items-center gap-2 bg-accent/20 border border-accent/30 rounded-full px-4 py-1.5 mb-6">
            <Leaf className="h-4 w-4 text-accent" />
            <span className="text-xs font-medium text-accent">Digital Infrastructure for Clean Cooking</span>
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-primary-foreground mb-6 leading-tight">
            About CleanCookIQ
          </h1>
          <p className="text-primary-foreground/80 max-w-3xl mx-auto text-lg leading-relaxed">
            CleanCookIQ is a digital infrastructure platform accelerating the transition to clean cooking across institutional markets in Africa.
          </p>
        </div>
      </section>

      {/* Intro */}
      <section className="py-20 bg-background">
        <div className="container max-w-3xl">
          <p className="text-muted-foreground text-lg leading-relaxed mb-6">
            Designed to solve fragmentation across the clean cooking ecosystem, the platform connects institutions, solution providers, financiers, and ecosystem partners — transforming disconnected efforts into coordinated, scalable, and investment-ready opportunities.
          </p>
          <p className="text-muted-foreground text-lg leading-relaxed">
            Rather than operating as a standalone project or technology provider, CleanCookIQ functions as the coordination and intelligence layer powering the next generation of clean cooking markets.
          </p>
        </div>
      </section>

      {/* Challenge */}
      <section className="py-20 bg-muted/20">
        <div className="container max-w-4xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">The Challenge</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Despite growing momentum, clean cooking adoption — particularly at the institutional level — remains constrained by systemic barriers.
            </p>
          </div>
          <ul className="space-y-4">
            {challenges.map((item) => (
              <li
                key={item}
                className="flex items-start gap-4 bg-card border border-border rounded-xl p-5 shadow-card"
              >
                <div className="h-9 w-9 rounded-full bg-destructive/15 border border-destructive/30 flex items-center justify-center shrink-0">
                  <X className="h-4 w-4 text-destructive" strokeWidth={3} />
                </div>
                <p className="text-foreground font-medium pt-1.5">{item}</p>
              </li>
            ))}
          </ul>
          <p className="text-muted-foreground text-center mt-10 max-w-2xl mx-auto">
            These challenges slow down deployment, limit investment flows, and prevent the ecosystem from reaching its full potential.
          </p>
        </div>
      </section>

      {/* Our Approach */}
      <section className="py-20 bg-background">
        <div className="container max-w-5xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">Our Approach</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              CleanCookIQ addresses these gaps by building a unified platform that enables:
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {approachPillars.map((item) => (
              <div
                key={item.title}
                className="bg-card border border-border rounded-xl p-7 shadow-card hover:shadow-elevated transition-shadow"
              >
                <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center mb-5">
                  <item.icon className="h-6 w-6 text-primary-foreground" />
                </div>
                <h3 className="font-display font-bold text-xl mb-3">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-muted/20">
        <div className="container max-w-5xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">How It Works</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              CleanCookIQ transforms clean cooking deployment into a coordinated process.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {howItWorksSteps.map((s) => (
              <div key={s.step} className="bg-card border border-border rounded-xl p-6 shadow-card">
                <span className="text-xs font-bold text-primary tracking-widest uppercase">Step {s.step}</span>
                <h3 className="font-display font-bold text-lg mt-2 mb-2">{s.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Who We Serve */}
      <section className="py-20 bg-background">
        <div className="container max-w-5xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">Who We Serve</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              CleanCookIQ is designed for a multi-stakeholder ecosystem.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {stakeholders.map((s) => (
              <div key={s.title} className="bg-card border border-border rounded-xl p-6 shadow-card">
                <div className="h-10 w-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
                  <s.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-display font-bold text-lg mb-2">{s.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Now */}
      <section className="py-20 bg-muted/20">
        <div className="container max-w-3xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">Why Now</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              The clean cooking sector is at a critical inflection point.
            </p>
          </div>
          <ul className="space-y-4">
            {inflectionPoints.map((item) => (
              <li
                key={item}
                className="flex items-start gap-4 bg-card border border-border rounded-xl p-5 shadow-card"
              >
                <div className="h-9 w-9 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center shrink-0">
                  <Zap className="h-4 w-4 text-primary" />
                </div>
                <p className="text-foreground font-medium pt-1.5">{item}</p>
              </li>
            ))}
          </ul>
          <p className="text-muted-foreground text-center mt-10 max-w-2xl mx-auto">
            CleanCookIQ exists to ensure this momentum translates into real, scalable deployment — not fragmented progress.
          </p>
        </div>
      </section>

      {/* Our Focus */}
      <section className="py-20 bg-background">
        <div className="container max-w-4xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">Our Focus</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              The platform is initially focused on institutional markets, where impact can be aggregated and scaled efficiently.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-card border border-border rounded-xl p-7 shadow-card">
              <div className="flex items-center gap-3 mb-3">
                <MapPin className="h-5 w-5 text-primary" />
                <span className="text-xs font-bold text-primary tracking-widest uppercase">Wave 1</span>
              </div>
              <h3 className="font-display font-bold text-2xl">Kenya</h3>
            </div>
            <div className="bg-card border border-border rounded-xl p-7 shadow-card">
              <div className="flex items-center gap-3 mb-3">
                <MapPin className="h-5 w-5 text-primary" />
                <span className="text-xs font-bold text-primary tracking-widest uppercase">Wave 2</span>
              </div>
              <h3 className="font-display font-bold text-2xl">Uganda and Sierra Leone</h3>
            </div>
          </div>
          <p className="text-muted-foreground text-center mt-8 max-w-2xl mx-auto">
            These markets offer enabling environments for rapid deployment and ecosystem collaboration.
          </p>
        </div>
      </section>

      {/* Our Vision */}
      <section className="py-20 bg-gradient-hero text-primary-foreground">
        <div className="container max-w-3xl text-center">
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-6">Our Vision</h2>
          <p className="text-primary-foreground/90 text-xl leading-relaxed font-display italic">
            To build the operating system for clean cooking markets — enabling coordinated, data-driven, and large-scale transition across Africa and beyond.
          </p>
        </div>
      </section>

      {/* What Makes CleanCookIQ Different */}
      <section className="py-20 bg-background">
        <div className="container max-w-5xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">What Makes CleanCookIQ Different</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Not */}
            <div className="bg-card border border-border rounded-xl p-7 shadow-card">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-8 w-8 rounded-lg bg-destructive/15 border border-destructive/30 flex items-center justify-center">
                  <X className="h-4 w-4 text-destructive" strokeWidth={3} />
                </div>
                <p className="text-destructive text-xs font-bold uppercase tracking-widest">CleanCookIQ is not</p>
              </div>
              <ul className="space-y-4">
                {notList.map((t) => (
                  <li key={t} className="flex items-start gap-3">
                    <X className="h-4 w-4 text-destructive mt-1 shrink-0" strokeWidth={3} />
                    <span className="text-foreground">{t}</span>
                  </li>
                ))}
              </ul>
            </div>
            {/* Is */}
            <div className="bg-card border border-border rounded-xl p-7 shadow-card">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-8 w-8 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center">
                  <Check className="h-4 w-4 text-primary" strokeWidth={3} />
                </div>
                <p className="text-primary text-xs font-bold uppercase tracking-widest">It is</p>
              </div>
              <ul className="space-y-4">
                {isList.map((t) => (
                  <li key={t} className="flex items-start gap-3">
                    <Check className="h-4 w-4 text-primary mt-1 shrink-0" strokeWidth={3} />
                    <span className="text-foreground">{t}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
