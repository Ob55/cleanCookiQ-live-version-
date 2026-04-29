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
  MapPin,
  AlertCircle,
} from "lucide-react";
import heroBg from "@/assets/hero-bg.jpg";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";

const challenges: Array<{
  title: string;
  scenario: string;
  pattern: string;
  cost: string;
  fix: string;
}> = [
  {
    title: "Project pipelines are scattered and disconnected",
    scenario:
      "A boarding school in Bungoma decides to switch from firewood to LPG. Two valleys away, a hospital is making the same decision in the same week. Neither knows the other exists. A supplier in Nairobi visits each one separately, quotes them separately, and travels back twice.",
    pattern:
      "Multiply that by hundreds of institutions across 47 counties. Demand exists, but it is invisible — locked inside individual procurement officers, county education offices, and dusty assessment reports that never reach the people who could act on them together.",
    cost:
      "Suppliers price every visit as a one-off. Financiers see no aggregated demand. Programmes overlap or miss whole regions. The transition happens one slow handshake at a time when it could happen in coordinated waves.",
    fix:
      "cleancookIQ keeps one verified, county-by-county pipeline of institutions with their fuel, readiness, and contact details — so demand becomes a map instead of a rumour.",
  },
  {
    title: "Financiers struggle to see which projects are ready",
    scenario:
      "A development finance institution has a USD 50 million facility earmarked for clean cooking in East Africa. Its investment committee wants ten investable projects on its desk by quarter-end. What it actually receives are scattered concept notes, individual school pitches too small to underwrite, and verbal claims of \"strong pipeline\" with no shared definition of ready.",
    pattern:
      "Without a common standard for what \"investment-ready\" means — verified energy baseline, costed technology, signed institutional agreement, identified counterparties — every funder builds its own due-diligence machine from scratch for every deal.",
    cost:
      "Capital that is willing to deploy sits idle. Promising projects miss windows because they cannot be packaged fast enough. The cost of capital stays high because perceived risk stays high.",
    fix:
      "cleancookIQ scores each opportunity against a transparent readiness rubric — financial, operational, technical, social — so funders filter on facts, not on whoever pitched them last.",
  },
  {
    title: "Partners work in silos instead of coordinating",
    scenario:
      "In one Kenyan county, a government programme is installing improved cookstoves in primary schools. A bilateral donor is rolling out biogas to secondary schools. An NGO is training cooks at TVETs. None of the three programmes share a list of which schools they have touched, what equipment is installed, or who is responsible if something breaks next month.",
    pattern:
      "Each partner reports up its own chain. Beneficiaries get visited three times by three teams asking the same questions. Maintenance falls through the cracks because no one agreed who owns what after handover.",
    cost:
      "Beneficiary fatigue, double-spending on assessment, gaps in service, and donor reports that paint isolated wins instead of a coherent national picture.",
    fix:
      "cleancookIQ acts as the neutral coordination layer — one institution record, one source of truth on stage, supplier, and funder — so every partner can see who else is in the room.",
  },
  {
    title: "There is no shared data or way to track performance",
    scenario:
      "Six months after a brand-new biogas digester is commissioned at a girls' school, the donor wants to know: are the cooks actually using it, how much firewood was avoided, what is the carbon impact? The school has no meter readings, the supplier moved on to the next project, and the baseline that was measured at the start of the engagement was never digitised.",
    pattern:
      "The sector measures inputs (units installed, money spent) far better than it measures outcomes (fuel actually displaced, meals actually cooked, emissions actually avoided). Carbon credits worth real money go unclaimed because no one collected the evidence in a verifiable form.",
    cost:
      "Funders cannot prove impact. Carbon revenue stays on the table. Repeat investment becomes harder to justify because last year's investment cannot be evaluated.",
    fix:
      "cleancookIQ captures monthly readings, photos, and acceptance signoffs against per-fuel templates — and keeps the citations behind every metric, so a credit verifier can audit the chain of evidence.",
  },
  {
    title: "Proven solutions are hard to scale across regions",
    scenario:
      "An electric pressure cooker pilot in Kakamega works beautifully — cooks love it, fuel bills drop, and the maintenance crew is local and trained. The donor asks: can we replicate this in five neighbouring counties next year? The honest answer is: not without rebuilding the supplier relationships, the financing structure, and the training network from scratch in each new place.",
    pattern:
      "What makes a pilot succeed is rarely the hardware. It is the surrounding network — installers, financiers, county officials, lead users. Without a way to transplant that network, every \"proven solution\" stays trapped in the county where it was born.",
    cost:
      "The sector keeps re-piloting things that already work. Time, money, and momentum that should compound into national reach gets reset every time the geography changes.",
    fix:
      "cleancookIQ carries the pattern across regions — the same vetted suppliers, the same financing instruments, the same readiness rubric — so a working model in Kakamega becomes a launchable model in Migori without starting from zero.",
  },
];

const approachPillars = [
  {
    icon: Layers,
    title: "1. Building the Pipeline",
    body: "We bring together clean cooking opportunities, like schools, hospitals, and other large energy users, into one structured, visible pipeline.",
  },
  {
    icon: Users,
    title: "2. Connecting the Ecosystem",
    body: "The platform connects project developers, solution providers, technology partners, governments, and implementing agencies, so the right solutions meet the right demand.",
  },
  {
    icon: Banknote,
    title: "3. Unlocking Financing",
    body: "By structuring projects and making them visible, cleancookIQ helps unlock impact investment, carbon finance, and mixed financing options, making projects easier to fund and scale.",
  },
  {
    icon: LineChart,
    title: "4. Data and Insights",
    body: "The platform tracks performance, supports monitoring and reporting, and gives stakeholders clear data to make decisions with.",
  },
];

const howItWorksSteps = [
  { step: "01", title: "Sign Up Institutions", desc: "Institutions and projects register on the platform." },
  { step: "02", title: "Match Solutions", desc: "The right technologies and providers are connected to each institution." },
  { step: "03", title: "Bring in Financing", desc: "Projects are shaped and shown to funders and partners." },
  { step: "04", title: "Track Progress", desc: "We keep an eye on performance, impact, and how well things scale." },
];

const stakeholders = [
  { icon: Building2, title: "Institutions", desc: "Access clean, reliable cooking solutions that can grow with you." },
  { icon: Rocket, title: "Project Developers", desc: "Build and grow project pipelines with structured support." },
  { icon: Factory, title: "Solution Providers", desc: "Reach verified institutions and roll out your technology." },
  { icon: Banknote, title: "Financiers and Investors", desc: "Find curated, lower-risk, data-backed opportunities." },
  { icon: Landmark, title: "Governments and Partners", desc: "Drive coordinated, large-scale change." },
];

const inflectionPoints = [
  "Rising climate and health urgency",
  "Growing interest in carbon markets and results-based funding",
  "Fast progress in electric and clean cooking technologies",
  "Strong policy support across African markets",
];

const notList = [
  "A single technology solution",
  "A project developer",
  "A standalone initiative",
];

const isList = [
  "A platform that connects the ecosystem",
  "A pipeline engine for clean cooking markets",
  "A data and coordination layer that helps the sector scale",
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
            <span className="text-xs font-medium text-accent">A Platform for Clean Cooking</span>
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-primary-foreground mb-6 leading-tight">
            About cleancookIQ
          </h1>
          <p className="text-primary-foreground/80 max-w-3xl mx-auto text-lg leading-relaxed">
            cleancookIQ is a platform that helps institutions across Africa switch to clean cooking, faster.
          </p>
        </div>
      </section>

      {/* Intro */}
      <section className="py-20 bg-background">
        <div className="container max-w-3xl">
          <p className="text-muted-foreground text-lg leading-relaxed mb-6">
            Built to solve the scattered nature of the clean cooking ecosystem, the platform connects institutions, solution providers, financiers, and partners, turning disconnected efforts into coordinated, ready-to-invest opportunities.
          </p>
          <p className="text-muted-foreground text-lg leading-relaxed">
            Rather than operating as a standalone project or technology provider, cleancookIQ functions as the coordination and intelligence layer powering the next generation of clean cooking markets.
          </p>
        </div>
      </section>

      {/* Challenge */}
      <section className="py-20 bg-muted/20">
        <div className="container max-w-4xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">The Challenge</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Even with growing momentum, clean cooking, especially at the institutional level, is held back by a few big barriers.
            </p>
          </div>
          <p className="text-xs text-muted-foreground text-center mb-4 italic">
            Click any challenge to read the story behind it.
          </p>
          <Accordion type="single" collapsible className="space-y-4">
            {challenges.map((item, i) => (
              <AccordionItem
                key={item.title}
                value={`challenge-${i}`}
                className="bg-card border border-border rounded-xl shadow-card overflow-hidden data-[state=open]:shadow-elevated transition-shadow"
              >
                <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-muted/30 text-left">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="h-9 w-9 rounded-full bg-destructive/10 border border-destructive/30 flex items-center justify-center shrink-0">
                      <AlertCircle className="h-4 w-4 text-destructive" />
                    </div>
                    <span className="font-display font-semibold text-foreground pt-1.5 leading-snug">
                      {item.title}
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-5 pb-6">
                  <div className="ml-13 pl-13 space-y-4 text-sm leading-relaxed">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
                        What it looks like on the ground
                      </p>
                      <p className="text-foreground/85">{item.scenario}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
                        The pattern
                      </p>
                      <p className="text-foreground/85">{item.pattern}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
                        Why it matters
                      </p>
                      <p className="text-foreground/85">{item.cost}</p>
                    </div>
                    <div className="border-l-4 border-primary bg-primary/5 rounded-r-lg p-4 mt-4">
                      <p className="text-[11px] font-bold uppercase tracking-widest text-primary mb-1 flex items-center gap-1">
                        <Check className="h-3 w-3" strokeWidth={3} /> How cleancookIQ closes this gap
                      </p>
                      <p className="text-foreground/90">{item.fix}</p>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
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
              cleancookIQ addresses these gaps by building a unified platform that enables:
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
              cleancookIQ transforms clean cooking deployment into a coordinated process.
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
              cleancookIQ is designed for a multi-stakeholder ecosystem.
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
            cleancookIQ exists to turn this momentum into real, large-scale progress, not scattered wins.
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
            To build the operating system for clean cooking markets, enabling coordinated, data-driven, large-scale change across Africa and beyond.
          </p>
        </div>
      </section>

      {/* What Makes cleancookIQ Different */}
      <section className="py-20 bg-background">
        <div className="container max-w-5xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">What Makes cleancookIQ Different</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Not */}
            <div className="bg-card border border-border rounded-xl p-7 shadow-card">
              <div className="mb-6">
                <p className="text-foreground/70 text-xs font-bold uppercase tracking-widest">cleancookIQ is not</p>
              </div>
              <ul className="space-y-3">
                {notList.map((t) => (
                  <li key={t} className="text-foreground">{t}</li>
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
