import { Link, Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  MapPin, BarChart3, TrendingUp, Leaf, Building2,
  ArrowRight, Flame, Factory, Banknote, Briefcase, FolderKanban,
  GraduationCap, UserPlus, ClipboardCheck, Handshake, Rocket, Activity,
  ChevronRight, Check, AlertCircle, ArrowUpRight,
} from "lucide-react";
import FuelOptionsSection from "@/components/institution/FuelOptionsSection";
import { supabase } from "@/integrations/supabase/client";
import kitchenTransitionBg from "@/assets/kitchen-transition.jpg";
import cleancookIqMark from "@/assets/cleancookiq-mark.png";
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

type StatRow = {
  pipeline_stage: string | null;
  assessment_score: number | null;
  annual_savings_ksh: number | null;
  co2_reduction_tonnes_pa: number | null;
};

function formatPipelineValue(totalKsh: number): { num: number; suffix: string; decimals: number } {
  if (totalKsh >= 1_000_000_000) return { num: totalKsh / 1_000_000_000, suffix: "B", decimals: 1 };
  if (totalKsh >= 1_000_000) return { num: totalKsh / 1_000_000, suffix: "M", decimals: 1 };
  if (totalKsh >= 1_000) return { num: totalKsh / 1_000, suffix: "K", decimals: 1 };
  return { num: totalKsh, suffix: "", decimals: 0 };
}

const modules = [
  { title: "Institution Map", desc: "An interactive map showing every institution, the fuel they cook with today, how ready they are to switch, and the progress of their transition.", icon: MapPin },
  { title: "Provider Directory", desc: "A vetted list of equipment suppliers, installers, and service partners, organised by category so institutions can find the right fit.", icon: Factory },
  { title: "Training & Technical Support", desc: "Connects institutions that need training or design help with qualified support partners in their county.", icon: GraduationCap },
  { title: "Financing", desc: "Brings grants, loans, and investment together in one place, and connects institutions with funders.", icon: Banknote },
  { title: "Portfolio Tracking", desc: "Once equipment is installed, the platform tracks performance, service contracts, and support requests.", icon: Briefcase },
  { title: "Programme Management", desc: "Tools for running large programmes across many institutions: procurement, provider bidding, and due diligence.", icon: FolderKanban },
];

const failures = [
  { fail: "Demand is invisible — no one knows which institutions are ready to switch.", fix: "We maintain a verified, county-level pipeline of institutions ready to transition." },
  { fail: "Capital is fragmented and slow to deploy where it is needed.", fix: "We match funders to investment-ready projects with vetted suppliers and clear impact." },
];

const steps = [
  { step: "01", title: "Register", icon: UserPlus, desc: "Institutions share their cooking details: current fuel, meals served, budget, and location." },
  { step: "02", title: "Assess", icon: ClipboardCheck, desc: "We assess each institution and work out the best clean cooking option for them." },
  { step: "03", title: "Match & Finance", icon: Handshake, desc: "We connect ready institutions with vetted suppliers and interested funders." },
  { step: "04", title: "Install", icon: Rocket, desc: "Equipment is installed and progress is tracked in real time." },
  { step: "05", title: "Monitor", icon: Activity, desc: "After installation, we track performance and produce impact and carbon reports." },
];

// Word-by-word reveal for the hero headline. Each word fades up + un-blurs
// in turn — adapted from the BlurText pattern in the Liquid Glass prompt.
function BlurWords({ text, delay = 0, className = "" }: { text: string; delay?: number; className?: string }) {
  return (
    <span className={className}>
      {text.split(" ").map((word, i) => (
        <motion.span
          key={`${word}-${i}`}
          initial={{ opacity: 0, y: 28, filter: "blur(10px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.65, delay: delay + i * 0.08, ease: [0.16, 1, 0.3, 1] }}
          className="inline-block mr-[0.22em]"
        >
          {word}
        </motion.span>
      ))}
    </span>
  );
}

const fadeUp = {
  hidden: { opacity: 0, y: 30, filter: "blur(6px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)" },
};

export default function HomePage() {
  const { user, profile, roles, loading } = useAuth();

  const { data: institutionRows } = useQuery({
    queryKey: ["home-stats-institutions"],
    queryFn: async (): Promise<StatRow[]> => {
      const { data } = await supabase
        .from("institutions")
        .select("pipeline_stage, assessment_score, annual_savings_ksh, co2_reduction_tonnes_pa");
      return (data as StatRow[] | null) ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const totalInstitutions = institutionRows?.length ?? 0;
  const assessedCount = institutionRows?.filter(r =>
    r.pipeline_stage === "assessed" || r.pipeline_stage === "scored" ||
    (r.assessment_score != null && Number(r.assessment_score) > 0)
  ).length ?? 0;
  const inDeliveryCount = institutionRows?.filter(r =>
    r.pipeline_stage === "contracted" || r.pipeline_stage === "installed" || r.pipeline_stage === "in_delivery"
  ).length ?? 0;
  const pipelineValueKsh = institutionRows?.reduce((s, r) => s + Number(r.annual_savings_ksh ?? 0), 0) ?? 0;
  const co2Tonnes = institutionRows?.reduce((s, r) => s + Number(r.co2_reduction_tonnes_pa ?? 0), 0) ?? 0;
  const pipelineDisplay = formatPipelineValue(pipelineValueKsh);

  const stats = [
    { label: "Institutions Tracked", num: totalInstitutions, suffix: "", decimals: 0, icon: Building2 },
    { label: "Institutions Assessed", num: assessedCount, suffix: "", decimals: 0, icon: BarChart3 },
    { label: "Projects in Delivery", num: inDeliveryCount, suffix: "", decimals: 0, icon: TrendingUp },
    { label: "Pipeline Value (KSh)", num: pipelineDisplay.num, suffix: pipelineDisplay.suffix, decimals: pipelineDisplay.decimals, icon: Flame },
    { label: "Tonnes CO₂ Avoided", num: co2Tonnes, suffix: "", decimals: 0, icon: Leaf },
  ];

  if (!loading && user) {
    if (roles.some(r => ["admin", "manager", "field_agent"].includes(r))) return <Navigate to="/admin/pipeline" replace />;
    if (profile?.org_type === "institution") return <Navigate to={profile?.organisation_id ? "/institution/dashboard" : "/institution/setup"} replace />;
    if (profile?.org_type === "supplier") return <Navigate to="/supplier/dashboard" replace />;
    if (profile?.org_type === "funder") return <Navigate to="/funder/dashboard" replace />;
    if (profile?.org_type === "csr") return <Navigate to="/csr/dashboard" replace />;
    if (profile?.org_type === "other") return <Navigate to="/auth/pending" replace />;
  }

  return (
    <div className="bg-background text-foreground">
      {/* ─────────── HERO ─────────── */}
      <section className="relative min-h-screen flex items-center overflow-hidden">
        {/* Background image — kept clearly visible. Black vignette on
            the left for headline legibility, image breathes on the right
            behind the stat cards. */}
        <div className="absolute inset-0">
          <img
            src={kitchenTransitionBg}
            alt="Institutional kitchen transitioning to clean cooking equipment"
            className="w-full h-full object-cover"
            width={1920}
            height={1080}
            fetchPriority="high"
            decoding="async"
          />
          {/* dark scrim for headline contrast (heaviest on the left,
              fades to transparent right so the kitchen photo breathes
              behind the cards) */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/65 via-black/35 to-transparent" />
          {/* bottom fade into next section */}
          <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-b from-transparent to-background" />
          {/* warm + green glow + ember grid for ambience */}
          <div className="absolute inset-0 bg-hero-glow opacity-70" />
          <div className="absolute inset-0 bg-ember-grid opacity-20" />
          {/* floating orange embers */}
          <div className="absolute top-1/3 left-[15%] h-2 w-2 rounded-full bg-primary blur-sm animate-ember-float" style={{ animationDelay: "0s" }} />
          <div className="absolute top-2/3 left-[28%] h-1.5 w-1.5 rounded-full bg-primary/60 blur-sm animate-ember-float" style={{ animationDelay: "1.2s" }} />
          <div className="absolute top-1/4 right-[20%] h-2 w-2 rounded-full bg-primary blur-sm animate-ember-float" style={{ animationDelay: "2.4s" }} />
          <div className="absolute bottom-1/3 right-[10%] h-1.5 w-1.5 rounded-full bg-primary/60 blur-sm animate-ember-float" style={{ animationDelay: "0.6s" }} />
        </div>

        <div className="relative z-10 w-full max-w-[1600px] mx-auto px-6 lg:px-12 pt-32 pb-20">
          <div className="grid lg:grid-cols-[1.2fr_1fr] gap-10 items-center">
            {/* Headline column */}
            <div>
              <h1 className="font-display font-extrabold text-[3rem] sm:text-6xl lg:text-7xl xl:text-[5.5rem] leading-[0.95] tracking-tight text-[#A5D6A7] [text-shadow:0_2px_18px_rgba(0,0,0,0.55)]">
                <BlurWords text="Powering Kenya's" />
                <br />
                <span className="inline-block text-[#F5871F] [text-shadow:0_2px_16px_rgba(0,0,0,0.45)]">
                  clean cooking
                </span>
                <br />
                <BlurWords text="transition." delay={0.5} />
              </h1>

              <motion.p
                initial={{ opacity: 0, y: 20, filter: "blur(8px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ duration: 0.8, delay: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className="mt-8 inline-block bg-[#F6F3EE] text-black text-base lg:text-lg leading-relaxed max-w-xl rounded-2xl px-5 py-4 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.6)] border-l-4 border-[#FF8C00]"
              >
                Digital infrastructure that converts fragmented demand, dispersed supply, and available financing into a structured, verified national transition pipeline.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 1.1 }}
                className="mt-10 flex flex-wrap gap-3"
              >
                <Link to="/map">
                  <button className="group relative inline-flex items-center gap-2 h-12 px-7 rounded-full bg-gradient-ignis text-white font-semibold shadow-ignis hover:translate-y-[-1px] transition-transform">
                    <MapPin className="h-4 w-4" /> Explore the Map
                    <span className="absolute inset-0 rounded-full bg-gradient-ignis opacity-50 blur-md -z-10 group-hover:opacity-80 transition-opacity" />
                  </button>
                </Link>
                <Link to="/book-demo">
                  <button className="inline-flex items-center gap-2 h-12 px-7 rounded-full liquid-glass-strong text-foreground font-medium hover:bg-white/10 transition-colors">
                    Book a Demo <ArrowUpRight className="h-4 w-4" />
                  </button>
                </Link>
              </motion.div>

              {/* mini partner strip */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1, delay: 1.4 }}
                className="mt-14 flex flex-wrap items-center gap-x-6 gap-y-3"
              >
                <span className="text-[11px] uppercase tracking-[0.18em] text-accent font-bold drop-shadow-[0_1px_4px_rgba(0,0,0,0.7)]">Trusted partners</span>
                <div className="flex items-center gap-5">
                  {partners.slice(0, 4).map((p, i) => (
                    <img key={i} src={p} alt="" className="h-7 max-w-[80px] object-contain" />
                  ))}
                </div>
              </motion.div>
            </div>

            {/* Right column — floating glass stat cards */}
            <motion.div
              initial={{ opacity: 0, x: 40, filter: "blur(8px)" }}
              animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
              transition={{ duration: 0.9, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="hidden lg:block relative"
            >
              {/* Big featured stat */}
              <div className="liquid-glass-strong rounded-[2rem] p-8 mb-4 bg-background/75">
                <div className="flex items-center gap-2 mb-4">
                  <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                  <span className="text-xs uppercase tracking-[0.2em] text-primary font-bold">Live pipeline</span>
                </div>
                <p className="font-editorial italic text-7xl text-foreground leading-none">
                  <AnimatedNumber value={totalInstitutions} />
                </p>
                <p className="mt-3 text-base text-foreground/90">institutions being tracked across <span className="text-foreground font-semibold">47 counties</span></p>
                <div className="mt-6 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                <div className="mt-5 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-foreground/80 font-semibold mb-1">Assessed</p>
                    <p className="font-display font-extrabold text-4xl text-foreground"><AnimatedNumber value={assessedCount} /></p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-foreground/80 font-semibold mb-1">In delivery</p>
                    <p className="font-display font-extrabold text-4xl text-primary"><AnimatedNumber value={inDeliveryCount} /></p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="liquid-glass rounded-2xl p-5 bg-background/60">
                  <Leaf className="h-6 w-6 text-rich-emerald mb-3" />
                  <p className="font-display font-extrabold text-3xl text-foreground"><AnimatedNumber value={co2Tonnes} /></p>
                  <p className="text-xs text-foreground/85 font-medium mt-1.5 leading-tight">Tonnes CO₂ avoided / year</p>
                </div>
                <div className="liquid-glass rounded-2xl p-5 bg-background/60">
                  <img src={cleancookIqMark} alt="" className="h-6 w-6 object-contain mb-3" />
                  <p className="font-display font-extrabold text-3xl text-foreground">
                    KSh <AnimatedNumber value={pipelineDisplay.num} suffix={pipelineDisplay.suffix} decimals={pipelineDisplay.decimals} />
                  </p>
                  <p className="text-xs text-foreground/85 font-medium mt-1.5 leading-tight">Pipeline value</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Bottom fade into next section */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent to-background z-10" />
      </section>

      {/* ─────────── LIVE STATS BAR (mobile + tablet) ─────────── */}
      <section className="lg:hidden relative -mt-6 z-20">
        <div className="max-w-[1600px] mx-auto px-6">
          <div className="ignis-card p-5">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {stats.map((s) => (
                <div key={s.label} className="flex items-center gap-3">
                  <s.icon className="h-5 w-5 text-primary shrink-0" />
                  <div>
                    <p className="font-display font-bold text-lg text-foreground leading-none">
                      <AnimatedNumber value={s.num} suffix={s.suffix} decimals={s.decimals} />
                    </p>
                    <p className="text-[10px] text-foreground/55 mt-0.5 leading-tight">{s.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─────────── WHAT THE PLATFORM DOES ─────────── */}
      <section className="relative py-28 lg:py-36 overflow-hidden bg-[#00712D]">
        <div className="absolute inset-0 bg-ember-grid opacity-20 pointer-events-none" />
        <div className="absolute left-1/2 top-0 -translate-x-1/2 h-px w-1/2 bg-gradient-to-r from-transparent via-amber-400/20 to-transparent" />

        <div className="relative max-w-[1600px] mx-auto px-6 lg:px-12">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <motion.span
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 liquid-glass rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-amber-400 mb-5"
            >
              <img src={cleancookIqMark} alt="" className="h-3.5 w-3.5 object-contain" /> The platform
            </motion.span>
            <motion.h2
              initial="hidden" whileInView="show" viewport={{ once: true }}
              variants={fadeUp} transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="font-editorial text-4xl md:text-5xl lg:text-6xl leading-[1] tracking-tight text-white"
            >
              Everything one transition needs, <span className="italic text-gradient-ignis">in one place.</span>
            </motion.h2>
            <p className="mt-5 text-white/65 leading-relaxed">
              Six modules that move an institution from current fuel to a clean alternative — with the supply, finance, training and tracking built in.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {modules.map((mod, i) => (
              <motion.div
                key={mod.title}
                initial="hidden" whileInView="show" viewport={{ once: true, margin: "-50px" }}
                variants={fadeUp} transition={{ duration: 0.6, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                className="group relative ignis-card p-7 hover:-translate-y-1 transition-transform duration-300"
              >
                <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-amber-400/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="flex items-start justify-between mb-6">
                  <span className="relative h-12 w-12 rounded-2xl bg-[#00712D]/10 flex items-center justify-center">
                    <mod.icon className="h-5 w-5 text-[#00712D]" strokeWidth={1.8} />
                  </span>
                  <span className="font-editorial italic text-2xl text-[#00712D]/15 group-hover:text-[#FF8C00]/40 transition-colors">0{i + 1}</span>
                </div>
                <h3 className="font-display font-bold text-lg mb-3 text-[#0D4715]">{mod.title}</h3>
                <p className="text-sm text-[#0D4715]/70 leading-relaxed">{mod.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────── FUEL OPTIONS ─────────── */}
      <section className="relative py-20 lg:py-28">
        <div className="max-w-[1600px] mx-auto px-6 lg:px-12">
          <FuelOptionsSection />
        </div>
      </section>

      {/* ─────────── CLOSING THE GAPS ─────────── */}
      <section className="relative py-28 lg:py-36 overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={kitchenTransitionBg}
            alt=""
            className="w-full h-full object-cover opacity-15"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background via-background/85 to-background" />
          <div className="absolute inset-0 bg-hero-glow opacity-40" />
        </div>

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
              Closing the gaps in <span className="italic text-gradient-ignis">institutional cooking.</span>
            </motion.h2>
            <p className="mt-5 text-foreground/70">
              The clean cooking sector has real gaps. CleanCookIQ fills them.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Failures */}
            <motion.div
              initial="hidden" whileInView="show" viewport={{ once: true }}
              variants={fadeUp} transition={{ duration: 0.7 }}
              className="ignis-card p-8 lg:p-10"
            >
              <div className="flex items-center gap-3 mb-8">
                <span className="h-9 w-9 rounded-xl bg-destructive/15 border border-destructive/30 flex items-center justify-center">
                  <AlertCircle className="h-4 w-4 text-destructive" strokeWidth={2.5} />
                </span>
                <p className="text-destructive text-[11px] font-bold uppercase tracking-[0.2em]">The Problem</p>
              </div>
              <ul className="space-y-6">
                {failures.map((item, i) => (
                  <motion.li
                    key={item.fail}
                    initial={{ opacity: 0, x: -16 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
                    transition={{ delay: i * 0.1, duration: 0.5 }}
                    className="flex items-start gap-4"
                  >
                    <span className="h-9 w-9 rounded-full bg-destructive/15 border border-destructive/30 flex items-center justify-center shrink-0 mt-0.5">
                      <AlertCircle className="h-4 w-4 text-destructive" strokeWidth={2.5} />
                    </span>
                    <p className="text-sm text-foreground/85 leading-relaxed pt-1.5">{item.fail}</p>
                  </motion.li>
                ))}
              </ul>
            </motion.div>

            {/* Solutions */}
            <motion.div
              initial="hidden" whileInView="show" viewport={{ once: true }}
              variants={fadeUp} transition={{ duration: 0.7, delay: 0.15 }}
              className="ignis-card p-8 lg:p-10 relative overflow-hidden"
            >
              <div className="absolute -right-20 -top-20 h-60 w-60 rounded-full bg-ignis/15 blur-3xl" />
              <div className="relative flex items-center gap-3 mb-8">
                <span className="h-9 w-9 rounded-xl bg-ignis/20 border border-ignis/40 flex items-center justify-center">
                  <Check className="h-4 w-4 text-primary" strokeWidth={3} />
                </span>
                <p className="text-primary text-[11px] font-bold uppercase tracking-[0.2em]">Our Solution</p>
              </div>
              <ul className="relative space-y-6">
                {failures.map((item, i) => (
                  <motion.li
                    key={item.fix}
                    initial={{ opacity: 0, x: 16 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
                    transition={{ delay: i * 0.1 + 0.2, duration: 0.5 }}
                    className="flex items-start gap-4"
                  >
                    <span className="h-9 w-9 rounded-full bg-ignis/20 border border-ignis/40 flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="h-4 w-4 text-primary" strokeWidth={3} />
                    </span>
                    <p className="text-sm text-foreground/85 leading-relaxed pt-1.5">{item.fix}</p>
                  </motion.li>
                ))}
              </ul>
            </motion.div>
          </div>

          <div className="text-center mt-12">
            <Link to="/about#challenges" className="inline-flex items-center gap-2 text-primary hover:text-foreground font-semibold transition-colors group">
              Learn more about how we close these gaps <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </section>

      {/* ─────────── HOW IT WORKS ─────────── */}
      <section className="relative py-28 lg:py-36 overflow-hidden bg-[#F5F5F5]">
        <div className="absolute inset-0 bg-ember-grid opacity-15 pointer-events-none" />

        <div className="relative max-w-[1600px] mx-auto px-6 lg:px-12">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <span className="inline-flex items-center gap-2 liquid-glass rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-primary mb-5">
              <Rocket className="h-3 w-3" /> How it works
            </span>
            <motion.h2
              initial="hidden" whileInView="show" viewport={{ once: true }}
              variants={fadeUp} transition={{ duration: 0.7 }}
              className="font-editorial text-4xl md:text-5xl lg:text-6xl leading-[1] tracking-tight text-foreground"
            >
              Five steps. <span className="italic text-gradient-ignis">One fully tracked kitchen.</span>
            </motion.h2>
            <p className="mt-5 text-foreground/65">
              From sign-up to monitoring, every move is captured against the same shared record.
            </p>
          </div>

          {/* Desktop horizontal timeline */}
          <div className="hidden lg:block relative">
            <div className="absolute left-12 right-12 top-12 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
            <div className="grid grid-cols-5 gap-2">
              {steps.map((s, i) => (
                <motion.div
                  key={s.step}
                  initial="hidden" whileInView="show" viewport={{ once: true }}
                  variants={fadeUp} transition={{ duration: 0.6, delay: i * 0.12 }}
                  className="flex flex-col items-center text-center group px-2"
                >
                  <div className="relative mb-5">
                    <div className="h-24 w-24 rounded-full liquid-glass-strong bg-muted flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
                      <s.icon className="h-9 w-9 text-primary" strokeWidth={1.6} />
                    </div>
                    <span className="absolute inset-0 rounded-full bg-ignis/30 blur-2xl -z-10 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <span className="text-[10px] font-bold text-primary tracking-[0.2em] uppercase mb-2">Step {s.step}</span>
                  <h3 className="font-display font-bold text-lg text-foreground mb-2">{s.title}</h3>
                  <p className="text-xs text-foreground/55 leading-relaxed max-w-[180px]">{s.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Mobile / tablet stacked */}
          <div className="lg:hidden space-y-4">
            {steps.map((s, i) => (
              <motion.div
                key={s.step}
                initial="hidden" whileInView="show" viewport={{ once: true }}
                variants={fadeUp} transition={{ duration: 0.5, delay: i * 0.06 }}
                className="ignis-card p-5 flex items-start gap-4"
              >
                <div className="relative">
                  <div className="h-14 w-14 rounded-2xl liquid-glass-strong bg-muted flex items-center justify-center shrink-0">
                    <s.icon className="h-5 w-5 text-primary" />
                  </div>
                </div>
                <div className="flex-1 pt-0.5">
                  <span className="text-[10px] font-bold text-primary tracking-[0.2em] uppercase">Step {s.step}</span>
                  <h3 className="font-display font-bold text-lg text-foreground mt-0.5 mb-1.5">{s.title}</h3>
                  <p className="text-sm text-foreground/60 leading-relaxed">{s.desc}</p>
                </div>
                {i < steps.length - 1 && (
                  <ChevronRight className="h-5 w-5 text-accent/40 self-center shrink-0" />
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>


      {/* ─────────── PARTNERS MARQUEE ─────────── */}
      <section className="relative py-20 lg:py-24 overflow-hidden border-t border-border">
        <div className="max-w-[1600px] mx-auto px-6 lg:px-12 mb-12">
          <div className="text-center">
            <span className="inline-flex items-center gap-2 liquid-glass rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-primary mb-4">
              <Handshake className="h-3 w-3" /> Our partners
            </span>
            <h3 className="font-editorial text-3xl md:text-4xl text-foreground">
              Trusted organisations <span className="italic text-gradient-ignis">powering the transition.</span>
            </h3>
          </div>
        </div>
        <div className="relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
          <div className="flex w-max animate-marquee gap-16 items-center">
            {[...partners, ...partners].map((logo, i) => (
              <div key={i} className="h-20 w-40 flex items-center justify-center shrink-0">
                <img
                  src={logo}
                  alt={`Partner ${(i % partners.length) + 1}`}
                  className="max-h-16 max-w-full object-contain"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────── FINAL CTA ─────────── */}
      <section className="relative py-28 lg:py-36 overflow-hidden">
        <div className="absolute inset-0 bg-[#00712D]" />
        <div className="absolute inset-0 bg-hero-glow opacity-80" />
        <div className="absolute inset-0 bg-ember-grid opacity-25" />
        {/* big ember */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full bg-ignis/20 blur-3xl animate-glow-pulse" />

        <div className="relative max-w-[1600px] mx-auto px-6 lg:px-12 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 liquid-glass rounded-full px-4 py-1.5 mb-7"
          >
            <img src={cleancookIqMark} alt="" className="h-4 w-4 object-contain" />
            <span className="text-xs font-medium text-white/85">Join the transition</span>
          </motion.div>

          <motion.h2
            initial="hidden" whileInView="show" viewport={{ once: true }}
            variants={fadeUp} transition={{ duration: 0.8 }}
            className="font-editorial text-4xl md:text-6xl lg:text-7xl xl:text-8xl leading-[0.95] tracking-tight text-white max-w-5xl mx-auto"
          >
            Ready to join the <span className="italic text-gradient-ignis">transition?</span>
          </motion.h2>

          <motion.p
            initial="hidden" whileInView="show" viewport={{ once: true }}
            variants={fadeUp} transition={{ duration: 0.7, delay: 0.2 }}
            className="mt-7 text-lg text-white/70 max-w-2xl mx-auto leading-relaxed"
          >
            Whether you are an institution, provider, funder, or researcher, there is a place for you on CleanCookIQ.
          </motion.p>

          <motion.div
            initial="hidden" whileInView="show" viewport={{ once: true }}
            variants={fadeUp} transition={{ duration: 0.7, delay: 0.3 }}
            className="mt-10 flex flex-wrap gap-3 justify-center"
          >
            <Link to="/auth/register">
              <button className="group relative inline-flex items-center gap-2 h-12 px-8 rounded-full bg-gradient-ignis text-white font-semibold shadow-ignis hover:translate-y-[-1px] transition-transform">
                Join the Platform <ArrowRight className="h-4 w-4" />
                <span className="absolute inset-0 rounded-full bg-gradient-ignis opacity-50 blur-md -z-10 group-hover:opacity-80 transition-opacity" />
              </button>
            </Link>
            <Link to="/book-demo">
              <button className="inline-flex items-center gap-2 h-12 px-8 rounded-full liquid-glass-strong text-white font-medium hover:bg-white/10 transition-colors">
                Book a Demo
              </button>
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
