import { useEffect, useRef, useState } from "react";

interface Props {
  value: number;
  suffix?: string;
  decimals?: number;
  duration?: number;
}

export default function AnimatedNumber({ value, suffix = "", decimals = 0, duration = 4500 }: Props) {
  const [current, setCurrent] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const startTime = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(eased * value);
      if (progress < 1) rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [value, duration]);

  const formatted = decimals > 0
    ? current.toFixed(decimals)
    : Math.floor(current).toLocaleString();

  return <>{formatted}{suffix}</>;
}
