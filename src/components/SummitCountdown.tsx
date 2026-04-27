import { useEffect, useState } from "react";

const TARGET_MS = Date.UTC(2026, 6, 9, 5, 0, 0);

const PRIMARY_GREEN = "#007129";
const ORANGE = "#F58323";

type Remaining = { days: number; hours: number; minutes: number; seconds: number };

function getRemaining(): Remaining | null {
  const diff = TARGET_MS - Date.now();
  if (diff <= 0) return null;
  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  const seconds = Math.floor((diff % 60_000) / 1000);
  return { days, hours, minutes, seconds };
}

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

const FlipDigit = ({ value }: { value: number }) => {
  const padded = pad(value);
  return (
    <div className="flex justify-center gap-1 sm:gap-1.5" style={{ perspective: "600px" }}>
      {padded.split("").map((digit, i) => (
        <span
          key={`${i}-${digit}`}
          className="inline-block animate-flip-down"
          style={{
            fontFamily: "'Bebas Neue', 'Impact', sans-serif",
            color: ORANGE,
            letterSpacing: "0.02em",
            transformOrigin: "50% 100%",
            textShadow: `0 2px 18px rgba(245,131,35,0.35)`,
          }}
        >
          {digit}
        </span>
      ))}
    </div>
  );
};

const SummitCountdown = () => {
  const [remaining, setRemaining] = useState<Remaining | null>(() => getRemaining());

  useEffect(() => {
    if (remaining === null) return;
    const id = setInterval(() => {
      const next = getRemaining();
      setRemaining(next);
      if (next === null) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, [remaining === null]);

  if (remaining === null) return null;

  const units: Array<{ label: string; value: number }> = [
    { label: "Days", value: remaining.days },
    { label: "Hours", value: remaining.hours },
    { label: "Minutes", value: remaining.minutes },
    { label: "Seconds", value: remaining.seconds },
  ];

  return (
    <section className="py-20 lg:py-24 bg-background">
      <div className="container flex justify-center">
        <div
          className="relative w-full max-w-5xl rounded-3xl px-6 py-10 sm:px-12 sm:py-14 lg:px-16 lg:py-16 text-center"
          style={{
            background: "linear-gradient(135deg, #0a1410 0%, #0f1d17 100%)",
            boxShadow: `0 0 0 1px rgba(0,113,41,0.4), 0 30px 80px -20px rgba(0,113,41,0.5), 0 0 120px -30px ${PRIMARY_GREEN}`,
          }}
        >
          <div className="flex items-center justify-center gap-2.5 mb-8 sm:mb-10">
            <span className="relative flex h-3 w-3">
              <span
                className="absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping"
                style={{ backgroundColor: ORANGE }}
              />
              <span
                className="relative inline-flex h-3 w-3 rounded-full"
                style={{ backgroundColor: ORANGE }}
              />
            </span>
            <span className="text-xs sm:text-sm font-semibold tracking-[0.3em] uppercase text-white/85">
              Live Countdown
            </span>
          </div>

          <div className="grid grid-cols-4 gap-3 sm:gap-5 lg:gap-6 mb-8 sm:mb-10">
            {units.map((u) => (
              <div
                key={u.label}
                className="rounded-2xl py-6 sm:py-8 lg:py-10 px-2"
                style={{
                  backgroundColor: "rgba(0,113,41,0.14)",
                  border: "1px solid rgba(0,113,41,0.4)",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05), inset 0 -2px 0 rgba(0,0,0,0.25)",
                }}
              >
                <div className="text-5xl sm:text-7xl md:text-8xl lg:text-9xl leading-none">
                  <FlipDigit value={u.value} />
                </div>
                <div className="mt-3 sm:mt-4 text-[11px] sm:text-sm uppercase tracking-[0.25em] text-white/65 font-semibold">
                  {u.label}
                </div>
              </div>
            ))}
          </div>

          <p className="text-sm sm:text-lg text-white/90 font-medium">
            IEA Clean Cooking Summit
            <span className="mx-2 sm:mx-3" style={{ color: ORANGE }}>—</span>
            Nairobi, Kenya
            <span className="mx-2 sm:mx-3 text-white/40">·</span>
            9–10 July 2026
          </p>
        </div>
      </div>
    </section>
  );
};

export default SummitCountdown;
