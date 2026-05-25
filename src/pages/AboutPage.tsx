import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Building2,
  Users,
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
  FileText,
  Download,
  Flame,
  Sparkles,
  Globe,
} from "lucide-react";
import heroBg from "@/assets/hero-bg.jpg";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { sbAny } from "@/lib/sbAny";

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
        "CleanCookIQ runs one shared, county-by-county pipeline that turns invisible demand into a live, filterable map.",
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
        "CleanCookIQ scores every opportunity against the same transparent readiness rubric, so funders compare apples to apples and filter on facts.",
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
        "CleanCookIQ is the neutral coordination layer — one institution record, one source of truth across every partner involved.",
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
        "CleanCookIQ captures every reading, photo and signoff against per-fuel templates — building an evidence trail any third-party verifier can audit.",
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
        "CleanCookIQ carries the pattern across regions — same vetted suppliers, same instruments, same rubric — so a Kakamega win launches in Migori without starting from zero.",
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
    body: "By structuring projects and making them visible, CleanCookIQ helps unlock impact investment, carbon finance, and mixed financing options, making projects easier to fund and scale.",
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

const fadeUp = {
  hidden: { opacity: 0, y: 30, filter: "blur(6px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)" },
};

type ApproachPillar = (typeof approachPillars)[number];

function ApproachCard({ pillar, step }: { pillar: ApproachPillar; step: number }) {
  const Icon = pillar.icon;
  return (
    <div className="group relative ignis-card p-6 h-full flex flex-col hover:-translate-y-1 transition-transform duration-300">
      <div className="absolute -top-3 -left-3 h-9 w-9 rounded-full bg-gradient-ignis text-white text-xs font-bold flex items-center justify-center shadow-ignis z-10">
        {step}
      </div>
      <span className="relative h-11 w-11 rounded-2xl liquid-glass-strong bg-muted flex items-center justify-center mb-4">
        <Icon className="h-5 w-5 text-primary" strokeWidth={1.8} />
        <span className="absolute inset-0 rounded-2xl bg-primary/30 blur-xl -z-10 opacity-0 group-hover:opacity-100 transition-opacity" />
      </span>
      <h3 className="font-display font-bold text-base lg:text-lg leading-tight mb-2 text-foreground">{pillar.title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{pillar.body}</p>
    </div>
  );
}

function FlowArrow({ direction }: { direction: "right" | "down" }) {
  const Icon = direction === "right" ? ArrowRight : ArrowDown;
  return (
    <div className="h-10 w-10 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center text-primary shrink-0">
      <Icon className="h-5 w-5" strokeWidth={2.5} />
    </div>
  );
}

export default function AboutPage() {
  const location = useLocation();

  useEffect(() => {
    if (!location.hash) return;
    const id = location.hash.slice(1);
    const t = setTimeout(() => {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
    return () => clearTimeout(t);
  }, [location.hash]);

  const { data: valueProp } = useQuery({
    queryKey: ["about-value-proposition"],
    queryFn: async () => {
      const { data } = await sbAny
        .from("resources")
        .select("title, description, file_url, external_url, page_count, file_size_bytes")
        .eq("slug", "value-proposition")
        .eq("is_published", true)
        .maybeSingle();
      return data as {
        title: string;
        description: string | null;
        file_url: string | null;
        external_url: string | null;
        page_count: number | null;
        file_size_bytes: number | null;
      } | null;
    },
  });
  const valuePropUrl = valueProp?.file_url || valueProp?.external_url || null;

  return (
    <div className="bg-background text-foreground">
      {/* ─────────── HERO ─────────── */}
      <section className="relative min-h-[80vh] flex items-center overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={heroBg}
            alt="Clean cooking facility in rural Kenya"
            className="w-full h-full object-cover opacity-60"
            width={1920}
            height={1080}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/75 via-background/55 to-background/90" />
          <div className="absolute inset-0 bg-hero-glow opacity-70" />
          <div className="absolute inset-0 bg-ember-grid opacity-20" />
          <div className="absolute top-1/3 left-[20%] h-2 w-2 rounded-full bg-ignis blur-sm animate-ember-float" />
          <div className="absolute top-2/3 right-[25%] h-1.5 w-1.5 rounded-full bg-ignis-bright blur-sm animate-ember-float" style={{ animationDelay: "1.5s" }} />
        </div>

        <div className="relative z-10 w-full max-w-[1600px] mx-auto px-6 lg:px-12 pt-32 pb-20 text-center">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 liquid-glass rounded-full px-4 py-1.5 mb-8"
          >
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-medium text-foreground/85">A platform for clean cooking</span>
          </motion.div>

          <h1 className="font-editorial text-5xl md:text-7xl lg:text-8xl leading-[0.95] tracking-tight text-foreground max-w-5xl mx-auto">
            <motion.span
              initial={{ opacity: 0, y: 30, filter: "blur(10px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="block"
            >
              About
            </motion.span>
            <motion.span
              initial={{ opacity: 0, y: 30, filter: "blur(10px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="italic text-gradient-ignis block"
            >
              CleanCookIQ.
            </motion.span>
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.5 }}
            className="mt-8 text-lg lg:text-xl text-foreground/70 max-w-3xl mx-auto leading-relaxed"
          >
            A platform that helps institutions across Africa switch to clean cooking, faster.
          </motion.p>
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent to-background z-10" />
      </section>

      {/* ─────────── INTRO ─────────── */}
      <section className="relative py-24 lg:py-32 bg-[#00712D]">
        <div className="max-w-[1600px] mx-auto px-6 lg:px-12">
          <div className="grid lg:grid-cols-[1fr_2fr] gap-12 lg:gap-20 max-w-6xl mx-auto">
            <motion.div
              initial="hidden" whileInView="show" viewport={{ once: true }}
              variants={fadeUp} transition={{ duration: 0.7 }}
            >
              <span className="text-[11px] uppercase tracking-[0.2em] text-amber-400 font-semibold">The story</span>
              <h2 className="font-editorial italic text-4xl lg:text-5xl text-white mt-3 leading-[1.05]">
                Not a project. <span className="text-gradient-ignis">A layer.</span>
              </h2>
            </motion.div>
            <motion.div
              initial="hidden" whileInView="show" viewport={{ once: true }}
              variants={fadeUp} transition={{ duration: 0.7, delay: 0.15 }}
              className="space-y-6"
            >
              <p className="text-white/75 text-lg leading-relaxed">
                Built to solve the scattered nature of the clean cooking ecosystem, the platform connects institutions, solution providers, financiers, and partners, turning disconnected efforts into coordinated, ready-to-invest opportunities.
              </p>
              <p className="text-white/60 text-base leading-relaxed">
                Rather than operating as a standalone project or technology provider, CleanCookIQ functions as the coordination and intelligence layer powering the next generation of clean cooking markets.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ─────────── VALUE PROPOSITION ─────────── */}
      {valueProp && (
        <section id="value-proposition" className="relative py-16 scroll-mt-24">
          <div className="max-w-[1600px] mx-auto px-6 lg:px-12">
            <motion.div
              initial="hidden" whileInView="show" viewport={{ once: true }}
              variants={fadeUp} transition={{ duration: 0.7 }}
              className="ignis-card relative overflow-hidden max-w-5xl mx-auto"
            >
              <div className="absolute -right-32 -top-32 h-72 w-72 rounded-full bg-primary/15 blur-3xl" />
              <div className="relative grid md:grid-cols-[auto_1fr_auto] gap-6 items-center p-8 md:p-10">
                <div className="h-16 w-16 rounded-2xl liquid-glass-strong bg-muted flex items-center justify-center mx-auto md:mx-0">
                  <FileText className="h-7 w-7 text-primary" />
                </div>
                <div className="text-center md:text-left">
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary mb-2">
                    Value Proposition
                  </p>
                  <h2 className="font-editorial italic text-2xl md:text-3xl text-foreground mb-2">
                    {valueProp.title}
                  </h2>
                  {valueProp.description && (
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {valueProp.description}
                    </p>
                  )}
                </div>
                <div className="flex justify-center md:justify-end">
                  {valuePropUrl ? (
                    <Button asChild size="lg" className="gap-2 bg-gradient-ignis text-white border-0 rounded-full shadow-ignis hover:translate-y-[-1px] transition-transform">
                      <a href={valuePropUrl} target="_blank" rel="noopener noreferrer">
                        <Download className="h-4 w-4" />
                        Read the brief
                      </a>
                    </Button>
                  ) : (
                    <span className="text-xs text-muted-foreground italic">
                      Document coming soon
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        </section>
      )}

      {/* ─────────── CHALLENGES ─────────── */}
      <section id="challenges" className="relative py-28 lg:py-36 overflow-hidden scroll-mt-24 bg-[#FFF5E6]">
        <div className="absolute inset-0 bg-ember-grid opacity-15 pointer-events-none" />
        <div className="absolute left-1/2 top-0 -translate-x-1/2 h-px w-1/2 bg-gradient-to-r from-transparent via-primary/20 to-transparent" />

        <div className="relative max-w-[1600px] mx-auto px-6 lg:px-12">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <span className="inline-flex items-center gap-2 liquid-glass rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-primary mb-5">
              <AlertCircle className="h-3 w-3" /> The gaps we close
            </span>
            <motion.h2
              initial="hidden" whileInView="show" viewport={{ once: true }}
              variants={fadeUp} transition={{ duration: 0.7 }}
              className="font-editorial text-4xl md:text-5xl lg:text-6xl leading-[1] tracking-tight text-foreground"
            >
              The gaps we <span className="italic text-gradient-ignis">close.</span>
            </motion.h2>
            <p className="mt-5 text-muted-foreground leading-relaxed">
              Even with growing momentum, clean cooking — especially at the institutional level — is held back by a few big barriers. Here is each barrier, and how CleanCookIQ closes it.
            </p>
            <p className="text-xs text-muted-foreground mt-6 italic">
              Click any item to read the story behind the gap and how we close it.
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <Accordion type="single" collapsible className="space-y-3">
              {challenges.map((item, i) => (
                <motion.div
                  key={item.title}
                  initial="hidden" whileInView="show" viewport={{ once: true, margin: "-50px" }}
                  variants={fadeUp} transition={{ duration: 0.5, delay: i * 0.06 }}
                >
                  <AccordionItem
                    value={`challenge-${i}`}
                    className="ignis-card overflow-hidden data-[state=open]:shadow-ignis transition-shadow border-0"
                  >
                    <AccordionTrigger className="px-6 py-5 hover:no-underline group text-left [&[data-state=open]]:bg-primary/5">
                      <div className="flex items-start gap-4 flex-1">
                        <span className="h-9 w-9 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center shrink-0 group-data-[state=open]:bg-primary group-data-[state=open]:border-primary transition-colors">
                          <span className="text-[11px] font-bold text-primary group-data-[state=open]:text-white tabular-nums">
                            0{i + 1}
                          </span>
                        </span>
                        <span className="font-display font-semibold text-foreground pt-1.5 leading-snug">
                          {item.title}
                        </span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-6 pb-7">
                      <div className="space-y-5 text-sm leading-relaxed pl-0 md:pl-13">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary mb-2">
                            What it looks like on the ground
                          </p>
                          <p className="text-foreground/75">{item.scenario}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary mb-2">
                            The pattern
                          </p>
                          <p className="text-foreground/75">{item.pattern}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary mb-2">
                            Why it matters
                          </p>
                          <p className="text-foreground/75">{item.cost}</p>
                        </div>
                        <div className="relative overflow-hidden border-l-2 border-primary/60 bg-primary/5 rounded-r-xl p-5 mt-4 space-y-3">
                          <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-primary/15 blur-2xl" />
                          <p className="relative text-[10px] font-bold uppercase tracking-[0.2em] text-primary flex items-center gap-1.5">
                            <Check className="h-3 w-3" strokeWidth={3} /> How CleanCookIQ closes this gap
                          </p>
                          <p className="relative text-foreground font-medium">{item.fix.summary}</p>
                          <ul className="relative space-y-2 pt-1">
                            {item.fix.mechanics.map((m, idx) => (
                              <li key={idx} className="flex items-start gap-2 text-foreground/80">
                                <Check className="h-3.5 w-3.5 text-primary mt-1 shrink-0" strokeWidth={3} />
                                <span>{m}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </motion.div>
              ))}
            </Accordion>
            <p className="text-muted-foreground text-center mt-12 max-w-2xl mx-auto leading-relaxed">
              These challenges slow down deployment, limit investment flows, and prevent the ecosystem from reaching its full potential.
            </p>
          </div>
        </div>
      </section>

      {/* ─────────── OUR APPROACH ─────────── */}
      <section className="relative py-28 lg:py-36 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-b from-background via-sacramento/40 to-background" />
        </div>

        <div className="relative max-w-[1600px] mx-auto px-6 lg:px-12">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="inline-flex items-center gap-2 liquid-glass rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-primary mb-5">
              <Layers className="h-3 w-3" /> Our approach
            </span>
            <motion.h2
              initial="hidden" whileInView="show" viewport={{ once: true }}
              variants={fadeUp} transition={{ duration: 0.7 }}
              className="font-editorial text-4xl md:text-5xl lg:text-6xl leading-[1] tracking-tight text-foreground"
            >
              A continuous <span className="italic text-gradient-ignis">cycle.</span>
            </motion.h2>
            <p className="mt-5 text-muted-foreground leading-relaxed">
              Every step strengthens the next, and the whole loop compounds momentum across the ecosystem.
            </p>
          </div>

          <div className="max-w-6xl mx-auto">
            {/* xl: single horizontal row */}
            <div className="hidden xl:grid grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] gap-x-3 items-stretch">
              <ApproachCard pillar={approachPillars[0]} step={1} />
              <div className="flex items-center"><FlowArrow direction="right" /></div>
              <ApproachCard pillar={approachPillars[1]} step={2} />
              <div className="flex items-center"><FlowArrow direction="right" /></div>
              <ApproachCard pillar={approachPillars[2]} step={3} />
              <div className="flex items-center"><FlowArrow direction="right" /></div>
              <ApproachCard pillar={approachPillars[3]} step={4} />
            </div>

            {/* md/lg: 2×2 grid */}
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

            {/* mobile: vertical stack */}
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
        </div>
      </section>

      {/* ─────────── HOW IT WORKS ─────────── */}
      <section className="relative py-28 lg:py-36 overflow-hidden bg-[#00712D]">
        <div className="absolute inset-0 bg-ember-grid opacity-15 pointer-events-none" />

        <div className="relative max-w-[1600px] mx-auto px-6 lg:px-12">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="inline-flex items-center gap-2 liquid-glass rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-amber-400 mb-5">
              <Rocket className="h-3 w-3" /> How it works
            </span>
            <motion.h2
              initial="hidden" whileInView="show" viewport={{ once: true }}
              variants={fadeUp} transition={{ duration: 0.7 }}
              className="font-editorial text-4xl md:text-5xl lg:text-6xl leading-[1] tracking-tight text-white"
            >
              Coordination, <span className="italic text-gradient-ignis">made simple.</span>
            </motion.h2>
            <p className="mt-5 text-white/60">
              CleanCookIQ transforms clean cooking deployment into a coordinated process.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-6xl mx-auto">
            {howItWorksSteps.map((s, i) => (
              <motion.div
                key={s.step}
                initial="hidden" whileInView="show" viewport={{ once: true, margin: "-50px" }}
                variants={fadeUp} transition={{ duration: 0.6, delay: i * 0.1 }}
                className="group ignis-card p-7 hover:-translate-y-1 transition-transform"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-bold text-[#00712D] tracking-[0.2em] uppercase">Step {s.step}</span>
                  <span className="font-editorial italic text-2xl text-[#00712D]/15 group-hover:text-[#FF8C00]/40 transition-colors">0{i + 1}</span>
                </div>
                <h3 className="font-display font-bold text-lg text-[#0D4715] mb-2">{s.title}</h3>
                <p className="text-sm text-[#0D4715]/70 leading-relaxed">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────── WHO WE SERVE ─────────── */}
      <section className="relative py-28 lg:py-36 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-b from-background via-sacramento/40 to-background" />
        </div>

        <div className="relative max-w-[1600px] mx-auto px-6 lg:px-12">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="inline-flex items-center gap-2 liquid-glass rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-primary mb-5">
              <Users className="h-3 w-3" /> Who we serve
            </span>
            <motion.h2
              initial="hidden" whileInView="show" viewport={{ once: true }}
              variants={fadeUp} transition={{ duration: 0.7 }}
              className="font-editorial text-4xl md:text-5xl lg:text-6xl leading-[1] tracking-tight text-foreground"
            >
              A multi-stakeholder <span className="italic text-gradient-ignis">ecosystem.</span>
            </motion.h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 max-w-6xl mx-auto">
            {stakeholders.map((s, i) => (
              <motion.div
                key={s.title}
                initial="hidden" whileInView="show" viewport={{ once: true, margin: "-50px" }}
                variants={fadeUp} transition={{ duration: 0.6, delay: i * 0.08 }}
                className="group ignis-card p-7 hover:-translate-y-1 transition-transform"
              >
                <span className="relative inline-flex h-12 w-12 rounded-2xl liquid-glass-strong bg-muted items-center justify-center mb-5">
                  <s.icon className="h-5 w-5 text-primary" strokeWidth={1.8} />
                  <span className="absolute inset-0 rounded-2xl bg-primary/30 blur-xl -z-10 opacity-0 group-hover:opacity-100 transition-opacity" />
                </span>
                <h3 className="font-display font-bold text-lg text-foreground mb-2">{s.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────── WHY NOW ─────────── */}
      <section className="relative py-28 lg:py-36 overflow-hidden bg-[#FFF5E6]">
        <div className="relative max-w-[1600px] mx-auto px-6 lg:px-12">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <span className="inline-flex items-center gap-2 liquid-glass rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-primary mb-5">
              <Zap className="h-3 w-3" /> Why now
            </span>
            <motion.h2
              initial="hidden" whileInView="show" viewport={{ once: true }}
              variants={fadeUp} transition={{ duration: 0.7 }}
              className="font-editorial text-4xl md:text-5xl lg:text-6xl leading-[1] tracking-tight text-foreground"
            >
              A critical <span className="italic text-gradient-ignis">inflection point.</span>
            </motion.h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
            {inflectionPoints.map((item, i) => (
              <motion.div
                key={item}
                initial="hidden" whileInView="show" viewport={{ once: true, margin: "-50px" }}
                variants={fadeUp} transition={{ duration: 0.5, delay: i * 0.08 }}
                className="ignis-card flex items-start gap-4 p-5"
              >
                <span className="h-10 w-10 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center shrink-0">
                  <Zap className="h-4 w-4 text-primary" />
                </span>
                <p className="text-foreground/85 font-medium pt-2 leading-snug">{item}</p>
              </motion.div>
            ))}
          </div>

          <p className="text-muted-foreground text-center mt-12 max-w-2xl mx-auto leading-relaxed">
            CleanCookIQ exists to turn this momentum into real, large-scale progress, not scattered wins.
          </p>
        </div>
      </section>

      {/* ─────────── OUR FOCUS ─────────── */}
      <section className="relative py-28 lg:py-36 overflow-hidden">
        <div className="absolute inset-0 bg-ember-grid opacity-15 pointer-events-none" />

        <div className="relative max-w-[1600px] mx-auto px-6 lg:px-12">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="inline-flex items-center gap-2 liquid-glass rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-primary mb-5">
              <Globe className="h-3 w-3" /> Our focus
            </span>
            <motion.h2
              initial="hidden" whileInView="show" viewport={{ once: true }}
              variants={fadeUp} transition={{ duration: 0.7 }}
              className="font-editorial text-4xl md:text-5xl lg:text-6xl leading-[1] tracking-tight text-foreground"
            >
              From Kenya, <span className="italic text-gradient-ignis">outward.</span>
            </motion.h2>
            <p className="mt-5 text-muted-foreground max-w-2xl mx-auto">
              The platform is initially focused on institutional markets, where impact can be aggregated and scaled efficiently.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-5xl mx-auto">
            {[
              { wave: "Wave 1", region: "Kenya" },
              { wave: "Wave 2", region: "Uganda and Sierra Leone" },
              { wave: "Wave 3", region: "Africa and the rest of the world" },
            ].map((item, i) => (
              <motion.div
                key={item.wave}
                initial="hidden" whileInView="show" viewport={{ once: true, margin: "-50px" }}
                variants={fadeUp} transition={{ duration: 0.6, delay: i * 0.12 }}
                className="group ignis-card p-8 hover:-translate-y-1 transition-transform relative overflow-hidden"
              >
                <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-primary/10 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative flex items-center gap-3 mb-4">
                  <MapPin className="h-4 w-4 text-primary" />
                  <span className="text-[10px] font-bold text-primary tracking-[0.2em] uppercase">{item.wave}</span>
                </div>
                <h3 className="relative font-editorial italic text-3xl text-foreground leading-tight">{item.region}</h3>
              </motion.div>
            ))}
          </div>

          <p className="text-muted-foreground text-center mt-12 max-w-2xl mx-auto">
            These markets offer enabling environments for rapid deployment and ecosystem collaboration.
          </p>
        </div>
      </section>

      {/* ─────────── OUR VISION ─────────── */}
      <section className="relative py-32 lg:py-44 overflow-hidden bg-[#00712D]">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0D4715] via-[#00712D] to-[#0D4715]" />
        <div className="absolute inset-0 bg-hero-glow opacity-80" />
        <div className="absolute inset-0 bg-ember-grid opacity-25" />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full bg-primary/20 blur-3xl animate-glow-pulse" />

        <div className="relative max-w-[1600px] mx-auto px-6 lg:px-12 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 liquid-glass rounded-full px-4 py-1.5 mb-8"
          >
            <Flame className="h-3.5 w-3.5 text-amber-400" />
            <span className="text-xs font-medium text-white/85 uppercase tracking-[0.2em]">Our vision</span>
          </motion.div>

          <motion.h2
            initial="hidden" whileInView="show" viewport={{ once: true }}
            variants={fadeUp} transition={{ duration: 0.8 }}
            className="font-editorial italic text-4xl md:text-6xl lg:text-7xl leading-[1.05] tracking-tight text-white max-w-5xl mx-auto"
          >
            To build the operating system for <span className="text-gradient-ignis">clean cooking markets</span>, enabling coordinated, data-driven, large-scale change across Africa and beyond.
          </motion.h2>
        </div>
      </section>
    </div>
  );
}
