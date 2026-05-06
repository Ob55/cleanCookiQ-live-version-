import { useEffect } from "react";
import { useLocation } from "react-router-dom";
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
  ArrowRight,
  ArrowDown,
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
  fix: { summary: string; mechanics: string[] };
}> = [
  {
    title: "Project pipelines are scattered and disconnected",
    scenario:
      "A boarding school in Bungoma decides to switch from firewood to LPG. Two valleys away, a hospital is making the same decision in the same week. Neither knows the other exists. A supplier in Nairobi visits each one separately, quotes them separately, and travels back twice.",
    pattern:
      "Multiply that by hundreds of institutions across 47 counties. Demand exists, but it is invisible — locked inside individual procurement officers, county education offices, and dusty assessment reports that never reach the people who could act on them together.",
    cost:
      "Suppliers price every visit as a one-off. Financiers see no aggregated demand. Programmes overlap or miss whole regions. The transition happens one slow handshake at a time when it could happen in coordinated waves.",
    fix: {
      summary:
        "cleancookIQ runs one shared, county-by-county pipeline that turns invisible demand into a live, filterable map.",
      mechanics: [
        "Every institution carries a verified profile — county, current fuel, meals per day, readiness score, decision-maker contact — visible to vetted suppliers and funders.",
        "Suppliers and funders work off the same pipeline, filtered to their preferences (fuel, ticket size, region) so a single field visit surfaces a whole cluster of nearby opportunities.",
        "Live county metrics aggregate institution counts, dominant fuels, and provider coverage — so programme designers can see which regions are over-served and which are still dark.",
      ],
    },
  },
  {
    title: "Financiers struggle to see which projects are ready",
    scenario:
      "A development finance institution has a USD 50 million facility earmarked for clean cooking in East Africa. Its investment committee wants ten investable projects on its desk by quarter-end. What it actually receives are scattered concept notes, individual school pitches too small to underwrite, and verbal claims of \"strong pipeline\" with no shared definition of ready.",
    pattern:
      "Without a common standard for what \"investment-ready\" means — verified energy baseline, costed technology, signed institutional agreement, identified counterparties — every funder builds its own due-diligence machine from scratch for every deal.",
    cost:
      "Capital that is willing to deploy sits idle. Promising projects miss windows because they cannot be packaged fast enough. The cost of capital stays high because perceived risk stays high.",
    fix: {
      summary:
        "cleancookIQ scores every opportunity against the same transparent readiness rubric, so funders compare apples to apples and filter on facts.",
      mechanics: [
        "Eight-dimension readiness score per institution — fuel, kitchen condition, financing preference, scale, monthly fuel spend, decision-maker authority and more — with an audit trail behind every input.",
        "A built-in TCO and financing model produces NPV, IRR, simple and discounted payback for every project, so funders compare deals on identical terms.",
        "The funder dashboard ranks live opportunities against each funder's stated preferences (county, fuel, ticket size, max acceptable risk) — and flags hard mismatches up front.",
      ],
    },
  },
  {
    title: "Partners work in silos instead of coordinating",
    scenario:
      "In one Kenyan county, a government programme is installing improved cookstoves in primary schools. A bilateral donor is rolling out biogas to secondary schools. An NGO is training cooks at TVETs. None of the three programmes share a list of which schools they have touched, what equipment is installed, or who is responsible if something breaks next month.",
    pattern:
      "Each partner reports up its own chain. Beneficiaries get visited three times by three teams asking the same questions. Maintenance falls through the cracks because no one agreed who owns what after handover.",
    cost:
      "Beneficiary fatigue, double-spending on assessment, gaps in service, and donor reports that paint isolated wins instead of a coherent national picture.",
    fix: {
      summary:
        "cleancookIQ is the neutral coordination layer — one institution record, one source of truth across every partner involved.",
      mechanics: [
        "Each institution has a single shared record its supplier, funder, technical-assistance provider and the platform admin all see — no more re-asking the same questions.",
        "Project stages, deliveries, risks and monitoring readings are timeline-tracked, so the next partner walking in knows exactly where the last one left off.",
        "Programmes register their footprint on the same county map, making duplication and coverage gaps visible to everyone before money is spent.",
      ],
    },
  },
  {
    title: "There is no shared data or way to track performance",
    scenario:
      "Six months after a brand-new biogas digester is commissioned at a girls' school, the donor wants to know: are the cooks actually using it, how much firewood was avoided, what is the carbon impact? The school has no meter readings, the supplier moved on to the next project, and the baseline that was measured at the start of the engagement was never digitised.",
    pattern:
      "The sector measures inputs (units installed, money spent) far better than it measures outcomes (fuel actually displaced, meals actually cooked, emissions actually avoided). Carbon credits worth real money go unclaimed because no one collected the evidence in a verifiable form.",
    cost:
      "Funders cannot prove impact. Carbon revenue stays on the table. Repeat investment becomes harder to justify because last year's investment cannot be evaluated.",
    fix: {
      summary:
        "cleancookIQ captures every reading, photo and signoff against per-fuel templates — building an evidence trail any third-party verifier can audit.",
      mechanics: [
        "Monthly monitoring readings record clean fuel used, baseline fuel still used, meals served, downtime hours and cook satisfaction — captured on mobile by field agents.",
        "Automatic behavioural-relapse detection: two consecutive readings below 50% clean-fuel share open a refresher-training ticket and a critical risk on the project.",
        "Every metric ties back to a sourced data point with publisher, citation, validity date and confidence level — so a carbon verifier or auditor can trace any number to its origin.",
        "A carbon-credits ledger keeps forecast, estimated and independently-verified tonnes side by side, so funders see what's promised versus what's banked.",
      ],
    },
  },
  {
    title: "Proven solutions are hard to scale across regions",
    scenario:
      "An electric pressure cooker pilot in Kakamega works beautifully — cooks love it, fuel bills drop, and the maintenance crew is local and trained. The donor asks: can we replicate this in five neighbouring counties next year? The honest answer is: not without rebuilding the supplier relationships, the financing structure, and the training network from scratch in each new place.",
    pattern:
      "What makes a pilot succeed is rarely the hardware. It is the surrounding network — installers, financiers, county officials, lead users. Without a way to transplant that network, every \"proven solution\" stays trapped in the county where it was born.",
    cost:
      "The sector keeps re-piloting things that already work. Time, money, and momentum that should compound into national reach gets reset every time the geography changes.",
    fix: {
      summary:
        "cleancookIQ carries the pattern across regions — same vetted suppliers, same instruments, same rubric — so a Kakamega win launches in Migori without starting from zero.",
      mechanics: [
        "The provider directory and CSCC compliance tier travel with each technology — a Tier 1 supplier in one county is Tier 1 anywhere they serve.",
        "Reusable financing instruments (concessional loans, blended grants, PAYGO and more) are pre-modeled with default terms, so a working financing structure becomes a template, not a one-off.",
        "County intelligence pages give a new region's pipeline, fuel-price benchmarks and active policies on day one — programmes inherit context instead of rebuilding it.",
      ],
    },
  },
];

const approachPillars = [
  {
    icon: Layers,
    title: "Building the Pipeline",
    body: "We bring together clean cooking opportunities, like schools, hospitals, and other large energy users, into one structured, visible pipeline.",
  },
  {
    icon: Users,
    title: "Connecting the Ecosystem",
    body: "The platform connects project developers, solution providers, technology partners, governments, and implementing agencies, so the right solutions meet the right demand.",
  },
  {
    icon: Banknote,
    title: "Unlocking Financing",
    body: "By structuring projects and making them visible, cleancookIQ helps unlock impact investment, carbon finance, and mixed financing options, making projects easier to fund and scale.",
  },
  {
    icon: LineChart,
    title: "Data and Insights",
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

type ApproachPillar = (typeof approachPillars)[number];

function ApproachCard({ pillar, step }: { pillar: ApproachPillar; step: number }) {
  const Icon = pillar.icon;
  return (
    <div className="relative bg-card border border-border rounded-xl p-5 shadow-card hover:shadow-elevated transition-shadow h-full flex flex-col">
      <div className="absolute -top-3 -left-3 h-8 w-8 rounded-full bg-accent text-accent-foreground text-xs font-bold flex items-center justify-center shadow-md z-10">
        {step}
      </div>
      <div className="h-11 w-11 rounded-xl bg-primary flex items-center justify-center mb-3">
        <Icon className="h-5 w-5 text-primary-foreground" />
      </div>
      <h3 className="font-display font-bold text-base lg:text-lg leading-tight mb-2">{pillar.title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{pillar.body}</p>
    </div>
  );
}

function FlowArrow({ direction }: { direction: "right" | "down" }) {
  const Icon = direction === "right" ? ArrowRight : ArrowDown;
  return (
    <div className="h-10 w-10 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center text-primary shrink-0">
      <Icon className="h-5 w-5" strokeWidth={2.5} />
    </div>
  );
}

export default function AboutPage() {
  const location = useLocation();

  // Scroll to anchored section when arriving with #challenges (etc.)
  useEffect(() => {
    if (!location.hash) return;
    const id = location.hash.slice(1);
    // Wait a tick for the section to mount, then scroll
    const t = setTimeout(() => {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
    return () => clearTimeout(t);
  }, [location.hash]);

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

      {/* Challenges + how we close them */}
      <section id="challenges" className="py-20 bg-muted/20 scroll-mt-24">
        <div className="container max-w-4xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">The Gaps We Close</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Even with growing momentum, clean cooking — especially at the institutional level — is held back by a few big barriers. Here is each barrier, and how cleancookIQ closes it.
            </p>
          </div>
          <p className="text-xs text-muted-foreground text-center mb-4 italic">
            Click any item to read the story behind the gap and how we close it.
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
                    <div className="border-l-4 border-primary bg-primary/5 rounded-r-lg p-4 mt-4 space-y-3">
                      <p className="text-[11px] font-bold uppercase tracking-widest text-primary flex items-center gap-1">
                        <Check className="h-3 w-3" strokeWidth={3} /> How cleancookIQ closes this gap
                      </p>
                      <p className="text-foreground/90 font-medium">{item.fix.summary}</p>
                      <ul className="space-y-2 pt-1">
                        {item.fix.mechanics.map((m, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-foreground/85">
                            <Check className="h-3.5 w-3.5 text-primary mt-1 shrink-0" strokeWidth={3} />
                            <span>{m}</span>
                          </li>
                        ))}
                      </ul>
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

      {/* Our Approach — cyclic flow */}
      <section className="py-20 bg-background">
        <div className="container max-w-5xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">Our Approach</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              A continuous cycle — every step strengthens the next, and the whole loop compounds momentum across the ecosystem.
            </p>
          </div>

          {/* xl (≥1280px): single horizontal row, 1 → 2 → 3 → 4 */}
          <div className="hidden xl:grid grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] gap-x-3 items-stretch">
            <ApproachCard pillar={approachPillars[0]} step={1} />
            <div className="flex items-center"><FlowArrow direction="right" /></div>
            <ApproachCard pillar={approachPillars[1]} step={2} />
            <div className="flex items-center"><FlowArrow direction="right" /></div>
            <ApproachCard pillar={approachPillars[2]} step={3} />
            <div className="flex items-center"><FlowArrow direction="right" /></div>
            <ApproachCard pillar={approachPillars[3]} step={4} />
          </div>

          {/* md/lg: 2×2 grid in natural reading order with right + down arrows */}
          <div className="hidden md:grid xl:hidden grid-cols-[1fr_auto_1fr] gap-x-4 gap-y-4 items-stretch">
            <ApproachCard pillar={approachPillars[0]} step={1} />
            <div className="flex items-center justify-center"><FlowArrow direction="right" /></div>
            <ApproachCard pillar={approachPillars[1]} step={2} />

            <div className="flex justify-center"><FlowArrow direction="down" /></div>
            <div />
            <div className="flex justify-center"><FlowArrow direction="down" /></div>

            <ApproachCard pillar={approachPillars[2]} step={3} />
            <div className="flex items-center justify-center"><FlowArrow direction="right" /></div>
            <ApproachCard pillar={approachPillars[3]} step={4} />
          </div>

          {/* mobile: vertical stack with down arrows */}
          <div className="md:hidden space-y-3">
            {approachPillars.map((p, i) => (
              <div key={p.title}>
                <ApproachCard pillar={p} step={i + 1} />
                {i < approachPillars.length - 1 && (
                  <div className="flex justify-center my-2"><FlowArrow direction="down" /></div>
                )}
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
            <div className="bg-card border border-border rounded-xl p-7 shadow-card">
              <div className="flex items-center gap-3 mb-3">
                <MapPin className="h-5 w-5 text-primary" />
                <span className="text-xs font-bold text-primary tracking-widest uppercase">Wave 3</span>
              </div>
              <h3 className="font-display font-bold text-2xl">Africa and the rest of the world</h3>
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

    </div>
  );
}
