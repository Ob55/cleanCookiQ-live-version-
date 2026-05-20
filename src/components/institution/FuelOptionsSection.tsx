import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Flame, Leaf, Zap, Cloud, Trees, Sprout, ArrowUpRight } from "lucide-react";
import firewoodImg from "@/assets/fuels/firewood.webp";
import charcoalImg from "@/assets/fuels/charcoal.jpg";
import lpgImg from "@/assets/fuels/lpg.webp";
import biogasImg from "@/assets/fuels/biogas.jpg";
import electricImg from "@/assets/fuels/electric.webp";
import pelletsImg from "@/assets/fuels/pellets.jpg";

type Tier = "baseline" | "transitional" | "clean" | "emerging";

const tierStyles: Record<Tier, { label: string; pillBg: string; pillText: string; ring: string }> = {
  baseline:     { label: "Baseline",     pillBg: "bg-[hsl(141_18%_92%)]", pillText: "text-[hsl(141_30%_28%)]", ring: "ring-[hsl(141_20%_70%)]" },
  transitional: { label: "Transitional", pillBg: "bg-[hsl(33_100%_94%)]", pillText: "text-[hsl(26_92%_38%)]", ring: "ring-[hsl(33_70%_70%)]" },
  clean:        { label: "Clean",        pillBg: "bg-[hsl(141_75%_94%)]", pillText: "text-[hsl(141_75%_22%)]", ring: "ring-[hsl(141_50%_65%)]" },
  emerging:     { label: "Emerging",     pillBg: "bg-[hsl(33_100%_94%)]", pillText: "text-[hsl(26_92%_38%)]", ring: "ring-[hsl(33_70%_70%)]" },
};

const FUELS: Array<{
  name: string;
  tier: Tier;
  tierLabel?: string;
  cost: string;
  unit: string;
  desc: string;
  long: string;
  highlight: string;
  highlightLabel: string;
  image: string;
  icon: typeof Flame;
}> = [
  {
    name: "Firewood",
    tier: "baseline",
    cost: "KSh 3–5",
    unit: "/ meal",
    desc: "High particulate emissions, deforestation risk.",
    long: "Still the dominant fuel in most rural institutional kitchens. Cheap to source, but the health and environmental cost is rarely priced in.",
    highlight: "78%",
    highlightLabel: "of institutional kitchens still rely on it",
    image: firewoodImg,
    icon: Trees,
  },
  {
    name: "Charcoal",
    tier: "baseline",
    tierLabel: "Common",
    cost: "KSh 8–12",
    unit: "/ meal",
    desc: "Lower efficiency, indoor air quality concerns.",
    long: "Often used in urban and peri-urban institutions. Cleaner-burning than firewood but production drives forest degradation upstream.",
    highlight: "3.5×",
    highlightLabel: "more expensive than firewood per meal",
    image: charcoalImg,
    icon: Cloud,
  },
  {
    name: "LPG",
    tier: "transitional",
    cost: "KSh 6–9",
    unit: "/ meal",
    desc: "Clean burn, supply-chain dependent.",
    long: "A practical step-up for institutions ready to leave biomass behind. Reliable, scalable, with mature supply lines across Kenya's 47 counties.",
    highlight: "60%",
    highlightLabel: "lower particulate emissions vs firewood",
    image: lpgImg,
    icon: Flame,
  },
  {
    name: "Biogas",
    tier: "clean",
    tierLabel: "Renewable",
    cost: "KSh 2–4",
    unit: "/ meal",
    desc: "Lowest running cost, needs feedstock.",
    long: "On-site digestion turns kitchen and farm waste into cooking fuel. The lowest marginal cost option once the digester is installed — and a closed loop.",
    highlight: "KSh 2",
    highlightLabel: "cheapest running cost in the country",
    image: biogasImg,
    icon: Sprout,
  },
  {
    name: "Electric (Induction)",
    tier: "clean",
    cost: "KSh 5–8",
    unit: "/ meal",
    desc: "Zero emissions at point of use, grid-dependent.",
    long: "Fastest, cleanest, most controllable — pairs naturally with rooftop solar. Best fit for institutions on Kenya's strengthening grid.",
    highlight: "0",
    highlightLabel: "grams of soot in the kitchen",
    image: electricImg,
    icon: Zap,
  },
  {
    name: "Biomass Pellets",
    tier: "emerging",
    cost: "KSh 4–7",
    unit: "/ meal",
    desc: "Efficient, standardised fuel, growing supply.",
    long: "Compressed agricultural residue. A drop-in upgrade path for institutions that still need solid fuel but want a cleaner, more measurable supply.",
    highlight: "5×",
    highlightLabel: "more efficient than raw firewood",
    image: pelletsImg,
    icon: Leaf,
  },
];

const AUTO_CYCLE_MS = 4000;

export default function FuelOptionsSection() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const hoverRef = useRef(false);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => {
      if (hoverRef.current) return;
      setActive((i) => (i + 1) % FUELS.length);
    }, AUTO_CYCLE_MS);
    return () => clearInterval(id);
  }, [paused]);

  const current = FUELS[active];
  const tier = tierStyles[current.tier];

  return (
    <section
      className="section-cream relative overflow-hidden px-5 sm:px-8 lg:px-12 py-20 lg:py-28 rounded-[2.5rem]"
      onMouseEnter={() => { hoverRef.current = true; }}
      onMouseLeave={() => { hoverRef.current = false; }}
    >
      {/* ambient washes so the cream feels alive */}
      <div className="pointer-events-none absolute -top-32 right-0 h-72 w-72 rounded-full bg-[hsl(33_100%_50%/0.10)] blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 left-0 h-72 w-72 rounded-full bg-[hsl(141_75%_22%/0.10)] blur-3xl" />

      <div className="relative max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-12 lg:mb-16">
          <div className="max-w-2xl">
            <motion.span
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 rounded-full border border-[hsl(141_30%_80%)] bg-white px-3 py-1 text-[11px] uppercase tracking-[0.2em] font-semibold text-[hsl(141_75%_22%)] mb-5"
            >
              <Flame className="h-3 w-3" /> Fuel comparison
            </motion.span>
            <motion.h2
              initial={{ opacity: 0, y: 20, filter: "blur(8px)" }}
              whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="font-editorial text-4xl md:text-5xl lg:text-[3.5rem] leading-[1] tracking-tight cream-heading"
            >
              Six fuels. <span className="italic text-[hsl(33_100%_50%)]">One decision.</span>
            </motion.h2>
            <p className="mt-5 cream-muted text-base lg:text-lg leading-relaxed max-w-xl">
              Indicative averages for a 500-person institutional kitchen across Kenya. Click any fuel to compare — or watch them auto-cycle.
            </p>
          </div>

          {/* progress / status */}
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-xs cream-muted tabular-nums font-medium">
              {String(active + 1).padStart(2, "0")} <span className="opacity-50">/</span> {String(FUELS.length).padStart(2, "0")}
            </span>
            <button
              type="button"
              onClick={() => setPaused((p) => !p)}
              className="text-[10px] uppercase tracking-[0.2em] font-bold text-[hsl(141_75%_22%)] hover:text-[hsl(33_100%_50%)] transition-colors"
              aria-pressed={paused}
            >
              {paused ? "▶ Play" : "❚❚ Pause"}
            </button>
          </div>
        </div>

        {/* Explorer */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-5 lg:gap-7">
          {/* Featured panel — big image + glass info card */}
          <div className="relative h-[460px] sm:h-[540px] lg:h-[600px] rounded-[2rem] overflow-hidden ring-1 ring-[hsl(141_30%_80%)] shadow-[0_30px_60px_-20px_hsl(141_75%_15%/0.25)]">
            {/* Image stack — Ken Burns-style transition + slow zoom on hold */}
            <AnimatePresence mode="sync">
              <motion.img
                key={current.image}
                src={current.image}
                alt={current.name}
                initial={{ opacity: 0, scale: 1.15, filter: "blur(12px)" }}
                animate={{ opacity: 1, scale: 1.04, filter: "blur(0px)" }}
                exit={{ opacity: 0, scale: 1, filter: "blur(8px)" }}
                transition={{
                  opacity: { duration: 0.7, ease: [0.16, 1, 0.3, 1] },
                  filter: { duration: 0.7, ease: [0.16, 1, 0.3, 1] },
                  scale: { duration: AUTO_CYCLE_MS / 1000 + 0.5, ease: "linear" },
                }}
                className="absolute inset-0 w-full h-full object-cover"
              />
            </AnimatePresence>
            {/* gradient veil for legibility */}
            <div className="absolute inset-0 bg-gradient-to-tr from-black/85 via-black/40 to-transparent" />
            {/* progress bar */}
            {!paused && (
              <motion.div
                key={`bar-${active}`}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: AUTO_CYCLE_MS / 1000, ease: "linear" }}
                style={{ originX: 0 }}
                className="absolute top-0 left-0 right-0 h-[3px] bg-[hsl(33_100%_50%)]"
              />
            )}

            {/* Tier pill top-left */}
            <div className="absolute top-5 left-5 z-10">
              <span className={`inline-flex items-center rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] ${tier.pillBg} ${tier.pillText} ring-1 ${tier.ring} backdrop-blur-md`}>
                {current.tierLabel ?? tier.label}
              </span>
            </div>

            {/* Big number top-right */}
            <AnimatePresence mode="wait">
              <motion.div
                key={`hl-${active}`}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="absolute top-5 right-5 z-10 text-right max-w-[60%]"
              >
                <p className="font-editorial italic text-[2.5rem] sm:text-5xl lg:text-6xl leading-none text-white">
                  {current.highlight}
                </p>
                <p className="text-[10px] uppercase tracking-[0.2em] text-white/70 mt-1.5 leading-tight">
                  {current.highlightLabel}
                </p>
              </motion.div>
            </AnimatePresence>

            {/* Bottom glass info card */}
            <div className="absolute inset-x-5 bottom-5 z-10">
              <AnimatePresence mode="wait">
                <motion.div
                  key={`info-${active}`}
                  initial={{ opacity: 0, y: 20, filter: "blur(8px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: -10, filter: "blur(8px)" }}
                  transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                  className="liquid-glass-strong rounded-2xl p-5 sm:p-6 bg-black/45"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h3 className="font-display font-bold text-2xl sm:text-3xl text-white leading-tight">{current.name}</h3>
                      <p className="text-sm text-white/75 mt-2 leading-relaxed">{current.long}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-editorial italic text-2xl sm:text-3xl text-[hsl(33_100%_64%)] leading-none">{current.cost}</p>
                      <p className="text-[10px] uppercase tracking-[0.18em] text-white/55 mt-1.5">{current.unit}</p>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* Right rail — fuel tabs */}
          <div className="space-y-2.5">
            {FUELS.map((fuel, i) => {
              const isActive = i === active;
              const t = tierStyles[fuel.tier];
              const Icon = fuel.icon;
              return (
                <motion.button
                  key={fuel.name}
                  type="button"
                  onClick={() => setActive(i)}
                  initial={{ opacity: 0, x: 16 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.06 }}
                  animate={{ scale: isActive ? 1.02 : 1 }}
                  whileHover={{ x: 3 }}
                  className={[
                    "group relative w-full text-left flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-[background,box-shadow,outline] duration-300",
                    isActive
                      ? "bg-white ring-2 ring-[hsl(33_100%_50%)] shadow-[0_18px_40px_-16px_hsl(33_100%_50%/0.35)]"
                      : "bg-white/65 ring-1 ring-[hsl(36_20%_88%)] hover:bg-white hover:ring-[hsl(141_30%_70%)]",
                  ].join(" ")}
                  aria-pressed={isActive}
                >
                  {/* index */}
                  <span className={[
                    "shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-colors",
                    isActive ? "bg-[hsl(33_100%_50%)] text-white" : "bg-[hsl(141_18%_94%)] text-[hsl(141_75%_22%)]",
                  ].join(" ")}>
                    <Icon className="h-4 w-4" strokeWidth={2} />
                  </span>

                  {/* name + tier */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-display font-bold text-[15px] cream-heading truncate">{fuel.name}</p>
                      <span className={`shrink-0 inline-flex items-center rounded-full px-2 py-[3px] text-[9px] font-bold uppercase tracking-[0.15em] ${t.pillBg} ${t.pillText}`}>
                        {fuel.tierLabel ?? t.label}
                      </span>
                    </div>
                    <p className="text-xs cream-muted truncate mt-0.5">{fuel.desc}</p>
                  </div>

                  {/* price */}
                  <div className="shrink-0 text-right">
                    <p className={[
                      "font-editorial italic text-lg leading-none transition-colors",
                      isActive ? "text-[hsl(33_100%_50%)]" : "text-[hsl(141_75%_22%)]",
                    ].join(" ")}>
                      {fuel.cost}
                    </p>
                    <p className="text-[9px] uppercase tracking-[0.18em] cream-muted mt-1">{fuel.unit}</p>
                  </div>

                  <ArrowUpRight
                    className={[
                      "h-4 w-4 shrink-0 transition-all",
                      isActive ? "text-[hsl(33_100%_50%)] translate-x-0" : "text-[hsl(141_30%_55%)] opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0",
                    ].join(" ")}
                  />
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
